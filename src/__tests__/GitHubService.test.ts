
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
      owner: 'o',
      visibility: 'all',
      affiliation: 'owner,collaborator,organization_member'
    });
    expect(res).toEqual(['repo']);
  });

  it('emits deleteBranch event with patterns', async () => {
    (socketService.request as any).mockResolvedValue({ ok: true });
    const res = await service.deleteBranch('o', 'r', 'b', ['p'], ['a']);
    expect(socketService.request).toHaveBeenCalledWith('deleteBranch', {
      token: 'token',
      owner: 'o',
      repo: 'r',
      branch: 'b',
      protectedPatterns: ['p'],
      allowedPatterns: ['a']
    });
    expect(res).toEqual({ ok: true });
  });
});
