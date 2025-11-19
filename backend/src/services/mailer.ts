import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import logger from '../lib/logger';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  if (!env.SMTP_HOST || !env.SMTP_USERNAME || !env.SMTP_PASSWORD) {
    throw new Error('SMTP credentials are not configured');
  }

  const port = env.SMTP_PORT ?? 587;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

export interface RelayEmailPayload {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
}

export const sendRelayEmail = async (payload: RelayEmailPayload): Promise<void> => {
  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      headers: payload.headers,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to forward relay email');
    throw error;
  }
};


