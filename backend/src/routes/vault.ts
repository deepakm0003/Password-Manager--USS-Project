import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { passwordRateLimit } from '../middleware/security';
import type { ApiResponse } from '../types/api';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const entrySchema = z.object({
  ciphertext: z.string().min(10),
  nonce: z.string().min(10),
  authTag: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

router.get('/', authenticate, passwordRateLimit, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const entries = await prisma.vaultEntry.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ entries });
});

router.post('/', authenticate, passwordRateLimit, async (req, res: ApiResponse) => {
  try {
    const body = entrySchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).userId as string;

    const entry = await prisma.vaultEntry.create({
      data: {
        userId,
        ciphertext: body.ciphertext,
        nonce: body.nonce,
        authTag: body.authTag ?? null,
        metadata: body.metadata,
      },
    });

    await logAuditEvent({
      userId,
      action: 'vault.entry_created',
      details: { entryId: entry.id },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    res.status(201).json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to store vault entry';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', authenticate, passwordRateLimit, async (req, res: ApiResponse) => {
  try {
    const body = entrySchema.partial().parse(req.body);
    const userId = (req as AuthenticatedRequest).userId as string;
    const entryId = req.params.id;

    const updated = await prisma.vaultEntry.updateMany({
      where: { id: entryId, userId },
      data: {
        ...body,
        metadata: body.metadata ?? undefined,
      },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    const entry = await prisma.vaultEntry.findUnique({ where: { id: entryId } });
    if (entry) {
      await logAuditEvent({
        userId,
        action: 'vault.entry_updated',
        details: { entryId: entry.id },
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
    }
    res.json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.flatten().fieldErrors });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update entry';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', authenticate, passwordRateLimit, async (req, res: ApiResponse) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const entryId = req.params.id;

  const deleted = await prisma.vaultEntry.deleteMany({ where: { id: entryId, userId } });

  if (deleted.count === 0) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  await logAuditEvent({
    userId,
    action: 'vault.entry_deleted',
    details: { entryId },
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  });

  res.json({ message: 'Entry deleted' });
});

export default router;



