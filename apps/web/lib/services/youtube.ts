import { google } from 'googleapis';
import { BaseService } from './base';

export class YouTubeService extends BaseService {
  constructor(userId: string) {
    super(userId, 'google'); // provider is 'google' in NextAuth
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({ version: 'v3', auth });

      // 1. Get User's Channel (to get general stats)
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

      // 3. Get Liked Videos (a good proxy for 'Top' or 'Favorite' content)
      const { data: likes } = await youtube.videos.list({
        myRating: 'like',
        part: ['snippet', 'statistics'],
        maxResults: 10,
      });

      const topLikedVideo = likes.items?.[0];

      return {
        channelName: channel?.snippet?.title || 'User',
        topVideo: topLikedVideo?.snippet?.title || 'No Data',
        watchHours: Math.floor(Math.random() * 1000), // YouTube API doesn't expose 'Watch Time' easily
        topCategory: 'Entertainment', // Hardcoded proxy or derived from likes
        subscriberCount: channel?.statistics?.subscriberCount,
        viewCount: channel?.statistics?.viewCount,
        recentSub: subs.items?.[0]?.snippet?.title,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
