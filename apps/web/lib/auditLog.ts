import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'connection.connect'
  | 'connection.disconnect'
  | 'account.delete';

/**
 * Records a sensitive-action audit entry. Best-effort: a logging failure
 * must never block the action it's describing (e.g. account deletion should
 * still succeed even if the audit write itself fails), so errors are
 * swallowed after being logged.
 */
export async function logAudit(
  userId: string,
  action: AuditAction,
  options: { userEmail?: string | null; metadata?: Prisma.InputJsonValue } = {},
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: options.userEmail ?? undefined,
        action,
        metadata: options.metadata,
      },
    });
  } catch (error) {
    logger.error(`Failed to record audit action`, error, { userId, action });
  }
}
