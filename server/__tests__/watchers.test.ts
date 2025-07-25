import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __test, subscribeRepo, getWatcher, unsubscribeRepo } from '../watchers.ts';

let eventsMock: any;
let alertsMock: any;
let createGitHubServiceMock: any;

vi.mock('../github.ts', () => ({
  createGitHubService: (...args: any[]) => createGitHubServiceMock(...args)
}));

describe('watchers cache', () => {
  let watcher: any;
  let emit: any;

  beforeEach(() => {
    eventsMock = vi.fn();
    alertsMock = vi.fn();
    createGitHubServiceMock = vi.fn(() => ({
      octokit: {
        rest: {
          activity: { listRepoEvents: (...args: any[]) => eventsMock(...args) },
          dependabot: { listAlertsForRepo: (...args: any[]) => alertsMock(...args) }
        }
      },
      fetchPullRequests: vi.fn(async () => []),
      fetchStrayBranches: vi.fn(async () => []),
      fetchRecentActivity: vi.fn(async () => [])
    }));
    emit = vi.fn();
    watcher = {
      token: 't',
      owner: 'o',
      repo: 'r',
      sockets: new Set([{ emit }]),
      lastEvent: null,
      alerts: new Set(),
      config: {}
    };
    __test.repoCache.clear();
  });

  it('stores successful events in cache', async () => {
    const event = { id: '1', type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 1 } } };
    eventsMock.mockResolvedValue({ data: [event] });
    alertsMock.mockResolvedValue({ data: [] });

    await __test.pollRepo(watcher);

    expect(__test.repoCache.get('o/r').events.length).toBe(1);
    expect(emit).toHaveBeenCalledWith('repoUpdate', { event: 'pull_request.opened', repo: 'o/r', data: event.payload.pull_request });
  });

  it('uses cached events on fetch failure', async () => {
    const event = { id: '1', type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 1 } } };
    eventsMock.mockResolvedValue({ data: [event] });
    alertsMock.mockResolvedValue({ data: [] });

    await __test.pollRepo(watcher);
    expect(emit).toHaveBeenCalledTimes(1);
    emit.mockClear();

    eventsMock.mockRejectedValue(new Error('fail'));
    alertsMock.mockRejectedValue(new Error('fail'));

    await __test.pollRepo(watcher);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('repoUpdate', { event: 'pull_request.opened', repo: 'o/r', data: event.payload.pull_request });
  });

  it('expires cache after TTL', async () => {
    const event = { id: '1', type: 'PullRequestEvent', payload: { action: 'opened', pull_request: { number: 1 } } };
    eventsMock.mockResolvedValue({ data: [event] });
    alertsMock.mockResolvedValue({ data: [] });

    await __test.pollRepo(watcher);

    const entry = __test.repoCache.get('o/r');
    entry.timestamp = Date.now() - 301000;

    emit.mockClear();
    eventsMock.mockRejectedValue(new Error('fail'));
    alertsMock.mockRejectedValue(new Error('fail'));

    await __test.pollRepo(watcher);

    expect(emit).toHaveBeenCalledTimes(0);
  });
});

describe('subscribeRepo', () => {
  let socket: any;

  beforeEach(() => {
    socket = { emit: vi.fn() };
    eventsMock = vi.fn();
    alertsMock = vi.fn();
    createGitHubServiceMock = vi.fn(() => ({
      octokit: {
        rest: {
          activity: { listRepoEvents: (...args: any[]) => eventsMock(...args) },
          dependabot: { listAlertsForRepo: (...args: any[]) => alertsMock(...args) }
        }
      },
      fetchPullRequests: vi.fn(async () => []),
      fetchStrayBranches: vi.fn(async () => []),
      fetchRecentActivity: vi.fn(async () => [])
    }));
    __test.repoCache.clear();
  });

  afterEach(() => {
    unsubscribeRepo(socket, { owner: 'o', repo: 'r' });
  });

  it('updates token and polls immediately when watcher exists', async () => {
    eventsMock.mockResolvedValue({ data: [] });
    alertsMock.mockResolvedValue({ data: [] });

    subscribeRepo(socket, { token: 't1', owner: 'o', repo: 'r' });
    await Promise.resolve();

    expect(eventsMock).toHaveBeenCalledTimes(1);

    eventsMock.mockResolvedValue({ data: [] });
    alertsMock.mockResolvedValue({ data: [] });

    subscribeRepo(socket, { token: 't2', owner: 'o', repo: 'r' });
    await Promise.resolve();

    expect(eventsMock).toHaveBeenCalledTimes(2);
    const watcher = getWatcher('o', 'r');
    expect(watcher.token).toBe('t2');
    expect(createGitHubServiceMock).toHaveBeenLastCalledWith('t2');
  });
});
