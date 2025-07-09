
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/StatsCards';
import { RealtimeFeed } from '@/components/RealtimeFeed';
import { GlobalConfiguration } from '@/components/GlobalConfiguration';
import { DashboardHeader } from '@/components/DashboardHeader';
import { RepositoryManagement } from '@/components/RepositoryManagement';
import { ApiKeyManagement } from '@/components/ApiKeyManagement';
import { SecurityManagement } from '@/components/SecurityManagement';
import { useDashboardData } from '@/hooks/useDashboardData';
import { 
  Shield, 
  GitBranch, 
  Key, 
  Settings, 
  Activity
} from 'lucide-react';

export const Dashboard = () => {
  const {
    repositories,
    apiKeys,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    toggleRepository,
    addRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    toggleShowApiKey,
    exportReport,
    setGlobalConfig
  } = useDashboardData();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <DashboardHeader />

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} />

        {/* Main Content */}
        <Tabs defaultValue="repositories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 neo-card bg-secondary h-16 border-0">
            <TabsTrigger value="repositories" className="neo-button-secondary h-12">
              <GitBranch className="w-4 h-4 mr-2" />
              Repositories
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="neo-button-secondary h-12">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="feed" className="neo-button-secondary h-12">
              <Activity className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="config" className="neo-button-secondary h-12">
              <Settings className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
            <TabsTrigger value="security" className="neo-button-secondary h-12">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repositories" className="space-y-6">
            <RepositoryManagement
              repositories={repositories}
              onToggleRepository={toggleRepository}
              onAddRepository={addRepository}
              onAddBranch={addBranch}
              onRemoveBranch={removeBranch}
              onAddUser={addUser}
              onRemoveUser={removeUser}
            />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeyManagement
              apiKeys={apiKeys}
              onAddApiKey={addApiKey}
              onToggleApiKey={toggleApiKey}
              onDeleteApiKey={deleteApiKey}
              showApiKey={showApiKey}
              onToggleShowApiKey={toggleShowApiKey}
            />
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <RealtimeFeed activities={activities} onExportReport={exportReport} />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <GlobalConfiguration 
              config={globalConfig} 
              onConfigChange={setGlobalConfig}
              onExportConfig={exportReport}
              onImportConfig={() => console.log('Import config')}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
