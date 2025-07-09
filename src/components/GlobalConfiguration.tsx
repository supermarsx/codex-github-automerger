import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Plus, Trash2, Download, Upload, Shield, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { GlobalConfig, Repository, ApiKey } from '@/types/dashboard';
import { ExportImportService, ExportOptions, SecurityConfig } from '@/utils/exportImport';

interface GlobalConfigurationProps {
  config: GlobalConfig;
  repositories: Repository[];
  apiKeys: ApiKey[];
  onConfigChange: (config: GlobalConfig) => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
}

export const GlobalConfiguration: React.FC<GlobalConfigurationProps> = ({
  config,
  repositories,
  apiKeys,
  onConfigChange,
  onExportConfig,
  onImportConfig
}) => {
  const [newPattern, setNewPattern] = useState('');
  const [newUser, setNewUser] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeGlobalConfig: true,
    includeRepositories: true,
    includeApiKeys: false,
    includeSecurity: false,
    encrypt: false
  });
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
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

  const handleExport = async () => {
    try {
      const securityConfig: SecurityConfig = {
        passkeyEnabled: false,
        webhookSecurityEnabled: false,
        encryptionEnabled: config.encryptionEnabled,
        lastSecurityUpdate: new Date().toISOString()
      };

      const exportData = await ExportImportService.exportData(
        config,
        repositories,
        apiKeys,
        securityConfig,
        exportOptions
      );

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `automerger-config-${timestamp}.json`;
      
      ExportImportService.downloadFile(exportData, filename);
      
      toast({ 
        title: "Configuration exported successfully!",
        description: `Saved as ${filename}`
      });
      setShowExportDialog(false);
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: "Failed to export configuration",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ 
        title: "No file selected", 
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }

    try {
      const exportData = await ExportImportService.readFile(importFile);
      const result = await ExportImportService.importData(exportData, importPassword);

      if (!result.success) {
        toast({ 
          title: "Import failed", 
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      if (result.data?.globalConfig) {
        onConfigChange(result.data.globalConfig);
      }

      toast({ 
        title: "Configuration imported successfully!",
        description: "Settings have been updated"
      });
      setShowImportDialog(false);
      setImportFile(null);
      setImportPassword('');
    } catch (error) {
      toast({ 
        title: "Import failed", 
        description: "Invalid file format",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="neo-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Global Configuration
          </CardTitle>
          <div className="flex items-center gap-4">
            <ThemeToggle 
              theme={config.darkMode ? 'dark' : 'light'} 
              onThemeChange={(theme) => onConfigChange({ ...config, darkMode: theme === 'dark' })}
            />
            <div className="h-6 w-px bg-border" />
            <div className="flex gap-2">
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button className="neo-button-secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
              <DialogContent className="neo-card">
                <DialogHeader>
                  <DialogTitle>Export Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>What to export:</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="global-config"
                          checked={exportOptions.includeGlobalConfig}
                          onCheckedChange={(checked) => 
                            setExportOptions({...exportOptions, includeGlobalConfig: !!checked})
                          }
                        />
                        <Label htmlFor="global-config">Global Configuration</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="repositories"
                          checked={exportOptions.includeRepositories}
                          onCheckedChange={(checked) => 
                            setExportOptions({...exportOptions, includeRepositories: !!checked})
                          }
                        />
                        <Label htmlFor="repositories">Repositories</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="api-keys"
                          checked={exportOptions.includeApiKeys}
                          onCheckedChange={(checked) => 
                            setExportOptions({...exportOptions, includeApiKeys: !!checked})
                          }
                        />
                        <Label htmlFor="api-keys">API Keys</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="security"
                          checked={exportOptions.includeSecurity}
                          onCheckedChange={(checked) => 
                            setExportOptions({...exportOptions, includeSecurity: !!checked})
                          }
                        />
                        <Label htmlFor="security">Security Settings</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="encrypt"
                        checked={exportOptions.encrypt}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, encrypt: !!checked})
                        }
                      />
                      <Label htmlFor="encrypt" className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Encrypt export file
                      </Label>
                    </div>
                    
                    {exportOptions.encrypt && (
                      <Input
                        type="password"
                        placeholder="Encryption password"
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        className="neo-input"
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleExport} className="neo-button">
                      Export Configuration
                    </Button>
                    <Button 
                      onClick={() => setShowExportDialog(false)} 
                      variant="outline"
                      className="neo-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button className="neo-button-secondary" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="neo-card">
                <DialogHeader>
                  <DialogTitle>Import Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Configuration file:</Label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="neo-input"
                    />
                  </div>
                  
                  <div>
                    <Label>Password (if encrypted):</Label>
                    <Input
                      type="password"
                      placeholder="Enter password if file is encrypted"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      className="neo-input"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleImport} className="neo-button">
                      Import Configuration
                    </Button>
                    <Button 
                      onClick={() => setShowImportDialog(false)} 
                      variant="outline"
                      className="neo-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-merge Settings */}
        <div className="space-y-4">
          <h4 className="font-black text-lg">Auto-merge Settings</h4>
          <div className="grid grid-cols-1 gap-4">
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
           <div className="grid grid-cols-1 gap-4">
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
               <Label htmlFor="darkMode">Dark Mode</Label>
               <Switch
                 id="darkMode"
                 checked={config.darkMode}
                onCheckedChange={(checked) => onConfigChange({ ...config, darkMode: checked })}
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

        {/* System Configuration */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">System Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serverCheckInterval">Server Check Interval (seconds)</Label>
              <Input
                id="serverCheckInterval"
                type="number"
                value={config.serverCheckInterval / 1000}
                onChange={(e) => onConfigChange({ ...config, serverCheckInterval: parseInt(e.target.value) * 1000 })}
                className="neo-input"
                min="5"
                max="300"
              />
            </div>
            <div>
              <Label htmlFor="logLevel">Log Level</Label>
              <select
                id="logLevel"
                value={config.logLevel}
                onChange={(e) => onConfigChange({ ...config, logLevel: e.target.value as 'info' | 'warn' | 'error' | 'debug' })}
                className="neo-input w-full"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};