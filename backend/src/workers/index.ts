import 'dotenv/config';
import { Worker } from 'bullmq';
import {
  MFA_PUSH_QUEUE,
  RELAY_EMAIL_QUEUE,
  queueConnectionOptions,
  type MfaPushJobData,
  type RelayEmailJobData,
} from '../jobs/queues';
import logger from '../lib/logger';
import { sendPushNotification } from '../services/push';
import prisma from '../lib/prisma';
import { decryptData } from '../utils/encryption';
import { sendRelayEmail } from '../services/mailer';
import { env } from '../config/env';

const createMfaWorker = (): void => {
  new Worker<MfaPushJobData>(
    MFA_PUSH_QUEUE,
    async job => {
      await sendPushNotification({
        token: job.data.fcmToken,
        title: 'Login approval requested',
        body: `Challenge ${job.data.challenge.slice(0, 6)}… expires soon`,
        data: {
          requestId: job.data.requestId,
          challenge: job.data.challenge,
          expiresAt: job.data.expiresAt,
        },
      });
      job.log('Push notification sent');
    },
    {
      ...queueConnectionOptions,
      concurrency: 5,
    },
  )
    .on('completed', job => {
      logger.info({ jobId: job.id }, 'MFA push job completed');
    })
    .on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, 'MFA push job failed');
    });
};

const createRelayWorker = (): void => {
  new Worker<RelayEmailJobData>(
    RELAY_EMAIL_QUEUE,
    async job => {
      const alias = await prisma.alias.findUnique({
        where: { id: job.data.aliasId },
      });

      if (!alias) {
        throw new Error(`Alias ${job.data.aliasId} not found`);
      }

      if (!alias.targetCiphertext) {
        throw new Error(`Alias ${alias.id} missing destination ciphertext`);
      }

      if (!env.RELAY_ENCRYPTION_KEY) {
        throw new Error('Relay encryption key not configured');
      }

      const destination = decryptData(alias.targetCiphertext, env.RELAY_ENCRYPTION_KEY);

      await sendRelayEmail({
        to: destination,
        from: job.data.sender,
        subject: job.data.subject,
        text: job.data.text,
        html: job.data.html,
        headers: job.data.headers,
      });

      job.log(`Email forwarded to ${destination}`);
    },
    {
      ...queueConnectionOptions,
      concurrency: 3,
    },
  )
    .on('completed', job => {
      logger.info({ jobId: job.id }, 'Relay email job completed');
    })
    .on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, 'Relay email job failed');
    });
};

const start = (): void => {
  createMfaWorker();
  createRelayWorker();
  logger.info('Workers bootstrapped');
};

start();


