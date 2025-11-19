import { Queue, type QueueOptions } from 'bullmq';
import { env } from '../config/env';

const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';

const baseQueueOptions: QueueOptions = {
  connection: {
    url: redisUrl,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
};

export const MFA_PUSH_QUEUE = 'mfa-push';
export const RELAY_EMAIL_QUEUE = 'relay-email';

export interface MfaPushJobData {
  requestId: string;
  userId: string;
  deviceId: string;
  challenge: string;
  fcmToken: string;
  payload: Record<string, unknown>;
  expiresAt: string;
}

export interface RelayEmailJobData {
  aliasId: string;
  aliasEmail: string;
  sender: string;
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
}

export const mfaPushQueue = new Queue<MfaPushJobData>(MFA_PUSH_QUEUE, baseQueueOptions);
export const relayEmailQueue = new Queue<RelayEmailJobData>(RELAY_EMAIL_QUEUE, baseQueueOptions);

export const queueConnectionOptions = baseQueueOptions;




