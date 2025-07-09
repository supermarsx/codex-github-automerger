
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

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const {
    repositories,
    apiKeys,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    logs,
    isLoading,
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
    exportLogs,
    fetchActivities
  } = useDashboardData();

  // Auto-refresh activities every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities(repositories, apiKeys);
    }, 30000);

    return () => clearInterval(interval);
  }, [repositories, apiKeys, fetchActivities]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(repositories, apiKeys);
  }, [repositories, apiKeys, fetchActivities]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        {!globalConfig.hideHeader && <DashboardHeader apiKeys={apiKeys} />}

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} statsPeriod={globalConfig.statsPeriod} />

        {/* Connection Status */}
        <ConnectionManager apiKeys={apiKeys} checkInterval={globalConfig.serverCheckInterval} />

        {/* Main Content */}
        <div className="pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          <TabsContent value="feed" className="space-y-6 max-w-4xl mx-auto">
            <RealtimeFeed activities={activities} onExportReport={exportReport} isLoading={isLoading} />
            <WatchMode 
              repositories={repositories} 
              apiKeys={apiKeys} 
              onUpdateRepository={(repoId, updates) => console.log('Update repo:', repoId, updates)}
            />
          </TabsContent>

          <TabsContent value="repositories" className="space-y-6 max-w-4xl mx-auto">
            <RepositoryManagement
              repositories={repositories}
              apiKeys={apiKeys}
              onToggleRepository={toggleRepository}
              onAddRepository={addRepository}
              onDeleteRepository={deleteRepository}
              onAddBranch={addBranch}
              onRemoveBranch={removeBranch}
              onAddUser={addUser}
              onRemoveUser={removeUser}
              onAddRepositoryFromApiKey={(apiKeyId, repoName, repoOwner) => {
                // Mock implementation - in real app would fetch from GitHub API
                console.log('Adding repository from API key:', { apiKeyId, repoName, repoOwner });
              }}
            />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeyManagement
              apiKeys={apiKeys}
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
                onImportConfig={() => console.log('Import config')}
              />
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityManagement />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <DetailedStatistics repositories={repositories} period={globalConfig.statsPeriod} />
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
          <div className="bg-card/95 backdrop-blur-sm border rounded-full p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('feed')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'feed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('repositories')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'repositories' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <GitBranch className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'api-keys' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'actions' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'config' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'security' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Shield className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'statistics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`p-3 rounded-full transition-all ${
                  activeTab === 'logs' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
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
