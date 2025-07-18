
import { useState, useEffect } from 'react';
import { getItem, setItem, removeItem } from '@/utils/storage';
import { Repository, ActivityItem } from '@/types/dashboard';
import { useToast } from './use-toast';
import { useLogger } from './useLogger';

const REPOSITORIES_STORAGE_KEY = 'automerger-repositories';

export const useRepositories = () => {
  const { toast } = useToast();
  const { logInfo, logError } = useLogger();
  
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedRepos = await getItem<Repository[]>(REPOSITORIES_STORAGE_KEY);
      if (!mounted || !savedRepos) return;
      try {
        const parsed = typeof savedRepos === 'string' ? JSON.parse(savedRepos) : savedRepos;
        const repos = parsed.map((repo: Repository) => ({
          ...repo,
          autoMergeOnClean: repo.autoMergeOnClean ?? true,
          autoMergeOnUnstable: repo.autoMergeOnUnstable ?? false,
          watchEnabled: repo.watchEnabled ?? false,
          autoDeleteOnDirty: repo.autoDeleteOnDirty ?? false,
          autoCloseBranch: repo.autoCloseBranch ?? false,
          protectedBranches: repo.protectedBranches ?? ['main'],
          lastActivity: repo.lastActivity ? new Date(repo.lastActivity) : undefined,
          recentPull: repo.recentPull ? {
            ...repo.recentPull,
            timestamp: new Date(repo.recentPull.timestamp)
          } : undefined,
          activities: (repo.activities || []).map((activity: ActivityItem) => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          }))
        }));
        setRepositories(repos);
      } catch (error) {
        logError('repository', 'Error parsing saved repositories', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [logError]);

  // Persist repositories to IndexedDB whenever they change
  useEffect(() => {
      setItem(REPOSITORIES_STORAGE_KEY, repositories).catch(error => {
        logError('repository', 'Error saving repositories', error);
        toast({
          title: 'Storage error',
          description: 'Unable to save repository data to IndexedDB.',
          variant: 'destructive'
        });
      });
  }, [repositories, toast, logError]);

  function addRepositoryActivity(
    repoId: string,
    activity: Omit<ActivityItem, 'id'>
  ) {
    const activityWithId = {
      ...activity,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };

    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? {
              ...repo,
              activities: [activityWithId, ...repo.activities].slice(0, 100),
              lastActivity: new Date()
            }
          : repo
      )
    );
  }

  const toggleRepository = (id: string) => {
    setRepositories(repos =>
      repos.map(repo => {
        if (repo.id === id) {
          const newEnabled = !repo.enabled;
          logInfo('repository', `Repository ${repo.name} ${newEnabled ? 'activated' : 'deactivated'}`, { repo: repo.name, enabled: newEnabled });
          toast({
            title: `Repository ${repo.name} ${newEnabled ? 'activated' : 'deactivated'}`,
            description: newEnabled ? 'Repository is now active' : 'Repository is now inactive'
          });
          return { ...repo, enabled: newEnabled };
        }
        return repo;
      })
    );
  };

  const toggleAutoMergeOnClean = (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return;
    const newStatus = !repo.autoMergeOnClean;

    setRepositories(repos =>
      repos.map(r =>
        r.id === id ? { ...r, autoMergeOnClean: newStatus } : r
      )
    );

    logInfo('repository', `Auto-merge on clean for ${repo.name} ${newStatus ? 'enabled' : 'disabled'}`, {
      repo: repo.name,
      autoMergeOnClean: newStatus
    });
    toast({
      title: `Auto-merge on clean ${newStatus ? 'enabled' : 'disabled'} for ${repo.name}`,
      description: newStatus
        ? 'Pull requests will be merged automatically when clean'
        : 'Automatic merging disabled'
    });

    addRepositoryActivity(id, {
      type: 'alert',
      message: `${newStatus ? 'enabled' : 'disabled'} auto merge on clean`,
      repo: `${repo.owner}/${repo.name}`,
      timestamp: new Date()
    });
  };

  const toggleAutoMergeOnUnstable = (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return;
    const newStatus = !repo.autoMergeOnUnstable;

    setRepositories(repos =>
      repos.map(r =>
        r.id === id ? { ...r, autoMergeOnUnstable: newStatus } : r
      )
    );

    logInfo('repository', `Auto-merge on unstable for ${repo.name} ${newStatus ? 'enabled' : 'disabled'}`, {
      repo: repo.name,
      autoMergeOnUnstable: newStatus
    });
    toast({
      title: `Auto-merge on unstable ${newStatus ? 'enabled' : 'disabled'} for ${repo.name}`,
      description: newStatus
        ? 'Pull requests may merge even when status checks are pending'
        : 'Unstable auto-merge disabled'
    });

    addRepositoryActivity(id, {
      type: 'alert',
      message: `${newStatus ? 'enabled' : 'disabled'} auto merge on unstable`,
      repo: `${repo.owner}/${repo.name}`,
      timestamp: new Date()
    });
  };

  const toggleWatch = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, watchEnabled: !repo.watchEnabled } : repo
      )
    );
  };

  const toggleDeleteOnDirty = (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return;
    const newStatus = !repo.autoDeleteOnDirty;

    setRepositories(repos =>
      repos.map(r =>
        r.id === id ? { ...r, autoDeleteOnDirty: newStatus } : r
      )
    );

    logInfo('repository', `Auto delete on dirty for ${repo.name} ${newStatus ? 'enabled' : 'disabled'}`, {
      repo: repo.name,
      autoDeleteOnDirty: newStatus
    });
    toast({
      title: `Auto delete on dirty ${newStatus ? 'enabled' : 'disabled'} for ${repo.name}`,
      description: newStatus
        ? 'Dirty stray branches will be removed automatically'
        : 'Automatic deletion disabled'
    });

    addRepositoryActivity(id, {
      type: 'alert',
      message: `${newStatus ? 'enabled' : 'disabled'} auto del on dirty`,
      repo: `${repo.owner}/${repo.name}`,
      timestamp: new Date()
    });
  };

  const toggleCloseBranch = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, autoCloseBranch: !repo.autoCloseBranch } : repo
      )
    );
  };

  const addRepository = (name: string, owner: string, apiKeyId?: string) => {
    const existingRepo = repositories.find(r => r.name === name && r.owner === owner);
    if (existingRepo) {
      toast({ 
        title: 'Repository already exists',
        description: `${owner}/${name} is already in your list`,
        variant: 'destructive'
      });
      return;
    }

    const newRepository: Repository = {
      id: Date.now().toString(),
      name,
      owner,
      enabled: true,
      autoMergeOnClean: true,
      autoMergeOnUnstable: false,
      watchEnabled: false,
      autoDeleteOnDirty: false,
      autoCloseBranch: false,
      allowedBranches: ['codex-*', 'feature/*', 'fix/*'],
      protectedBranches: ['main'],
      allowedUsers: ['github-actions[bot]'],
      allowAllBranches: false,
      allowAllUsers: false,
      alertsEnabled: true,
      apiKeyId,
      fetchMode: 'github-api',
      webhookMethod: 'global',
      lastActivity: new Date(),
      stats: { 
        totalMerges: 0, 
        successfulMerges: 0, 
        failedMerges: 0, 
        pendingMerges: 0 
      },
      activities: []
    };
    
    setRepositories(prev => [...prev, newRepository]);
    logInfo('repository', `Repository ${owner}/${name} added`, { repo: `${owner}/${name}`, apiKeyId });
    toast({ 
      title: `Repository ${owner}/${name} added successfully!`,
      description: 'You can now configure its settings and enable monitoring'
    });
  };

  const deleteRepository = (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return;
    
    setRepositories(repos => repos.filter(r => r.id !== id));
    logInfo('repository', `Repository ${repo.owner}/${repo.name} deleted`, { repo: `${repo.owner}/${repo.name}` });
    toast({ 
      title: `Repository ${repo.owner}/${repo.name} deleted`,
      description: 'All associated data has been removed'
    });
  };

  const updateRepository = (id: string, updates: Partial<Repository>) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, ...updates } : repo
      )
    );
  };

  const addBranch = (repoId: string, branch: string) => {
    if (!branch.trim()) {
      toast({ 
        title: 'Invalid branch pattern',
        description: 'Branch pattern cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    const repo = repositories.find(r => r.id === repoId);
    if (repo?.allowedBranches.includes(branch)) {
      toast({ 
        title: 'Branch pattern already exists',
        description: `"${branch}" is already in the allowed list`,
        variant: 'destructive'
      });
      return;
    }

    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedBranches: [...repo.allowedBranches, branch] }
          : repo
      )
    );
    toast({ title: `Branch pattern "${branch}" added successfully!` });
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
    if (!user.trim()) {
      toast({ 
        title: 'Invalid username',
        description: 'Username cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    const repo = repositories.find(r => r.id === repoId);
    if (repo?.allowedUsers.includes(user)) {
      toast({ 
        title: 'User already exists',
        description: `"${user}" is already in the allowed list`,
        variant: 'destructive'
      });
      return;
    }

    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedUsers: [...repo.allowedUsers, user] }
          : repo
      )
    );
    toast({ title: `User "${user}" added successfully!` });
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

  const updateRepositoryStats = (repoId: string, stats: Partial<Repository['stats']>) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, stats: { ...repo.stats, ...stats } }
          : repo
      )
    );
  };


  const clearAllRepositories = () => {
    setRepositories([]);
    removeItem(REPOSITORIES_STORAGE_KEY);
    toast({
      title: 'All repositories cleared',
      description: 'Repository data has been reset'
    });
  };

  return {
    repositories,
    toggleRepository,
    addRepository,
    deleteRepository,
    updateRepository,
    toggleAutoMergeOnClean,
    toggleAutoMergeOnUnstable,
    toggleWatch,
    toggleDeleteOnDirty,
    toggleCloseBranch,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    updateRepositoryStats,
    addRepositoryActivity,
    clearAllRepositories
  };
};
