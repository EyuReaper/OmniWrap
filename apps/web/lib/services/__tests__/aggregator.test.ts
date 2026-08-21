/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for Prisma/NextAuth payloads */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// `vi.hoisted` so the vi.mock factories below (which are hoisted above this
// module) can share the fetch spies with the assertions.
const { fetchDataFns } = vi.hoisted(() => ({
  fetchDataFns: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

// Mock Prisma client to prevent actual DB connections in unit tests.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    connection: {
      findMany: vi.fn(),
    },
    wrap: {
      upsert: vi.fn(),
    },
  },
}));

// Mock the four provider services so generateWrap can run without network.
function mockServiceClass(provider: string, data: unknown) {
  const fetchData = vi.fn().mockResolvedValue(data);
  fetchDataFns[provider] = fetchData;
  return class {
    fetchData = fetchData;
  };
}

vi.mock('../spotify', () => ({
  SpotifyService: mockServiceClass('spotify', { topSong: 'S1', topArtist: 'A1', minutes: 6000, topGenre: 'pop', recentTrackCount: 50 }),
}));
vi.mock('../youtube', () => ({
  YouTubeService: mockServiceClass('google', { channelName: 'C', topVideo: 'V1', watchHours: 20, topCategory: 'Music', likedVideoCount: 40 }),
}));
vi.mock('../github', () => ({
  GitHubService: mockServiceClass('github', { username: 'u', commits: 1500, topRepo: 'r', languages: ['ts'], totalStars: 10 }),
}));
vi.mock('../strava', () => ({
  StravaService: mockServiceClass('strava', { distanceKm: 1000, activities: 200, topSport: 'Run', elevationGain: 50 }),
}));

import { prisma } from '../../prisma';
import { Aggregator } from '../aggregator';
import { WrapData } from '../../types';

describe('Aggregator - calculateTopCategory (honest, time-based only)', () => {
  const aggregator = new Aggregator('test-user-id');

  it('returns "Music" when Spotify minutes exceed YouTube watch hours', () => {
    const wrapData = {
      spotify: { minutes: 6000 },
      google: { watchHours: 20 }, // 1200 min
    } as WrapData;
    expect(aggregator.calculateTopCategory(wrapData)).toBe('Music');
  });

  it('returns "Video" when YouTube watch hours exceed Spotify minutes', () => {
    const wrapData = {
      spotify: { minutes: 500 },
      google: { watchHours: 150 }, // 9000 min
    } as WrapData;
    expect(aggregator.calculateTopCategory(wrapData)).toBe('Video');
  });

  it('returns null when there is no time-based data at all', () => {
    const wrapData = {} as WrapData;
    expect(aggregator.calculateTopCategory(wrapData)).toBeNull();
  });

  it('never fabricates a category from commits or distance (no fake minute proxies)', () => {
    const wrapData = {
      github: { commits: 100000 },
      strava: { distanceKm: 5000 },
    } as WrapData;
    expect(aggregator.calculateTopCategory(wrapData)).toBeNull();
  });

  it('prefers a real-time category even when non-time metrics are huge', () => {
    const wrapData = {
      spotify: { minutes: 10 },
      google: { watchHours: 1 }, // 60 min — beats Spotify's 10 min
      github: { commits: 999999 },
      strava: { distanceKm: 999999 },
    } as WrapData;
    expect(aggregator.calculateTopCategory(wrapData)).toBe('Video');
  });
});

describe('Aggregator - generateWrap', () => {
  const userId = 'integration-user';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates only real time and stores per-provider status', async () => {
    vi.mocked(prisma.connection.findMany).mockResolvedValue([
      { provider: 'spotify' },
      { provider: 'google' },
      { provider: 'github' },
      { provider: 'strava' },
    ] as any);
    vi.mocked(prisma.wrap.upsert).mockResolvedValue({ data: {}, year: 2025 } as any);

    const aggregator = new Aggregator(userId);
    await aggregator.generateWrap(2025);

    // Spotify 6000 min + YouTube 20h (1200 min) = 7200 min -> 120 hours.
    const upsert = vi.mocked(prisma.wrap.upsert);
    expect(upsert).toHaveBeenCalledTimes(1);
    const data = upsert.mock.calls[0][0].create.data as WrapData;
    expect(data.aggregated?.totalHours).toBe(120);
    expect(data.aggregated?.topCategory).toBe('Music');
    // Commits/km must NOT be converted into fake minutes.
    expect(data.aggregated?.totalHours).not.toBeGreaterThan(121);
    expect(data.providerStatus).toEqual({
      spotify: { ok: true },
      google: { ok: true },
      github: { ok: true },
      strava: { ok: true },
    });
  });

  it('records per-provider failure status when a service throws a TokenError', async () => {
    vi.mocked(prisma.connection.findMany).mockResolvedValue([
      { provider: 'spotify' },
      { provider: 'github' },
    ] as any);
    vi.mocked(prisma.wrap.upsert).mockResolvedValue({ data: {}, year: 2025 } as any);
    const { TokenError } = await import('../base');
    fetchDataFns.github.mockRejectedValue(new TokenError('github', 'token_expired', 'Token expired'));

    const aggregator = new Aggregator(userId);
    await aggregator.generateWrap(2025);

    const data = vi.mocked(prisma.wrap.upsert).mock.calls[0][0].create.data as WrapData;
    expect(data.providerStatus?.github).toEqual({
      ok: false,
      error: 'token_expired',
      message: 'Token expired',
    });
    expect(data.providerStatus?.spotify).toEqual({ ok: true });
  });

  it('retries transient failures but not TokenErrors', async () => {
    vi.mocked(prisma.connection.findMany).mockResolvedValue([{ provider: 'github' }] as any);
    vi.mocked(prisma.wrap.upsert).mockResolvedValue({ data: {}, year: 2025 } as any);
    const { TokenError } = await import('../base');

    // First two calls fail with a network error (retryable), third succeeds.
    fetchDataFns.github
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue({ username: 'u', commits: 42, topRepo: 'r', languages: [], totalStars: 1 });

    const aggregator = new Aggregator(userId);
    await aggregator.generateWrap(2025);

    const data = vi.mocked(prisma.wrap.upsert).mock.calls[0][0].create.data as WrapData;
    expect(data.providerStatus?.github).toEqual({ ok: true });
    expect(fetchDataFns.github).toHaveBeenCalledTimes(3);

    // A TokenError should not be retried.
    fetchDataFns.github.mockClear();
    fetchDataFns.github.mockRejectedValue(new TokenError('github', 'token_revoked', 'Refresh failed'));
    const aggregator2 = new Aggregator(userId);
    await aggregator2.generateWrap(2025);
    expect(fetchDataFns.github).toHaveBeenCalledTimes(1);
  });
});