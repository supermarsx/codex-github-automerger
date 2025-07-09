import { useState } from 'react';
import { Repository } from '@/types/dashboard';
import { useToast } from './use-toast';
import { useLogger } from './useLogger';

export const useRepositories = () => {
  const { toast } = useToast();
  const { logInfo } = useLogger();
  
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
    setRepositories(prev => [...prev, newRepository]);
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

  return {
    repositories,
    toggleRepository,
    addRepository,
    deleteRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser
  };
};