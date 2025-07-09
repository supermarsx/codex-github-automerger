
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
  Zap
} from 'lucide-react';

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
        <DashboardHeader apiKeys={apiKeys} />

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} />

        {/* Connection Status */}
        <ConnectionManager apiKeys={apiKeys} checkInterval={globalConfig.serverCheckInterval} />

        {/* Main Content */}
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 h-16 gap-2 p-0">
            <TabsTrigger value="feed" className="neo-button-secondary h-12">
              <Activity className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="repositories" className="neo-button-secondary h-12">
              <GitBranch className="w-4 h-4 mr-2" />
              Repositories
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="neo-button-secondary h-12">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="actions" className="neo-button-secondary h-12">
              <Zap className="w-4 h-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="config" className="neo-button-secondary h-12">
              <Settings className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
            <TabsTrigger value="security" className="neo-button-secondary h-12">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="logs" className="neo-button-secondary h-12">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <RealtimeFeed activities={activities} onExportReport={exportReport} />
          </TabsContent>

          <TabsContent value="repositories" className="space-y-6">
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

          <TabsContent value="actions" className="space-y-6">
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

          <TabsContent value="logs" className="space-y-6">
            <LogsTab logs={logs} onExportLogs={exportLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
