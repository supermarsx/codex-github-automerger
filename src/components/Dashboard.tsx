
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/StatsCards';
import { RealtimeFeed } from '@/components/RealtimeFeed';
import { GlobalConfiguration } from '@/components/GlobalConfiguration';
import { DashboardHeader } from '@/components/DashboardHeader';
import { RepositoryManagement } from '@/components/RepositoryManagement';
import { ApiKeyManagement } from '@/components/ApiKeyManagement';
import { SecurityManagement } from '@/components/SecurityManagement';
import { FeedActions } from '@/components/FeedActions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { ConnectionManager } from '@/components/ConnectionManager';
import { LogsTab } from '@/components/LogsTab';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  GitBranch, 
  Key, 
  Settings, 
  Activity,
  FileText,
  Zap,
  BarChart3
} from 'lucide-react';
import { DetailedStatistics } from '@/components/DetailedStatistics';
import { WatchMode } from '@/components/WatchMode';
import { SelectiveRepositoryLoader } from '@/components/SelectiveRepositoryLoader';
import { useAppPersistence } from '@/hooks/useAppPersistence';
import { useLogger } from '@/hooks/useLogger';

export const Dashboard = () => {
  const { appState, updateActiveTab, markActivity } = useAppPersistence();
  const { logInfo, logError, logWarn } = useLogger('info');
  const {
    repositories,
    apiKeys,
    isUnlocked,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    logs,
    isLoading,
    toggleRepository,
    toggleAutoMergeOnClean,
    toggleAutoMergeOnUnstable,
    toggleWatch,
    toggleDeleteOnDirty,
    toggleCloseBranch,
    addRepository,
    deleteRepository,
    updateRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    addRepositoryActivity,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    exportReport,
    setGlobalConfig,
    exportLogs,
    clearLogs,
    fetchActivities,
    getDecryptedApiKey,
    unlock,
    authInProgress,
    showLockedModal,
    setShowLockedModal
  } = useDashboardData();

  // Auto-refresh activities based on configured interval
  useEffect(() => {
    if (repositories.length === 0 || apiKeys.length === 0 || !isUnlocked) return;

    logInfo('dashboard', `Setting up auto-refresh for ${repositories.length} repositories`);
    const interval = setInterval(() => {
      logInfo('dashboard', 'Auto-refreshing activities');
      fetchActivities(repositories, apiKeys, getDecryptedApiKey, addRepositoryActivity);
    }, globalConfig.refreshInterval);

    return () => {
      logInfo('dashboard', 'Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [repositories.length, apiKeys.length, isUnlocked, globalConfig.refreshInterval]);

  // Initial fetch when repos or keys change
  useEffect(() => {
    if (repositories.length > 0 && apiKeys.length > 0 && isUnlocked) {
      logInfo('dashboard', `Initial fetch for ${repositories.length} repositories with ${apiKeys.length} API keys`);
      fetchActivities(repositories, apiKeys, getDecryptedApiKey, addRepositoryActivity);
    }
  }, [repositories.length, apiKeys.length, isUnlocked]);

  // Log app initialization
  useEffect(() => {
    logInfo('dashboard', 'Dashboard initialized', { 
      sessionStart: appState.sessionStartTime,
      activeTab: appState.activeTab
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {authInProgress && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="neo-card p-6 font-black text-xl">
            Waiting for authentication...
          </div>
        </div>
      )}
      <Dialog open={showLockedModal} onOpenChange={setShowLockedModal}>
        <DialogContent className="neo-card">
          <DialogHeader>
            <DialogTitle>API Keys Locked</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Authenticate with your passkey to unlock API keys.</p>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto p-4 space-y-6 pb-32">
        {/* Header */}
        {!globalConfig.hideHeader && (
          <DashboardHeader
            apiKeys={apiKeys}
            darkMode={globalConfig.darkMode}
            onThemeChange={(dark) => setGlobalConfig({ darkMode: dark })}
          />
        )}

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} statsPeriod={globalConfig.statsPeriod} />

        {/* Connection Status */}
        <ConnectionManager apiKeys={apiKeys} checkInterval={globalConfig.serverCheckInterval} />

        {/* Main Content */}
        <div className="w-full max-w-2xl mx-auto">
          <Tabs value={appState.activeTab} onValueChange={(tab) => {
            updateActiveTab(tab);
            markActivity();
            logInfo('dashboard', `Switched to tab: ${tab}`);
          }} className="w-full">

            <TabsContent value="feed" className="space-y-4">
              <div className="w-full">
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

            <TabsContent value="repositories" className="space-y-4">
              <div className="w-full">
                <SelectiveRepositoryLoader
                  apiKeys={apiKeys}
                  existingRepos={repositories.map(r => `${r.owner}/${r.name}`)}
                  getDecryptedApiKey={getDecryptedApiKey}
                  onAddRepository={(repoData) => {
                    addRepository(repoData.name, repoData.owner);
                    // Associate with API key
                    const newRepo = repositories.find(r => r.name === repoData.name && r.owner === repoData.owner);
                    if (newRepo) {
                      // Update the repository with API key association
                      console.log('Repository added from API key:', repoData);
                    }
                  }}
                />
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
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-4">
              <div className="w-full">
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

            <TabsContent value="actions" className="space-y-4">
              <div className="w-full">
                <FeedActions
                  actions={globalConfig.feedActions}
                  onActionsChange={(actions) => setGlobalConfig({ ...globalConfig, feedActions: actions })}
                />
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="w-full">
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

            <TabsContent value="security" className="space-y-4">
              <div className="w-full">
                <SecurityManagement
                  apiKeys={apiKeys}
                  repositories={repositories}
                  config={globalConfig}
                  onAuthenticate={unlock}
                />
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              <div className="w-full">
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

            <TabsContent value="logs" className="space-y-4">
              <div className="w-full">
                {!globalConfig.logsDisabled ? (
                  <LogsTab logs={logs} onExportLogs={exportLogs} onClearLogs={clearLogs} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Logs are currently disabled</p>
                    <p className="text-sm">Enable logs in System Configuration to view them here.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="neo-card rounded-full px-3 py-2 backdrop-blur-sm bg-card/95 border-2 border-foreground shadow-lg">
          <div className="flex items-center gap-1">
            <button
              title="Feed"
              onClick={() => {
                updateActiveTab('feed');
                markActivity();
                logInfo('dashboard', 'Switched to feed tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'feed' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              title="Repositories"
              onClick={() => {
                updateActiveTab('repositories');
                markActivity();
                logInfo('dashboard', 'Switched to repositories tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'repositories' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              title="API Keys"
              onClick={() => {
                updateActiveTab('api-keys');
                markActivity();
                logInfo('dashboard', 'Switched to api-keys tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'api-keys' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              title="Actions"
              onClick={() => {
                updateActiveTab('actions');
                markActivity();
                logInfo('dashboard', 'Switched to actions tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'actions' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              title="Config"
              onClick={() => {
                updateActiveTab('config');
                markActivity();
                logInfo('dashboard', 'Switched to config tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'config' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              title="Security"
              onClick={() => {
                updateActiveTab('security');
                markActivity();
                logInfo('dashboard', 'Switched to security tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'security' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>
            <button
              title="Statistics"
              onClick={() => {
                updateActiveTab('statistics');
                markActivity();
                logInfo('dashboard', 'Switched to statistics tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'statistics' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              title="Logs"
              onClick={() => {
                updateActiveTab('logs');
                markActivity();
                logInfo('dashboard', 'Switched to logs tab via floating action bar');
              }}
              className={`rounded-full p-3 transition-all duration-200 ${
                appState.activeTab === 'logs' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
