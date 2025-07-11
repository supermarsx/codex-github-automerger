import { describe, it, expect, vi, beforeEach } from 'vitest';
import { __test } from '../watchers.js';

let eventsMock: any;
let alertsMock: any;

vi.mock('../github.js', () => ({
  createGitHubService: () => ({
    octokit: {
      rest: {
        activity: { listRepoEvents: (...args: any[]) => eventsMock(...args) },
        dependabot: { listAlertsForRepo: (...args: any[]) => alertsMock(...args) }
      }
    }
  })
}));

describe('watchers cache', () => {
  let watcher: any;
  let emit: any;

  beforeEach(() => {
    eventsMock = vi.fn();
    alertsMock = vi.fn();
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
