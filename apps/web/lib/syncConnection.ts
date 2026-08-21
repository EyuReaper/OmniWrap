import { encrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/** The subset of a NextAuth `account` object this function needs. */
export interface OAuthAccountLike {
  provider: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
}

/**
 * Upserts the Connection row for a provider that just completed OAuth sign-in.
 *
 * Extracted from the NextAuth `events.signIn` handler so it can be unit-tested
 * without booting NextAuth (see lib/__tests__/syncConnection.test.ts). Tokens
 * are encrypted with AES-256-GCM before they touch the database.
 */
export async function syncConnectionFromAccount(
  userId: string,
  account: OAuthAccountLike,
): Promise<void> {
  const encryptedAccessToken = account.access_token ? encrypt(account.access_token) : null;
  const encryptedRefreshToken = account.refresh_token ? encrypt(account.refresh_token) : null;
  const expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;

  await prisma.connection.upsert({
    where: {
      userId_provider: { userId, provider: account.provider },
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      status: 'connected',
      lastError: null,
    },
    create: {
      userId,
      provider: account.provider,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      status: 'connected',
    },
  });

  logger.info('Connection upserted after OAuth sign-in', {
    userId,
    provider: account.provider,
    hasRefreshToken: Boolean(encryptedRefreshToken),
  });
}