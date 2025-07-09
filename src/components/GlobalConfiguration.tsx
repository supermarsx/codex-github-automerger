import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Trash2, Download, Upload, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GlobalConfig } from '@/types/dashboard';

interface GlobalConfigurationProps {
  config: GlobalConfig;
  onConfigChange: (config: GlobalConfig) => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
}

export const GlobalConfiguration: React.FC<GlobalConfigurationProps> = ({
  config,
  onConfigChange,
  onExportConfig,
  onImportConfig
}) => {
  const [newPattern, setNewPattern] = useState('');
  const [newUser, setNewUser] = useState('');
  const { toast } = useToast();

  const addBranchPattern = () => {
    if (newPattern) {
      onConfigChange({
        ...config,
        defaultBranchPatterns: [...config.defaultBranchPatterns, newPattern]
      });
      setNewPattern('');
    }
  };

  const removeBranchPattern = (index: number) => {
    onConfigChange({
      ...config,
      defaultBranchPatterns: config.defaultBranchPatterns.filter((_, i) => i !== index)
    });
  };

  const addAllowedUser = () => {
    if (newUser) {
      onConfigChange({
        ...config,
        defaultAllowedUsers: [...config.defaultAllowedUsers, newUser]
      });
      setNewUser('');
    }
  };

  const removeAllowedUser = (index: number) => {
    onConfigChange({
      ...config,
      defaultAllowedUsers: config.defaultAllowedUsers.filter((_, i) => i !== index)
    });
  };

  return (
    <Card className="neo-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Global Configuration
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                onExportConfig();
                toast({ title: "Configuration exported successfully!" });
              }} 
              className="neo-button-secondary" 
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => {
                onImportConfig();
                toast({ title: "Configuration imported successfully!" });
              }} 
              className="neo-button-secondary" 
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-merge Settings */}
        <div className="space-y-4">
          <h4 className="font-black text-lg">Auto-merge Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoMerge">Enable Auto-merge</Label>
              <Switch
                id="autoMerge"
                checked={config.autoMergeEnabled}
                onCheckedChange={(checked) => onConfigChange({ ...config, autoMergeEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="requireApproval">Require Approval</Label>
              <Switch
                id="requireApproval"
                checked={config.requireApproval}
                onCheckedChange={(checked) => onConfigChange({ ...config, requireApproval: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="alertsEnabled">Enable Alerts</Label>
              <Switch
                id="alertsEnabled"
                checked={config.alertsEnabled}
                onCheckedChange={(checked) => onConfigChange({ ...config, alertsEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="encryptionEnabled">Encrypt API Keys</Label>
              <Switch
                id="encryptionEnabled"
                checked={config.encryptionEnabled}
                onCheckedChange={(checked) => onConfigChange({ ...config, encryptionEnabled: checked })}
              />
            </div>
          </div>
        </div>

        {/* Default Branch Patterns */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Default Branch Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {config.defaultBranchPatterns.map((pattern, index) => (
              <Badge key={index} variant="secondary" className="neo-card neo-blue text-black dark:text-white font-bold">
                {pattern}
                <button
                  onClick={() => removeBranchPattern(index)}
                  className="ml-2 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., codex-*"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              className="neo-input"
              onKeyPress={(e) => e.key === 'Enter' && addBranchPattern()}
            />
            <Button onClick={addBranchPattern} className="neo-button" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Default Allowed Users */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Default Allowed Users</h4>
          <div className="flex flex-wrap gap-2">
            {config.defaultAllowedUsers.map((user, index) => (
              <Badge key={index} variant="secondary" className="neo-card neo-green text-black dark:text-white font-bold">
                {user}
                <button
                  onClick={() => removeAllowedUser(index)}
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
              className="neo-input"
              onKeyPress={(e) => e.key === 'Enter' && addAllowedUser()}
            />
            <Button onClick={addAllowedUser} className="neo-button" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="font-black text-lg">Advanced Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoDeleteBranch">Auto Delete Branch After Merge</Label>
              <Switch
                id="autoDeleteBranch"
                checked={config.autoDeleteBranch}
                onCheckedChange={(checked) => onConfigChange({ ...config, autoDeleteBranch: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="allowAllBranches">Allow All Branches</Label>
                <Shield className="w-4 h-4 text-destructive" />
              </div>
              <Switch
                id="allowAllBranches"
                checked={config.allowAllBranches}
                onCheckedChange={(checked) => onConfigChange({ ...config, allowAllBranches: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="allowAllUsers">Allow All Users</Label>
                <Shield className="w-4 h-4 text-destructive" />
              </div>
              <Switch
                id="allowAllUsers"
                checked={config.allowAllUsers}
                onCheckedChange={(checked) => onConfigChange({ ...config, allowAllUsers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fetchMode">Fetch Mode</Label>
              <select
                id="fetchMode"
                value={config.fetchMode}
                onChange={(e) => onConfigChange({ ...config, fetchMode: e.target.value as 'no-auth' | 'github-api' })}
                className="neo-input w-48"
              >
                <option value="no-auth">No Authentication</option>
                <option value="github-api">GitHub API</option>
              </select>
            </div>
          </div>
          {(config.allowAllBranches || config.allowAllUsers) && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-bold">
                <Shield className="w-4 h-4" />
                Security Warning
              </div>
              <p className="text-sm text-destructive mt-1">
                {config.allowAllBranches && "Allowing all branches can be risky. "}
                {config.allowAllUsers && "Allowing all users can compromise security. "}
                Please review your security settings.
              </p>
            </div>
          )}
        </div>

        {/* Alert Configuration */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Alert Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alertThreshold">Alert Threshold (minutes)</Label>
              <Input
                id="alertThreshold"
                type="number"
                value={config.alertThreshold}
                onChange={(e) => onConfigChange({ ...config, alertThreshold: parseInt(e.target.value) })}
                className="neo-input"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                value={config.maxRetries}
                onChange={(e) => onConfigChange({ ...config, maxRetries: parseInt(e.target.value) })}
                className="neo-input"
                min="0"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};