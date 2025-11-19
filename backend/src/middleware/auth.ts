import type { RequestHandler } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Express.Request {
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  tokenPayload?: AccessTokenPayload;
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const typedReq = req as AuthenticatedRequest;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7).trim();
    try {
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, status: true },
      });

      if (!user || user.status !== 'active') {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      typedReq.userId = user.id;
      typedReq.sessionId = decoded.sessionId;
      typedReq.deviceId = decoded.deviceId;
      typedReq.tokenPayload = decoded;

      next();
    } catch (tokenError) {
      const message = tokenError instanceof Error ? tokenError.message : 'Invalid or expired token';
      res.status(401).json({ error: message });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication error';
    res.status(500).json({ error: message });
  }
};
