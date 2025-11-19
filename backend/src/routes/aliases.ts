import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { ApiResponse } from '../types/api';
import { env } from '../config/env';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const createSchema = z.object({
  routingMode: z.enum(['DIRECT', 'HMAC_LOOKUP']).default('DIRECT'),
  targetCiphertext: z.string().optional(),
  targetHmac: z.string().optional(),
  hmacKeyVersion: z.number().int().positive().optional(),
});

const generateAliasEmail = (domain: string): string => {
  const randomPart = crypto.randomBytes(5).toString('hex');
  return `${randomPart}@${domain}`;
};

router.get('/', authenticate, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const aliases = await prisma.alias.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  res.json({ aliases });
});

router.post('/', authenticate, async (req, res: ApiResponse) => {
  try {
    const body = createSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId as string;

    if (body.routingMode === 'DIRECT' && !body.targetCiphertext) {
      res.status(400).json({ error: 'targetCiphertext is required for DIRECT aliases' });
      return;
    }

    if (body.routingMode === 'HMAC_LOOKUP' && !body.targetHmac) {
      res.status(400).json({ error: 'targetHmac is required for HMAC_LOOKUP aliases' });
      return;
    }

    const aliasEmail = generateAliasEmail(env.RELAY_DOMAIN);

    const alias = await prisma.alias.create({
      data: {
        userId,
        aliasEmail,
        routingMode: body.routingMode,
        targetCiphertext: body.targetCiphertext ?? null,
        targetHmac: body.targetHmac ?? null,
        hmacKeyVersion: body.hmacKeyVersion ?? null,
      },
    });

    await logAuditEvent({
      userId,
      action: 'alias.created',
      details: {
        aliasId: alias.id,
        aliasEmail: alias.aliasEmail,
        routingMode: alias.routingMode,
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({ alias });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create alias';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', authenticate, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const aliasId = req.params.id;

  const result = await prisma.alias.updateMany({
    where: { id: aliasId, userId },
    data: { status: 'REVOKED' },
  });

  if (result.count > 0) {
    await logAuditEvent({
      userId,
      action: 'alias.revoked',
      details: { aliasId },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }

  res.json({ message: 'Alias revoked' });
});

export default router;

