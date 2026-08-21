import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can expose their spies to assertions.
const { mocks } = vi.hoisted(() => ({
  mocks: {
    getMyTopTracks: vi.fn(),
    getMyTopArtists: vi.fn(),
    getRecentlyPlayedTracks: vi.fn(),
  },
}));

vi.mock('../base', () => ({
  getValidAccessToken: vi.fn(async () => 'fake-access-token'),
  TokenError: class TokenError extends Error {},
  BaseService: class BaseService {
    constructor(
      public userId: string,
      public provider: string,
    ) {}
    async getAccessToken() {
      return 'fake-access-token';
    }
    handleError(error: unknown): never {
      throw error;
    }
  },
}));

vi.mock('spotify-web-api-ts', () => ({
  SpotifyWebApi: vi.fn().mockImplementation(function () {
    return {
      personalization: {
        getMyTopTracks: mocks.getMyTopTracks,
        getMyTopArtists: mocks.getMyTopArtists,
      },
      player: {
        getRecentlyPlayedTracks: mocks.getRecentlyPlayedTracks,
      },
    };
  }),
}));

import { SpotifyService } from '../spotify';

describe('SpotifyService.fetchData', () => {
  const service = new SpotifyService('user-1');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyTopTracks.mockResolvedValue({
      items: [{ name: 'Song A', album: { images: [{ url: 'https://img/a.png' }] } }],
    });
    mocks.getMyTopArtists.mockResolvedValue({
      items: [{ name: 'Artist A', genres: ['indie'], images: [{ url: 'https://img/artist.png' }] }],
    });
    mocks.getRecentlyPlayedTracks.mockResolvedValue({
      items: [
        { track: { duration_ms: 240_000 } },
        { track: { duration_ms: 180_000 } },
      ],
    });
  });

  it('maps top tracks/artists and sums real track durations into minutes', async () => {
    const data = await service.fetchData();
    expect(data).toMatchObject({
      topSong: 'Song A',
      topArtist: 'Artist A',
      topGenre: 'indie',
      // 240s + 180s = 420s -> 7 minutes, from real API durations.
      minutes: 7,
      recentTrackCount: 2,
      trackImage: 'https://img/a.png',
    });
    expect(data.minutesNote).toContain('2 recently played tracks');
  });

  it('derives an estimated minutes note that is never a fabricated Math.random value', async () => {
    mocks.getRecentlyPlayedTracks.mockResolvedValue({ items: [] });
    const data = await service.fetchData();
    expect(data.minutes).toBe(0);
    expect(data.minutesNote).toContain('0 recently played tracks');
  });

  it('falls back to "No Data" for missing top item fields', async () => {
    mocks.getMyTopTracks.mockResolvedValue({ items: [] });
    mocks.getMyTopArtists.mockResolvedValue({ items: [] });
    const data = await service.fetchData();
    expect(data.topSong).toBe('No Data');
    expect(data.topArtist).toBe('No Data');
  });
});