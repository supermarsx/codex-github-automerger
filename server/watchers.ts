import type { Socket } from 'socket.io';
import { createGitHubService, RateLimitError } from './github.js';
import { WebhookService } from './webhooks.js';
import { logger } from './logger.js';
import { matchesPattern } from './shared/matchesPattern.js';

const DEFAULT_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
const MAX_INTERVAL = parseInt(process.env.POLL_MAX_INTERVAL_MS || '300000', 10);
const BACKOFF_MULTIPLIER = parseFloat(process.env.POLL_BACKOFF_MULTIPLIER || '2');
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);
const ALERT_HISTORY_LIMIT = parseInt(process.env.ALERT_HISTORY_LIMIT || '100', 10);

export interface WatcherConfig {
  protectedBranches?: string[];
  allowedUsers?: string[];
  minAlertSeverity?: 'low' | 'medium' | 'high' | 'critical';
  [key: string]: any;
}

export interface Watcher {
  token: string;
  owner: string;
  repo: string;
  sockets: Set<Socket>;
  lastEvent: string | null;
  alerts: Set<number>;
  interval: number;
  baseInterval: number;
  timer: NodeJS.Timeout | null;
  isPolling: boolean;
  pauseUntil?: number;
  failureCount: number;
  config: WatcherConfig;
  pullRequests: any[];
  strayBranches: string[];
  activityEvents: any[];
}

interface CacheEntry {
  events: { event: string; data: any }[];
  alerts: any[];
  timestamp: number;
}

const watchers = new Map<string, Watcher>();
const repoCache = new Map<string, CacheEntry>();

const CACHE_CLEANUP_INTERVAL = parseInt(
  process.env.CACHE_CLEANUP_INTERVAL_MS || '60000',
  10
);

setInterval(() => {
  if (watchers.size === 0) {
    cleanCache();
  }
}, CACHE_CLEANUP_INTERVAL);

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of repoCache) {
    if (now - entry.timestamp > CACHE_TTL) repoCache.delete(key);
  }
}

export function subscribeRepo(
  socket: Socket,
  {
    token,
    owner,
    repo,
    interval,
    config = {}
  }: {
    token: string;
    owner: string;
    repo: string;
    interval?: number;
    config?: WatcherConfig;
  }
) {
  const key = `${owner}/${repo}`;
  let watcher = watchers.get(key);
  let isNew = false;
  if (!watcher) {
    watcher = {
      token,
      owner,
      repo,
      sockets: new Set(),
      lastEvent: null,
      alerts: new Set(),
      interval: interval || DEFAULT_INTERVAL,
      baseInterval: interval || DEFAULT_INTERVAL,
      timer: null,
      isPolling: false,
      pauseUntil: 0,
      failureCount: 0,
      config: { ...config },
      pullRequests: [],
      strayBranches: [],
      activityEvents: []
    };
    watchers.set(key, watcher);
    isNew = true;
  } else {
    watcher.token = token;
    watcher.config = { ...watcher.config, ...config };
    if (interval && interval !== watcher.baseInterval) {
      clearInterval(watcher.timer);
      watcher.interval = interval;
      watcher.baseInterval = interval;
      watcher.failureCount = 0;
      watcher.timer = setInterval(() => {
        if (!watcher.isPolling) pollRepo(watcher);
      }, watcher.interval);
    }
    pollRepo(watcher);
  }
  watcher.sockets.add(socket);
  if (isNew) {
    pollRepo(watcher);
    watcher.timer = setInterval(() => {
      if (!watcher.isPolling) pollRepo(watcher);
    }, watcher.interval);
  }
  const cache = repoCache.get(key) || { events: [], alerts: [] };
  socket.emit('repoCache', {
    repo: key,
    pullRequests: watcher.pullRequests,
    strayBranches: watcher.strayBranches,
    activityEvents: watcher.activityEvents,
    events: cache.events,
    alerts: cache.alerts
  });
}

export function unsubscribeRepo(
  socket: Socket,
  { owner, repo }: { owner: string; repo: string }
) {
  const key = `${owner}/${repo}`;
  const watcher = watchers.get(key);
  if (!watcher) return;
  watcher.sockets.delete(socket);
  if (watcher.sockets.size === 0) {
    clearInterval(watcher.timer);
    watchers.delete(key);
    cleanCache();
  }
}

async function pollRepo(watcher: Watcher): Promise<void> {
  if (watcher.isPolling) return;
  if (watcher.pauseUntil && Date.now() < watcher.pauseUntil) return;
  watcher.pauseUntil = 0;
  watcher.isPolling = true;
  const { token, owner, repo } = watcher;
  cleanCache();
  const svc = createGitHubService(token);
  const repoKey = `${owner}/${repo}`;
  let cacheEntry = repoCache.get(repoKey);
  if (!cacheEntry) {
    cacheEntry = { events: [], alerts: [], timestamp: 0 };
    repoCache.set(repoKey, cacheEntry);
  }
  try {
    const { data: events } = await svc.octokit.rest.activity.listRepoEvents({ owner, repo, per_page: 10 });
    for (const event of events.reverse()) {
      if (watcher.lastEvent && BigInt(event.id) <= BigInt(watcher.lastEvent)) continue;
      watcher.lastEvent = event.id;
      handleEvent(watcher, event);
    }
    const { data: alerts } = await svc.octokit.rest.dependabot.listAlertsForRepo({ owner, repo, state: 'open', per_page: 10 });
    const { minAlertSeverity } = watcher.config || {};
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    for (const alert of alerts) {
      if (
        minAlertSeverity &&
        order[alert.security_vulnerability.severity || 'low'] < order[minAlertSeverity]
      ) {
        continue;
      }
      if (!watcher.alerts.has(alert.number)) {
        watcher.alerts.add(alert.number);
        while (watcher.alerts.size > ALERT_HISTORY_LIMIT) {
          const oldest = watcher.alerts.values().next().value;
          watcher.alerts.delete(oldest);
        }
        broadcast(watcher, 'security.alert', alert);
      }
    }

    // store additional repo state for caching
    try {
      watcher.pullRequests = await svc.fetchPullRequests(owner, repo);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      // ignore pull request errors
    }
    try {
      watcher.strayBranches = await svc.fetchStrayBranches(owner, repo);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      // ignore stray branch errors
    }
    try {
      watcher.activityEvents = await svc.fetchRecentActivity([{ owner, name: repo }]);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      // ignore activity fetch errors
    }
    cacheEntry.timestamp = Date.now();
    if (watcher.failureCount > 0 || watcher.interval !== watcher.baseInterval) {
      watcher.failureCount = 0;
      if (watcher.interval !== watcher.baseInterval) {
        watcher.interval = watcher.baseInterval;
        if (watcher.timer) {
          clearInterval(watcher.timer);
          watcher.timer = setInterval(() => {
            if (!watcher.isPolling) pollRepo(watcher);
          }, watcher.interval);
        }
      }
    }
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      const wait = err.reset - Date.now();
      watcher.pauseUntil = err.reset;
      logger.warn(
        `Rate limit reached for ${repoKey}, retrying in ${Math.ceil(Math.max(wait, 0) / 1000)}s`
      );
      if (wait > 0) setTimeout(() => pollRepo(watcher), wait);
    } else {
      logger.error('Polling error for', repoKey, err?.message);
      serveCache(watcher, cacheEntry);
    }
    watcher.failureCount++;
    const newInterval = Math.min(
      Math.ceil(watcher.interval * BACKOFF_MULTIPLIER),
      MAX_INTERVAL
    );
    if (newInterval !== watcher.interval) {
      watcher.interval = newInterval;
      if (watcher.timer) {
        clearInterval(watcher.timer);
        watcher.timer = setInterval(() => {
          if (!watcher.isPolling) pollRepo(watcher);
        }, watcher.interval);
      }
      logger.warn(
        `Polling interval increased to ${watcher.interval}ms for ${repoKey} after ${watcher.failureCount} failures`
      );
    }
  } finally {
    watcher.isPolling = false;
  }
}

function branchProtected(branch: string, patterns: string[] = []): boolean {
  return patterns.some(p => matchesPattern(branch, p));
}

function handleEvent(watcher: Watcher, event: any): void {
  const payload = event.payload;
  if (event.type === 'PullRequestEvent') {
    const { protectedBranches = [], allowedUsers = [] } = watcher.config || {};
    const pr = payload.pull_request;
    if (pr && pr.base && pr.head) {
      if (
        branchProtected(pr.base.ref, protectedBranches) ||
        branchProtected(pr.head.ref, protectedBranches)
      ) {
        return;
      }
    }
    if (allowedUsers.length && pr && !allowedUsers.includes(pr.user.login)) return;

    if (payload.action === 'opened') broadcast(watcher, 'pull_request.opened', pr);
    else if (payload.action === 'closed') {
      if (pr.merged) broadcast(watcher, 'pull_request.merged', pr);
      else broadcast(watcher, 'pull_request.closed', pr);
    }
  }
}

function broadcast(watcher: Watcher, event: string, data: any): void {
  const repo = `${watcher.owner}/${watcher.repo}`;
  watcher.sockets.forEach(s => s.emit('repoUpdate', { event, repo, data }));
  WebhookService.triggerWebhooks(event, repo, data);

  const cache = repoCache.get(repo) || { events: [], alerts: [], timestamp: Date.now() };
  if (event === 'security.alert') {
    cache.alerts.push(data);
    if (cache.alerts.length > 10) cache.alerts.shift();
  } else {
    cache.events.push({ event, data });
    if (cache.events.length > 10) cache.events.shift();
  }
  cache.timestamp = Date.now();
  repoCache.set(repo, cache);
}

function serveCache(watcher: Watcher, entry: CacheEntry | undefined): void {
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return;
  const repo = `${watcher.owner}/${watcher.repo}`;
  for (const e of entry.events) {
    watcher.sockets.forEach(s => s.emit('repoUpdate', { event: e.event, repo, data: e.data }));
  }
  for (const alert of entry.alerts) {
    watcher.sockets.forEach(s => s.emit('repoUpdate', { event: 'security.alert', repo, data: alert }));
  }
}

export function getWatcher(owner: string, repo: string): Watcher | undefined {
  return watchers.get(`${owner}/${repo}`);
}

export const __test = {
  repoCache,
  pollRepo,
  ALERT_HISTORY_LIMIT,
  cleanCache,
  CACHE_TTL,
  CACHE_CLEANUP_INTERVAL,
  MAX_INTERVAL,
  BACKOFF_MULTIPLIER
};
