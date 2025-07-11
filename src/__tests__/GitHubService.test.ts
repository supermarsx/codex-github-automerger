import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/SocketService', () => ({
  socketService: {
    fetchPullRequests: vi.fn(),
    fetchRepositories: vi.fn(),
    fetchRecentActivity: vi.fn(),
    fetchStrayBranches: vi.fn(),
    checkPRMergeable: vi.fn()
  }
}));

import { socketService } from '../services/SocketService';
import { GitHubService } from '../components/GitHubService';

let service: GitHubService;

beforeEach(() => {
  service = new GitHubService('token');
  vi.clearAllMocks();
});

describe('GitHubService', () => {
  it('delegates fetchPullRequests', async () => {
    (socketService.fetchPullRequests as any).mockResolvedValue(['pr']);
    const res = await service.fetchPullRequests('o', 'r');
    expect(socketService.fetchPullRequests).toHaveBeenCalledWith('token', 'o', 'r');
    expect(res).toEqual(['pr']);
  });

  it('delegates fetchRepositories', async () => {
    (socketService.fetchRepositories as any).mockResolvedValue(['repo']);
    const res = await service.fetchRepositories('o');
    expect(socketService.fetchRepositories).toHaveBeenCalledWith('token', 'o');
    expect(res).toEqual(['repo']);
  });
});
