import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __test, subscribeRepo, getWatcher, unsubscribeRepo } from '../watchers.ts';

let eventsMock: any;
let alertsMock: any;
let createGitHubServiceMock: any;

vi.mock('../github.ts', () => ({
  createGitHubService: (...args: any[]) => createGitHubServiceMock(...args),
  RateLimitError: class {}
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
      interval: 1000,
      baseInterval: 1000,
      timer: null,
      isPolling: false,
      failureCount: 0,
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

  it('skips concurrent polls', async () => {
    let resolveEvents: (v: any) => void;
    eventsMock.mockReturnValue(new Promise(r => { resolveEvents = r; }));
    alertsMock.mockResolvedValue({ data: [] });

    const first = __test.pollRepo(watcher);
    await Promise.resolve();
    expect(eventsMock).toHaveBeenCalledTimes(1);

    await __test.pollRepo(watcher);
    expect(eventsMock).toHaveBeenCalledTimes(1);

    resolveEvents({ data: [] });
    await first;

    eventsMock.mockResolvedValue({ data: [] });
    await __test.pollRepo(watcher);
    expect(eventsMock).toHaveBeenCalledTimes(2);
  });

  it('fetches alerts in parallel with events', async () => {
    let resolveEvents: (v: any) => void;
    eventsMock.mockReturnValue(new Promise(r => { resolveEvents = r; }));
    alertsMock.mockResolvedValue({ data: [] });

    const poll = __test.pollRepo(watcher);
    await Promise.resolve();

    expect(alertsMock).toHaveBeenCalledTimes(1);

    resolveEvents({ data: [] });
    await poll;
  });

  it('evicts old alerts when limit exceeded', async () => {
    const limit = __test.ALERT_HISTORY_LIMIT;
    const alerts = Array.from({ length: limit + 1 }, (_, i) => ({
      number: i + 1,
      security_vulnerability: { severity: 'high' }
    }));
    eventsMock.mockResolvedValue({ data: [] });
    alertsMock.mockResolvedValue({ data: alerts });

    await __test.pollRepo(watcher);

    expect(watcher.alerts.size).toBe(limit);
    expect(watcher.alerts.has(1)).toBe(false);
    expect(watcher.alerts.has(limit + 1)).toBe(true);
  });

  it('backs off interval on failures and resets on success', async () => {
    eventsMock.mockRejectedValueOnce(new Error('fail'));
    alertsMock.mockResolvedValue({ data: [] });

    await __test.pollRepo(watcher);

    expect(watcher.failureCount).toBe(1);
    expect(watcher.interval).toBe(
      Math.min(1000 * __test.BACKOFF_MULTIPLIER, __test.MAX_INTERVAL)
    );

    eventsMock.mockResolvedValue({ data: [] });

    await __test.pollRepo(watcher);

    expect(watcher.failureCount).toBe(0);
    expect(watcher.interval).toBe(1000);
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
    const w = getWatcher('o', 'r')!;
    while (w.isPolling) {
      await Promise.resolve();
    }

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

  it('deep merges nested config values', async () => {
    eventsMock.mockResolvedValue({ data: [] });
    alertsMock.mockResolvedValue({ data: [] });

    subscribeRepo(socket, {
      token: 't',
      owner: 'o',
      repo: 'r',
      config: { nested: { arr: ['a'], obj: { a: 1 } } }
    });
    await Promise.resolve();
    const first = getWatcher('o', 'r')!;
    while (first.isPolling) {
      await Promise.resolve();
    }

    subscribeRepo(socket, {
      token: 't',
      owner: 'o',
      repo: 'r',
      config: { nested: { arr: ['b'], obj: { b: 2 } } }
    });
    const watcher = getWatcher('o', 'r');
    expect(watcher.config).toEqual({
      nested: { arr: ['a', 'b'], obj: { a: 1, b: 2 } }
    });
  });
});

describe('cache cleanup', () => {
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

  it('cleans expired entries when last watcher unsubscribes', async () => {
    eventsMock.mockResolvedValue({ data: [] });
    alertsMock.mockResolvedValue({ data: [] });

    subscribeRepo(socket, { token: 't', owner: 'o', repo: 'r' });
    await Promise.resolve();
    const w = getWatcher('o', 'r')!;
    while (w.isPolling) {
      await Promise.resolve();
    }

    const entry = __test.repoCache.get('o/r')!;
    entry.timestamp = Date.now() - (__test.CACHE_TTL + 1000);

    unsubscribeRepo(socket, { owner: 'o', repo: 'r' });

    expect(__test.repoCache.has('o/r')).toBe(false);
  });
});
