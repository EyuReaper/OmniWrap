/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    connection: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { syncConnectionFromAccount } from '@/lib/syncConnection';

describe('syncConnectionFromAccount (connection upsert on sign-in)', () => {
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts a connection with encrypted tokens and connected status', async () => {
    vi.mocked(prisma.connection.upsert).mockResolvedValue({ id: 'c1' } as any);

    await syncConnectionFromAccount(userId, {
      provider: 'spotify',
      access_token: 'plaintext-access',
      refresh_token: 'plaintext-refresh',
      expires_at: 1893456000,
    });

    const [args] = vi.mocked(prisma.connection.upsert).mock.calls;
    const { where, create, update } = args[0];

    expect(where).toEqual({ userId_provider: { userId, provider: 'spotify' } });
    expect(create.provider).toBe('spotify');
    expect(create.status).toBe('connected');

    // Tokens must be encrypted (never the plaintext values).
    expect(create.accessToken).not.toContain('plaintext-access');
    expect(create.accessToken).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(create.refreshToken).not.toContain('plaintext-refresh');

    // expires_at (seconds) is converted to a Date.
    expect(create.expiresAt).toBeInstanceOf(Date);
    expect((create.expiresAt as Date).getTime()).toBe(1893456000 * 1000);

    // update path keeps the row in sync too.
    expect(update.accessToken).toBe(create.accessToken);
    expect(update.status).toBe('connected');
    expect(update.lastError).toBeNull();
  });

  it('stores null tokens when the account has none', async () => {
    vi.mocked(prisma.connection.upsert).mockResolvedValue({ id: 'c1' } as any);

    await syncConnectionFromAccount(userId, { provider: 'github' });

    const [{ create }] = vi.mocked(prisma.connection.upsert).mock.calls[0];
    expect(create.accessToken).toBeNull();
    expect(create.refreshToken).toBeNull();
    expect(create.expiresAt).toBeNull();
  });
});