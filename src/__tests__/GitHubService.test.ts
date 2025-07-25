
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSocket = { request: vi.fn() };
vi.mock('../services/SocketService', () => {
  return {
    getSocketService: () => mockSocket
  };
});

const requestMock = vi.fn();
vi.mock('@/services/SocketService', () => {
  return {
    getSocketService: () => ({
      request: requestMock
    })
  };
});

import { getSocketService } from '@/services/SocketService';
import { GitHubService } from '../components/GitHubService';

let service: GitHubService;
let socketService: any;

beforeEach(() => {
  vi.clearAllMocks();
  service = new GitHubService('token');
  socketService = getSocketService();
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

  it('emits fetchReposByKey event', async () => {
    (socketService.request as any).mockResolvedValue(['repo']);
    const res = await service.fetchRepositoriesByKey('o');
    expect(socketService.request).toHaveBeenCalledWith('fetchReposByKey', {
      token: 'token',
      owner: 'o'
    });
    expect(res).toEqual(['repo']);
  });
});
