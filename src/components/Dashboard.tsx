
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/StatsCards';
import { RealtimeFeed } from '@/components/RealtimeFeed';
import { RepositoryCard } from '@/components/RepositoryCard';
import { ApiKeyCard } from '@/components/ApiKeyCard';
import { GlobalConfiguration } from '@/components/GlobalConfiguration';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { 
  Shield, 
  GitBranch, 
  Key, 
  Settings, 
  Github, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Users,
  Lock,
  Unlock,
  Bot,
  Activity
} from 'lucide-react';
import { Repository, ApiKey, MergeStats, GlobalConfig, ActivityItem } from '@/types/dashboard';

export const Dashboard = () => {
  const [repositories, setRepositories] = useState<Repository[]>([
    {
      id: '1',
      name: 'my-project',
      owner: 'username',
      enabled: true,
      allowedBranches: ['codex-feature/*', 'codex-fix/*', 'codex-update/*'],
      allowedUsers: ['github-actions[bot]', 'codex-merger'],
      alertsEnabled: true,
      lastActivity: new Date('2024-01-20'),
      recentPull: {
        number: 123,
        title: 'Add new feature',
        status: 'merged',
        timestamp: new Date('2024-01-20')
      },
      stats: {
        totalMerges: 45,
        successfulMerges: 42,
        failedMerges: 3,
        pendingMerges: 2
      },
      activities: [
        { id: '1', type: 'merge', message: 'PR #123 merged successfully', repo: 'my-project', timestamp: new Date('2024-01-20') },
        { id: '2', type: 'success', message: 'Codex branch auto-merged', repo: 'my-project', timestamp: new Date('2024-01-19') }
      ]
    },
    {
      id: '2',
      name: 'another-repo',
      owner: 'username',
      enabled: false,
      allowedBranches: ['codex-*'],
      allowedUsers: ['github-actions[bot]'],
      alertsEnabled: false,
      lastActivity: new Date('2024-01-15'),
      stats: {
        totalMerges: 12,
        successfulMerges: 10,
        failedMerges: 2,
        pendingMerges: 1
      },
      activities: [
        { id: '3', type: 'failure', message: 'PR #45 failed to merge', repo: 'another-repo', timestamp: new Date('2024-01-15') }
      ]
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production Key',
      key: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      created: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      isActive: true,
      encrypted: true
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      created: new Date('2024-01-10'),
      isActive: false,
      encrypted: false
    }
  ]);

  const [newRepo, setNewRepo] = useState({ name: '', owner: '', branch: '', user: '' });
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '' });
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    autoMergeEnabled: true,
    requireApproval: false,
    alertsEnabled: true,
    encryptionEnabled: true,
    defaultBranchPatterns: ['codex-*'],
    defaultAllowedUsers: ['github-actions[bot]'],
    alertThreshold: 30,
    maxRetries: 3
  });

  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', type: 'merge', message: 'PR #123 merged successfully', repo: 'my-project', timestamp: new Date() },
    { id: '2', type: 'alert', message: 'Non-mergeable PR detected', repo: 'another-repo', timestamp: new Date() }
  ]);

  const mergeStats: MergeStats = {
    session: { pending: 3, merged: 12, failed: 1 },
    total: { pending: 5, merged: 67, failed: 8 }
  };

  const toggleRepository = (id: string) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === id ? { ...repo, enabled: !repo.enabled } : repo
      )
    );
  };

  const addRepository = () => {
    if (newRepo.name && newRepo.owner) {
      const newRepository: Repository = {
        id: Date.now().toString(),
        name: newRepo.name,
        owner: newRepo.owner,
        enabled: true,
        allowedBranches: ['codex-*'],
        allowedUsers: ['github-actions[bot]'],
        alertsEnabled: true,
        stats: { totalMerges: 0, successfulMerges: 0, failedMerges: 0, pendingMerges: 0 },
        activities: []
      };
      setRepositories([...repositories, newRepository]);
      setNewRepo({ name: '', owner: '', branch: '', user: '' });
    }
  };

  const addApiKey = () => {
    if (newApiKey.name && newApiKey.key) {
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newApiKey.name,
        key: newApiKey.key,
        created: new Date(),
        isActive: true,
        encrypted: true
      };
      setApiKeys([...apiKeys, newKey]);
      setNewApiKey({ name: '', key: '' });
    }
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(keys =>
      keys.map(key =>
        key.id === id ? { ...key, isActive: !key.isActive } : key
      )
    );
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(keys => keys.filter(key => key.id !== id));
  };

  const addBranch = (repoId: string, branch: string) => {
    if (branch) {
      setRepositories(repos =>
        repos.map(repo =>
          repo.id === repoId
            ? { ...repo, allowedBranches: [...repo.allowedBranches, branch] }
            : repo
        )
      );
    }
  };

  const removeBranch = (repoId: string, branchIndex: number) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedBranches: repo.allowedBranches.filter((_, i) => i !== branchIndex) }
          : repo
      )
    );
  };

  const addUser = (repoId: string, user: string) => {
    if (user) {
      setRepositories(repos =>
        repos.map(repo =>
          repo.id === repoId
            ? { ...repo, allowedUsers: [...repo.allowedUsers, user] }
            : repo
        )
      );
    }
  };

  const removeUser = (repoId: string, userIndex: number) => {
    setRepositories(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, allowedUsers: repo.allowedUsers.filter((_, i) => i !== userIndex) }
          : repo
      )
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between mb-4">
            <ConnectionStatus />
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="neo-card p-4 neo-purple">
              <Bot className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-6xl font-black uppercase tracking-wider text-shadow">
              Codex Automerger
            </h1>
            <div className="neo-card p-4 neo-green">
              <Github className="w-8 h-8 text-black" />
            </div>
          </div>
          <p className="text-xl font-bold text-muted-foreground">
            Manage your automated merge configurations with style
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards repositories={repositories} apiKeys={apiKeys} mergeStats={mergeStats} />

        {/* Main Content */}
        <Tabs defaultValue="repositories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 neo-card bg-secondary h-16">
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
            {/* Add Repository */}
            <Card className="neo-card">
              <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  Add Repository
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Repository name"
                    value={newRepo.name}
                    onChange={(e) => setNewRepo({...newRepo, name: e.target.value})}
                    className="neo-input"
                  />
                  <Input
                    placeholder="Owner/Organization"
                    value={newRepo.owner}
                    onChange={(e) => setNewRepo({...newRepo, owner: e.target.value})}
                    className="neo-input"
                  />
                </div>
                <Button onClick={addRepository} className="neo-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Repository
                </Button>
              </CardContent>
            </Card>

            {/* Repository List */}
            <div className="grid gap-6">
              {repositories.map((repo) => (
                <Card key={repo.id} className="neo-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`neo-card p-2 ${repo.enabled ? 'neo-green' : 'neo-red'}`}>
                          <Github className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black">
                            {repo.owner}/{repo.name}
                          </CardTitle>
                          <CardDescription className="font-bold">
                            {repo.enabled ? 'Automerge Enabled' : 'Automerge Disabled'}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={repo.enabled}
                        onCheckedChange={() => toggleRepository(repo.id)}
                        className="scale-125"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Allowed Branches */}
                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Allowed Branch Patterns
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {repo.allowedBranches.map((branch, index) => (
                          <Badge key={index} variant="secondary" className="neo-card neo-yellow text-black font-bold">
                            {branch}
                            <button
                              onClick={() => removeBranch(repo.id, index)}
                              className="ml-2 hover:text-red-600"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., codex-feature/*"
                          value={newRepo.branch}
                          onChange={(e) => setNewRepo({...newRepo, branch: e.target.value})}
                          className="neo-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addBranch(repo.id, newRepo.branch);
                              setNewRepo({...newRepo, branch: ''});
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            addBranch(repo.id, newRepo.branch);
                            setNewRepo({...newRepo, branch: ''});
                          }}
                          className="neo-button"
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Allowed Users */}
                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Allowed Users
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {repo.allowedUsers.map((user, index) => (
                          <Badge key={index} variant="secondary" className="neo-card neo-blue text-black font-bold">
                            {user}
                            <button
                              onClick={() => removeUser(repo.id, index)}
                              className="ml-2 hover:text-red-600"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., github-actions[bot]"
                          value={newRepo.user}
                          onChange={(e) => setNewRepo({...newRepo, user: e.target.value})}
                          className="neo-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addUser(repo.id, newRepo.user);
                              setNewRepo({...newRepo, user: ''});
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            addUser(repo.id, newRepo.user);
                            setNewRepo({...newRepo, user: ''});
                          }}
                          className="neo-button"
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            {/* Add API Key */}
            <Card className="neo-card">
              <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  Add API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Key name"
                    value={newApiKey.name}
                    onChange={(e) => setNewApiKey({...newApiKey, name: e.target.value})}
                    className="neo-input"
                  />
                  <Input
                    placeholder="GitHub Personal Access Token"
                    type="password"
                    value={newApiKey.key}
                    onChange={(e) => setNewApiKey({...newApiKey, key: e.target.value})}
                    className="neo-input"
                  />
                </div>
                <Button onClick={addApiKey} className="neo-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add API Key
                </Button>
              </CardContent>
            </Card>

            {/* API Keys List */}
            <div className="grid gap-6">
              {apiKeys.map((key) => (
                <Card key={key.id} className="neo-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`neo-card p-2 ${key.isActive ? 'neo-green' : 'neo-red'}`}>
                          <Key className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg">{key.name}</h3>
                          <p className="text-sm text-muted-foreground font-bold">
                            Created: {key.created.toLocaleDateString()}
                            {key.lastUsed && ` • Last used: ${key.lastUsed.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          className="neo-button-secondary"
                        >
                          {showApiKey === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Switch
                          checked={key.isActive}
                          onCheckedChange={() => toggleApiKey(key.id)}
                          className="scale-125"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                          className="neo-button bg-red-500 hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {showApiKey === key.id && (
                      <div className="mt-4 p-3 bg-muted rounded neo-card">
                        <code className="text-sm font-mono">{key.key}</code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="neo-card">
              <CardHeader>
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Security Configuration
                </CardTitle>
                <CardDescription className="font-bold">
                  Configure security settings for your automerger
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="neo-card p-4 neo-purple">
                    <h4 className="font-black text-lg mb-2 text-black">Passkey Authentication</h4>
                    <p className="text-sm text-black font-bold mb-4">
                      Enable passkey authentication for enhanced security
                    </p>
                    <Button className="neo-button bg-black text-white">
                      <Lock className="w-4 h-4 mr-2" />
                      Configure Passkey
                    </Button>
                  </div>
                  
                  <div className="neo-card p-4 neo-orange">
                    <h4 className="font-black text-lg mb-2 text-black">Webhook Security</h4>
                    <p className="text-sm text-black font-bold mb-4">
                      Secure your GitHub webhooks with encryption
                    </p>
                    <Button className="neo-button bg-black text-white">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Webhooks
                    </Button>
                  </div>
                </div>
                
                <div className="neo-card p-4 neo-pink">
                  <h4 className="font-black text-lg mb-2 text-black">Security Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-black">API Keys Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-black">Secure Repository Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-bold text-black">Passkey Authentication Pending</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
