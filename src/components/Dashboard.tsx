import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, GitBranch, Key, Settings, Shield, BarChart3, FileText, Zap, RefreshCw } from 'lucide-react';

// Component imports
import { RealtimeFeed } from '@/components/RealtimeFeed';
import { RepositoryManagement } from '@/components/RepositoryManagement';
import { ApiKeyManagement } from '@/components/ApiKeyManagement';
import { GlobalConfiguration } from '@/components/GlobalConfiguration';
import { SecurityManagement } from '@/components/SecurityManagement';
import { DetailedStatistics } from '@/components/DetailedStatistics';
import { LogsTab } from '@/components/LogsTab';
import { FeedActions } from '@/components/FeedActions';
import { WatchMode } from '@/components/WatchMode';
import { SelectiveRepositoryLoader } from '@/components/SelectiveRepositoryLoader';
import { ConnectionManager } from '@/components/ConnectionManager';
import { ThemeToggle } from '@/components/ThemeToggle';

// Hook imports
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppPersistence } from '@/hooks/useAppPersistence';
import { useLogger } from '@/hooks/useLogger';

export const Dashboard: React.FC = () => {
  const {
    repositories,
    apiKeys,
    activities,
    globalConfig,
    mergeStats,
    logs,
    isLoading,
    isUnlocked,
    authInProgress,
    showApiKey,
    showLockedModal,
    setShowLockedModal,
    // Repository functions
    addRepository,
    deleteRepository,
    updateRepository,
    toggleRepository,
    toggleAutoMergeOnClean,
    toggleAutoMergeOnUnstable,
    toggleWatch,
    toggleDeleteOnDirty,
    toggleCloseBranch,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    // API Key functions
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    getDecryptedApiKey,
    // Config functions
    setGlobalConfig,
    // Auth functions
    unlock,
    // Other functions
    exportReport,
    exportLogs,
    clearLogs,
    addRepositoryActivity,
    fetchActivities
  } = useDashboardData();

  const { appState, updateActiveTab } = useAppPersistence();
  const { logInfo } = useLogger();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (repositories.length === 0 || apiKeys.length === 0) return;

    logInfo('dashboard', `Setting up auto-refresh for ${repositories.length} repositories`);
    const interval = setInterval(() => {
      logInfo('dashboard', 'Auto-refreshing activities');
      fetchActivities(repositories, apiKeys, getDecryptedApiKey);
    }, 30000);

    return () => {
      logInfo('dashboard', 'Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [repositories.length, apiKeys.length, fetchActivities, logInfo, getDecryptedApiKey]);

  // Initial fetch when repos or keys change
  useEffect(() => {
    if (repositories.length > 0 && apiKeys.length > 0) {
      logInfo('dashboard', `Initial fetch for ${repositories.length} repositories with ${apiKeys.length} API keys`);
      fetchActivities(repositories, apiKeys, getDecryptedApiKey);
    }
  }, [repositories.length, apiKeys.length, fetchActivities, logInfo, getDecryptedApiKey]);

  // Log app initialization
  useEffect(() => {
    logInfo('dashboard', 'Dashboard initialized', { 
      sessionStart: appState.sessionStartTime,
      activeTab: appState.activeTab
    });
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">AutoMerger Dashboard</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-24">
          <Tabs value={appState.activeTab} onValueChange={(tab) => {
            updateActiveTab(tab);
            logInfo('dashboard', `Switched to tab: ${tab}`);
          }} className="space-y-6">

          <TabsContent value="feed" className="space-y-6 max-w-4xl mx-auto">
            <RealtimeFeed activities={activities} onExportReport={exportReport} isLoading={isLoading} isUnlocked={isUnlocked} />
            <WatchMode
              repositories={repositories}
              apiKeys={apiKeys}
              getDecryptedApiKey={getDecryptedApiKey}
              isUnlocked={isUnlocked}
              onUpdateRepository={updateRepository}
              globalConfig={globalConfig}
              showControlPanel={false}
            />
          </TabsContent>

          <TabsContent value="repositories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <SelectiveRepositoryLoader
                  apiKeys={apiKeys}
                  existingRepos={repositories.map(r => `${r.owner}/${r.name}`)}
                  getDecryptedApiKey={getDecryptedApiKey}
                  onAddRepository={(repoData) => {
                    addRepository(repoData.name, repoData.owner);
                  }}
                />
              </div>
              <div className="space-y-6">
                <RepositoryManagement
                  repositories={repositories}
                  apiKeys={apiKeys}
                  onToggleRepository={toggleRepository}
                  onToggleAutoMergeOnClean={toggleAutoMergeOnClean}
                  onToggleAutoMergeOnUnstable={toggleAutoMergeOnUnstable}
                  onToggleWatch={toggleWatch}
                  onToggleDeleteOnDirty={toggleDeleteOnDirty}
                  onToggleCloseBranch={toggleCloseBranch}
                  onAddRepository={addRepository}
                  onDeleteRepository={deleteRepository}
                  onAddBranch={addBranch}
                  onRemoveBranch={removeBranch}
                  onAddUser={addUser}
                  onRemoveUser={removeUser}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6 max-w-4xl mx-auto">
            <ApiKeyManagement
              apiKeys={apiKeys}
              isUnlocked={isUnlocked}
              onAddApiKey={addApiKey}
              onToggleApiKey={toggleApiKey}
              onDeleteApiKey={deleteApiKey}
              onRevertDelete={revertApiKeyDeletion}
              showApiKey={showApiKey}
              onToggleShowApiKey={toggleShowApiKey}
            />
          </TabsContent>

          <TabsContent value="actions" className="space-y-6 max-w-4xl mx-auto">
            <FeedActions
              actions={globalConfig.feedActions}
              onActionsChange={(actions) => setGlobalConfig({ ...globalConfig, feedActions: actions })}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-6">
              <GlobalConfiguration 
                config={globalConfig} 
                repositories={repositories}
                apiKeys={apiKeys}
                onConfigChange={setGlobalConfig}
                onExportConfig={exportReport}
                onImportConfig={() => logInfo('dashboard', 'Import config triggered')}
              />
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 max-w-4xl mx-auto">
            <SecurityManagement
              apiKeys={apiKeys}
              repositories={repositories}
              config={globalConfig}
              onAuthenticate={unlock}
            />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6 max-w-4xl mx-auto">
            <DetailedStatistics 
              repositories={repositories} 
              activities={activities.map(activity => ({
                id: activity.id,
                type: activity.type === 'merge' ? 'merged' : 
                      activity.type === 'pull' ? 'pull_request' : 
                      activity.type === 'failure' ? 'merge_failed' : 'alert',
                message: activity.message,
                repository: activity.repo,
                timestamp: activity.timestamp,
                details: activity.details
              }))} 
              period={globalConfig.statsPeriod} 
            />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6 max-w-4xl mx-auto">
            {!globalConfig.logsDisabled ? (
              <LogsTab logs={logs} onExportLogs={exportLogs} onClearLogs={clearLogs} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Logs Disabled</h3>
                  <p className="text-muted-foreground text-center">
                    Logs are currently disabled. Enable them in Global Configuration to view application logs.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          </Tabs>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-card/95 backdrop-blur-sm border rounded-full p-2 shadow-lg">
            <div className="flex items-center gap-2">
              {[
                { key: 'feed', icon: Activity, title: 'Feed' },
                { key: 'repositories', icon: GitBranch, title: 'Repositories' },
                { key: 'api-keys', icon: Key, title: 'API Keys' },
                { key: 'actions', icon: Zap, title: 'Actions' },
                { key: 'config', icon: Settings, title: 'Config' },
                { key: 'security', icon: Shield, title: 'Security' },
                { key: 'statistics', icon: BarChart3, title: 'Statistics' },
                { key: 'logs', icon: FileText, title: 'Logs' }
              ].map(({ key, icon: Icon, title }) => (
                <button
                  key={key}
                  onClick={() => {
                    updateActiveTab(key);
                    logInfo('dashboard', `Switched to ${key} tab via floating action bar`);
                  }}
                  className={`p-3 rounded-full transition-all ${
                    appState.activeTab === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
