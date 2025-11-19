import type { RequestHandler, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';
import rateLimit from 'express-rate-limit';

/**
 * Additional security headers
 */
export const securityHeaders: RequestHandler = (_req, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput: RequestHandler = (req, _res, next) => {
  // Sanitize string inputs recursively
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential SQL injection patterns
      return obj.replace(/['";\\]/g, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Request size limit middleware
 */
export const requestSizeLimit: RequestHandler = (req, res, next) => {
  // Limit request size to 1MB
  const MAX_SIZE = 1024 * 1024; // 1MB
  const contentLength = req.get('content-length');
  
  if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
    res.status(413).json({ error: 'Request entity too large' });
    return;
  }

  next();
};

/**
 * Rate limiting for authentication routes
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for password routes
 */
export const passwordRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many password requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * SQL injection protection middleware
 */
export const sqlInjectionProtection: RequestHandler = (req, _res, next) => {
  // Check for common SQL injection patterns
  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(--|;|\*|xp_|sp_)/i,
        /('|(\\')|(\;)|(\\)|(%27)|(%00)|(\/\*)|(\*\/)|(xp_)|(sp_))/i,
      ];
      
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
      return value.some(checkForSQLInjection);
    }
    
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(checkForSQLInjection);
    }
    
    return false;
  };

  // Check body, query, and params
  const checkAll = [
    req.body,
    req.query,
    req.params,
  ];

  for (const data of checkAll) {
    if (data && checkForSQLInjection(data)) {
      next(new Error('Invalid input detected'));
      return;
    }
  }

  next();
};

/**
 * Email format validation middleware
 */
export const validateEmailFormat: RequestHandler = (req, _res, next) => {
  const { email } = req.body;
  
  if (email && typeof email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      next(new Error('Invalid email format'));
      return;
    }
  }
  
  next();
};

/**
 * Password strength validation middleware
 */
export const validatePasswordStrength: RequestHandler = (req, _res, next) => {
  const { password } = req.body;
  
  if (password && typeof password === 'string') {
    if (password.length < 8) {
      next(new Error('Password must be at least 8 characters long'));
      return;
    }
    
    // Optional: Add more strength checks
    // if (!/[A-Z]/.test(password)) {
    //   next(new Error('Password must contain at least one uppercase letter'));
    //   return;
    // }
  }
  
  next();
};
