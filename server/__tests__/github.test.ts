import { describe, it, expect, vi, beforeEach } from 'vitest';

const listAuth = vi.fn();
const getBranch = vi.fn();
const deleteRef = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listForAuthenticatedUser: listAuth,
        getBranch
      },
      git: { deleteRef }
    }
  }))
}));

import { createGitHubService, __test } from '../github.ts';

const { strayBranchCache, cleanupStrayCache, STRAY_CACHE_TTL } = __test;

describe('strayBranchCache cleanup', () => {
  it('removes entries older than TTL', () => {
    strayBranchCache.clear();
    strayBranchCache.set('o/r', { branches: ['b'], timestamp: Date.now() - STRAY_CACHE_TTL - 1000 });
    cleanupStrayCache();
    expect(strayBranchCache.size).toBe(0);
  });

  it('keeps recent entries', () => {
    strayBranchCache.clear();
    strayBranchCache.set('o/r', { branches: ['b'], timestamp: Date.now() });
    cleanupStrayCache();
    expect(strayBranchCache.size).toBe(1);
  });
});

describe('fetchRepositories', () => {
  beforeEach(() => {
    listAuth.mockReset();
  });

  it('uses authenticated user when no owner specified', async () => {
    listAuth.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'repo',
          owner: { login: 'me' },
          updated_at: '2020-01-01T00:00:00Z'
        }
      ]
    });
    const svc = createGitHubService('t');
    const repos = await svc.fetchRepositories({ visibility: 'public', affiliation: 'owner' });
    expect(listAuth).toHaveBeenCalledWith({ visibility: 'public', affiliation: 'owner', per_page: 100 });
    expect(repos[0]).toMatchObject({ id: '1', owner: 'me' });
  });

  it('filters repositories by owner when specified', async () => {
    listAuth.mockResolvedValue({
      data: [
        {
          id: 2,
          name: 'repo',
          owner: { login: 'bob' },
          updated_at: '2020-01-02T00:00:00Z'
        },
        {
          id: 3,
          name: 'repo',
          owner: { login: 'org' },
          updated_at: '2020-01-03T00:00:00Z'
        }
      ]
    });
    const svc = createGitHubService('t');
    const repos = await svc.fetchRepositories({ owner: 'org' });
    expect(listAuth).toHaveBeenCalledWith({ visibility: 'all', affiliation: 'owner,collaborator,organization_member', per_page: 100 });
    expect(repos).toHaveLength(1);
    expect(repos[0]).toMatchObject({ id: '3', owner: 'org' });
  });
});

describe('deleteBranch', () => {
  beforeEach(() => {
    strayBranchCache.clear();
    getBranch.mockReset();
    deleteRef.mockReset();
  });

  it('throws branch not found on 404', async () => {
    strayBranchCache.set('o/r', { branches: ['b'], timestamp: Date.now() });
    getBranch.mockRejectedValue({ status: 404 });
    const svc = createGitHubService('t');
    await expect(svc.deleteBranch('o', 'r', 'b')).rejects.toThrow('branch not found');
    expect(deleteRef).not.toHaveBeenCalled();
  });
});
