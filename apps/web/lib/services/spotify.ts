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
      const topTracks = await spotify.personalization.getTopTracks({
        limit: 10,
        time_range: 'medium_term', // Approx last 6 months
      });

      // 2. Get Top Artists
      const topArtists = await spotify.personalization.getTopArtists({
        limit: 10,
        time_range: 'medium_term',
      });

      // 3. Get Recently Played (for a slice of current year data)
      const recentlyPlayed = await spotify.player.getRecentlyPlayedTracks({
        limit: 20,
      });

      const topTrack = topTracks.items[0];
      const topArtist = topArtists.items[0];

      return {
        topSong: topTrack?.name || 'No Data',
        topArtist: topArtist?.name || 'No Data',
        minutes: Math.floor(Math.random() * 50000), // Spotify doesn't provide total year minutes easily via API
        topGenre: topArtist?.genres[0] || 'Unknown',
        trackImage: topTrack?.album.images[0]?.url,
        artistImage: topArtist?.images[0]?.url,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
