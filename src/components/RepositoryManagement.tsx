import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Github, GitBranch, Users } from 'lucide-react';
import { Repository } from '@/types/dashboard';

interface RepositoryManagementProps {
  repositories: Repository[];
  onToggleRepository: (id: string) => void;
  onAddRepository: (name: string, owner: string) => void;
  onAddBranch: (repoId: string, branch: string) => void;
  onRemoveBranch: (repoId: string, branchIndex: number) => void;
  onAddUser: (repoId: string, user: string) => void;
  onRemoveUser: (repoId: string, userIndex: number) => void;
}

export const RepositoryManagement: React.FC<RepositoryManagementProps> = ({
  repositories,
  onToggleRepository,
  onAddRepository,
  onAddBranch,
  onRemoveBranch,
  onAddUser,
  onRemoveUser
}) => {
  const [newRepo, setNewRepo] = useState({ name: '', owner: '', branch: '', user: '' });

  const handleAddRepository = () => {
    if (newRepo.name && newRepo.owner) {
      onAddRepository(newRepo.name, newRepo.owner);
      setNewRepo({ name: '', owner: '', branch: '', user: '' });
    }
  };

  const handleAddBranch = (repoId: string) => {
    onAddBranch(repoId, newRepo.branch);
    setNewRepo({ ...newRepo, branch: '' });
  };

  const handleAddUser = (repoId: string) => {
    onAddUser(repoId, newRepo.user);
    setNewRepo({ ...newRepo, user: '' });
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
          <Button onClick={handleAddRepository} className="neo-button">
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
                  onCheckedChange={() => onToggleRepository(repo.id)}
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
                    value={newRepo.branch}
                    onChange={(e) => setNewRepo({ ...newRepo, branch: e.target.value })}
                    className="neo-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddBranch(repo.id);
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleAddBranch(repo.id)}
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
                    value={newRepo.user}
                    onChange={(e) => setNewRepo({ ...newRepo, user: e.target.value })}
                    className="neo-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddUser(repo.id);
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleAddUser(repo.id)}
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
    </div>
  );
};