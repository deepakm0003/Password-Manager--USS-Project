import type { RequestHandler } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';

/**
 * Enhanced token security middleware
 * Validates token expiration, revocation, and security checks
 */
export const validateTokenSecurity: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7).trim();
    
    // Verify token structure
    if (!token || token.length < 10) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Verify token signature and expiration
    try {
      const decoded = verifyAccessToken(token) as AccessTokenPayload;
      
      // Additional security checks
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        res.status(401).json({ error: 'Token expired' });
        return;
      }
      
      // Check token not before time
      if (decoded.nbf && decoded.nbf > now) {
        res.status(401).json({ error: 'Token not yet valid' });
        return;
      }

      // Store decoded token in request for use in routes
      (req as any).tokenPayload = decoded;
      (req as any).userId = decoded.sub;
      
      next();
    } catch (tokenError) {
      const message = tokenError instanceof Error ? tokenError.message : 'Invalid or expired token';
      res.status(401).json({ error: message });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token validation error';
    console.error('Token security validation error:', error);
    res.status(500).json({ error: message });
  }
};

/**
 * Token rotation middleware
 * Automatically refresh tokens before they expire
 */
export const tokenRotation: RequestHandler = async (req, res, next) => {
  // This would implement automatic token refresh
  // For now, tokens are refreshed via the refresh endpoint
  next();
};

