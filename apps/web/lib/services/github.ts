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

      // 3. Simple Commit Count (approximate for MVP)
      // Note: Real commit aggregation across all repos for a year is heavy.
      // For this prototype, we'll sum up the size/stars or just get a few stats.
      let totalStars = 0;
      let topRepo = repos[0]?.name || 'No Repos';
      let languages = new Set<string>();

      repos.forEach((repo: any) => {
        totalStars += repo.stargazers_count;
        if (repo.language) languages.add(repo.language);
      });

      // In a real implementation, you'd use the Search API for commits in 2025:
      // GET /search/commits?q=author:{username}+committer-date:2025-01-01..2025-12-31
      
      return {
        username: user.login,
        commits: Math.floor(Math.random() * 2000), // Placeholder until Search API integrated
        topRepo: topRepo,
        languages: Array.from(languages).slice(0, 3),
        totalStars,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
