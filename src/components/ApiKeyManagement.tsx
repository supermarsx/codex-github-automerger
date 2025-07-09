import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { ApiKey } from '@/types/dashboard';
import { ApiKeyCard } from '@/components/ApiKeyCard';

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  onAddApiKey: (name: string, key: string) => void;
  onToggleApiKey: (id: string) => void;
  onDeleteApiKey: (id: string) => void;
  onRevertDelete: (id: string) => void;
  showApiKey: string | null;
  onToggleShowApiKey: (id: string) => void;
}

export const ApiKeyManagement: React.FC<ApiKeyManagementProps> = ({
  apiKeys,
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
    <div className="space-y-6">
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
          <Button onClick={handleAddApiKey} className="neo-button">
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
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