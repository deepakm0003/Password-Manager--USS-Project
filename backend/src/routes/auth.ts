import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/crypto';
import {
  getRefreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { hashToken } from '../utils/hash';
import { authRateLimit } from '../middleware/security';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { ApiError, ApiResponse } from '../types/api';
import { logAuditEvent } from '../utils/audit';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  masterKeySalt: z.string().min(16),
  masterKeyParams: z.record(z.any()),
  kdfIterations: z.number().min(100000).max(600000).default(200000),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string().uuid().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const createSession = async (
  userId: string,
  deviceId: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined,
) => {
  const sessionId = crypto.randomUUID();
  const { token: accessToken, jti } = signAccessToken({ sub: userId, sessionId, deviceId });
  const refreshToken = signRefreshToken({ sub: userId, sessionId, deviceId });

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId,
      deviceId,
      accessTokenJti: jti,
      refreshTokenHash: hashToken(refreshToken),
      refreshExpiresAt: getRefreshExpiryDate(),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return { accessToken, refreshToken, sessionId };
};

router.post(
  '/register',
  authRateLimit,
  async (req, res: ApiResponse) => {
    try {
      const body = registerSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const passwordHash = await hashPassword(body.password);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          accountPasswordHash: passwordHash,
          masterKeySalt: body.masterKeySalt,
          kdfIterations: body.kdfIterations,
          masterKeyParams: body.masterKeyParams,
        },
      });

      await logAuditEvent({
        userId: user.id,
        action: 'auth.register',
        details: { email: user.email },
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.flatten().fieldErrors });
        return;
      }
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  '/login',
  authRateLimit,
  async (req, res: ApiResponse) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email: body.email } });

      if (!user || !user.accountPasswordHash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await verifyPassword(body.password, user.accountPasswordHash);
      if (!valid) {
        await logAuditEvent({
          userId: user.id,
          action: 'auth.login_failed',
          details: { reason: 'invalid_password', deviceId: body.deviceId },
          ipAddress: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const session = await createSession(user.id, body.deviceId, req.ip ?? undefined, req.get('user-agent') ?? undefined);

      await logAuditEvent({
        userId: user.id,
        action: 'auth.login',
        details: {
          sessionId: session.sessionId,
          deviceId: body.deviceId,
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        sessionId: session.sessionId,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.flatten().fieldErrors });
        return;
      }
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  '/refresh',
  async (req, res: ApiResponse) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const payload = verifyRefreshToken(refreshToken);
      const hashed = hashToken(refreshToken);

      const session = await prisma.authSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          refreshTokenHash: hashed,
          revokedAt: null,
          refreshExpiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        res.status(401).json({ error: 'Invalid session' });
        return;
      }

      const { token: newAccess, jti } = signAccessToken({
        sub: payload.sub,
        sessionId: session.id,
        deviceId: session.deviceId ?? undefined,
      });
      const newRefresh = signRefreshToken({
        sub: payload.sub,
        sessionId: session.id,
        deviceId: session.deviceId ?? undefined,
      });

      await prisma.authSession.update({
        where: { id: session.id },
        data: {
          accessTokenJti: jti,
          refreshTokenHash: hashToken(newRefresh),
          refreshExpiresAt: getRefreshExpiryDate(),
        },
      });

      await logAuditEvent({
        userId: payload.sub,
        action: 'auth.refresh',
        details: { sessionId: session.id },
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.json({
        accessToken: newAccess,
        refreshToken: newRefresh,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.flatten().fieldErrors });
        return;
      }
      const message = error instanceof Error ? error.message : 'Refresh failed';
      res.status(401).json({ error: message });
    }
  },
);

router.post('/logout', authenticate, async (req, res: ApiResponse) => {
  const typedReq = req as AuthenticatedRequest;
  if (!typedReq.sessionId) {
    res.status(400).json({ error: 'Missing session context' });
    return;
  }

  await prisma.authSession.updateMany({
    where: { id: typedReq.sessionId },
    data: { revokedAt: new Date() },
  });

  if (typedReq.userId) {
    await logAuditEvent({
      userId: typedReq.userId,
      action: 'auth.logout',
      details: { sessionId: typedReq.sessionId },
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }

  res.json({ message: 'Logged out' });
});

export default router;
