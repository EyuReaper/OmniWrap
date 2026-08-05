import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getValidAccessToken, TokenError } from '@/lib/services/base';
import { CONNECTABLE_SERVICES, OAUTH_PROVIDERS, ConnectionStatus, ConnectionInfo } from '@/lib/serviceCatalog';

const errorKindToStatus: Record<TokenError['kind'], ConnectionStatus> = {
  not_connected: 'never',
  token_expired: 'expired',
  token_revoked: 'error',
  fetch_error: 'error',
};

/** Returns per-service connection status for the current user. */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const rows = await prisma.connection.findMany({ where: { userId } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const results = await Promise.all(
    CONNECTABLE_SERVICES.map(async (service): Promise<ConnectionInfo> => {
      const row = byProvider.get(service.provider);

      if (!row) {
        return { provider: service.provider, status: 'never' };
      }

      if (OAUTH_PROVIDERS.includes(service.provider)) {
        try {
          await getValidAccessToken(userId, service.provider);
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

  return NextResponse.json({ connections: results });
}
