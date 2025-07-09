
import React from 'react';
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

export const Dashboard = () => {
  const {
    repositories,
    apiKeys,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    logs,
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
    exportLogs
  } = useDashboardData();

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
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 h-16 gap-2 p-0">
            <TabsTrigger value="feed" className="neo-button-secondary h-12 min-w-0">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="repositories" className="neo-button-secondary h-12 min-w-0">
              <GitBranch className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Repos</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="neo-button-secondary h-12 min-w-0">
              <Key className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="neo-button-secondary h-12 min-w-0">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="neo-button-secondary h-12 min-w-0">
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="neo-button-secondary h-12 min-w-0">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="neo-button-secondary h-12 min-w-0">
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="neo-button-secondary h-12 min-w-0">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate ml-2 hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6 max-w-4xl mx-auto">
            <RealtimeFeed activities={activities} onExportReport={exportReport} />
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
    </div>
  );
};
