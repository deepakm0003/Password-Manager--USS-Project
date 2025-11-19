import admin from 'firebase-admin';
import logger from '../lib/logger';
import { env } from '../config/env';

let firebaseApp: admin.app.App | null = null;

const initFirebaseApp = (): admin.app.App | null => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!env.FCM_SERVICE_ACCOUNT) {
    return null;
  }

  try {
    const raw = env.FCM_SERVICE_ACCOUNT.trim();
    const jsonString = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const credentials = JSON.parse(jsonString) as admin.ServiceAccount;
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    return firebaseApp;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK');
    return null;
  }
};

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async (payload: PushNotificationPayload): Promise<void> => {
  const app = initFirebaseApp();

  try {
    if (app) {
      await app.messaging().send({
        token: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
      });
      return;
    }

    if (!env.FCM_SERVER_KEY) {
      throw new Error('FCM credentials are not configured');
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${env.FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        priority: 'high',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`FCM request failed with status ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to send push notification');
    throw error;
  }
};


