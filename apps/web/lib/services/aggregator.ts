import { prisma } from '../prisma';
import { SpotifyService } from './spotify';
import { YouTubeService } from './youtube';
import { GitHubService } from './github';
import { StravaService } from './strava';

export class Aggregator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Identifies all active connections for the user and fetches data from each.
   */
  async generateWrap(year: number = 2025) {
    // 1. Get all user connections
    const connections = await prisma.connection.findMany({
      where: { userId: this.userId },
      select: { provider: true },
    });

    const providers = connections.map((c) => c.provider);
    const wrapData: any = {};

    // 2. Fetch data in parallel
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
          // Add more providers as they are implemented
          default:
            console.warn(`[Aggregator] No service implemented for provider: ${provider}`);
            return;
        }

        const data = await service.fetchData();
        wrapData[provider] = data;
      } catch (err) {
        console.error(`[Aggregator] Failed to fetch data for ${provider}:`, err);
        // We continue with other services even if one fails
      }
    });

    await Promise.all(promises);

    // 3. Simple aggregation for the "Legend" summary slide
    let totalMinutes = 0;
    if (wrapData.spotify?.minutes) totalMinutes += wrapData.spotify.minutes;
    if (wrapData.youtube?.watchHours) totalMinutes += wrapData.youtube.watchHours * 60;
    // Commits and distance are harder to map to 'minutes' but we can add a proxy
    if (wrapData.github?.commits) totalMinutes += wrapData.github.commits * 10;
    if (wrapData.strava?.distanceKm) totalMinutes += wrapData.strava.distanceKm * 5;

    wrapData.aggregated = {
      totalHours: Math.floor(totalMinutes / 60),
      topCategory: this.calculateTopCategory(wrapData),
    };

    // 4. Save the Wrap to the database (Upsert based on userId and year)
    const savedWrap = await prisma.wrap.upsert({
      where: {
        userId_year: {
          userId: this.userId,
          year: year,
        }
      },
      update: {
        data: wrapData,
      },
      create: {
        userId: this.userId,
        year: year,
        data: wrapData,
      },
    });

    return savedWrap;
  }

  private calculateTopCategory(wrapData: any): string {
    const categories = {
        Music: wrapData.spotify?.minutes || 0,
        Video: (wrapData.youtube?.watchHours || 0) * 60,
        Code: (wrapData.github?.commits || 0) * 10,
        Fitness: (wrapData.strava?.distanceKm || 0) * 5,
    };
    return Object.entries(categories).sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  }
}
