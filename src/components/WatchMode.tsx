import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  GitMerge,
  XCircle,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Repository, ActivityItem, ApiKey } from '@/types/dashboard';
import { createGitHubService } from '@/components/GitHubService';
import { useWatchModePersistence } from '@/hooks/useWatchModePersistence';
import { useLogger } from '@/hooks/useLogger';
import { useToast } from '@/hooks/use-toast';
import { abbreviate } from '@/utils/text';
import { matchesPattern } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const MIN_FETCH_INTERVAL = 60 * 1000; // 1 minute
const MAX_REFRESHES_PER_MINUTE = 10;

interface WatchModeProps {
  repositories: Repository[];
  apiKeys: ApiKey[];
  getDecryptedApiKey: (id: string) => string | null;
  isUnlocked: boolean;
  onUpdateRepository: (repoId: string, updates: Partial<Repository>) => void;
  globalConfig: import('@/types/dashboard').GlobalConfig;
  showControlPanel?: boolean;
}

export const WatchMode: React.FC<WatchModeProps> = ({ repositories, apiKeys, getDecryptedApiKey, isUnlocked, onUpdateRepository, globalConfig, showControlPanel = true }) => {
  const {
    watchModeState,
    updateRepoActivities,
    updateRepoPullRequests,
    updateRepoStrayBranches,
    updateLastUpdateTime,
    updateRepoLastFetched,
    reorderRepoActivity
  } = useWatchModePersistence();
  
  const { logInfo, logError, logWarn, logDebug } = useLogger('info');
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [errorTimestamps, setErrorTimestamps] = useState<Record<string, number>>({});
  const refreshHistory = useRef<number[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; repo: Repository | null; branch: string}>({open: false, repo: null, branch: ''});

  const watchEnabledMap = Object.fromEntries(repositories.map(r => [r.id, r.watchEnabled]));
  const watchedRepos = Object.keys(watchEnabledMap).filter(id => watchEnabledMap[id]);
  const repoActivities = watchModeState.repoActivities;
  const repoPullRequests = watchModeState.repoPullRequests;
  const repoStrayBranches = watchModeState.repoStrayBranches || {};
  const repoLastFetched = watchModeState.repoLastFetched || {};
  const lastUpdateTime = watchModeState.lastUpdateTime;

  const enabledRepos = repositories.filter(repo => repo.enabled);

  const fetchRepoData = async (repo: Repository) => {
    const lastFetched = repoLastFetched[repo.id] || 0;
    if (Date.now() - lastFetched < MIN_FETCH_INTERVAL) {
      return;
    }
    let apiKey = apiKeys.find(key => key.id === repo.apiKeyId && key.isActive);
    if (!apiKey) {
      // fallback to first active key if repository has none or inactive
      apiKey = apiKeys.find(key => key.isActive);
      if (!apiKey) {
        logWarn('watch-mode', `No active API key found for ${repo.owner}/${repo.name}`);
        return;
      }
      if (apiKey.id !== repo.apiKeyId) {
        onUpdateRepository(repo.id, { apiKeyId: apiKey.id });
      }
    }

    const lastError = errorTimestamps[repo.id];
    if (lastError && Date.now() - lastError < 2 * 60 * 1000) {
      logWarn('watch-mode', `Skipping fetch for ${repo.owner}/${repo.name} due to recent errors`);
      return;
    }

    try {
      logInfo('watch-mode', `Fetching data for ${repo.owner}/${repo.name}`);
      const token = getDecryptedApiKey(apiKey.id);
      if (!token) {
        logWarn('watch-mode', 'API key locked, skipping fetch', { repo: repo.id });
        return;
      }
      const service = createGitHubService(token);
      
      // Fetch pull requests
      const pullRequests = await service.fetchPullRequests(repo.owner, repo.name);
      updateRepoPullRequests(repo.id, pullRequests);
      logInfo('watch-mode', `Fetched ${pullRequests.length} pull requests for ${repo.owner}/${repo.name}`);

      // Fetch recent activity
      const activities = await service.fetchRecentActivity([repo]);
      updateRepoActivities(repo.id, activities);
      logInfo('watch-mode', `Fetched ${activities.length} activities for ${repo.owner}/${repo.name}`);

      // Fetch stray branches
      let branches = await service.fetchStrayBranches(repo.owner, repo.name);
      const patterns = [...(globalConfig.protectedBranches || []), ...(repo.protectedBranches || [])];
      if (patterns.length > 0) {
        branches = branches.filter(b => !patterns.some(p => matchesPattern(b, p)));
      }
      updateRepoStrayBranches(repo.id, branches);
      logInfo('watch-mode', `Fetched ${branches.length} stray branches for ${repo.owner}/${repo.name}`);
      updateRepoLastFetched(repo.id);
      setErrorTimestamps(prev => {
        const copy = { ...prev };
        delete copy[repo.id];
        return copy;
      });
      
    } catch (error) {
      logError('watch-mode', `Error fetching data for ${repo.owner}/${repo.name}`, error);
      setErrorTimestamps(prev => ({ ...prev, [repo.id]: Date.now() }));
    }
  };

  const refreshAllWatched = async () => {
    if (isLoading || !isUnlocked) return;
    const now = Date.now();
    refreshHistory.current = refreshHistory.current.filter(ts => now - ts < 60000);
    if (refreshHistory.current.length >= MAX_REFRESHES_PER_MINUTE) {
      return;
    }
    refreshHistory.current.push(now);
    const watchedReposList = enabledRepos.filter(repo => watchedRepos.includes(repo.id));
    if (watchedReposList.length === 0) return;

    setIsLoading(true);
    logDebug('watch-mode', `Refreshing ${watchedReposList.length} watched repositories`);
    
    const promises = watchedReposList.map(repo => fetchRepoData(repo));
    
    await Promise.all(promises);
    updateLastUpdateTime(new Date());
    setIsLoading(false);
    logDebug('watch-mode', 'Completed refresh of all watched repositories');
  };

  // Periodically refresh using a self-scheduling timeout
  useEffect(() => {
    if (watchedRepos.length === 0 || !isUnlocked) return;

    let cancelled = false;

    const scheduleRefresh = async () => {
      await refreshAllWatched();
      if (!cancelled) {
        timeoutRef.current = setTimeout(scheduleRefresh, 30000);
      }
    };

    const stopTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !timeoutRef.current) {
        scheduleRefresh();
      } else if (document.visibilityState !== 'visible') {
        stopTimeout();
      }
    };

    if (document.visibilityState === 'visible') {
      scheduleRefresh();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      stopTimeout();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [watchedRepos, enabledRepos, isUnlocked]);

  // Initial load for watched repos
  useEffect(() => {
    if (watchedRepos.length > 0 && isUnlocked) {
      refreshAllWatched();
    }
  }, [watchedRepos, isUnlocked]);

  const getRepoStatus = (repo: Repository) => {
    const pullRequests = repoPullRequests[repo.id] || [];
    const activities = repoActivities[repo.id] || [];
    
    const mergeable = pullRequests.filter(pr => pr.mergeable === true).length;
    const nonMergeable = pullRequests.filter(pr => pr.mergeable === false).length;
    const recentActivity = activities.filter(a => 
      new Date(a.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    return { mergeable, nonMergeable, recentActivity, totalPRs: pullRequests.length };
  };

  const { toast } = useToast();

  const handleMerge = async (repo: Repository, prNumber: number) => {
    let apiKey = apiKeys.find(k => k.id === repo.apiKeyId && k.isActive);
    if (!apiKey) {
      apiKey = apiKeys.find(k => k.isActive);
      if (!apiKey) return;
      if (apiKey.id !== repo.apiKeyId) {
        onUpdateRepository(repo.id, { apiKeyId: apiKey.id });
      }
    }

    const token = getDecryptedApiKey(apiKey.id);
    if (!token) return;
    const service = createGitHubService(token);
    const success = await service.mergePullRequest(repo.owner, repo.name, prNumber);
    if (success) {
      toast({ title: `Merged PR #${prNumber} successfully` });
      if (globalConfig.autoArchiveClosed) {
        updateRepoPullRequests(repo.id, (repoPullRequests[repo.id] || []).filter(pr => pr.number !== prNumber));
      }
      const branches = await service.fetchStrayBranches(repo.owner, repo.name);
      updateRepoStrayBranches(repo.id, branches);
      fetchRepoData(repo);
    } else {
      toast({ title: `Failed to merge PR #${prNumber}` });
    }
  };

  const handleClose = async (repo: Repository, prNumber: number) => {
    let apiKey = apiKeys.find(k => k.id === repo.apiKeyId && k.isActive);
    if (!apiKey) {
      apiKey = apiKeys.find(k => k.isActive);
      if (!apiKey) return;
      if (apiKey.id !== repo.apiKeyId) {
        onUpdateRepository(repo.id, { apiKeyId: apiKey.id });
      }
    }

    const token = getDecryptedApiKey(apiKey.id);
    if (!token) return;
    const service = createGitHubService(token);
    const success = await service.closePullRequest(repo.owner, repo.name, prNumber);
    if (success) {
      toast({ title: `Closed PR #${prNumber}` });
      if (globalConfig.autoArchiveClose) {
        updateRepoPullRequests(repo.id, (repoPullRequests[repo.id] || []).filter(pr => pr.number !== prNumber));
      }
      const branches = await service.fetchStrayBranches(repo.owner, repo.name);
      updateRepoStrayBranches(repo.id, branches);
      fetchRepoData(repo);
    } else {
      toast({ title: `Failed to close PR #${prNumber}` });
    }
  };

  const handleDeleteBranch = async (repo: Repository, branch: string) => {
    let apiKey = apiKeys.find(k => k.id === repo.apiKeyId && k.isActive);
    if (!apiKey) {
      apiKey = apiKeys.find(k => k.isActive);
      if (!apiKey) return;
      if (apiKey.id !== repo.apiKeyId) {
        onUpdateRepository(repo.id, { apiKeyId: apiKey.id });
      }
    }

    const token = getDecryptedApiKey(apiKey.id);
    if (!token) return;
    const service = createGitHubService(token);
    const success = await service.deleteBranch(repo.owner, repo.name, branch);
    if (success) {
      toast({ title: `Deleted branch ${branch}` });
      const activity: ActivityItem = {
        id: Date.now().toString(),
        type: 'alert',
        message: `del ${branch}`,
        repo: `${repo.owner}/${repo.name}`,
        timestamp: new Date()
      };
      updateRepoActivities(repo.id, [activity, ...(repoActivities[repo.id] || [])]);
      updateRepoStrayBranches(repo.id, (repoStrayBranches[repo.id] || []).filter(b => b !== branch));
      fetchRepoData(repo);
    } else {
      toast({ title: `Failed to delete branch ${branch}` });
    }
  };

  return (
    <>
    <div className="relative space-y-6">
      {!isUnlocked && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 neo-card font-black text-xl">
          Need authentication first
        </div>
      )}
      {showControlPanel && (
      <Card className="neo-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Watch Mode
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last update: {lastUpdateTime.toLocaleTimeString()}
              </div>
              <Button
                onClick={refreshAllWatched}
                disabled={isLoading || watchedRepos.length === 0}
                size="sm"
                className="neo-button-secondary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="text-sm text-muted-foreground">
              Configure which repositories are watched from the Repositories tab. Watch mode provides real-time updates without automatic actions.
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Watched Repositories Details */}
      {watchedRepos.length > 0 && (
        <div className="grid gap-6">
          {enabledRepos
            .filter(repo => watchedRepos.includes(repo.id))
            .map(repo => {
              const pullRequests = repoPullRequests[repo.id] || [];
              const activities = repoActivities[repo.id] || [];
              
              return (
                <Card key={repo.id} className="neo-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        {repo.owner}/{repo.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {repoLastFetched[repo.id] ? new Date(repoLastFetched[repo.id]).toLocaleString() : 'Never'}
                        </Badge>
                        <Button
                          onClick={() => window.open(`https://github.com/${repo.owner}/${repo.name}`, '_blank')}
                          size="sm"
                          className="neo-button-secondary"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on GitHub
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Pull Requests */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <GitPullRequest className="w-4 h-4" />
                          Pull Requests ({pullRequests.length})
                        </h4>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {pullRequests.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <GitPullRequest className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No pull requests</p>
                              </div>
                            ) : (
                              pullRequests.map(pr => (
                                <div key={pr.id} className="p-3 border rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {pr.mergeable === true ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      ) : pr.mergeable === false ? (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                      ) : (
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                      )}
                                      <span className="font-medium">#{pr.number}</span>
                                    </div>
                                    <Button
                                      onClick={() => window.open(pr.html_url, '_blank')}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm font-medium mb-1">{pr.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{pr.user.login}</span>
                                    <span>•</span>
                                    <span>{pr.head.ref} → {pr.base.ref}</span>
                                    {pr.mergeable_state && (
                                      <>
                                        <span>•</span>
                                        <span className="capitalize">{pr.mergeable_state}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      onClick={() => handleMerge(repo, pr.number)}
                                      size="sm"
                                      className="neo-button"
                                      disabled={pr.mergeable !== true}
                                    >
                                      <GitMerge className="w-3 h-3 mr-1" />
                                      Merge
                                    </Button>
                                    <Button
                                      onClick={() => handleClose(repo, pr.number)}
                                      size="sm"
                                      className="neo-button neo-red"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Close
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Recent Activity */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Recent Activity ({activities.length})
                        </h4>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {activities.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent activity</p>
                              </div>
                            ) : (
                              activities.slice(0, 20).map((activity, idx) => (
                                <div key={activity.id} className="p-3 border rounded flex items-start gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium mb-1">{activity.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex flex-col">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => reorderRepoActivity(repo.id, idx, idx - 1)}
                                      className="text-foreground"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => reorderRepoActivity(repo.id, idx, idx + 1)}
                                      className="text-foreground"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Stray Branches */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          Stray Branches ({(repoStrayBranches[repo.id] || []).length})
                        </h4>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {(repoStrayBranches[repo.id] || []).length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No stray branches</p>
                              </div>
                            ) : (
                              (repoStrayBranches[repo.id] || []).map(branch => (
                                <div key={branch} className="p-3 border rounded flex items-center justify-between">
                                  <span className="text-sm font-mono" title={branch}>
                                    {abbreviate(branch)}
                                  </span>
                                  <Button
                                    size="sm"
                                    className="neo-button neo-red"
                                    variant="destructive"
                                    onClick={() => {
                                      if (globalConfig.confirmBranchDeletion) {
                                        setDeleteDialog({ open: true, repo, branch });
                                      } else {
                                        handleDeleteBranch(repo, branch);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
    <ConfirmationDialog
      open={deleteDialog.open}
      onOpenChange={(open) =>
        setDeleteDialog({
          ...deleteDialog,
          open,
        })
      }
      title="Delete Branch"
      description={`Are you sure you want to delete ${deleteDialog.branch}?`}
      onConfirm={() => {
        if (deleteDialog.repo) {
          handleDeleteBranch(deleteDialog.repo, deleteDialog.branch);
        }
        setDeleteDialog({ open: false, repo: null, branch: '' });
      }}
      confirmText="Delete"
      variant="destructive"
    />
    </>
  );
};