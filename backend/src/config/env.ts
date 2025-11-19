import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_ACCESS_TTL: z.string().default('5m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  SENTRY_DSN: z.string().url().optional(),
  FCM_SERVER_KEY: z.string().optional(),
  FCM_SERVICE_ACCOUNT: z.string().optional(),
  APP_DOMAIN: z.string().optional(),
  RELAY_DOMAIN: z.string().default('relay.uam.local'),
  RELAY_WEBHOOK_SECRET: z.string().optional(),
  RELAY_ENCRYPTION_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform(value => (value ? Number(value) : undefined)),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

