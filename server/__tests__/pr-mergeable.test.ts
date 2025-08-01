import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const pullGet = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      pulls: { get: pullGet }
    }
  }))
}));

let svc: any;

async function loadModule() {
  const mod = await import('../github.ts');
  svc = mod.createGitHubService('t');
}

beforeEach(async () => {
  pullGet.mockReset();
  process.env.MERGEABLE_TIMEOUT_MS = '50';
  process.env.MERGEABLE_POLL_INTERVAL_MS = '10';
  vi.resetModules();
  await loadModule();
});

afterEach(() => {
  vi.resetModules();
  delete process.env.MERGEABLE_TIMEOUT_MS;
  delete process.env.MERGEABLE_POLL_INTERVAL_MS;
});

describe('checkPullRequestMergeable', () => {
  it('polls until mergeable becomes true', async () => {
    pullGet.mockResolvedValueOnce({ data: { mergeable: null } });
    pullGet.mockResolvedValueOnce({ data: { mergeable: true, mergeable_state: 'clean' } });

    const result = await svc.checkPullRequestMergeable('o', 'r', 1);
    expect(result).toBe(true);
    expect(pullGet).toHaveBeenCalledTimes(2);
  });
});
