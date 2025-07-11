import { Repository, ActivityItem } from '@/types/dashboard';
import { socketService } from '@/services/SocketService';

export class GitHubService {
  constructor(private token: string) {}

  private emit<T>(event: string, payload: Record<string, any>): Promise<T> {
    return socketService.request<T>(event, { ...payload, token: this.token });
  }

  fetchRepositories(owner: string): Promise<Repository[]> {
    return this.emit('fetchRepos', { owner });
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
}

export const createGitHubService = (apiKey: string) => new GitHubService(apiKey);
