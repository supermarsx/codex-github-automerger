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

  fetchRepositories(
    owner: string,
    visibility = 'all',
    affiliation = 'owner,collaborator,organization_member'
  ): Promise<Repository[]> {
    return this.emit('fetchRepos', { owner, visibility, affiliation });
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
    protectedPatterns: string[] = [],
    allowedPatterns: string[] = []
  ): Promise<boolean> {
    return this.emit('deleteBranch', {
      owner,
      repo,
      branch,
      protectedPatterns,
      allowedPatterns
    });
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
