import { Octokit } from '@octokit/rest';
import { Repository, ApiKey, ActivityItem } from '@/types/dashboard';

export class GitHubService {
  private octokit: Octokit;

  constructor(apiKey: string) {
    this.octokit = new Octokit({
      auth: apiKey,
    });
  }

  async fetchRepositories(owner: string): Promise<Repository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        type: 'all',
        per_page: 100,
      });

      return data.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        owner: repo.owner.login,
        enabled: false,
        allowedBranches: ['codex-*'],
        allowedUsers: ['github-actions[bot]'],
        alertsEnabled: true,
        lastActivity: new Date(repo.updated_at),
        stats: {
          totalMerges: 0,
          successfulMerges: 0,
          failedMerges: 0,
          pendingMerges: 0
        },
        activities: []
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  async fetchPullRequests(owner: string, repo: string): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 100,
      });

      return data;
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      throw error;
    }
  }

  async mergePullRequest(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    try {
      await this.octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        merge_method: 'merge',
      });
      return true;
    } catch (error) {
      console.error('Error merging pull request:', error);
      return false;
    }
  }

  async deleteBranch(owner: string, repo: string, branch: string): Promise<boolean> {
    try {
      await this.octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);
      return false;
    }
  }

  async fetchRecentActivity(repositories: Repository[]): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    for (const repo of repositories) {
      try {
        const { data: events } = await this.octokit.rest.activity.listRepoEvents({
          owner: repo.owner,
          repo: repo.name,
          per_page: 10,
        });

        events.forEach(event => {
          if (event.type === 'PullRequestEvent') {
            const payload = event.payload as any;
            activities.push({
              id: event.id || Date.now().toString(),
              type: payload.action === 'closed' && payload.pull_request?.merged ? 'merge' : 'pull',
              message: `PR #${payload.pull_request?.number} ${payload.action}`,
              repo: `${repo.owner}/${repo.name}`,
              timestamp: new Date(event.created_at),
              details: payload
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching activity for ${repo.name}:`, error);
      }
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async checkPullRequestMergeable(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return data.mergeable === true && data.mergeable_state === 'clean';
    } catch (error) {
      console.error('Error checking pull request mergeability:', error);
      return false;
    }
  }
}

export const createGitHubService = (apiKey: string) => new GitHubService(apiKey);