import { describe, it, expect, vi, beforeEach } from 'vitest';

const listAuth = vi.fn();
const listUser = vi.fn();
const listOrg = vi.fn();
const getUser = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listForAuthenticatedUser: listAuth,
        listForUser: listUser,
        listForOrg: listOrg
      },
      users: {
        getByUsername: getUser
      }
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
    listUser.mockReset();
    listOrg.mockReset();
    getUser.mockReset();
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

  it('uses listForUser when owner is a user', async () => {
    getUser.mockResolvedValue({ data: { type: 'User' } });
    listUser.mockResolvedValue({
      data: [
        {
          id: 2,
          name: 'repo',
          owner: { login: 'bob' },
          updated_at: '2020-01-02T00:00:00Z'
        }
      ]
    });
    const svc = createGitHubService('t');
    const repos = await svc.fetchRepositories({ owner: 'bob' });
    expect(listUser).toHaveBeenCalledWith({ username: 'bob', type: 'all', per_page: 100 });
    expect(repos[0]).toMatchObject({ id: '2', owner: 'bob' });
  });

  it('uses listForOrg when owner is an organization', async () => {
    getUser.mockResolvedValue({ data: { type: 'Organization' } });
    listOrg.mockResolvedValue({
      data: [
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
    expect(listOrg).toHaveBeenCalledWith({ org: 'org', type: 'all', per_page: 100 });
    expect(repos[0]).toMatchObject({ id: '3', owner: 'org' });
  });
});
