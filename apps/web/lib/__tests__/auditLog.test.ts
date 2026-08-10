/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { logAudit } from '../auditLog';

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the action, userId, email snapshot, and metadata', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await logAudit('u1', 'connection.disconnect', {
      userEmail: 'test@example.com',
      metadata: { provider: 'spotify' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        userEmail: 'test@example.com',
        action: 'connection.disconnect',
        metadata: { provider: 'spotify' },
      },
    });
  });

  it('does not throw when the write fails', async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('db down'));

    await expect(logAudit('u1', 'account.delete')).resolves.toBeUndefined();
  });
});
