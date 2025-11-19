import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { ApiResponse } from '../types/api';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  publicKey: z.string().min(32),
  keyAlgorithm: z.enum(['ed25519', 'secp256k1']).default('ed25519'),
  fcmTokenCipher: z.string().optional(),
  platform: z.enum(['android', 'ios', 'web', 'desktop']),
  appVersion: z.string().optional(),
});

router.get('/', authenticate, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const devices = await prisma.device.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ devices });
});

router.post('/register', authenticate, async (req, res: ApiResponse) => {
  try {
    const body = registerSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId as string;

    const device = await prisma.device.create({
      data: {
        userId,
        name: body.name,
        publicKey: body.publicKey,
        keyAlgorithm: body.keyAlgorithm,
        fcmTokenCipher: body.fcmTokenCipher ?? null,
        platform: body.platform,
        appVersion: body.appVersion ?? null,
        isPrimary: false,
      },
    });

    await logAuditEvent({
      userId,
      action: 'device.registered',
      details: {
        deviceId: device.id,
        platform: body.platform,
        keyAlgorithm: body.keyAlgorithm,
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({ device });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Device registration failed';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', authenticate, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const deviceId = req.params.id;

  const result = await prisma.device.updateMany({
    where: { id: deviceId, userId },
    data: { revokedAt: new Date() },
  });

  if (result.count > 0) {
    await logAuditEvent({
      userId,
      action: 'device.revoked',
      details: { deviceId },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }

  res.json({ message: 'Device revoked' });
});

export default router;

