import { Octokit } from '@octokit/core';
import { BaseService } from './base';

export class GitHubService extends BaseService {
  constructor(userId: string) {
    super(userId, 'github');
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();
      const octokit = new Octokit({ auth: accessToken });

      // 1. Get User Info
      const { data: user } = await octokit.request('GET /user');

      // 2. Get Repositories
      const { data: repos } = await octokit.request('GET /user/repos', {
        sort: 'updated',
        per_page: 100,
      });

      // 3. Get Real Commit Count for 2025
      const { data: commitSearch } = await octokit.request('GET /search/commits', {
        q: `author:${user.login} committer-date:2025-01-01..2025-12-31`,
      });

      let totalStars = 0;
      const topRepo = repos[0]?.name || 'No Repos';
      const languages = new Set<string>();

      repos.forEach((repo: { stargazers_count?: number; language?: string | null }) => {
        totalStars += repo.stargazers_count || 0;
        if (repo.language) languages.add(repo.language);
      });

      return {
        username: user.login,
        commits: commitSearch.total_count || 0,
        topRepo: topRepo,
        languages: Array.from(languages).slice(0, 3),
        totalStars,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
