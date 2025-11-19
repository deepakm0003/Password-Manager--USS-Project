import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

const register = new client.Registry();

register.setDefaultLabels({
  service: 'uam-backend',
});

client.collectDefaultMetrics({
  register,
  prefix: 'uam_',
});

const requestDuration = new client.Histogram({
  name: 'uam_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

register.registerMetric(requestDuration);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const endTimer = requestDuration.startTimer({
    method: req.method,
    route: req.route?.path ?? req.path,
  });

  res.on('finish', () => {
    endTimer({ status: res.statusCode.toString() });
  });

  next();
};

export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};


