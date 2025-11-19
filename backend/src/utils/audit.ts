import type { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

type AuditDetails = Prisma.InputJsonValue | undefined;

interface LogAuditEventOptions {
  userId: string;
  action: string;
  details?: AuditDetails;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const logAuditEvent = async ({
  userId,
  action,
  details,
  ipAddress,
  userAgent,
}: LogAuditEventOptions): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        meta: details,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error logging audit event:', message);
  }
};
