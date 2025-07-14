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
import { Settings, Plus, Trash2, Download, Upload, Shield, Lock, Webhook, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GlobalConfig, Repository, ApiKey } from '@/types/dashboard';
import { ExportImportService, ExportOptions, SecurityConfig } from '@/utils/exportImport';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { WebhookManagement } from '@/components/WebhookManagement';
import { ConfigToggle } from '@/components/ConfigToggle';
import { ConfigSelector } from '@/components/ConfigSelector';
import { EditableList } from '@/components/EditableList';
import { useLogger } from '@/hooks/useLogger';
import { useWatchModePersistence } from '@/hooks/useWatchModePersistence';
import { checkUserscriptUpdates } from '@/utils/updateChecker';

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
  const { logInfo, logError, logWarn } = useLogger('info');
  const { clearWatchModeState } = useWatchModePersistence();

  const accentColorOptions = [
    { value: '#000000', label: 'Black' },
    { value: '#1a1a1a', label: 'Dark Grey' },
    { value: '#d3d3d3', label: 'Light Grey' },
    { value: '#ffffff', label: 'White' },
    { value: '#ff0000', label: 'Red' },
    { value: '#ffa500', label: 'Orange' },
    { value: '#ffff00', label: 'Yellow' },
    { value: '#008000', label: 'Green' },
    { value: '#0000ff', label: 'Blue' },
    { value: '#800080', label: 'Purple' }
  ];

  const addBranchPattern = () => {
    if (newPattern) {
      onConfigChange({
        ...config,
        defaultBranchPatterns: [...config.defaultBranchPatterns, newPattern]
      });
      setNewPattern('');
      logInfo('global-config', `Added branch pattern: ${newPattern}`);
      toast({ title: "Branch pattern added successfully!" });
    }
  };

  const removeBranchPattern = (index: number) => {
    const removedPattern = config.defaultBranchPatterns[index];
    onConfigChange({
      ...config,
      defaultBranchPatterns: config.defaultBranchPatterns.filter((_, i) => i !== index)
    });
    logInfo('global-config', `Removed branch pattern: ${removedPattern}`);
    toast({ title: "Branch pattern removed successfully!" });
  };

  const addAllowedUser = () => {
    if (newUser) {
      onConfigChange({
        ...config,
        defaultAllowedUsers: [...config.defaultAllowedUsers, newUser]
      });
      setNewUser('');
      logInfo('global-config', `Added allowed user: ${newUser}`);
      toast({ title: "User added successfully!" });
    }
  };

  const removeAllowedUser = (index: number) => {
    const removedUser = config.defaultAllowedUsers[index];
    onConfigChange({
      ...config,
      defaultAllowedUsers: config.defaultAllowedUsers.filter((_, i) => i !== index)
    });
    logInfo('global-config', `Removed allowed user: ${removedUser}`);
    toast({ title: "User removed successfully!" });
  };

  const handleExport = async () => {
    logInfo('global-config', 'Starting configuration export', exportOptions);
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
      
      logInfo('global-config', `Configuration exported successfully: ${filename}`);
      toast({ 
        title: "Configuration exported successfully!",
        description: `Saved as ${filename}`
      });
      setShowExportDialog(false);
    } catch (error) {
      logError('global-config', 'Export failed', error);
      toast({ 
        title: "Export failed", 
        description: "Failed to export configuration",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      logWarn('global-config', 'Import attempted with no file selected');
      toast({ 
        title: "No file selected", 
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }

    logInfo('global-config', `Starting configuration import from file: ${importFile.name}`);
    try {
      const exportData = await ExportImportService.readFile(importFile);
      const result = await ExportImportService.importData(exportData, importPassword);

      if (!result.success) {
        logError('global-config', 'Import failed', result.error);
        toast({ 
          title: "Import failed", 
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      if (result.data?.globalConfig) {
        onConfigChange(result.data.globalConfig);
        logInfo('global-config', 'Configuration imported and applied successfully');
      }

      toast({ 
        title: "Configuration imported successfully!",
        description: "Settings have been updated"
      });
      setShowImportDialog(false);
      setImportFile(null);
      setImportPassword('');
    } catch (error) {
      logError('global-config', 'Import failed due to invalid file format', error);
      toast({ 
        title: "Import failed", 
        description: "Invalid file format",
        variant: "destructive"
      });
    }
  };

  const handleCheckUpdates = async () => {
    const result = await checkUserscriptUpdates();
    if (result.hasUpdate) {
      toast({
        title: 'Update available',
        description: `Latest version ${result.latestVersion}`
      });
    } else {
      toast({ title: 'No updates found' });
    }
  };

  return (
    <Card className="nb-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Global Configuration
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button className="nb-button-secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
              <DialogContent className="nb-card">
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
                        className="nb-input"
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleExport} className="nb-button">
                      Export Configuration
                    </Button>
                    <Button 
                      onClick={() => setShowExportDialog(false)} 
                      variant="outline"
                      className="nb-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button className="nb-button-secondary" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="nb-card">
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
                      className="nb-input"
                    />
                  </div>
                  
                  <div>
                    <Label>Password (if encrypted):</Label>
                    <Input
                      type="password"
                      placeholder="Enter password if file is encrypted"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      className="nb-input"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleImport} className="nb-button">
                      Import Configuration
                    </Button>
                    <Button 
                      onClick={() => setShowImportDialog(false)} 
                      variant="outline"
                      className="nb-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
              <Button onClick={handleCheckUpdates} className="nb-button-secondary" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Updates
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Approval Settings */}
        <div className="space-y-4">
          <h4 className="font-black text-lg">Approval Settings</h4>
          <div className="space-y-4">
            <ConfigToggle
              id="requireApproval"
              label="Require Approval"
              checked={config.requireApproval}
              onCheckedChange={(checked) => onConfigChange({ ...config, requireApproval: checked })}
            />
            <ConfigToggle
              id="alertsEnabled"
              label="Enable Alerts"
              checked={config.alertsEnabled}
              onCheckedChange={(checked) => onConfigChange({ ...config, alertsEnabled: checked })}
            />
            <ConfigToggle
              id="encryptionEnabled"
              label="Encrypt API Keys"
              checked={config.encryptionEnabled}
              onCheckedChange={(checked) => onConfigChange({ ...config, encryptionEnabled: checked })}
            />
          </div>
        </div>

        {/* Default Branch Patterns */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Default Branch Patterns</h4>
          <EditableList
            items={config.defaultBranchPatterns}
            reorderable
            onItemsChange={(items) => onConfigChange({ ...config, defaultBranchPatterns: items })}
            placeholder="e.g., codex-*"
            itemColor="nb-blue"
          />
        </div>

        {/* Default Allowed Users */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Default Allowed Users</h4>
          <EditableList
            items={config.defaultAllowedUsers}
            reorderable
            onItemsChange={(items) => onConfigChange({ ...config, defaultAllowedUsers: items })}
            placeholder="e.g., github-actions[bot]"
            itemColor="nb-green"
          />
        </div>

        {/* Protected Branches */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">Protected Branches</h4>
          <EditableList
            items={config.protectedBranches}
            reorderable
            onItemsChange={(items) => onConfigChange({ ...config, protectedBranches: items })}
            placeholder="e.g., main"
            itemColor="nb-red"
          />
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="font-black text-lg">Advanced Settings</h4>
           <div className="grid grid-cols-1 gap-4">
            <ConfigToggle
               id="autoMergeOnClean"
               label="Auto Merge on Clean"
               checked={config.autoMergeOnClean}
               onCheckedChange={(checked) => onConfigChange({ ...config, autoMergeOnClean: checked })}
             />
            <ConfigToggle
               id="autoMergeOnUnstable"
               label="Auto Merge on Unstable"
               checked={config.autoMergeOnUnstable}
               onCheckedChange={(checked) => onConfigChange({ ...config, autoMergeOnUnstable: checked })}
             />
            <ConfigToggle
               id="autoDeleteOnDirty"
               label="Auto Delete on Dirty"
               checked={config.autoDeleteOnDirty}
               onCheckedChange={(checked) => onConfigChange({ ...config, autoDeleteOnDirty: checked })}
             />
              <ConfigToggle
                id="confirmBranchDeletion"
                label="Confirm Branch Deletion"
                checked={config.confirmBranchDeletion}
                onCheckedChange={(checked) => onConfigChange({ ...config, confirmBranchDeletion: checked })}
              />
              <ConfigToggle
                id="autoArchiveClose"
                label="Auto-Archive on Close"
                checked={config.autoArchiveClose}
                onCheckedChange={(checked) => onConfigChange({ ...config, autoArchiveClose: checked })}
              />
              <ConfigToggle
                id="autoArchiveClosed"
                label="Auto-Archive Closed PRs"
                checked={config.autoArchiveClosed}
                onCheckedChange={(checked) => onConfigChange({ ...config, autoArchiveClosed: checked })}
              />
            <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="allowAllBranches" className="font-bold">Allow All Branches</Label>
                  <Shield className="w-4 h-4 text-destructive" />
                </div>
                <Switch
                  id="allowAllBranches"
                  checked={config.allowAllBranches}
                  onCheckedChange={(checked) => onConfigChange({ ...config, allowAllBranches: checked })}
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="allowAllUsers" className="font-bold">Allow All Users</Label>
                  <Shield className="w-4 h-4 text-destructive" />
                </div>
                <Switch
                  id="allowAllUsers"
                  checked={config.allowAllUsers}
                  onCheckedChange={(checked) => onConfigChange({ ...config, allowAllUsers: checked })}
                />
              </div>
             <ConfigSelector
                id="fetchMode"
                label="Fetch Mode"
                value={config.fetchMode}
                onChange={(value) => onConfigChange({ ...config, fetchMode: value as 'no-auth' | 'github-api' })}
                options={[
                  { value: 'no-auth', label: 'No Authentication' },
                  { value: 'github-api', label: 'GitHub API' }
                ]}
              />
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
          <div className="space-y-4">
            <ConfigSelector
              id="alertThreshold"
              label="Alert Threshold (minutes)"
              value={config.alertThreshold}
              onChange={(value) => onConfigChange({ ...config, alertThreshold: parseInt(value) })}
              type="number"
              min={1}
            />
            <ConfigSelector
              id="maxRetries"
              label="Max Retries"
              value={config.maxRetries}
              onChange={(value) => onConfigChange({ ...config, maxRetries: parseInt(value) })}
              type="number"
              min={0}
            />
          </div>
        </div>

        {/* System Configuration */}
        <div className="space-y-3">
          <h4 className="font-black text-lg">System Configuration</h4>
          <div className="space-y-4">
            <ConfigSelector
              id="serverCheckInterval"
              label="Server Check Interval (seconds)"
              value={config.serverCheckInterval / 1000}
              onChange={(value) => onConfigChange({ ...config, serverCheckInterval: parseInt(value) * 1000 })}
              type="number"
              min={5}
              max={300}
            />
            <ConfigSelector
              id="refreshInterval"
              label="Activity Refresh Interval (seconds)"
              value={config.refreshInterval / 1000}
              onChange={(value) => onConfigChange({ ...config, refreshInterval: parseInt(value) * 1000 })}
              type="number"
              min={1}
              max={300}
            />
            <ConfigSelector
              id="logLevel"
              label="Log Level"
              value={config.logLevel}
              onChange={(value) => onConfigChange({ ...config, logLevel: value as 'info' | 'warn' | 'error' | 'debug' })}
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' }
              ]}
            />
            <ConfigToggle
              id="darkMode"
              label="Dark Mode"
              checked={config.darkMode}
              onCheckedChange={(checked) => onConfigChange({ ...config, darkMode: checked })}
            />
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="accentColor" className="font-bold">Accent Color</Label>
              <Select
                value={config.accentColor}
                onValueChange={(value) => onConfigChange({ ...config, accentColor: value })}
              >
                <SelectTrigger className="nb-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accentColorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border border-foreground" style={{ backgroundColor: option.value }} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ConfigToggle
              id="hideHeader"
              label="Hide Header"
              checked={config.hideHeader}
              onCheckedChange={(checked) => onConfigChange({ ...config, hideHeader: checked })}
            />
              <ConfigToggle
                id="logsDisabled"
                label="Disable Logs"
                checked={config.logsDisabled}
                onCheckedChange={(checked) => onConfigChange({ ...config, logsDisabled: checked })}
              />
              <ConfigToggle
                id="checkUserscriptUpdates"
                label="Check Userscript Updates"
                checked={config.checkUserscriptUpdates}
                onCheckedChange={(checked) => onConfigChange({ ...config, checkUserscriptUpdates: checked })}
              />
              <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  clearWatchModeState();
                  toast({ title: 'Watch mode data cleared' });
                }}
                className="nb-button bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Watch Mode
              </Button>
            </div>
          </div>
        </div>

        {/* Webhook Management */}
        <WebhookManagement
          webhooks={config.webhooks}
          onWebhooksChange={(webhooks) => {
            onConfigChange({ ...config, webhooks });
            toast({ title: "Webhooks updated successfully!" });
          }}
        />
      </CardContent>
    </Card>
  );
};