import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Search, 
  Github, 
  GitBranch, 
  Star, 
  Eye, 
  GitFork,
  Calendar,
  RefreshCw,
  Plus,
  AlertCircle
} from 'lucide-react';
import { createGitHubService } from '@/components/GitHubService';
import { useToast } from '@/hooks/use-toast';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  updated_at: string;
  private: boolean;
  fork: boolean;
  language: string;
  default_branch: string;
}

interface SelectiveRepositoryLoaderProps {
  apiKeys: any[];
  existingRepos: string[];
  getDecryptedApiKey: (id: string) => string | null;
  onAddRepository: (repoData: {
    name: string;
    owner: string;
    apiKeyId: string;
    fullName: string;
    description?: string;
    isPrivate: boolean;
    language?: string;
    defaultBranch: string;
  }) => void;
}

export const SelectiveRepositoryLoader: React.FC<SelectiveRepositoryLoaderProps> = ({
  apiKeys,
  existingRepos,
  getDecryptedApiKey,
  onAddRepository
}) => {
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'stars'>('updated');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const { toast } = useToast();

  const activeApiKeys = apiKeys.filter(key => key.isActive);

  const loadRepositories = async (apiKeyId: string) => {
    const apiKey = activeApiKeys.find(key => key.id === apiKeyId);
    if (!apiKey) return;

    setIsLoading(true);
    try {
      const token = getDecryptedApiKey(apiKey.id);
      if (!token) {
        toast({ title: 'Unlock API keys to load repositories', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const service = createGitHubService(token);
      const repos = await service.fetchRepositories('');
      
      // Convert to our format and filter out already added repos
      const githubRepos: GitHubRepository[] = repos.map(repo => ({
        id: parseInt(repo.id),
        name: repo.name,
        full_name: `${repo.owner}/${repo.name}`,
        owner: {
          login: repo.owner,
          avatar_url: `https://github.com/${repo.owner}.png`
        },
        description: `Repository: ${repo.name}`,
        stargazers_count: 0,
        forks_count: 0,
        watchers_count: 0,
        updated_at: repo.lastActivity?.toISOString() || new Date().toISOString(),
        private: false,
        fork: false,
        language: 'Unknown',
        default_branch: 'main'
      }));

      setRepositories(githubRepos);
      setFilteredRepos(githubRepos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      toast({
        title: "Error loading repositories",
        description: "Failed to fetch repositories from GitHub API",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedApiKey) {
      loadRepositories(selectedApiKey);
    }
  }, [selectedApiKey]);

  useEffect(() => {
    let filtered = repositories;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.owner.login.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(repo => 
        filterType === 'private' ? repo.private : !repo.private
      );
    }

    // Sort repositories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredRepos(filtered);
  }, [repositories, searchTerm, filterType, sortBy]);

  const handleSelectRepo = (repoId: number) => {
    setSelectedRepos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    const reposToAdd = repositories.filter(repo => selectedRepos.has(repo.id));
    
    reposToAdd.forEach(repo => {
      onAddRepository({
        name: repo.name,
        owner: repo.owner.login,
        apiKeyId: selectedApiKey,
        fullName: repo.full_name,
        description: repo.description,
        isPrivate: repo.private,
        language: repo.language,
        defaultBranch: repo.default_branch
      });
    });

    setSelectedRepos(new Set());
    toast({
      title: "Repositories added",
      description: `Added ${reposToAdd.length} repositories to your dashboard`,
    });
  };

  const isRepoAlreadyAdded = (fullName: string) => {
    return existingRepos.includes(fullName);
  };

  return (
    <Card className="neo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Load Repositories from API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Selection */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select an API key" />
              </SelectTrigger>
              <SelectContent>
                {activeApiKeys.length === 0 ? (
                  <SelectItem value="no-keys" disabled>
                    No active API keys available
                  </SelectItem>
                ) : (
                  activeApiKeys.map(key => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => selectedApiKey && loadRepositories(selectedApiKey)}
            disabled={!selectedApiKey || isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {activeApiKeys.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active API keys available</p>
            <p className="text-sm">Add and activate API keys to load repositories</p>
          </div>
        )}

        {selectedApiKey && (
          <>
            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={(value: 'all' | 'public' | 'private') => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'name' | 'updated' | 'stars') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repository List */}
            <div className="border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No repositories found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="p-4 space-y-2">
                    {filteredRepos.map(repo => {
                      const isAlreadyAdded = isRepoAlreadyAdded(repo.full_name);
                      
                      return (
                        <div
                          key={repo.id}
                          className={`flex items-center gap-3 p-3 rounded border ${
                            isAlreadyAdded ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={selectedRepos.has(repo.id)}
                            onCheckedChange={() => handleSelectRepo(repo.id)}
                            disabled={isAlreadyAdded}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{repo.name}</h4>
                              {repo.private && <Badge variant="secondary">Private</Badge>}
                              {repo.fork && <GitFork className="w-4 h-4 text-muted-foreground" />}
                              {isAlreadyAdded && <Badge variant="outline">Already added</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {repo.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {repo.stargazers_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" />
                                {repo.forks_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {repo.watchers_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(repo.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Add Selected Button */}
            {selectedRepos.size > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedRepos.size} repositories selected
                </span>
                <Button onClick={handleAddSelected} className="neo-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Selected ({selectedRepos.size})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};