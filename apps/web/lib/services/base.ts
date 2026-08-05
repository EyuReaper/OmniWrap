import { decrypt, encrypt } from '../crypto';
import { prisma } from '../prisma';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/** Provider-specific token refresh logic. */
async function refreshAccessToken(
  provider: string,
  refreshToken: string,
): Promise<RefreshResult> {
  switch (provider) {
    case 'spotify': {
      const resp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SPOTIFY_CLIENT_ID!,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        }),
      });
      if (!resp.ok) throw new Error(`Spotify token refresh failed: ${resp.status}`);
      const data = await resp.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    }
    case 'google': {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      });
      if (!resp.ok) throw new Error(`Google token refresh failed: ${resp.status}`);
      const data = await resp.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    }
    case 'strava': {
      const resp = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.STRAVA_CLIENT_ID!,
          client_secret: process.env.STRAVA_CLIENT_SECRET!,
        }),
      });
      if (!resp.ok) throw new Error(`Strava token refresh failed: ${resp.status}`);
      const data = await resp.json() as {
        access_token: string;
        refresh_token?: string;
        expires_at?: number;
      };
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
      };
    }
    default:
      throw new Error(`Token refresh not supported for provider: ${provider}`);
  }
}

/**
 * Fetches a valid (possibly refreshed) OAuth access token for a user+provider.
 * Shared by BaseService (data fetching) and the connection-status endpoint
 * (which needs the same refresh-or-fail semantics without fetching provider data).
 * Throws a typed TokenError for missing/expired/revoked tokens instead of a bare Error.
 */
export async function getValidAccessToken(userId: string, provider: string): Promise<string> {
  const connection = await prisma.connection.findUnique({
    where: {
      userId_provider: { userId, provider },
    },
  });

  if (!connection || !connection.accessToken) {
    throw new TokenError(provider, 'not_connected', 'No connection found');
  }

  const isExpired =
    connection.expiresAt &&
    connection.expiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (!isExpired) {
    return decrypt(connection.accessToken);
  }

  // Token is expired or about to expire — attempt refresh
  if (!connection.refreshToken) {
    throw new TokenError(provider, 'token_expired', 'Token expired and no refresh token available');
  }

  try {
    const decryptedRefreshToken = decrypt(connection.refreshToken);
    const refreshed = await refreshAccessToken(provider, decryptedRefreshToken);

    // Persist the new tokens
    await prisma.connection.update({
      where: {
        userId_provider: { userId, provider },
      },
      data: {
        accessToken: encrypt(refreshed.accessToken),
        ...(refreshed.refreshToken && { refreshToken: encrypt(refreshed.refreshToken) }),
        ...(refreshed.expiresAt && { expiresAt: refreshed.expiresAt }),
      },
    });

    return refreshed.accessToken;
  } catch (err) {
    console.error(`[BaseService] Token refresh failed for ${provider}:`, err);
    throw new TokenError(provider, 'token_revoked', 'Token refresh failed');
  }
}

export abstract class BaseService {
  protected userId: string;
  protected provider: string;

  constructor(userId: string, provider: string) {
    this.userId = userId;
    this.provider = provider;
  }

  /**
   * Fetches a valid (possibly refreshed) access token from the database.
   * Returns a typed error for expired/revoked tokens instead of throwing.
   */
  protected async getAccessToken(): Promise<string> {
    return getValidAccessToken(this.userId, this.provider);
  }

  abstract fetchData(): Promise<unknown>;

  protected handleError(error: unknown): never {
    if (error instanceof TokenError) throw error;
    console.error(`Error in ${this.provider} service:`, error);
    throw new TokenError(this.provider, 'fetch_error', 'Failed to fetch data');
  }
}

/**
 * Typed error that carries provider + error kind so the aggregator and UI
 * can distinguish between expired tokens, missing connections, and fetch failures.
 */
export class TokenError extends Error {
  constructor(
    public readonly provider: string,
    public readonly kind: 'not_connected' | 'token_expired' | 'token_revoked' | 'fetch_error',
    message: string,
  ) {
    super(message);
    this.name = 'TokenError';
  }
}
