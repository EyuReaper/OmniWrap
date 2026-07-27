import { google } from 'googleapis';
import { BaseService } from './base';

/** Parse ISO 8601 duration (e.g. PT5M30S, PT1H2M3S) to seconds. */
function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export class YouTubeService extends BaseService {
  constructor(userId: string) {
    super(userId, 'google');
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({ version: 'v3', auth });

      // 1. Get User's Channel
      const { data: channelData } = await youtube.channels.list({
        mine: true,
        part: ['snippet', 'statistics', 'contentDetails'],
      });

      const channel = channelData.items?.[0];

      // 2. Get Subscriptions
      const { data: subs } = await youtube.subscriptions.list({
        mine: true,
        part: ['snippet'],
        maxResults: 50,
      });

      // 3. Get Liked Videos with contentDetails for real duration data
      const { data: likes } = await youtube.videos.list({
        myRating: 'like',
        part: ['snippet', 'statistics', 'contentDetails'],
        maxResults: 50,
      });

      const topLikedVideo = likes.items?.[0];

      // Sum video durations from liked videos (real API data, not fabricated)
      const totalSeconds = (likes.items ?? []).reduce((acc, video) => {
        return acc + parseISO8601Duration(video.contentDetails?.duration ?? 'PT0S');
      }, 0);
      const estimatedHours = Math.round((totalSeconds / 3600) * 10) / 10;

      // Derive top category from liked video tags/descriptions (best effort)
      const topCategory = this.deriveTopCategory(likes.items ?? []);

      return {
        channelName: channel?.snippet?.title || 'User',
        topVideo: topLikedVideo?.snippet?.title || 'No Data',
        watchHours: estimatedHours,
        topCategory,
        subscriberCount: channel?.statistics?.subscriberCount,
        viewCount: channel?.statistics?.viewCount,
        recentSub: subs.items?.[0]?.snippet?.title,
        likedVideoCount: likes.items?.length ?? 0,
        watchHoursNote: `Estimated from ${(likes.items?.length ?? 0)} liked videos`,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private deriveTopCategory(videos: Array<{ snippet?: { title?: string | null; description?: string | null; tags?: (string | null)[] | null } | null }>): string {
    const tagCounts: Record<string, number> = {};
    for (const video of videos) {
      const tags = video.snippet?.tags ?? [];
      for (const tag of tags) {
        if (!tag) continue;
        const normalized = tag.toLowerCase();
        tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(tagCounts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || 'Entertainment';
  }
}
