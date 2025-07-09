import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Repository, ActivityItem } from '@/types/dashboard';
import { createGitHubService } from '@/components/GitHubService';
import { useWatchModePersistence } from '@/hooks/useWatchModePersistence';
import { useLogger } from '@/hooks/useLogger';

interface WatchModeProps {
  repositories: Repository[];
  apiKeys: any[];
  getDecryptedApiKey: (id: string) => string | null;
  onUpdateRepository: (repoId: string, updates: Partial<Repository>) => void;
}

export const WatchMode: React.FC<WatchModeProps> = ({ repositories, apiKeys, getDecryptedApiKey, onUpdateRepository }) => {
  const {
    watchModeState,
    updateWatchEnabled,
    updateRepoActivities,
    updateRepoPullRequests,
    updateLastUpdateTime
  } = useWatchModePersistence();
  
  const { logInfo, logError, logWarn } = useLogger('info');
  const [isLoading, setIsLoading] = useState(false);
  const [errorTimestamps, setErrorTimestamps] = useState<Record<string, number>>({});

  const watchEnabledMap = watchModeState.watchEnabled;
  const watchedRepos = Object.keys(watchEnabledMap).filter(id => watchEnabledMap[id]);
  const repoActivities = watchModeState.repoActivities;
  const repoPullRequests = watchModeState.repoPullRequests;
  const lastUpdateTime = watchModeState.lastUpdateTime;

  const enabledRepos = repositories.filter(repo => repo.enabled);

  const fetchRepoData = async (repo: Repository) => {
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
      updateRepoPullRequests({ ...repoPullRequests, [repo.id]: pullRequests });
      logInfo('watch-mode', `Fetched ${pullRequests.length} pull requests for ${repo.owner}/${repo.name}`);

      // Fetch recent activity
      const activities = await service.fetchRecentActivity([repo]);
      updateRepoActivities({ ...repoActivities, [repo.id]: activities });
      logInfo('watch-mode', `Fetched ${activities.length} activities for ${repo.owner}/${repo.name}`);
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
    if (isLoading) return;
    const watchedReposList = enabledRepos.filter(repo => watchedRepos.includes(repo.id));
    if (watchedReposList.length === 0) return;

    setIsLoading(true);
    logInfo('watch-mode', `Refreshing ${watchedReposList.length} watched repositories`);
    
    const promises = watchedReposList.map(repo => fetchRepoData(repo));
    
    await Promise.all(promises);
    updateLastUpdateTime(new Date());
    setIsLoading(false);
    logInfo('watch-mode', 'Completed refresh of all watched repositories');
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (watchedRepos.length === 0) return;

    const interval = setInterval(refreshAllWatched, 30000);
    return () => clearInterval(interval);
  }, [watchedRepos, enabledRepos]);

  // Initial load for watched repos
  useEffect(() => {
    if (watchedRepos.length > 0) {
      refreshAllWatched();
    }
  }, [watchedRepos]);

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

  return (
    <div className="space-y-6">
      {/* Control Panel */}
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
                variant="outline"
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
                      <Button
                        onClick={() => window.open(`https://github.com/${repo.owner}/${repo.name}`, '_blank')}
                        size="sm"
                        variant="outline"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on GitHub
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
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
                              activities.slice(0, 20).map(activity => (
                                <div key={activity.id} className="p-3 border rounded">
                                  <p className="text-sm font-medium mb-1">{activity.message}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(activity.timestamp).toLocaleString()}
                                  </p>
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
  );
};