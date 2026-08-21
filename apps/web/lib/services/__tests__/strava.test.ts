import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    fetch: vi.fn(),
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

import { StravaService } from '../strava';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('StravaService.fetchData — pagination', () => {
  const service = new StravaService('user-1', 2025);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collects activities across multiple pages until a short page', async () => {
    const activity = (distance: number, type = 'Run') => ({
      distance,
      sport_type: type,
      type,
      total_elevation_gain: 10,
    });

    // Page 1: full (200), page 2: 50 (short) -> stop after page 2.
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ firstname: 'A', lastname: 'B' })) // athlete
      .mockResolvedValueOnce(jsonResponse(Array.from({ length: 200 }, () => activity(1000, 'Run'))))
      .mockResolvedValueOnce(jsonResponse(Array.from({ length: 50 }, () => activity(500, 'Ride'))));

    const data = await service.fetchData();

    expect(data.distanceKm).toBe(Math.round((200 * 1000 + 50 * 500) / 1000)); // 225 km
    expect(data.activities).toBe(250);
    expect(data.topSport).toBe('Run');
    expect(data.elevationGain).toBe(2500); // 250 * 10m

    // Every activities request must carry the year window and per_page=200.
    const activityCalls = mocks.fetch.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/athlete/activities'));
    expect(activityCalls).toHaveLength(2);
    expect(activityCalls[0]).toContain('after=1735689600'); // 2025-01-01T00:00:00Z
    expect(activityCalls[0]).toContain('before=1767225599'); // 2025-12-31T23:59:59Z
    expect(activityCalls[0]).toContain('per_page=200');
    expect(activityCalls[1]).toContain('page=2');
  });

  it('stops immediately when the first page is empty (no activities)', async () => {
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ firstname: 'A', lastname: 'B' }))
      .mockResolvedValueOnce(jsonResponse([]));

    const data = await service.fetchData();
    expect(data.activities).toBe(0);
    expect(data.distanceKm).toBe(0);
  });

  it('treats a non-array payload as a fetch error', async () => {
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ firstname: 'A', lastname: 'B' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Rate Limit Exceeded', errors: [] }));

    await expect(service.fetchData()).rejects.toThrow();
  });

  it('builds the year window from the service year, not a hardcoded 2025', async () => {
    const other = new StravaService('user-1', 2023);
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ firstname: 'A', lastname: 'B' }))
      .mockResolvedValueOnce(jsonResponse([]));

    await other.fetchData();
    const call = String(mocks.fetch.mock.calls[1][0]);
    expect(call).toContain('after=1672531200'); // 2023-01-01T00:00:00Z
    expect(call).toContain('before=1704067199'); // 2023-12-31T23:59:59Z
  });
});