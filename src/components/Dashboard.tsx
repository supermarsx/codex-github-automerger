import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, GitBranch, Key, Settings, Shield, BarChart3, FileText, Zap, GitMerge, RefreshCw } from 'lucide-react';

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
    fetchServerLogs,
    clearLogs,
    addRepositoryActivity,
    fetchActivities,
    purgeDatabase
  } = useDashboardData();

  const { appState, updateActiveTab, updateTheme } = useAppPersistence();
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

  // Sync server logs whenever the Logs tab is opened
  useEffect(() => {
    if (appState.activeTab === 'logs') {
      fetchServerLogs();
    }
  }, [appState.activeTab, fetchServerLogs]);


  const tabs = [
    { key: 'feed', icon: Activity, title: 'Feed', color: 'neo-blue' },
    { key: 'repositories', icon: GitBranch, title: 'Repositories', color: 'neo-green' },
    { key: 'api-keys', icon: Key, title: 'API Keys', color: 'neo-yellow' },
    { key: 'actions', icon: Zap, title: 'Actions', color: 'neo-purple' },
    { key: 'config', icon: Settings, title: 'Config', color: 'neo-orange' },
    { key: 'security', icon: Shield, title: 'Security', color: 'neo-red' },
    { key: 'statistics', icon: BarChart3, title: 'Statistics', color: 'neo-pink' },
    { key: 'logs', icon: FileText, title: 'Logs', color: 'neo-blue' }
  ];

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40" style={{ borderColor: 'hsl(var(--neo-border))' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="neo-card neo-green p-3">
                <GitMerge className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-shadow">AutoMerger Dashboard</h1>
                <p className="text-muted-foreground">Automated pull request management system</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionManager
                apiKeys={apiKeys}
                compact={true}
                isUnlocked={isUnlocked}
                authInProgress={authInProgress}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={appState.activeTab} onValueChange={(tab) => {
          updateActiveTab(tab);
          logInfo('dashboard', `Switched to tab: ${tab}`);
        }} className="space-y-6">
          
          {/* Tab Navigation */}
          <div className="neo-card p-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2 bg-transparent p-0 h-auto">
              {tabs.map(({ key, icon: Icon, title, color }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={`neo-card ${color} p-4 data-[state=active]:shadow-[2px_2px_0px_0px_hsl(var(--neo-border))] data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px] transition-all duration-150 flex flex-col items-center gap-2 min-h-[80px] text-center`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider">{title}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="feed" className="space-y-6">
            <div className="grid gap-4">
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
            </div>
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
                  isUnlocked={isUnlocked}
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

          <TabsContent value="api-keys" className="space-y-6">
            <div className="max-w-4xl mx-auto">
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
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <FeedActions
                actions={globalConfig.feedActions}
                onActionsChange={(actions) => setGlobalConfig({ ...globalConfig, feedActions: actions })}
              />
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <GlobalConfiguration
                config={globalConfig}
                repositories={repositories}
                apiKeys={apiKeys}
                onConfigChange={setGlobalConfig}
                onExportConfig={exportReport}
                onImportConfig={() => logInfo('dashboard', 'Import config triggered')}
                onPurgeDatabase={purgeDatabase}
                isUnlocked={isUnlocked}
                authInProgress={authInProgress}
              />
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <SecurityManagement
                apiKeys={apiKeys}
                repositories={repositories}
                config={globalConfig}
                onAuthenticate={unlock}
                isUnlocked={isUnlocked}
              />
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <div className="max-w-4xl mx-auto">
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
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              {!globalConfig.logsDisabled ? (
                <LogsTab logs={logs} onExportLogs={exportLogs} onClearLogs={clearLogs} onFetchServerLogs={fetchServerLogs} />
              ) : (
                <Card className="neo-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Logs Disabled</h3>
                    <p className="text-muted-foreground text-center">
                      Logs are currently disabled. Enable them in Global Configuration to view application logs.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {!isUnlocked && !authInProgress && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={unlock} className="neo-button">
            <Key className="w-4 h-4 mr-2" />
            Authenticate
          </Button>
        </div>
      )}

    </div>
  );
};
