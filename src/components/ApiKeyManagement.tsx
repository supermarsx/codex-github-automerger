import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ApiKey } from '@/types/dashboard';
import { ApiKeyCard } from '@/components/ApiKeyCard';

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  isUnlocked: boolean;
  onAddApiKey: (name: string, key: string) => void;
  onToggleApiKey: (id: string) => void;
  onDeleteApiKey: (id: string) => void;
  onRevertDelete: (id: string) => void;
  showApiKey: string | null;
  onToggleShowApiKey: (id: string) => void;
}

export const ApiKeyManagement: React.FC<ApiKeyManagementProps> = ({
  apiKeys,
  isUnlocked,
  onAddApiKey,
  onToggleApiKey,
  onDeleteApiKey,
  onRevertDelete,
  showApiKey,
  onToggleShowApiKey
}) => {
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '' });

  const handleAddApiKey = () => {
    if (newApiKey.name && newApiKey.key) {
      onAddApiKey(newApiKey.name, newApiKey.key);
      setNewApiKey({ name: '', key: '' });
    }
  };

  return (
    <div className="relative space-y-6">
      {!isUnlocked && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 neo-card font-black text-xl">
          Need authentication first
        </div>
      )}
      {!isUnlocked && (
        <Alert variant="destructive" className="neo-card">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>API Keys Locked</AlertTitle>
          <AlertDescription>
            API keys are locked until authentication is complete.
          </AlertDescription>
        </Alert>
      )}
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
              onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
              className="neo-input"
            />
            <Input
              placeholder="GitHub Personal Access Token"
              type="password"
              value={newApiKey.key}
              onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
              className="neo-input"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleAddApiKey} className="neo-button">
              <Plus className="w-4 h-4 mr-2" />
              Add API Key
            </Button>
            <Button
              onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo,read:user&description=Auto-merger+bot', '_blank')}
              variant="outline"
              className="neo-button-secondary"
            >
              Get 30-day PAT
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="grid gap-6">
        {apiKeys.map((key) => (
          <ApiKeyCard
            key={key.id}
            apiKey={key}
            onToggle={onToggleApiKey}
            onDelete={onDeleteApiKey}
            showKey={showApiKey}
            onToggleShow={onToggleShowApiKey}
          />
        ))}
      </div>
    </div>
  );
};