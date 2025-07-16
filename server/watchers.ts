// @ts-nocheck
import { createGitHubService } from './github.js';
import { WebhookService } from './webhooks.js';
import { logger } from './logger.js';

const DEFAULT_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);

const watchers = new Map();
const repoCache = new Map();

function matchesPattern(value, pattern) {
  const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
  return regex.test(value);
}

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of repoCache) {
    if (now - entry.timestamp > CACHE_TTL) repoCache.delete(key);
  }
}

export function subscribeRepo(socket, { token, owner, repo, interval, config = {} }) {
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
      timer: null,
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
    if (interval && interval !== watcher.interval) {
      clearInterval(watcher.timer);
      watcher.interval = interval;
      watcher.timer = setInterval(() => pollRepo(watcher), watcher.interval);
    }
    pollRepo(watcher);
  }
  watcher.sockets.add(socket);
  if (isNew) {
    pollRepo(watcher);
    watcher.timer = setInterval(() => pollRepo(watcher), watcher.interval);
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

export function unsubscribeRepo(socket, { owner, repo }) {
  const key = `${owner}/${repo}`;
  const watcher = watchers.get(key);
  if (!watcher) return;
  watcher.sockets.delete(socket);
  if (watcher.sockets.size === 0) {
    clearInterval(watcher.timer);
    watchers.delete(key);
  }
}

async function pollRepo(watcher) {
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
        broadcast(watcher, 'security.alert', alert);
      }
    }

    // store additional repo state for caching
    try {
      watcher.pullRequests = await svc.fetchPullRequests(owner, repo);
    } catch (err) {
      // ignore pull request errors
    }
    try {
      watcher.strayBranches = await svc.fetchStrayBranches(owner, repo);
    } catch (err) {
      // ignore stray branch errors
    }
    try {
      watcher.activityEvents = await svc.fetchRecentActivity([{ owner, name: repo }]);
    } catch (err) {
      // ignore activity fetch errors
    }
    cacheEntry.timestamp = Date.now();
  } catch (err: any) {
    logger.error('Polling error for', repoKey, err?.message);
    serveCache(watcher, cacheEntry);
  }
}

function branchProtected(branch, patterns = []) {
  return patterns.some(p => matchesPattern(branch, p));
}

function handleEvent(watcher, event) {
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

function broadcast(watcher, event, data) {
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

function serveCache(watcher, entry) {
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return;
  const repo = `${watcher.owner}/${watcher.repo}`;
  for (const e of entry.events) {
    watcher.sockets.forEach(s => s.emit('repoUpdate', { event: e.event, repo, data: e.data }));
  }
  for (const alert of entry.alerts) {
    watcher.sockets.forEach(s => s.emit('repoUpdate', { event: 'security.alert', repo, data: alert }));
  }
}

export function getWatcher(owner, repo) {
  return watchers.get(`${owner}/${repo}`);
}

export const __test = { repoCache, pollRepo };
