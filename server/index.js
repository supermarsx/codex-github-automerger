import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import { createGitHubService } from './github.js';
import { subscribeRepo, unsubscribeRepo } from './watchers.js';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

const pairedClients = new Set();

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

io.on('connection', socket => {
  socket.subscriptions = new Set();
  socket.isPaired = false;
  socket.pairToken = crypto.randomBytes(8).toString('hex');
  socket.clientId = null;

  socket.emit('pair_request', { token: socket.pairToken });

  socket.on('pair_approved', ({ token, clientId }) => {
    if (token === socket.pairToken) {
      socket.isPaired = true;
      socket.clientId = clientId;
      pairedClients.add(clientId);
      socket.emit('pair_approved', { success: true });
    } else {
      socket.emit('pair_approved', { success: false, error: 'invalid token' });
    }
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
      cb({ ok: false, error: err.message });
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
    try {
      const { token, owner, repo, branch, protectedPatterns = [] } = params;
      if (protectedPatterns.some(p => matchesPattern(branch, p))) {
        cb({ ok: false, error: 'branch protected' });
        return;
      }
      const svc = createGitHubService(token);
      await svc.deleteBranch(owner, repo, branch);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchStrayBranches', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const branches = await svc.fetchStrayBranches(params.owner, params.repo);
      cb({ ok: true, data: branches });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchRecentActivity', async (params, cb = () => {}) => {
    if (!requirePaired(socket, cb)) return;
    try {
      const svc = createGitHubService(params.token);
      const data = await svc.fetchRecentActivity(params.repositories);
      cb({ ok: true, data });
    } catch (err) {
      cb({ ok: false, error: err.message });
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
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
