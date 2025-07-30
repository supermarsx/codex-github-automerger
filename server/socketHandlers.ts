import type { Server, Socket } from 'socket.io';
import type express from 'express';

interface ExtendedSocket extends Socket {
  subscriptions: Set<string>;
  isPaired: boolean;
  pairToken: string;
  clientId: string | null;
}
import crypto from 'crypto';
import { createGitHubService } from './github.js';
import { subscribeRepo, unsubscribeRepo, getWatcher } from './watchers.js';
import { logger } from './logger.js';
import { getClientConfig, setClientConfig } from './config.js';
import { matchesPattern } from './utils/patterns.js';

const pairedClients = new Set<string>();
const pendingPairings = new Map<string, { socket: ExtendedSocket; clientId: string | null; expiry: number }>();
const TOKEN_TTL_MS = 5 * 60 * 1000;
const PAIR_SECRET = process.env.PAIR_SECRET || 'secret';

function requirePaired(socket: ExtendedSocket, cb?: (arg0: any) => void): boolean {
  if (!socket.isPaired) {
    if (typeof cb === 'function') {
      cb({ ok: false, error: 'client not paired' });
    }
    return false;
  }
  return true;
}

function cleanupPairings(): void {
  const now = Date.now();
  for (const [token, entry] of pendingPairings) {
    if (now > entry.expiry || entry.socket.disconnected) {
      logger.debug('pairing', 'cleaning expired token', {
        token,
        clientId: entry.clientId
      });
      pendingPairings.delete(token);
    }
  }
}

export function registerSocketHandlers(io: Server, app: express.Express): void {


app.post('/pairings/:token/approve', (req, res) => {
  if ((req.query.secret || req.body.secret) !== PAIR_SECRET) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  cleanupPairings();
  const entry = pendingPairings.get(req.params.token);
  if (!entry) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  logger.debug('pairing', 'approving client', {
    token: req.params.token,
    clientId: entry.clientId
  });
  entry.socket.isPaired = true;
  entry.socket.clientId = entry.clientId;
  pairedClients.add(entry.clientId);
  entry.socket.emit('pair_result', { success: true });
  pendingPairings.delete(req.params.token);
  res.json({ ok: true });
});

app.post('/pairings/:token/deny', (req, res) => {
  if ((req.query.secret || req.body.secret) !== PAIR_SECRET) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  cleanupPairings();
  const entry = pendingPairings.get(req.params.token);
  if (!entry) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  logger.debug('pairing', 'denying client', {
    token: req.params.token,
    clientId: entry.clientId
  });
  entry.socket.emit('pair_result', { success: false });
  pendingPairings.delete(req.params.token);
  res.json({ ok: true });
});

io.on('connection', (socket: Socket) => {
  logger.debug('socket', 'client connected', { id: socket.id });
  const s = socket as ExtendedSocket;
  s.subscriptions = new Set();
  s.isPaired = false;
  s.pairToken = crypto.randomBytes(8).toString('hex');
  s.clientId = null;
  pendingPairings.set(s.pairToken, {
    socket: s,
    clientId: null,
    expiry: Date.now() + TOKEN_TTL_MS
  });
  logger.debug('pairing', 'created pairing token', {
    token: s.pairToken,
    socketId: s.id
  });

  socket.on('pair_request', ({ clientId }) => {
    logger.debug('socket', 'pair_request received', { clientId });
    cleanupPairings();
    const entry = pendingPairings.get(s.pairToken);
    if (!entry) return;
    entry.clientId = clientId;
    s.clientId = clientId;
    s.emit('pair_token', { token: s.pairToken });
  });

  socket.on('syncConfig', async (config, cb = () => {}) => {
    logger.debug('socket', 'syncConfig received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      await setClientConfig(s.clientId, config || {});
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });
  socket.on('fetchRepos', async (params, cb = () => {}) => {
    logger.debug('socket', 'fetchRepos received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const repos = await svc.fetchRepositories({
        owner: params.owner || '',
        visibility: params.visibility,
        affiliation: params.affiliation
      });
      cb({ ok: true, data: repos });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchReposByKey', async (params, cb = () => {}) => {
    logger.debug('socket', 'fetchReposByKey received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const repos = await svc.fetchRepositories({
        owner: params.owner || '',
        visibility: params.visibility,
        affiliation: params.affiliation
      });
      cb({ ok: true, data: repos });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchPullRequests', async (params, cb = () => {}) => {
    logger.debug('socket', 'fetchPullRequests received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const pulls = await svc.fetchPullRequests(params.owner, params.repo);
      cb({ ok: true, data: pulls });
    } catch (err) {
      const watcher = getWatcher(params.owner, params.repo);
      if (watcher && watcher.pullRequests.length) {
        cb({ ok: true, data: watcher.pullRequests });
      } else {
        cb({ ok: false, error: err.message });
      }
    }
  });

  socket.on('mergePR', async (params, cb = () => {}) => {
    logger.debug('socket', 'mergePR received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      await svc.mergePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('closePR', async (params, cb = () => {}) => {
    logger.debug('socket', 'closePR received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      await svc.closePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('deleteBranch', async (params, cb = () => {}) => {
    logger.debug('socket', 'deleteBranch received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    const {
      token,
      owner,
      repo,
      branch,
      protectedPatterns = [],
      allowedPatterns = []
    } = params;
    const cfg = getClientConfig(s.clientId);
    const patterns = [
      ...(cfg.protectedBranches || []),
      ...(protectedPatterns || [])
    ];
    if (patterns.some(p => matchesPattern(branch, p))) {
      logger.info('Deletion blocked for', branch, '- matches protected pattern');
      cb({ ok: false, error: 'branch protected' });
      return;
    }
    try {
      const svc = createGitHubService(token);
      await svc.deleteBranch(owner, repo, branch, allowedPatterns);
      cb({ ok: true });
    } catch (err: any) {
      logger.info('Deletion blocked for', branch, '-', err?.message);
      if (err.message === 'branch protected') {
        cb({ ok: false, error: 'branch protected' });
      } else if (err.message === 'branch not in stray list') {
        cb({ ok: false, error: 'branch not in stray list' });
      } else if (err.message === 'branch not allowed') {
        cb({ ok: false, error: 'branch not allowed' });
      } else {
        cb({ ok: false, error: err.message });
      }
    }
  });

  socket.on('fetchStrayBranches', async (params, cb = () => {}) => {
    logger.debug('socket', 'fetchStrayBranches received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const branches = await svc.fetchStrayBranches(params.owner, params.repo);
      const cfg = getClientConfig(s.clientId);
      const protectedPatterns = cfg.protectedBranches || [];
      const filtered = branches.filter(
        b => !protectedPatterns.some(p => matchesPattern(b, p))
      );
      cb({ ok: true, data: filtered });
    } catch (err) {
      const watcher = getWatcher(params.owner, params.repo);
      if (watcher && watcher.strayBranches.length) {
        const cfg = getClientConfig(s.clientId);
        const protectedPatterns = cfg.protectedBranches || [];
        const filtered = watcher.strayBranches.filter(
          b => !protectedPatterns.some(p => matchesPattern(b, p))
        );
        cb({ ok: true, data: filtered });
      } else {
        cb({ ok: false, error: err.message });
      }
    }
  });

  socket.on('fetchRecentActivity', async (params, cb = () => {}) => {
    logger.debug('socket', 'fetchRecentActivity received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const data = await svc.fetchRecentActivity(params.repositories);
      cb({ ok: true, data });
    } catch (err) {
      const collected = [];
      for (const r of params.repositories || []) {
        const w = getWatcher(r.owner, r.name);
        if (w && w.activityEvents.length) collected.push(...w.activityEvents);
      }
      if (collected.length) {
        collected.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        cb({ ok: true, data: collected });
      } else {
        cb({ ok: false, error: err.message });
      }
    }
  });

  socket.on('subscribeRepo', params => {
    logger.debug('socket', 'subscribeRepo received', { clientId: s.clientId });
    if (!requirePaired(s)) return;
    subscribeRepo(s, params);
    s.subscriptions.add(`${params.owner}/${params.repo}`);
  });

  socket.on('unsubscribeRepo', params => {
    logger.debug('socket', 'unsubscribeRepo received', { clientId: s.clientId });
    if (!requirePaired(s)) return;
    unsubscribeRepo(s, params);
    s.subscriptions.delete(`${params.owner}/${params.repo}`);
  });

  socket.on('checkPRMergeable', async (params, cb = () => {}) => {
    logger.debug('socket', 'checkPRMergeable received', { clientId: s.clientId });
    if (!requirePaired(s, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const ok = await svc.checkPullRequestMergeable(params.owner, params.repo, params.pullNumber);
      cb({ ok: true, data: ok });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('ping', data => {
    socket.emit('pong', data);
  });

  socket.on('disconnect', () => {
    logger.debug('socket', 'client disconnected', { id: socket.id, clientId: s.clientId });
    for (const key of s.subscriptions) {
      const [owner, repo] = key.split('/');
      unsubscribeRepo(s, { owner, repo });
    }
    if (s.clientId) {
      pairedClients.delete(s.clientId);
    }
    pendingPairings.delete(s.pairToken);
  });
});
}
