import type { AccessTokenPayload } from '../utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    sessionId?: string;
    deviceId?: string;
    tokenPayload?: AccessTokenPayload;
    requestId?: string;
  }
}
