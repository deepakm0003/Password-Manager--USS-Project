import jwt, { type JwtPayload, type SignOptions, type VerifyOptions, type Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import ms, { type StringValue } from 'ms';
import { env } from '../config/env';

const PRIVATE_KEY: Secret = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
const PUBLIC_KEY: Secret = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  sessionId: string;
  deviceId?: string;
  scope?: string[];
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  sessionId: string;
  deviceId?: string;
  type: 'refresh';
}

const baseOptions: SignOptions = {
  issuer: 'unified-auth-manager',
  audience: 'unified-auth-client',
  algorithm: 'RS256',
};

const verifyOptions: VerifyOptions = {
  issuer: baseOptions.issuer,
  audience: baseOptions.audience as string | undefined,
  algorithms: ['RS256'],
};

export const signAccessToken = (
  payload: Omit<AccessTokenPayload, 'jti' | 'iat' | 'exp'>,
): { token: string; jti: string } => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { ...payload, jti },
    PRIVATE_KEY,
    {
      ...baseOptions,
      expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    },
  );
  return { token, jti };
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(
    { ...payload, type: 'refresh' },
    PRIVATE_KEY,
    {
      ...baseOptions,
      expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
    },
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, PUBLIC_KEY, verifyOptions);

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as JwtPayload;
  if (!payload.sub || typeof payload.sub !== 'string' || typeof payload.sessionId !== 'string') {
    throw new Error('Invalid token claims');
  }

  return payload as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, PUBLIC_KEY, verifyOptions);

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as JwtPayload;
  if (payload.type !== 'refresh' || typeof payload.sessionId !== 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token type');
  }

  return payload as RefreshTokenPayload;
};

export const getRefreshExpiryDate = (): Date => {
  const ttlMs = ms(env.JWT_REFRESH_TTL as StringValue);
  return new Date(Date.now() + ttlMs);
};
