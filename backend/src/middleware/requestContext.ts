import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  (req as Express.Request & { requestId?: string }).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;
  next();
};


