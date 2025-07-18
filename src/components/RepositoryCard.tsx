import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { abbreviate } from '@/utils/text';
import { 
  Github, 
  Plus, 
  Users, 
  GitBranch, 
  ChevronDown, 
  ChevronUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Upload
} from 'lucide-react';
import { Repository, ActivityItem } from '@/types/dashboard';

interface RepositoryCardProps {
  repo: Repository;
  onToggle: (id: string) => void;
  onToggleAutoMergeOnClean: (id: string) => void;
  onToggleAutoMergeOnUnstable: (id: string) => void;
  onAddBranch: (repoId: string, branch: string) => void;
  onRemoveBranch: (repoId: string, index: number) => void;
  onAddUser: (repoId: string, user: string) => void;
  onRemoveUser: (repoId: string, index: number) => void;
  onToggleAlerts: (repoId: string) => void;
  onExportConfig: (repoId: string) => void;
  onImportConfig: (repoId: string) => void;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repo,
  onToggle,
  onToggleAutoMergeOnClean,
  onToggleAutoMergeOnUnstable,
  onAddBranch,
  onRemoveBranch,
  onAddUser,
  onRemoveUser,
  onToggleAlerts,
  onExportConfig,
  onImportConfig
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  const [newUser, setNewUser] = useState('');

  const handleAddBranch = () => {
    if (newBranch) {
      onAddBranch(repo.id, newBranch);
      setNewBranch('');
    }
  };

  const handleAddUser = () => {
    if (newUser) {
      onAddUser(repo.id, newUser);
      setNewUser('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'merged': return 'nb-green';
      case 'pending': return 'nb-yellow';
      case 'failed': return 'nb-red';
      default: return 'nb-purple';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'failure': return <XCircle className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const successRate = repo.stats.totalMerges > 0 
    ? ((repo.stats.successfulMerges / repo.stats.totalMerges) * 100).toFixed(1)
    : '0';

  return (
    <Card className="nb-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`nb-card p-2 ${repo.enabled ? 'nb-green' : 'nb-red'}`}>
              <Github className="w-5 h-5 text-black" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">
                {repo.owner}/{repo.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`nb-card ${repo.enabled ? 'nb-green' : 'nb-red'} text-black font-bold text-xs`}>
                  {repo.enabled ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="secondary" className={`nb-card ${repo.autoMergeOnClean ? 'nb-green' : 'nb-red'} text-black font-bold text-xs`}>
                  {repo.autoMergeOnClean ? 'Auto Merge on Clean' : 'Auto Merge on Clean Off'}
                </Badge>
                <Badge variant="secondary" className="nb-card nb-blue text-black font-bold text-xs">
                  {successRate}% Success
                </Badge>
                <Badge variant="secondary" className="nb-card nb-purple text-black font-bold text-xs">
                  {repo.stats.totalMerges} Total
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onExportConfig(repo.id)}
              className="nb-button-secondary"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onImportConfig(repo.id)}
              className="nb-button-secondary"
              size="sm"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Switch
              checked={repo.enabled}
              onCheckedChange={() => onToggle(repo.id)}
              className="scale-125"
            />
          </div>
        </div>
        
        {/* Recent Activity Summary */}
        {repo.recentPull && (
          <div className="mt-4 p-3 rounded nb-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Latest Pull Request</p>
                <p className="text-xs text-muted-foreground">
                  #{repo.recentPull.number} - {repo.recentPull.title}
                </p>
              </div>
              <Badge variant="secondary" className={`nb-card ${getStatusColor(repo.recentPull.status)} text-black font-bold`}>
                {repo.recentPull.status}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between nb-button-secondary">
            Configuration & Activity
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Alert Configuration */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm">Alert Configuration</h4>
                <p className="text-xs text-muted-foreground">Enable alerts for non-mergeable PRs</p>
              </div>
              <Switch
                checked={repo.alertsEnabled}
                onCheckedChange={() => onToggleAlerts(repo.id)}
                className="scale-125"
              />
            </div>

            {/* Auto-merge Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm">Auto Merge on Clean</h4>
                <p className="text-xs text-muted-foreground">Automatically merge PRs when checks pass</p>
              </div>
              <Switch
                checked={repo.autoMergeOnClean}
                onCheckedChange={() => onToggleAutoMergeOnClean(repo.id)}
                className="scale-125"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm">Auto Merge on Unstable</h4>
              </div>
              <Switch
                checked={repo.autoMergeOnUnstable ?? false}
                onCheckedChange={() => onToggleAutoMergeOnUnstable(repo.id)}
                className="scale-125"
              />
            </div>

            {/* Repository Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="nb-card p-3 nb-yellow text-center">
                <p className="text-black font-semibold text-lg">{repo.stats.pendingMerges}</p>
                <p className="text-black text-xs">Pending</p>
              </div>
              <div className="nb-card p-3 nb-green text-center">
                <p className="text-black font-semibold text-lg">{repo.stats.successfulMerges}</p>
                <p className="text-black text-xs">Success</p>
              </div>
              <div className="nb-card p-3 nb-red text-center">
                <p className="text-black font-semibold text-lg">{repo.stats.failedMerges}</p>
                <p className="text-black text-xs">Failed</p>
              </div>
              <div className="nb-card p-3 nb-purple text-center">
                <p className="text-black font-semibold text-lg">{repo.stats.totalMerges}</p>
                <p className="text-black text-xs">Total</p>
              </div>
            </div>

            {/* Allowed Branch Patterns */}
            <div>
              <h4 className="font-black text-sm mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Allowed Branch Patterns
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {repo.allowedBranches.map((branch, index) => (
                  <Badge key={index} variant="secondary" className="nb-card nb-blue text-black font-bold" title={branch}>
                    {abbreviate(branch)}
                    <button
                      onClick={() => onRemoveBranch(repo.id, index)}
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
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="nb-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddBranch()}
                />
                <Button onClick={handleAddBranch} className="nb-button" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Allowed Users */}
            <div>
              <h4 className="font-black text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Allowed Users
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {repo.allowedUsers.map((user, index) => (
                  <Badge key={index} variant="secondary" className="nb-card nb-green text-black font-bold">
                    {user}
                    <button
                      onClick={() => onRemoveUser(repo.id, index)}
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
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  className="nb-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                />
                <Button onClick={handleAddUser} className="nb-button" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Repository Activity Feed */}
            <div>
              <h4 className="font-black text-sm mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Activity
              </h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {repo.activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 p-2 rounded bg-muted">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};