import crypto from 'crypto';

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateNonce = (length = 32): string =>
  crypto.randomBytes(length).toString('hex');

