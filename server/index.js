import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createGitHubService } from './github.js';
import { subscribeRepo, unsubscribeRepo } from './watchers.js';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

io.on('connection', socket => {
  socket.subscriptions = new Set();
  socket.on('fetchRepos', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      const repos = await svc.fetchRepositories(params.owner || '');
      cb({ ok: true, data: repos });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchPullRequests', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      const pulls = await svc.fetchPullRequests(params.owner, params.repo);
      cb({ ok: true, data: pulls });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('mergePR', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      await svc.mergePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('closePR', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      await svc.closePullRequest(params.owner, params.repo, params.pullNumber);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('deleteBranch', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      await svc.deleteBranch(params.owner, params.repo, params.branch);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchStrayBranches', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      const branches = await svc.fetchStrayBranches(params.owner, params.repo);
      cb({ ok: true, data: branches });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('fetchRecentActivity', async (params, cb = () => {}) => {
    try {
      const svc = createGitHubService(params.token);
      const data = await svc.fetchRecentActivity(params.repositories);
      cb({ ok: true, data });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('subscribeRepo', params => {
    subscribeRepo(socket, params);
    socket.subscriptions.add(`${params.owner}/${params.repo}`);
  });

  socket.on('unsubscribeRepo', params => {
    unsubscribeRepo(socket, params);
    socket.subscriptions.delete(`${params.owner}/${params.repo}`);
  });

  socket.on('checkPRMergeable', async (params, cb = () => {}) => {
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
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
