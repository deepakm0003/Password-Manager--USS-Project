import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { generateNonce } from '../utils/hash';
import { verifyDeviceSignature } from '../utils/signatures';
import type { ApiResponse } from '../types/api';
import { mfaPushQueue } from '../jobs/queues';
import { decryptData } from '../utils/encryption';
import logger from '../lib/logger';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const requestSchema = z.object({
  deviceId: z.string().uuid().optional(),
  payload: z.record(z.any()).default({}),
});

const responseSchema = z.object({
  mfaRequestId: z.string().uuid(),
  signature: z.string(),
  decision: z.enum(['approve', 'deny']),
  timestamp: z.number(),
});

router.post('/request', authenticate, async (req, res: ApiResponse) => {
  try {
    const body = requestSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId as string;
    const device = body.deviceId
      ? await prisma.device.findFirst({ where: { id: body.deviceId, userId, revokedAt: null } })
      : await prisma.device.findFirst({ where: { userId, revokedAt: null }, orderBy: { lastSeenAt: 'desc' } });

    if (!device) {
      res.status(400).json({ error: 'No eligible device registered' });
      return;
    }

    const challenge = generateNonce(32);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const mfaRequest = await prisma.mfaRequest.create({
      data: {
        userId,
        deviceId: device.id,
        challenge,
        payload: body.payload,
        expiresAt,
      },
    });

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    if (device.fcmTokenCipher) {
      try {
        const fcmToken = decryptData(device.fcmTokenCipher);
        if (fcmToken) {
          await mfaPushQueue.add('dispatch', {
            requestId: mfaRequest.id,
            userId,
            deviceId: device.id,
            challenge,
            fcmToken,
            payload: body.payload,
            expiresAt: expiresAt.toISOString(),
          });
        } else {
          logger.warn(
            {
              deviceId: device.id,
            },
            'Device FCM token decryption returned empty string',
          );
        }
      } catch (error) {
        logger.error({ err: error, deviceId: device.id }, 'Failed to enqueue MFA push notification');
      }
    } else {
      logger.warn({ deviceId: device.id }, 'Device missing FCM token; MFA push not sent');
    }

    await logAuditEvent({
      userId,
      action: 'mfa.request_created',
      details: {
        mfaRequestId: mfaRequest.id,
        deviceId: device.id,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({
      request: mfaRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create MFA request';
    res.status(500).json({ error: message });
  }
});

router.post('/response', async (req, res: ApiResponse) => {
  try {
    const body = responseSchema.parse(req.body);
    const mfaRequest = await prisma.mfaRequest.findUnique({
      where: { id: body.mfaRequestId },
      include: { device: true },
    });

    if (!mfaRequest || !mfaRequest.device) {
      res.status(404).json({ error: 'MFA request not found' });
      return;
    }

    if (mfaRequest.status !== 'PENDING' || mfaRequest.expiresAt < new Date()) {
      res.status(400).json({ error: 'MFA request expired' });
      return;
    }

    const payloadToSign = JSON.stringify({
      id: mfaRequest.id,
      challenge: mfaRequest.challenge,
      decision: body.decision,
      timestamp: body.timestamp,
    });

    const signatureValid = verifyDeviceSignature(mfaRequest.device.publicKey, payloadToSign, body.signature);

    if (!signatureValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const updated = await prisma.mfaRequest.update({
      where: { id: mfaRequest.id },
      data: {
        status: body.decision === 'approve' ? 'APPROVED' : 'DENIED',
        signature: body.signature,
        approvedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: mfaRequest.userId,
      action: 'mfa.request_completed',
      details: {
        mfaRequestId: mfaRequest.id,
        decision: body.decision,
        deviceId: mfaRequest.deviceId,
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.json({ request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to process MFA response';
    res.status(500).json({ error: message });
  }
});

export default router;

