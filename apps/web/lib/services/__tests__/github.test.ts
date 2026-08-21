import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    request: vi.fn(),
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

vi.mock('@octokit/core', () => ({
  Octokit: vi.fn().mockImplementation(function () {
    return { request: mocks.request };
  }),
}));

import { GitHubService } from '../github';

describe('GitHubService.fetchData', () => {
  const service = new GitHubService('user-1', 2025);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.request
      .mockResolvedValueOnce({ data: { login: 'octocat' } }) // GET /user
      .mockResolvedValueOnce({
        data: [
          { name: 'repo-a', stargazers_count: 5, language: 'TypeScript' },
          { name: 'repo-b', stargazers_count: 3, language: 'TypeScript' },
          { name: 'repo-c', stargazers_count: 0, language: 'Rust' },
        ],
      }) // GET /user/repos
      .mockResolvedValueOnce({ data: { total_count: 321 } }); // GET /search/commits
  });

  it('queries commits for the exact wrap year (not a hardcoded one)', async () => {
    const data = await service.fetchData();
    expect(data).toMatchObject({
      username: 'octocat',
      commits: 321,
      topRepo: 'repo-a',
      languages: ['TypeScript', 'Rust'],
      totalStars: 8,
    });

    const searchCall = mocks.request.mock.calls.find(([path]) => path === 'GET /search/commits');
    expect(searchCall).toBeTruthy();
    expect(searchCall![1].q).toContain('committer-date:2025-01-01..2025-12-31');
  });
});