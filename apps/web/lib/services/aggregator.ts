import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { SpotifyService } from './spotify';
import { YouTubeService } from './youtube';
import { GitHubService } from './github';
import { StravaService } from './strava';
import { WrapData, ProviderStatus } from '../types';
import { TokenError } from './base';

export class Aggregator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Identifies all active connections for the user and fetches data from each.
   * Returns per-provider status so the UI can show reconnect CTAs on failure.
   */
  async generateWrap(year: number = 2025) {
    const connections = await prisma.connection.findMany({
      where: { userId: this.userId },
      select: { provider: true },
    });

    const providers = connections.map((c) => c.provider);
    const wrapData: WrapData = {};
    const providerStatus: Record<string, ProviderStatus> = {};

    const promises = providers.map(async (provider) => {
      try {
        let service;
        switch (provider) {
          case 'spotify':
            service = new SpotifyService(this.userId);
            break;
          case 'google':
            service = new YouTubeService(this.userId);
            break;
          case 'github':
            service = new GitHubService(this.userId);
            break;
          case 'strava':
            service = new StravaService(this.userId);
            break;
          default:
            console.warn(`[Aggregator] No service implemented for provider: ${provider}`);
            providerStatus[provider] = { ok: false, error: 'not_connected', message: 'Not implemented' };
            return;
        }

        const data = await service.fetchData();
        (wrapData as Record<string, unknown>)[provider] = data;
        providerStatus[provider] = { ok: true };
      } catch (err) {
        if (err instanceof TokenError) {
          providerStatus[provider] = { ok: false, error: err.kind, message: err.message };
          console.warn(`[Aggregator] Provider ${provider} needs attention: ${err.kind}`);
        } else {
          providerStatus[provider] = { ok: false, error: 'fetch_error', message: 'Failed to fetch data' };
          console.error(`[Aggregator] Failed to fetch data for ${provider}:`, err);
        }
      }
    });

    await Promise.all(promises);

    // Aggregation: only count providers that returned real data
    let totalMinutes = 0;
    if (wrapData.spotify?.minutes) totalMinutes += wrapData.spotify.minutes;
    if (wrapData.google?.watchHours) totalMinutes += wrapData.google.watchHours * 60;
    if (wrapData.github?.commits) totalMinutes += wrapData.github.commits * 10;
    if (wrapData.strava?.distanceKm) totalMinutes += wrapData.strava.distanceKm * 5;

    wrapData.aggregated = {
      totalHours: Math.floor(totalMinutes / 60),
      topCategory: this.calculateTopCategory(wrapData),
    };
    wrapData.providerStatus = providerStatus;

    const savedWrap = await prisma.wrap.upsert({
      where: {
        userId_year: {
          userId: this.userId,
          year: year,
        }
      },
      update: {
        data: wrapData as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId: this.userId,
        year: year,
        data: wrapData as unknown as Prisma.InputJsonValue,
      },
    });

    return savedWrap;
  }

  public calculateTopCategory(wrapData: WrapData): string {
    const categories = {
        Music: wrapData.spotify?.minutes || 0,
        Video: (wrapData.google?.watchHours || 0) * 60,
        Code: (wrapData.github?.commits || 0) * 10,
        Fitness: (wrapData.strava?.distanceKm || 0) * 5,
    };
    return Object.entries(categories).sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  }
}
