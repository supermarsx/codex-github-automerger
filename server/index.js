import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import { createGitHubService } from './github.js';
import { subscribeRepo, unsubscribeRepo, getWatcher } from './watchers.js';

const app = express();
app.use(express.json());
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

const pairedClients = new Set();
const pendingPairings = new Map(); // token -> { socket, clientId, expiry }
const TOKEN_TTL_MS = 5 * 60 * 1000;
const PAIR_SECRET = process.env.PAIR_SECRET || 'secret';

function requirePaired(socket, cb) {
  if (!socket.isPaired) {
    if (typeof cb === 'function') {
      cb({ ok: false, error: 'client not paired' });
    }
    return false;
  }
  return true;
}

function matchesPattern(value, pattern) {
  const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
  return regex.test(value);
}

function cleanupPairings() {
  const now = Date.now();
  for (const [token, entry] of pendingPairings) {
    if (now > entry.expiry || entry.socket.disconnected) {
      pendingPairings.delete(token);
    }
  }
}

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
  entry.socket.emit('pair_result', { success: false });
  pendingPairings.delete(req.params.token);
  res.json({ ok: true });
});

io.on('connection', socket => {
  socket.subscriptions = new Set();
  socket.isPaired = false;
  socket.pairToken = crypto.randomBytes(8).toString('hex');
  socket.clientId = null;
  pendingPairings.set(socket.pairToken, {
    socket,
    clientId: null,
    expiry: Date.now() + TOKEN_TTL_MS
  });

  socket.on('pair_request', ({ clientId }) => {
    cleanupPairings();
    const entry = pendingPairings.get(socket.pairToken);
    if (!entry) return;
    entry.clientId = clientId;
    socket.clientId = clientId;
    socket.emit('pair_token', { token: socket.pairToken });
  });
  socket.on('fetchRepos', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const repos = await svc.fetchRepositories(params.owner || '');
      cb({ ok: true, data: repos });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchPullRequests', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
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
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      await svc.mergePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('closePR', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      await svc.closePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('deleteBranch', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    const {
      token,
      owner,
      repo,
      branch,
      protectedPatterns = [],
      allowedPatterns = []
    } = params;
    if (protectedPatterns.some(p => matchesPattern(branch, p))) {
      console.log('Deletion blocked for', branch, '- matches protected pattern');
      cb({ ok: false, error: 'branch protected' });
      return;
    }
    try {
      const svc = createGitHubService(token);
      await svc.deleteBranch(owner, repo, branch, allowedPatterns);
      cb({ ok: true });
    } catch (err) {
      console.log('Deletion blocked for', branch, '-', err.message);
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
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const branches = await svc.fetchStrayBranches(params.owner, params.repo);
      cb({ ok: true, data: branches });
    } catch (err) {
      const watcher = getWatcher(params.owner, params.repo);
      if (watcher && watcher.strayBranches.length) {
        cb({ ok: true, data: watcher.strayBranches });
      } else {
        cb({ ok: false, error: err.message });
      }
    }
  });

  socket.on('fetchRecentActivity', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
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
    if (!requirePaired(socket)) return;
    subscribeRepo(socket, params);
    socket.subscriptions.add(`${params.owner}/${params.repo}`);
  });

  socket.on('unsubscribeRepo', params => {
    if (!requirePaired(socket)) return;
    unsubscribeRepo(socket, params);
    socket.subscriptions.delete(`${params.owner}/${params.repo}`);
  });

  socket.on('checkPRMergeable', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const ok = await svc.checkPullRequestMergeable(params.owner, params.repo, params.pullNumber);
      cb({ ok: true, data: ok });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    for (const key of socket.subscriptions) {
      const [owner, repo] = key.split('/');
      unsubscribeRepo(socket, { owner, repo });
    }
    if (socket.clientId) {
      pairedClients.delete(socket.clientId);
    }
    pendingPairings.delete(socket.pairToken);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
