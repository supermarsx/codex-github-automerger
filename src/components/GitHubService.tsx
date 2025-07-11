import { Repository, ActivityItem } from '@/types/dashboard';
import { socketService } from '@/services/SocketService';

export class GitHubService {
  private token: string;

  constructor(apiKey: string) {
    this.token = apiKey;
  }

  async fetchRepositories(owner: string): Promise<Repository[]> {
    return socketService.fetchRepositories(this.token, owner);
  }

  async fetchPullRequests(owner: string, repo: string): Promise<any[]> {
    return socketService.fetchPullRequests(this.token, owner, repo);
  }

  async mergePullRequest(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    await socketService.mergePR(this.token, owner, repo, pullNumber);
    return true;
  }

  async closePullRequest(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    await socketService.closePR(this.token, owner, repo, pullNumber);
    return true;
  }

  async deleteBranch(owner: string, repo: string, branch: string): Promise<boolean> {
    await socketService.deleteBranch(this.token, owner, repo, branch);
    return true;
  }

  async fetchStrayBranches(owner: string, repo: string): Promise<string[]> {
    return socketService.fetchStrayBranches(this.token, owner, repo);
  }

  async fetchRecentActivity(repos: Repository[]): Promise<ActivityItem[]> {
    return socketService.fetchRecentActivity(this.token, repos);
  }

  async checkPullRequestMergeable(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    return socketService.checkPRMergeable(this.token, owner, repo, pullNumber);
  }
}

export const createGitHubService = (apiKey: string) => new GitHubService(apiKey);
