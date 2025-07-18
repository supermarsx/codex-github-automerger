import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Trash2, Key, Shield, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ApiKey } from '@/types/dashboard';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showKey: string | null;
  onToggleShow: (id: string) => void;
}

export const ApiKeyCard: React.FC<ApiKeyCardProps> = ({
  apiKey,
  onToggle,
  onDelete,
  showKey,
  onToggleShow
}) => {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean }>({ open: false });
  
  const maskKey = (key: string) => {
    return key.substring(0, 8) + '*'.repeat(32);
  };

  const handleDelete = () => {
    setDeleteDialog({ open: true });
  };

  const confirmDelete = () => {
    onDelete(apiKey.id);
    setDeleteDialog({ open: false });
  };

  return (
    <Card className="nb-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`nb-card p-2 ${apiKey.isActive ? 'nb-green' : 'nb-red'}`}>
              <Key className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">{apiKey.name}</h3>
                {apiKey.encrypted && (
                  <Badge variant="secondary" className="nb-card nb-purple text-black font-bold">
                    <Shield className="w-3 h-3 mr-1" />
                    Encrypted
                  </Badge>
                )}
                {!apiKey.encrypted && (
                  <Badge variant="secondary" className="nb-card nb-yellow text-black font-bold">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    Unencrypted
                  </Badge>
                )}
                {apiKey.isActive && (
                  <Badge variant="secondary" className={`nb-card font-bold ${
                    apiKey.connectionStatus === 'connected' ? 'nb-green text-black' :
                    apiKey.connectionStatus === 'disconnected' ? 'nb-red text-white' :
                    'nb-yellow text-black'
                  }`}>
                    {apiKey.connectionStatus === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {apiKey.connectionStatus === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
                    {apiKey.connectionStatus === 'testing' && <Clock className="w-3 h-3 mr-1" />}
                    {apiKey.connectionStatus === 'connected' ? 'Connected' :
                     apiKey.connectionStatus === 'disconnected' ? 'Disconnected' :
                     'Testing'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-bold">
                Created: {apiKey.created.toLocaleDateString()}
                {apiKey.lastUsed && ` • Last used: ${apiKey.lastUsed.toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={apiKey.isActive}
              onCheckedChange={() => onToggle(apiKey.id)}
              className="scale-125"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleShow(apiKey.id)}
              className="nb-button-secondary"
            >
              {showKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showKey === apiKey.id && (
          <div className="mt-4 p-3 bg-muted rounded nb-card">
            <code className="text-sm font-mono break-all">
              {apiKey.encrypted ? '[ENCRYPTED] ' + maskKey(apiKey.key) : apiKey.key}
            </code>
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        title="Delete API Key"
        description={`Are you sure you want to delete the API key "${apiKey.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </Card>
  );
};