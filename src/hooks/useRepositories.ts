import { useState, useEffect } from 'react';
import { Repository } from '@/types/dashboard';
import { useToast } from './use-toast';
import { useLogger } from './useLogger';

const REPOSITORIES_STORAGE_KEY = 'automerger-repositories';

export const useRepositories = () => {
  const { toast } = useToast();
  const { logInfo } = useLogger();
  
  const [repositories, setRepositories] = useState<Repository[]>(() => {
    const savedRepos = localStorage.getItem(REPOSITORIES_STORAGE_KEY);
    if (savedRepos) {
      try {
        const parsed = JSON.parse(savedRepos);
        // Convert date strings back to Date objects
        return parsed.map((repo: any) => ({
          ...repo,
          autoMergeEnabled: repo.autoMergeEnabled ?? repo.enabled ?? true,
          watchEnabled: repo.watchEnabled ?? false,
          autoDeleteBranch: repo.autoDeleteBranch ?? false,
          autoCloseBranch: repo.autoCloseBranch ?? false,
          lastActivity: repo.lastActivity ? new Date(repo.lastActivity) : undefined,
          recentPull: repo.recentPull ? {
            ...repo.recentPull,
            timestamp: new Date(repo.recentPull.timestamp)
          } : undefined,
          activities: (repo.activities || []).map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          }))
        }));
      } catch (error) {
        console.error('Error parsing saved repositories:', error);
        return [];
      }
    }
    return [];
  });

  // Persist repositories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(REPOSITORIES_STORAGE_KEY, JSON.stringify(repositories));
  }, [repositories]);

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

  const toggleAutoMerge = (id: string) => {
    setRepositories(repos =>
      repos.map(repo => {
        if (repo.id === id) {
          const newStatus = !repo.autoMergeEnabled;
          logInfo('repository', `Auto-merge for ${repo.name} ${newStatus ? 'enabled' : 'disabled'}`, { repo: repo.name, autoMergeEnabled: newStatus });
          toast({
            title: `Auto-merge ${newStatus ? 'enabled' : 'disabled'} for ${repo.name}`,
            description: newStatus ? 'Pull requests will be merged automatically' : 'Automatic merging disabled'
          });
          return { ...repo, autoMergeEnabled: newStatus };
        }
        return repo;
      })
    );
  };

  const toggleWatch = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, watchEnabled: !repo.watchEnabled } : repo
      )
    );
  };

  const toggleDeleteBranch = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, autoDeleteBranch: !repo.autoDeleteBranch } : repo
      )
    );
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
      autoMergeEnabled: true,
      watchEnabled: false,
      autoDeleteBranch: false,
      autoCloseBranch: false,
      allowedBranches: ['codex-*', 'feature/*', 'fix/*'],
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

  const addRepositoryActivity = (repoId: string, activity: Omit<Repository['activities'][0], 'id'>) => {
    const activityWithId = {
      ...activity,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };

    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { 
              ...repo, 
              activities: [activityWithId, ...repo.activities].slice(0, 100), // Keep last 100 activities
              lastActivity: new Date()
            }
          : repo
      )
    );
  };

  const clearAllRepositories = () => {
    setRepositories([]);
    localStorage.removeItem(REPOSITORIES_STORAGE_KEY);
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
    toggleAutoMerge,
    toggleWatch,
    toggleDeleteBranch,
    toggleCloseBranch,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    updateRepositoryStats,
    addRepositoryActivity,
    clearAllRepositories
  };};