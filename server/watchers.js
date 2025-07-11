import { createGitHubService } from './github.js';
import { WebhookService } from './webhooks.js';

const DEFAULT_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);

const watchers = new Map();

export function subscribeRepo(socket, { token, owner, repo, interval }) {
  const key = `${owner}/${repo}`;
  let watcher = watchers.get(key);
  if (!watcher) {
    watcher = {
      token,
      owner,
      repo,
      sockets: new Set(),
      lastEvent: null,
      alerts: new Set(),
      interval: interval || DEFAULT_INTERVAL,
      timer: null
    };
    watcher.timer = setInterval(() => pollRepo(watcher), watcher.interval);
    watchers.set(key, watcher);
  }
  watcher.sockets.add(socket);
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
  const svc = createGitHubService(token);
  const repoKey = `${owner}/${repo}`;
  try {
    const { data: events } = await svc.octokit.rest.activity.listRepoEvents({ owner, repo, per_page: 10 });
    for (const event of events.reverse()) {
      if (watcher.lastEvent && BigInt(event.id) <= BigInt(watcher.lastEvent)) continue;
      watcher.lastEvent = event.id;
      handleEvent(watcher, event);
    }
    const { data: alerts } = await svc.octokit.rest.dependabot.listAlertsForRepo({ owner, repo, state: 'open', per_page: 10 });
    for (const alert of alerts) {
      if (!watcher.alerts.has(alert.number)) {
        watcher.alerts.add(alert.number);
        broadcast(watcher, 'security.alert', alert);
      }
    }
  } catch (err) {
    console.error('Polling error for', repoKey, err.message);
  }
}

function handleEvent(watcher, event) {
  const payload = event.payload;
  if (event.type === 'PullRequestEvent') {
    if (payload.action === 'opened') broadcast(watcher, 'pull_request.opened', payload.pull_request);
    else if (payload.action === 'closed') {
      if (payload.pull_request.merged) broadcast(watcher, 'pull_request.merged', payload.pull_request);
      else broadcast(watcher, 'pull_request.closed', payload.pull_request);
    }
  }
}

function broadcast(watcher, event, data) {
  const repo = `${watcher.owner}/${watcher.repo}`;
  watcher.sockets.forEach(s => s.emit('repoUpdate', { event, repo, data }));
  WebhookService.triggerWebhooks(event, repo, data);
}
