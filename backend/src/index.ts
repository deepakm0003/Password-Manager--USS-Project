import 'dotenv/config';
import express, { Application, ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import https from 'https';
import * as Sentry from '@sentry/node';
import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import deviceRoutes from './routes/devices';
import mfaRoutes from './routes/mfa';
import aliasRoutes from './routes/aliases';
import relayRoutes from './routes/relay';
import { initRedis } from './utils/redis';
import { securityHeaders, sanitizeInput, requestSizeLimit, sqlInjectionProtection } from './middleware/security';
import logger from './lib/logger';
import { env } from './config/env';
import { metricsMiddleware, metricsEndpoint } from './lib/metrics';
import { requestContext } from './middleware/requestContext';

const app: Application = express();
const sentryHandlers = (Sentry as unknown as {
  Handlers?: {
    requestHandler: () => import('express').RequestHandler;
    tracingHandler: () => import('express').RequestHandler;
    errorHandler: () => ErrorRequestHandler;
  };
}).Handlers;
const PORT = env.PORT;

if (env.SENTRY_DSN && sentryHandlers) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
  app.use(sentryHandlers.requestHandler());
  app.use(sentryHandlers.tracingHandler());
} else if (env.SENTRY_DSN) {
  logger.warn('Sentry DSN provided but Handlers API unavailable; skipping middleware wiring');
}

app.use(requestContext);

// Initialize Redis (non-blocking, optional)
// Redis is optional - the app works without it
// Only initialize if explicitly configured (not using default)
if (env.REDIS_URL) {
  void initRedis()
    .then(() => logger.info('✅ Redis connected'))
    .catch(error => {
      logger.warn({ err: error }, 'Redis unavailable; continuing without cache/queue');
    });
}

// Security middleware - Enhanced security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [
  'http://localhost:19006',
  'exp://localhost:19000',
  'http://localhost:8081', // Expo web
  'http://10.0.2.2:5000', // Android emulator
  'http://localhost:5000', // Local development
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow if origin is in the list
    if (corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // For development, allow all localhost and expo origins
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('exp://') || origin.includes('19000') || origin.includes('19006') || origin.includes('8081')) {
        callback(null, true);
        return;
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Request-Timestamp', 'X-Client-Platform', 'X-Client-Version'],
};
app.use(cors(corsOptions));

// Additional security middleware
app.use(securityHeaders);
app.use(requestSizeLimit);
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(metricsMiddleware);

// Rate limiting
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100);

const limiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing with strict limits
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 50 }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/metrics', metricsEndpoint);

const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/vault`, vaultRoutes);
app.use(`${API_PREFIX}/devices`, deviceRoutes);
app.use(`${API_PREFIX}/mfa`, mfaRoutes);
app.use(`${API_PREFIX}/aliases`, aliasRoutes);
app.use(`${API_PREFIX}/relay`, relayRoutes);

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status((err as { status?: number }).status ?? 500).json({
    error: err.message ?? 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
if (env.SENTRY_DSN && sentryHandlers) {
  app.use(sentryHandlers.errorHandler());
}
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// HTTPS/TLS Configuration (optional for production)
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

if (HTTPS_ENABLED && SSL_KEY_PATH && SSL_CERT_PATH) {
  // Production: Use HTTPS with SSL certificates
  try {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH),
    };

    https.createServer(options, app).listen(PORT, () => {
      logger.info(
        {
          port: PORT,
          env: env.NODE_ENV,
          mode: 'https',
        },
        'Server ready',
      );
      logger.info(`🔗 Health check: https://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to boot HTTPS server, falling back to HTTP');
    app.listen(PORT, () => {
      logger.info(
        {
          port: PORT,
          env: env.NODE_ENV,
          mode: 'http-fallback',
        },
        'Server ready',
      );
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  }
} else {
  // Development: Use HTTP
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(
      {
        port: PORT,
        env: env.NODE_ENV,
        mode: 'http',
      },
      'Server ready',
    );
    if (env.NODE_ENV === 'production') {
      logger.warn('⚠️ Running on HTTP in production! Configure HTTPS.');
    }
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔗 iOS Simulator: http://localhost:${PORT}/health`);
    logger.info(`🔗 Android Emulator: http://10.0.2.2:${PORT}/health`);
  });
}

export default app;

