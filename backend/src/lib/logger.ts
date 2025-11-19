import pino from 'pino';

const logger = pino({
  name: 'uam-backend',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
    censor: '[REDACTED]',
  },
});

export default logger;

