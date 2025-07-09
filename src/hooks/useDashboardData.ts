import { useState } from 'react';
import { Repository, ApiKey, MergeStats, GlobalConfig, ActivityItem } from '@/types/dashboard';

export const useDashboardData = () => {
  const [repositories, setRepositories] = useState<Repository[]>([
    {
      id: '1',
      name: 'my-project',
      owner: 'username',
      enabled: true,
      allowedBranches: ['codex-feature/*', 'codex-fix/*', 'codex-update/*'],
      allowedUsers: ['github-actions[bot]', 'codex-merger'],
      alertsEnabled: true,
      lastActivity: new Date('2024-01-20'),
      recentPull: {
        number: 123,
        title: 'Add new feature',
        status: 'merged',
        timestamp: new Date('2024-01-20')
      },
      stats: {
        totalMerges: 45,
        successfulMerges: 42,
        failedMerges: 3,
        pendingMerges: 2
      },
      activities: [
        { id: '1', type: 'merge', message: 'PR #123 merged successfully', repo: 'my-project', timestamp: new Date('2024-01-20') },
        { id: '2', type: 'success', message: 'Codex branch auto-merged', repo: 'my-project', timestamp: new Date('2024-01-19') }
      ]
    },
    {
      id: '2',
      name: 'another-repo',
      owner: 'username',
      enabled: false,
      allowedBranches: ['codex-*'],
      allowedUsers: ['github-actions[bot]'],
      alertsEnabled: false,
      lastActivity: new Date('2024-01-15'),
      stats: {
        totalMerges: 12,
        successfulMerges: 10,
        failedMerges: 2,
        pendingMerges: 1
      },
      activities: [
        { id: '3', type: 'failure', message: 'PR #45 failed to merge', repo: 'another-repo', timestamp: new Date('2024-01-15') }
      ]
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production Key',
      key: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      created: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      isActive: true,
      encrypted: true
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      created: new Date('2024-01-10'),
      isActive: false,
      encrypted: false
    }
  ]);

  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    autoMergeEnabled: true,
    requireApproval: false,
    alertsEnabled: true,
    encryptionEnabled: true,
    defaultBranchPatterns: ['codex-*'],
    defaultAllowedUsers: ['github-actions[bot]'],
    alertThreshold: 30,
    maxRetries: 3,
    autoDeleteBranch: true,
    allowAllBranches: false,
    allowAllUsers: false,
    fetchMode: 'github-api'
  });

  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', type: 'merge', message: 'PR #123 merged successfully', repo: 'my-project', timestamp: new Date() },
    { id: '2', type: 'alert', message: 'Non-mergeable PR detected', repo: 'another-repo', timestamp: new Date() }
  ]);

  const mergeStats: MergeStats = {
    session: { pending: 3, merged: 12, failed: 1 },
    total: { pending: 5, merged: 67, failed: 8 }
  };

  // Repository handlers
  const toggleRepository = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, enabled: !repo.enabled } : repo
      )
    );
  };

  const addRepository = (name: string, owner: string) => {
    const newRepository: Repository = {
      id: Date.now().toString(),
      name,
      owner,
      enabled: true,
      allowedBranches: ['codex-*'],
      allowedUsers: ['github-actions[bot]'],
      alertsEnabled: true,
      stats: { totalMerges: 0, successfulMerges: 0, failedMerges: 0, pendingMerges: 0 },
      activities: []
    };
    setRepositories([...repositories, newRepository]);
  };

  const addBranch = (repoId: string, branch: string) => {
    if (branch) {
      setRepositories(repos =>
        repos.map(repo =>
          repo.id === repoId
            ? { ...repo, allowedBranches: [...repo.allowedBranches, branch] }
            : repo
        )
      );
    }
  };

  const removeBranch = (repoId: string, branchIndex: number) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedBranches: repo.allowedBranches.filter((_, i) => i !== branchIndex) }
          : repo
      )
    );
  };

  const addUser = (repoId: string, user: string) => {
    if (user) {
      setRepositories(repos =>
        repos.map(repo =>
          repo.id === repoId
            ? { ...repo, allowedUsers: [...repo.allowedUsers, user] }
            : repo
        )
      );
    }
  };

  const removeUser = (repoId: string, userIndex: number) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedUsers: repo.allowedUsers.filter((_, i) => i !== userIndex) }
          : repo
      )
    );
  };

  // API Key handlers
  const addApiKey = (name: string, key: string) => {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      key,
      created: new Date(),
      isActive: true,
      encrypted: true
    };
    setApiKeys([...apiKeys, newKey]);
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(keys =>
      keys.map(key =>
        key.id === id ? { ...key, isActive: !key.isActive } : key
      )
    );
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(keys => keys.filter(key => key.id !== id));
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey(showApiKey === id ? null : id);
  };

  // Other handlers
  const exportReport = () => {
    console.log('Exporting report...');
  };

  return {
    repositories,
    apiKeys,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    toggleRepository,
    addRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    toggleShowApiKey,
    exportReport,
    setGlobalConfig
  };
};
