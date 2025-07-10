
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
    toggleAutoMerge,
    toggleWatch,
    toggleDeleteBranch,
    toggleCloseBranch,
    addRepository,
    deleteRepository,
    updateRepository,
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
    exportLogs,
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
    <div className="min-h-screen bg-background p-6">
      {authInProgress && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 neo-card font-black text-xl">
          Waiting for authentication...
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        {!globalConfig.hideHeader && <DashboardHeader apiKeys={apiKeys} />}

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} statsPeriod={globalConfig.statsPeriod} />

        {/* Connection Status */}
        <ConnectionManager apiKeys={apiKeys} checkInterval={globalConfig.serverCheckInterval} />

        {/* Main Content */}
        <div className="pb-24">
          <Tabs value={appState.activeTab} onValueChange={(tab) => {
            updateActiveTab(tab);
            markActivity();
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

          <TabsContent value="repositories" className="space-y-6 max-w-4xl mx-auto">
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
              onToggleAutoMerge={toggleAutoMerge}
              onToggleWatch={toggleWatch}
              onToggleDeleteBranch={toggleDeleteBranch}
              onToggleCloseBranch={toggleCloseBranch}
              onAddRepository={addRepository}
              onDeleteRepository={deleteRepository}
              onAddBranch={addBranch}
              onRemoveBranch={removeBranch}
              onAddUser={addUser}
              onRemoveUser={removeUser}
            />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
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

          <TabsContent value="config" className="space-y-6">
            <div className="max-w-4xl mx-auto">
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

          <TabsContent value="security" className="space-y-6">
            <SecurityManagement
              apiKeys={apiKeys}
              repositories={repositories}
              config={globalConfig}
              onAuthenticate={unlock}
            />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
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

          <TabsContent value="logs" className="space-y-6">
            {!globalConfig.logsDisabled ? (
              <LogsTab logs={logs} onExportLogs={exportLogs} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Logs are currently disabled</p>
                <p className="text-sm">Enable logs in System Configuration to view them here.</p>
              </div>
            )}
          </TabsContent>
          </Tabs>
        </div>
        
        {/* Floating Action Bar */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="neo-card rounded-full p-2">
            <div className="flex items-center gap-2">
              <button
                title="Feed"
                onClick={() => {
                  updateActiveTab('feed');
                  markActivity();
                  logInfo('dashboard', 'Switched to feed tab via floating action bar');
                }}
                className={`rounded-full p-3 ${
                  appState.activeTab === 'feed' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'repositories' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'api-keys' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'actions' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'config' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'security' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'statistics' ? 'neo-button' : 'neo-button-secondary'
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
                className={`rounded-full p-3 ${
                  appState.activeTab === 'logs' ? 'neo-button' : 'neo-button-secondary'
                }`}
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
