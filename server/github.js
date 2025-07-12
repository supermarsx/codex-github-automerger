import { Octokit } from '@octokit/rest';

const strayBranchCache = new Map();

export function createGitHubService(token) {
  const octokit = new Octokit({ auth: token });

  return {
    octokit,
    async fetchRepositories(owner) {
      let data;
      if (owner) {
        const res = await octokit.rest.repos.listForUser({ username: owner, per_page: 100 });
        data = res.data;
      } else {
        const res = await octokit.rest.repos.listForAuthenticatedUser({ type: 'all', per_page: 100 });
        data = res.data;
      }
      return data.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        owner: repo.owner.login,
        enabled: false,
        allowedBranches: ['codex-*'],
        allowedUsers: ['github-actions[bot]'],
        alertsEnabled: true,
        lastActivity: new Date(repo.updated_at),
        stats: {
          totalMerges: 0,
          successfulMerges: 0,
          failedMerges: 0,
          pendingMerges: 0
        },
        activities: []
      }));
    },

    async fetchPullRequests(owner, repo) {
      const { data: pulls } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 10 });
      const detailed = await Promise.all(
        pulls.map(async pr => {
          try {
            const { data: details } = await octokit.rest.pulls.get({ owner, repo, pull_number: pr.number });
            return { ...pr, mergeable: details.mergeable, mergeable_state: details.mergeable_state };
          } catch {
            return pr;
          }
        })
      );
      return detailed;
    },

    async mergePullRequest(owner, repo, pullNumber) {
      await octokit.rest.pulls.merge({ owner, repo, pull_number: pullNumber, merge_method: 'merge' });
      return true;
    },

    async closePullRequest(owner, repo, pullNumber) {
      await octokit.rest.pulls.update({ owner, repo, pull_number: pullNumber, state: 'closed' });
      return true;
    },

    async isBranchProtected(owner, repo, branch) {
      try {
        const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
        return !!data.protected;
      } catch (err) {
        if (err.status === 404) return false;
        throw err;
      }
    },

    async deleteBranch(owner, repo, branch, allowedPatterns = []) {
      const matchesPattern = (value, pattern) => {
        const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
        return regex.test(value);
      };

      const key = `${owner}/${repo}`;
      const cached = strayBranchCache.get(key) || [];
      if (!cached.includes(branch)) {
        throw new Error('branch not in stray list');
      }
      if (
        allowedPatterns.length &&
        !allowedPatterns.some(p => matchesPattern(branch, p))
      ) {
        throw new Error('branch not allowed');
      }

      const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
      if (data.protected) {
        throw new Error('branch protected');
      }

      await octokit.rest.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
      strayBranchCache.set(key, cached.filter(b => b !== branch));
      return true;
    },

    async fetchStrayBranches(owner, repo) {
      const { data: branches } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
      const { data: pulls } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 });
      const activeBranches = new Set(pulls.map(pr => pr.head.ref));
      const stray = branches
        .filter(b => !b.protected && !activeBranches.has(b.name))
        .map(b => b.name);
      strayBranchCache.set(`${owner}/${repo}`, stray);
      return stray;
    },

    async fetchRecentActivity(repositories) {
      const activities = [];
      for (const repo of repositories) {
        const { data: events } = await octokit.rest.activity.listRepoEvents({ owner: repo.owner, repo: repo.name, per_page: 10 });
        events.forEach(event => {
          if (event.type === 'PullRequestEvent') {
            const payload = event.payload;
            activities.push({
              id: event.id || Date.now().toString(),
              type: payload.action === 'closed' && payload.pull_request?.merged ? 'merge' : 'pull',
              message: `PR #${payload.pull_request?.number} ${payload.action}`,
              repo: `${repo.owner}/${repo.name}`,
              timestamp: new Date(event.created_at),
              details: payload
            });
          }
        });
      }
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },

    async checkPullRequestMergeable(owner, repo, pullNumber) {
      const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
      return data.mergeable === true && data.mergeable_state === 'clean';
    }
  };
}
