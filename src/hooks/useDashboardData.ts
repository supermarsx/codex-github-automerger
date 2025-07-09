import { useState } from 'react';
import { Repository, ApiKey, MergeStats, GlobalConfig, ActivityItem } from '@/types/dashboard';
import { useLogger } from './useLogger';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';

export const useDashboardData = () => {
  const { toast } = useToast();
  const { logs, logInfo, logWarn, logError, logSuccess, exportLogs } = useLogger();
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
      encrypted: true,
      connectionStatus: 'connected'
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      created: new Date('2024-01-10'),
      isActive: false,
      encrypted: false,
      connectionStatus: 'disconnected'
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
    fetchMode: 'github-api',
    serverCheckInterval: 10000,
    logLevel: 'info',
    darkMode: localStorage.getItem('theme') === 'light' ? false : true,
    customCss: '',
    customJs: '',
    feedActions: [],
    statsPeriod: 'session'
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
      repos.map(repo => {
        if (repo.id === id) {
          const newEnabled = !repo.enabled;
          logInfo('repository', `Repository ${repo.name} ${newEnabled ? 'enabled' : 'disabled'}`, { repo: repo.name, enabled: newEnabled });
          toast({ 
            title: `Repository ${repo.name} ${newEnabled ? 'enabled' : 'disabled'}`,
            description: newEnabled ? 'Auto-merge is now active for this repository' : 'Auto-merge is now inactive for this repository'
          });
          return { ...repo, enabled: newEnabled };
        }
        return repo;
      })
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
    logInfo('repository', `Repository ${owner}/${name} added`, { repo: `${owner}/${name}` });
    toast({ title: `Repository ${owner}/${name} added successfully!` });
  };

  const deleteRepository = (id: string) => {
    const repo = repositories.find(r => r.id === id);
    setRepositories(repos => repos.filter(r => r.id !== id));
    if (repo) {
      logInfo('repository', `Repository ${repo.owner}/${repo.name} deleted`, { repo: `${repo.owner}/${repo.name}` });
      toast({ title: `Repository ${repo.owner}/${repo.name} deleted` });
    }
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
      toast({ title: `Branch pattern "${branch}" added successfully!` });
    }
  };

  const removeBranch = (repoId: string, branchIndex: number) => {
    const repo = repositories.find(r => r.id === repoId);
    const branchName = repo?.allowedBranches[branchIndex];
    
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedBranches: repo.allowedBranches.filter((_, i) => i !== branchIndex) }
          : repo
      )
    );
    
    if (branchName) {
      toast({ title: `Branch pattern "${branchName}" removed successfully!` });
    }
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
      toast({ title: `User "${user}" added successfully!` });
    }
  };

  const removeUser = (repoId: string, userIndex: number) => {
    const repo = repositories.find(r => r.id === repoId);
    const userName = repo?.allowedUsers[userIndex];
    
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedUsers: repo.allowedUsers.filter((_, i) => i !== userIndex) }
          : repo
      )
    );
    
    if (userName) {
      toast({ title: `User "${userName}" removed successfully!` });
    }
  };

  // API Key handlers
  const [deletedApiKeys, setDeletedApiKeys] = useState<Map<string, { key: ApiKey; timeout: NodeJS.Timeout }>>(new Map());

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
    logInfo('api-key', `API Key "${name}" added`, { keyName: name });
    toast({ title: `API Key "${name}" added successfully!` });
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(keys =>
      keys.map(key => {
        if (key.id === id) {
          const newActive = !key.isActive;
          logInfo('api-key', `API Key "${key.name}" ${newActive ? 'activated' : 'deactivated'}`, { keyName: key.name, active: newActive });
          toast({ 
            title: `API Key "${key.name}" ${newActive ? 'activated' : 'deactivated'}`,
            description: newActive ? 'API key is now active and ready to use' : 'API key is now inactive'
          });
          return { ...key, isActive: newActive };
        }
        return key;
      })
    );
  };

  const deleteApiKey = (id: string) => {
    const key = apiKeys.find(k => k.id === id);
    if (!key) return;
    
    setApiKeys(keys => keys.filter(key => key.id !== id));
    logInfo('api-key', `API Key "${key.name}" deleted`, { keyName: key.name });
    
    // Set up revert functionality
    const timeout = setTimeout(() => {
      setDeletedApiKeys(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, 15000);
    
    setDeletedApiKeys(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { key, timeout });
      return newMap;
    });
    
    toast({
      title: `API Key "${key.name}" deleted`,
      description: "You can revert this action within 15 seconds"
    });
  };

  const revertApiKeyDeletion = (id: string) => {
    const deleted = deletedApiKeys.get(id);
    if (deleted) {
      clearTimeout(deleted.timeout);
      setApiKeys(keys => [...keys, deleted.key]);
      setDeletedApiKeys(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      toast({ title: `API Key "${deleted.key.name}" restored` });
    }
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
    logs,
    toggleRepository,
    addRepository,
    deleteRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    exportReport,
    setGlobalConfig,
    exportLogs
  };
};
