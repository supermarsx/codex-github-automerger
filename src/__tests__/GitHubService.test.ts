import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/SocketService', () => ({
  socketService: {
    request: vi.fn()
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
  it('emits fetchPullRequests event', async () => {
    (socketService.request as any).mockResolvedValue(['pr']);
    const res = await service.fetchPullRequests('o', 'r');
    expect(socketService.request).toHaveBeenCalledWith('fetchPullRequests', {
      token: 'token',
      owner: 'o',
      repo: 'r'
    });
    expect(res).toEqual(['pr']);
  });

  it('emits fetchRepos event', async () => {
    (socketService.request as any).mockResolvedValue(['repo']);
    const res = await service.fetchRepositories('o');
    expect(socketService.request).toHaveBeenCalledWith('fetchRepos', {
      token: 'token',
      owner: 'o'
    });
    expect(res).toEqual(['repo']);
  });
});
