import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    channelsList: vi.fn(),
    subscriptionsList: vi.fn(),
    videosList: vi.fn(),
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

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function () {
        return { setCredentials: vi.fn() };
      }),
    },
    youtube: vi.fn().mockReturnValue({
      channels: { list: mocks.channelsList },
      subscriptions: { list: mocks.subscriptionsList },
      videos: { list: mocks.videosList },
    }),
  },
}));

import { YouTubeService } from '../youtube';

describe('YouTubeService.fetchData', () => {
  const service = new YouTubeService('user-1');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.channelsList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: { title: 'My Channel' },
            statistics: { subscriberCount: '1234', viewCount: '5678' },
          },
        ],
      },
    });
    mocks.subscriptionsList.mockResolvedValue({
      data: { items: [{ snippet: { title: 'Sub Channel' } }] },
    });
    mocks.videosList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: { title: 'Cool Video', tags: ['music', 'chill'] },
            contentDetails: { duration: 'PT1H30M' },
          },
          {
            snippet: { title: 'Other Video', tags: ['music'] },
            contentDetails: { duration: 'PT30M' },
          },
        ],
      },
    });
  });

  it('sums real video durations into watch hours and derives top category from tags', async () => {
    const data = await service.fetchData();
    expect(data).toMatchObject({
      channelName: 'My Channel',
      topVideo: 'Cool Video',
      // 1h30m + 30m = 2h, from real contentDetails durations.
      watchHours: 2,
      topCategory: 'music',
      likedVideoCount: 2,
    });
    expect(data.watchHoursNote).toContain('2 liked videos');
  });

  it('does not fabricate watch hours when there is no liked-video data', async () => {
    mocks.videosList.mockResolvedValue({ data: { items: [] } });
    const data = await service.fetchData();
    expect(data.watchHours).toBe(0);
    expect(data.topCategory).toBe('Entertainment');
  });
});