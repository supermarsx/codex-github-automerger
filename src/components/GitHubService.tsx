import { Repository, ActivityItem } from '@/types/dashboard';
import { getSocketService } from '@/services/SocketService';

export class GitHubService {
  constructor(private token: string) {}

  private emit<T>(event: string, payload: Record<string, any>): Promise<T> {
    return getSocketService().request<T>(event, {
      ...payload,
      token: this.token
    });
  }

  async fetchRepositories(owner: string): Promise<Repository[]> {
    try {
      const res = await this.emit<Repository[]>('fetchRepos', { owner });
      if (res) return res;
    } catch {
      // fall back to direct GitHub API below
    }

    const headers: Record<string, string> = {
      Authorization: `token ${this.token}`,
      'User-Agent': 'Automerger-App'
    };
    const url = owner
      ? `https://api.github.com/users/${owner}/repos?per_page=100`
      : 'https://api.github.com/user/repos?per_page=100';
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    const data = await response.json();
    return data.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      owner: repo.owner.login,
      enabled: false,
      autoMergeOnClean: true,
      autoMergeOnUnstable: false,
      watchEnabled: false,
      autoDeleteOnDirty: false,
      autoCloseBranch: false,
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
    })) as Repository[];
  }

  fetchPullRequests(owner: string, repo: string): Promise<any[]> {
    return this.emit('fetchPullRequests', { owner, repo });
  }

  mergePullRequest(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    return this.emit('mergePR', { owner, repo, pullNumber });
  }

  closePullRequest(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    return this.emit('closePR', { owner, repo, pullNumber });
  }

  deleteBranch(
    owner: string,
    repo: string,
    branch: string,
    protectedPatterns: string[] = []
  ): Promise<boolean> {
    return this.emit('deleteBranch', { owner, repo, branch, protectedPatterns });
  }

  fetchStrayBranches(owner: string, repo: string): Promise<string[]> {
    return this.emit('fetchStrayBranches', { owner, repo });
  }

  fetchRecentActivity(repos: Repository[]): Promise<ActivityItem[]> {
    return this.emit('fetchRecentActivity', { repositories: repos });
  }

  checkPullRequestMergeable(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    return this.emit('checkPRMergeable', { owner, repo, pullNumber });
  }

  subscribeRepo(owner: string, repo: string, interval?: number, config: Record<string, any> = {}): Promise<void> {
    return this.emit('subscribeRepo', { owner, repo, interval, config });
  }

  unsubscribeRepo(owner: string, repo: string): Promise<void> {
    return this.emit('unsubscribeRepo', { owner, repo });
  }
}

export const createGitHubService = (apiKey: string) => new GitHubService(apiKey);
