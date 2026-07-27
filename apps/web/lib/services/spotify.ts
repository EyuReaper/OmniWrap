import { SpotifyWebApi } from 'spotify-web-api-ts';
import { BaseService } from './base';

export class SpotifyService extends BaseService {
  constructor(userId: string) {
    super(userId, 'spotify');
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();
      const spotify = new SpotifyWebApi({ accessToken });

      // 1. Get Top Tracks
      const topTracks = await spotify.personalization.getMyTopTracks({
        limit: 10,
        time_range: 'medium_term',
      });

      // 2. Get Top Artists
      const topArtists = await spotify.personalization.getMyTopArtists({
        limit: 10,
        time_range: 'medium_term',
      });

      // 3. Get Recently Played — sum durations for an estimated listening metric
      const recentlyPlayed = await spotify.player.getRecentlyPlayedTracks({
        limit: 50,
      });

      // Sum track durations from recently played (real API data, not fabricated)
      const totalMs = recentlyPlayed.items.reduce((acc, item) => {
        return acc + (item.track?.duration_ms ?? 0);
      }, 0);
      const estimatedMinutes = Math.round(totalMs / 60000);

      const topTrack = topTracks.items[0];
      const topArtist = topArtists.items[0];

      return {
        topSong: topTrack?.name || 'No Data',
        topArtist: topArtist?.name || 'No Data',
        minutes: estimatedMinutes,
        topGenre: topArtist?.genres[0] || 'Unknown',
        trackImage: topTrack?.album.images[0]?.url,
        artistImage: topArtist?.images[0]?.url,
        recentTrackCount: recentlyPlayed.items.length,
        minutesNote: `Estimated from ${recentlyPlayed.items.length} recently played tracks`,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
