import { prisma } from '@/lib/prisma';
import { getValidAccessToken, TokenError } from '@/lib/services/base';
import { CONNECTABLE_SERVICES, OAUTH_PROVIDERS, ConnectionStatus, ConnectionInfo } from '@/lib/serviceCatalog';

const errorKindToStatus: Record<TokenError['kind'], ConnectionStatus> = {
  not_connected: 'never',
  token_expired: 'expired',
  token_revoked: 'error',
  fetch_error: 'error',
};

/**
 * Per-service connection status for a user.
 *
 * Shared by GET /api/connections and the dashboard Server Component so both
 * report identical state. Reads every connection in one query and hands the
 * rows to getValidAccessToken, which would otherwise re-query per provider.
 */
export async function getConnectionStatuses(userId: string): Promise<ConnectionInfo[]> {
  const rows = await prisma.connection.findMany({
    where: { userId },
    select: {
      provider: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      metadata: true,
      status: true,
      lastError: true,
      createdAt: true,
    },
  });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return Promise.all(
    CONNECTABLE_SERVICES.map(async (service): Promise<ConnectionInfo> => {
      const row = byProvider.get(service.provider);

      if (!row) {
        return { provider: service.provider, status: 'never' };
      }

      if (OAUTH_PROVIDERS.includes(service.provider)) {
        try {
          // A refresh inside here still writes back to the row it was given.
          await getValidAccessToken(userId, service.provider, row);
          return {
            provider: service.provider,
            status: 'connected',
            connectedAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt?.toISOString(),
            metadata: row.metadata as Record<string, unknown> | null,
          };
        } catch (err) {
          const kind = err instanceof TokenError ? err.kind : 'fetch_error';
          return {
            provider: service.provider,
            status: errorKindToStatus[kind],
            connectedAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt?.toISOString(),
            metadata: row.metadata as Record<string, unknown> | null,
            lastError: err instanceof Error ? err.message : undefined,
          };
        }
      }

      // Manual providers: status lives directly on the row.
      return {
        provider: service.provider,
        status: row.status as ConnectionStatus,
        connectedAt: row.createdAt.toISOString(),
        metadata: row.metadata as Record<string, unknown> | null,
        lastError: row.lastError,
      };
    }),
  );
}
