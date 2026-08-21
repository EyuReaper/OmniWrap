import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { SpotifyService } from './spotify';
import { YouTubeService } from './youtube';
import { GitHubService } from './github';
import { StravaService } from './strava';
import { WrapData, ProviderStatus } from '../types';
import { TokenError, BaseService } from './base';
import { retryWithBackoff } from '../retry';
import { logger } from '../logger';
import { getWrapYear } from '../wrapYear';

export class Aggregator {
  constructor(private userId: string) {}

  /**
   * Fetches data from every active connection, retries transient upstream
   * failures (but never auth failures — those need a reconnect), and stores
   * the result. Returns per-provider status so the UI can show reconnect CTAs.
   */
  async generateWrap(year: number = getWrapYear()) {
    const connections = await prisma.connection.findMany({
      where: { userId: this.userId },
      select: { provider: true },
    });

    const providers = connections.map((c) => c.provider);
    const wrapData: WrapData = {};
    const providerStatus: Record<string, ProviderStatus> = {};

    const promises = providers.map(async (provider) => {
      try {
        let service: BaseService;
        switch (provider) {
          case 'spotify':
            service = new SpotifyService(this.userId);
            break;
          case 'google':
            service = new YouTubeService(this.userId);
            break;
          case 'github':
            service = new GitHubService(this.userId, year);
            break;
          case 'strava':
            service = new StravaService(this.userId, year);
            break;
          default:
            logger.warn('Aggregator: no service implemented for provider', { provider });
            providerStatus[provider] = { ok: false, error: 'not_connected', message: 'Not implemented' };
            return;
        }

        // A TokenError means the OAuth token is gone/revoked — retrying is
        // pointless and would just burn upstream rate limits, so only
        // transient (network/5xx) failures are retried.
        const data = await retryWithBackoff(() => service.fetchData(), {
          retries: 2,
          shouldRetry: (_attempt, err) => !(err instanceof TokenError),
        });
        (wrapData as Record<string, unknown>)[provider] = data;
        providerStatus[provider] = { ok: true };
      } catch (err) {
        if (err instanceof TokenError) {
          providerStatus[provider] = { ok: false, error: err.kind, message: err.message };
          logger.warn('Aggregator: provider needs attention', { provider, kind: err.kind });
        } else {
          providerStatus[provider] = { ok: false, error: 'fetch_error', message: 'Failed to fetch data' };
          logger.error('Aggregator: failed to fetch data for provider', err, { provider });
        }
      }
    });

    await Promise.all(promises);

    // Honest aggregation. Only *measured* time counts toward total hours and
    // the top category. The old `commits * 10` / `km * 5` minute proxies were
    // fabricated and are intentionally dropped (P1 "Honest aggregation") —
    // GitHub and Strava metrics are shown as their own real counts instead.
    const trackedMinutes =
      (wrapData.spotify?.minutes ?? 0) + (wrapData.google?.watchHours ?? 0) * 60;

    const topCategory = this.calculateTopCategory(wrapData);
    wrapData.aggregated = {
      totalHours: Math.floor(trackedMinutes / 60),
      ...(topCategory ? { topCategory } : {}),
    };
    wrapData.providerStatus = providerStatus;

    const savedWrap = await prisma.wrap.upsert({
      where: {
        userId_year: {
          userId: this.userId,
          year,
        },
      },
      update: {
        data: wrapData as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId: this.userId,
        year,
        data: wrapData as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info('Aggregator: wrap generated', {
      userId: this.userId,
      year,
      totalHours: wrapData.aggregated.totalHours,
    });

    return savedWrap;
  }

  /**
   * The category with the most real tracked time, or null when no provider
   * returned time-based data. Only Music (Spotify minutes) and Video (YouTube
   * watch hours) are comparable on the same axis — commits and km are not
   * minutes, so they are never converted into a fake top category.
   */
  public calculateTopCategory(wrapData: WrapData): string | null {
    const candidates: Array<[string, number]> = [];
    if (wrapData.spotify?.minutes) candidates.push(['Music', wrapData.spotify.minutes]);
    if (wrapData.google?.watchHours) candidates.push(['Video', wrapData.google.watchHours * 60]);
    candidates.sort(([, a], [, b]) => b - a);
    return candidates[0]?.[0] ?? null;
  }
}