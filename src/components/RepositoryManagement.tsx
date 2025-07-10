import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Github, GitBranch, Users, Key, Webhook, Shield, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Repository } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EditableList } from '@/components/EditableList';


interface RepositoryManagementProps {
  repositories: Repository[];
  apiKeys: any[];
  onToggleRepository: (id: string) => void;
  onToggleAutoMergeOnClean: (id: string) => void;
  onToggleAutoMergeOnUnstable: (id: string) => void;
  onToggleWatch: (id: string) => void;
  onToggleDeleteOnDirty: (id: string) => void;
  onToggleCloseBranch: (id: string) => void;
  onAddRepository: (name: string, owner: string) => void;
  onDeleteRepository: (id: string) => void;
  onAddBranch: (repoId: string, branch: string) => void;
  onRemoveBranch: (repoId: string, branchIndex: number) => void;
  onAddUser: (repoId: string, user: string) => void;
  onRemoveUser: (repoId: string, userIndex: number) => void;
}

export const RepositoryManagement: React.FC<RepositoryManagementProps> = ({
  repositories,
  apiKeys,
  onToggleRepository,
  onToggleAutoMergeOnClean,
  onToggleAutoMergeOnUnstable,
  onToggleWatch,
  onToggleDeleteOnDirty,
  onToggleCloseBranch,
  onAddRepository,
  onDeleteRepository,
  onAddBranch,
  onRemoveBranch,
  onAddUser,
  onRemoveUser
}) => {
  const [newRepo, setNewRepo] = useState({ name: '', owner: '', branch: '', user: '' });
  const [collapsedRepos, setCollapsedRepos] = useState<Set<string>>(new Set(repositories.map(r => r.id)));
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; repoId: string; repoName: string }>({ 
    open: false, 
    repoId: '', 
    repoName: '' 
  });
  const { toast } = useToast();

  const handleAddRepository = () => {
    if (newRepo.name && newRepo.owner) {
      onAddRepository(newRepo.name, newRepo.owner);
      setNewRepo({ name: '', owner: '', branch: '', user: '' });
      toast({ title: "Repository added successfully!" });
    }
  };

  const handleAddBranch = (repoId: string) => {
    onAddBranch(repoId, newRepo.branch);
    setNewRepo({ ...newRepo, branch: '' });
    toast({ title: "Branch pattern added successfully!" });
  };

  const handleAddUser = (repoId: string) => {
    onAddUser(repoId, newRepo.user);
    setNewRepo({ ...newRepo, user: '' });
    toast({ title: "User added successfully!" });
  };

  const toggleRepoCollapse = (repoId: string) => {
    setCollapsedRepos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  };

  const handleDeleteRepository = (repo: Repository) => {
    setDeleteDialog({
      open: true,
      repoId: repo.id,
      repoName: `${repo.owner}/${repo.name}`
    });
  };

  const confirmDelete = () => {
    onDeleteRepository(deleteDialog.repoId);
    setDeleteDialog({ open: false, repoId: '', repoName: '' });
    toast({ title: "Repository deleted successfully!" });
  };

  return (
    <div className="space-y-6">
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
              onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
              className="neo-input"
            />
            <Input
              placeholder="Owner/Organization"
              value={newRepo.owner}
              onChange={(e) => setNewRepo({ ...newRepo, owner: e.target.value })}
              className="neo-input"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddRepository} className="neo-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Repository
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Repository List */}
      <div className="grid gap-6">
        {repositories.map((repo) => (
          <Collapsible key={repo.id} open={!collapsedRepos.has(repo.id)}>
            <Card className="neo-card">
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
                        {repo.enabled ? 'Active' : 'Inactive'} |
                        {repo.autoMergeOnClean ? ' Automerge Clean' : ' Automerge Clean Off'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={repo.enabled}
                      onCheckedChange={() => onToggleRepository(repo.id)}
                      className="scale-125"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRepository(repo)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRepoCollapse(repo.id)}
                        className="p-2"
                      >
                        {collapsedRepos.has(repo.id) ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Allowed Branches and Users - Two Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Allowed Branches */}
                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Allowed Branch Patterns
                      </h4>
                       <EditableList
                         items={repo.allowedBranches}
                         reorderable
                         onItemsChange={(items) => {
                           // Update branch patterns for this repository
                           const updatedBranches = items;
                           // This would need to be implemented in the parent component
                           console.log('Update branches for repo:', repo.id, updatedBranches);
                         }}
                         placeholder="e.g., codex-feature/*"
                         itemColor="neo-yellow"
                       />
                       <h4 className="font-black text-lg my-3 flex items-center gap-2">
                         <GitBranch className="w-5 h-5" />
                         Protected Branches
                       </h4>
                       <EditableList
                         items={repo.protectedBranches || []}
                         reorderable
                         onItemsChange={(items) => {
                           const updatedBranches = items;
                           console.log('Update protected branches for repo:', repo.id, updatedBranches);
                         }}
                         placeholder="e.g., main"
                         itemColor="neo-red"
                       />
                    </div>

                    {/* Allowed Users */}
                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Allowed Users
                        {repo.allowAllUsers && (
                          <Badge className="neo-card neo-red text-white font-bold ml-2">
                            <Shield className="w-3 h-3 mr-1" />
                            ALL USERS
                          </Badge>
                        )}
                      </h4>
                       <EditableList
                         items={repo.allowedUsers}
                         reorderable
                         onItemsChange={(items) => {
                           // Update allowed users for this repository
                           const updatedUsers = items;
                           // This would need to be implemented in the parent component
                           console.log('Update users for repo:', repo.id, updatedUsers);
                         }}
                         placeholder="e.g., github-actions[bot]"
                         itemColor="neo-blue"
                       />
                    </div>
                  </div>

                  {/* Repository Configuration - Three Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        API Key
                      </h4>
                      <Select defaultValue={repo.apiKeyId || "global"}>
                        <SelectTrigger className="neo-input">
                          <SelectValue placeholder="Select API key" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Use Global Config</SelectItem>
                          {apiKeys.filter(k => k.isActive).map(key => (
                            <SelectItem key={key.id} value={key.id}>{key.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Fetch Mode
                      </h4>
                      <Select defaultValue={repo.fetchMode || "global"}>
                        <SelectTrigger className="neo-input">
                          <SelectValue placeholder="Select fetch mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Use Global Config</SelectItem>
                          <SelectItem value="github-api">GitHub API</SelectItem>
                          <SelectItem value="no-auth">Public (No Auth)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  <div>
                      <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                        <Webhook className="w-5 h-5" />
                        Webhook Method
                      </h4>
                      <Select defaultValue={repo.webhookMethod || "global"}>
                        <SelectTrigger className="neo-input">
                          <SelectValue placeholder="Select webhook method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Use Global Config</SelectItem>
                          <SelectItem value="custom">Custom Webhook</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Watch</span>
                      <Switch
                        checked={repo.watchEnabled}
                        onCheckedChange={() => onToggleWatch(repo.id)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Auto Merge Clean</span>
                      <Switch
                        checked={repo.autoMergeOnClean}
                        onCheckedChange={() => onToggleAutoMergeOnClean(repo.id)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Auto Merge Unstable</span>
                      <Switch
                        checked={repo.autoMergeOnUnstable ?? false}
                        onCheckedChange={() => onToggleAutoMergeOnUnstable(repo.id)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Auto Delete Dirty</span>
                      <Switch
                        checked={repo.autoDeleteOnDirty ?? false}
                        onCheckedChange={() => onToggleDeleteOnDirty(repo.id)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Auto Close Branch</span>
                        <Switch
                          checked={repo.autoCloseBranch ?? false}
                          onCheckedChange={() => onToggleCloseBranch(repo.id)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Repository"
        description={`Are you sure you want to delete ${deleteDialog.repoName}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};