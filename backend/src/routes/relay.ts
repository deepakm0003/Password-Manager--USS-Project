import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { relayEmailQueue } from '../jobs/queues';
import type { ApiResponse } from '../types/api';
import logger from '../lib/logger';
import { env } from '../config/env';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const inboundSchema = z.object({
  aliasEmail: z.string().email(),
  from: z.string().min(3),
  subject: z.string().default(''),
  text: z.string().optional(),
  html: z.string().optional(),
  headers: z.record(z.string()).optional().default({}),
});

const verifySignature = (body: unknown, signature: string | undefined): boolean => {
  if (!env.RELAY_WEBHOOK_SECRET) {
    logger.error('Relay webhook secret is not configured');
    return false;
  }

  if (!signature) {
    return false;
  }

  const serialized = JSON.stringify(body);
  const computed = crypto.createHmac('sha256', env.RELAY_WEBHOOK_SECRET).update(serialized).digest('hex');

  const providedBuffer = Buffer.from(signature, 'hex');
  const computedBuffer = Buffer.from(computed, 'hex');

  if (providedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, computedBuffer);
};

router.post('/inbound', async (req, res: ApiResponse) => {
  if (!verifySignature(req.body, req.get('x-relay-signature'))) {
    res.status(401).json({ error: 'Invalid relay signature' });
    return;
  }

  try {
    const body = inboundSchema.parse(req.body);
    const alias = await prisma.alias.findUnique({
      where: { aliasEmail: body.aliasEmail },
    });

    if (!alias || alias.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Alias not found or inactive' });
      return;
    }

    await relayEmailQueue.add('relay-forward', {
      aliasId: alias.id,
      aliasEmail: alias.aliasEmail,
      sender: body.from,
      subject: body.subject,
      text: body.text,
      html: body.html,
      headers: body.headers,
    });

    await prisma.alias.update({
      where: { id: alias.id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: alias.userId,
      action: 'relay.email_forwarded',
      details: {
        aliasId: alias.id,
        sender: body.from,
        subject: body.subject,
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(202).json({ message: 'Email relay enqueued' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Relay processing failed';
    res.status(500).json({ error: message });
  }
});

export default router;




