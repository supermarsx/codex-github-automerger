import { describe, it, expect, vi, beforeEach } from 'vitest';

class OctokitMock {
  paginate = vi.fn();
  rest = {
    pulls: {
      list: vi.fn(),
      get: vi.fn(),
    },
    activity: {
      listRepoEvents: vi.fn(),
    },
    repos: {
      listBranches: vi.fn(),
    },
  };
}

let octokitInstance: OctokitMock;
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => {
    octokitInstance = new OctokitMock();
    return octokitInstance;
  }),
}));

import { GitHubService } from '../components/GitHubService';

let service: GitHubService;

beforeEach(() => {
  service = new GitHubService('token');
  // @ts-ignore access mock instance assigned in factory
  service.octokit = octokitInstance;
});

describe('fetchPullRequests', () => {
  it('requests pull list and details', async () => {
    octokitInstance.rest.pulls.list.mockResolvedValue({ data: [{ number: 1 }] });
    octokitInstance.rest.pulls.get.mockResolvedValue({ data: { mergeable: true, mergeable_state: 'clean' } });

    const prs = await service.fetchPullRequests('o', 'r');

    expect(octokitInstance.rest.pulls.list).toHaveBeenCalledWith({ owner: 'o', repo: 'r', state: 'open', per_page: 10 });
    expect(octokitInstance.rest.pulls.get).toHaveBeenCalledWith({ owner: 'o', repo: 'r', pull_number: 1 });
    expect(prs[0]).toMatchObject({ number: 1, mergeable: true, mergeable_state: 'clean' });
  });
});

describe('fetchRecentActivity', () => {
  it('requests repository events', async () => {
    const event = { id: '1', type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 2, merged: false } }, created_at: '2024-01-01T00:00:00Z' };
    octokitInstance.rest.activity.listRepoEvents.mockResolvedValue({ data: [event] });

    const activities = await service.fetchRecentActivity([{ owner: 'o', name: 'r' } as any]);

    expect(octokitInstance.rest.activity.listRepoEvents).toHaveBeenCalledWith({ owner: 'o', repo: 'r', per_page: 10 });
    expect(activities[0]).toMatchObject({ message: 'PR #2 opened', repo: 'o/r' });
  });
});

describe('fetchStrayBranches', () => {
  it('lists branches without open PRs', async () => {
    octokitInstance.rest.repos.listBranches.mockResolvedValue({ data: [
      { name: 'feature-1', protected: false },
      { name: 'main', protected: true }
    ]});
    octokitInstance.rest.pulls.list.mockResolvedValue({ data: [ { head: { ref: 'feature-2' } } ]});

    const branches = await service.fetchStrayBranches('o', 'r');

    expect(octokitInstance.rest.repos.listBranches).toHaveBeenCalledWith({ owner: 'o', repo: 'r', per_page: 100 });
    expect(octokitInstance.rest.pulls.list).toHaveBeenCalledWith({ owner: 'o', repo: 'r', state: 'open', per_page: 100 });
    expect(branches).toEqual(['feature-1']);
  });
});
