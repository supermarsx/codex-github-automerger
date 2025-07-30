import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, Settings, CheckCircle, AlertCircle, Plus, Trash2, Webhook, Key, Timer, Save, Eye, EyeOff, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasskeyService, PasskeyCredential } from '@/utils/passkeyAuth';
import { WebhookService, WebhookConfig, WebhookEvent } from '@/utils/webhooks';
import { EncryptionService } from '@/utils/encryption';
import { ApiKey, Repository, GlobalConfig } from '@/types/dashboard';

interface SecurityManagementProps {
  apiKeys: ApiKey[];
  repositories: Repository[];
  config: GlobalConfig;
  onAuthenticate: () => void;
  onLock: () => void;
  isUnlocked: boolean;
}

export const SecurityManagement: React.FC<SecurityManagementProps> = ({ apiKeys, repositories, config, onAuthenticate, onLock, isUnlocked }) => {
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{ iterations: number; time: number } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkDuration, setBenchmarkDuration] = useState(1000);
  const [targetIterations, setTargetIterations] = useState(100000);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as WebhookEvent[]
  });
  const [username, setUsername] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setPasskeySupported(PasskeyService.isSupported());
    PasskeyService.getStoredCredentials().then(setCredentials);
    WebhookService.getWebhooks().then(setWebhooks);
  }, []);

  const handleRegisterPasskey = async () => {
    if (!username) {
      toast({ title: "Username required", variant: "destructive" });
      return;
    }

    const result = await PasskeyService.register(username);
    if (result.success) {
      PasskeyService.getStoredCredentials().then(setCredentials);
      toast({ title: "Passkey registered successfully!" });
      setShowPasskeyDialog(false);
      setUsername('');
    } else {
      toast({ title: "Registration failed", description: result.error, variant: "destructive" });
    }
  };

  const handleAuthenticatePasskey = async () => {
    await onAuthenticate();
  };

  const handleRemoveCredential = async () => {
    if (!credentialToDelete) return;
    const result = await PasskeyService.authenticate();
    if (!result.success) {
      toast({ title: 'Authentication failed', variant: 'destructive' });
      setCredentialToDelete(null);
      return;
    }
    await PasskeyService.removeCredential(credentialToDelete);
    PasskeyService.getStoredCredentials().then(setCredentials);
    setCredentialToDelete(null);
    toast({ title: 'Passkey removed' });
  };

  const handleSaveWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({ title: "Name and URL required", variant: "destructive" });
      return;
    }

    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      ...newWebhook,
      active: true,
      created: new Date()
    };

    WebhookService.saveWebhook(webhook).then(() =>
      WebhookService.getWebhooks().then(setWebhooks)
    );
    setNewWebhook({ name: '', url: '', secret: '', events: [] });
    setShowWebhookDialog(false);
    toast({ title: "Webhook configured successfully!" });
  };

  const handleDeleteWebhook = (id: string) => {
    WebhookService.deleteWebhook(id).then(() =>
      WebhookService.getWebhooks().then(setWebhooks)
    );
    toast({ title: "Webhook deleted" });
  };

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const result = await EncryptionService.benchmarkKeyDerivation(benchmarkDuration);
      setBenchmarkResult(result);
      toast({ title: `Benchmark complete: ${result.iterations} iterations in ${result.time}ms` });
    } catch (error) {
      toast({ title: "Benchmark failed", variant: "destructive" });
    } finally {
      setIsBenchmarking(false);
    }
  };

  const generateRecoveryPhrase = () => {
    const phrase = EncryptionService.generateRecoveryPhrase();
    setRecoveryPhrase(phrase.join(' '));
    toast({ title: "Recovery phrase generated" });
  };

  const saveRecoveryPhrase = () => {
    if (!recoveryPhrase) {
      generateRecoveryPhrase();
      return;
    }
    
    const blob = new Blob([recoveryPhrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-phrase-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Recovery phrase saved to file!" });
  };

  const printRecoveryPhrase = () => {
    if (!recoveryPhrase) {
      generateRecoveryPhrase();
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>AutoMerger Recovery Phrase</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .phrase { background: #f5f5f5; padding: 20px; border-radius: 8px; font-size: 18px; line-height: 1.6; }
              .warning { color: #dc2626; font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AutoMerger Recovery Phrase</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <div class="phrase">${recoveryPhrase}</div>
            <div class="warning">
              ⚠️ KEEP THIS PHRASE SECURE AND PRIVATE<br>
              This phrase can recover your encrypted data
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({ title: "Recovery phrase ready for printing!" });
  };

  const webhookEvents: WebhookEvent[] = [
    'pull_request.opened',
    'pull_request.closed',
    'pull_request.merged',
    'merge.success',
    'merge.failure',
    'security.alert',
    'config.updated'
  ];

  const apiKeysEncrypted = apiKeys.every(k => k.encrypted);
  const secureRepoAccess = repositories.every(r => r.fetchMode === 'github-api');
  const passkeyPending = credentials.length === 0;
    return (
      <Card className="neo-card max-w-4xl mx-auto text-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-black flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Security Configuration
        </CardTitle>
        <CardDescription className="font-bold">
          Configure security settings for your automerger
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="neo-card p-4 neo-purple">
            <h4 className="font-black text-lg mb-2 text-black">Passkey Authentication</h4>
            <p className="text-sm text-black font-bold mb-4">
              {passkeySupported ? 'Enable passkey authentication for enhanced security' : 'Passkeys not supported in this browser'}
            </p>
            <div className="space-y-2">
              {credentials.length > 0 && (
                <Button
                  onClick={handleAuthenticatePasskey}
                  disabled={isUnlocked}
                  className={`neo-button bg-black text-white w-full ${isUnlocked ? 'opacity-50 cursor-default' : ''}`}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {isUnlocked ? 'Authenticated' : 'Authenticate'}
                </Button>
              )}
              {credentials.length > 0 && isUnlocked && (
                <Button onClick={onLock} className="neo-button bg-black text-white w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Keys
                </Button>
              )}
              <Dialog open={showPasskeyDialog} onOpenChange={setShowPasskeyDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="neo-button bg-black text-white w-full"
                    disabled={!passkeySupported || credentials.length >= 1}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {credentials.length > 0 ? 'Add Passkey' : 'Setup Passkey'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="neo-card">
                  <DialogHeader>
                    <DialogTitle>Register Passkey</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        className="neo-input"
                      />
                    </div>
                    <Button onClick={handleRegisterPasskey} className="neo-button">
                      Register Passkey
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {credentials.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold">Registered Passkeys:</p>
                {credentials.map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between bg-white/20 p-2 rounded">
                    <span className="text-xs font-bold truncate">
                      {cred.label}
                      <span className="ml-2 text-[10px] text-muted-foreground">({cred.id.slice(0, 8)}...)</span>
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCredentialToDelete(cred.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Dialog open={!!credentialToDelete} onOpenChange={(o) => !o && setCredentialToDelete(null)}>
              <DialogContent className="neo-card">
                <DialogHeader>
                  <DialogTitle>Delete Passkey?</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm">Authenticate with your passkey to confirm deletion.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCredentialToDelete(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRemoveCredential}>Delete</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="neo-card p-4 neo-orange">
            <h4 className="font-black text-lg mb-2 text-black">Webhook Configuration</h4>
            <p className="text-sm text-black font-bold mb-4">
              Configure webhooks for real-time notifications
            </p>
            <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
              <DialogTrigger asChild>
                <Button className="neo-button bg-black text-white w-full">
                  <Webhook className="w-4 h-4 mr-2" />
                  Configure Webhooks
                </Button>
              </DialogTrigger>
              <DialogContent className="neo-card max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                        placeholder="Webhook name"
                        className="neo-input"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                        placeholder="https://example.com/webhook"
                        className="neo-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Secret (optional)</Label>
                    <Input
                      value={newWebhook.secret}
                      onChange={(e) => setNewWebhook({...newWebhook, secret: e.target.value})}
                      placeholder="Webhook secret for validation"
                      className="neo-input"
                    />
                  </div>
                  <div>
                    <Label>Events</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {webhookEvents.map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Checkbox
                            id={event}
                            checked={newWebhook.events.includes(event)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewWebhook({
                                  ...newWebhook,
                                  events: [...newWebhook.events, event]
                                });
                              } else {
                                setNewWebhook({
                                  ...newWebhook,
                                  events: newWebhook.events.filter(e => e !== event)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={event} className="text-xs">
                            {event.replace(/[._]/g, ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleSaveWebhook} className="neo-button">
                    Save Webhook
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {webhooks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold">Active Webhooks:</p>
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between bg-white/20 p-2 rounded">
                    <span className="text-xs font-bold truncate">{webhook.name}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="neo-card p-4 neo-green">
            <h4 className="font-black text-lg mb-2 text-black">Encryption & Recovery</h4>
            <p className="text-sm text-black font-bold mb-4">
              Manage API key encryption and recovery options
            </p>
            <div className="space-y-2">
              <Dialog open={showEncryptionDialog} onOpenChange={setShowEncryptionDialog}>
                <DialogTrigger asChild>
                  <Button className="neo-button bg-black text-white w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Encryption Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="neo-card max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Encryption & Recovery</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold mb-2">Encryption Benchmark</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-bold mb-2">Benchmark Duration (ms)</label>
                          <Input
                            type="number"
                            value={benchmarkDuration}
                            onChange={(e) => setBenchmarkDuration(parseInt(e.target.value) || 1000)}
                            className="neo-input"
                            min="100"
                            max="10000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">Target Iterations</label>
                          <Input
                            type="number"
                            value={targetIterations}
                            onChange={(e) => setTargetIterations(parseInt(e.target.value) || 100000)}
                            className="neo-input"
                            min="1000"
                            max="1000000"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        <Button onClick={runBenchmark} disabled={isBenchmarking} className="neo-button">
                          <Timer className="w-4 h-4 mr-2" />
                          {isBenchmarking ? 'Running...' : 'Run Benchmark'}
                        </Button>
                        
                        {benchmarkResult && (
                          <Badge className="neo-card neo-green text-white font-bold">
                            {benchmarkResult.iterations} iterations / {benchmarkResult.time}ms
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold mb-2">Recovery Phrase</h4>
                      <div className="flex flex-wrap gap-4">
                        <Button onClick={generateRecoveryPhrase} className="neo-button">
                          <Key className="w-4 h-4 mr-2" />
                          Generate Recovery Phrase
                        </Button>
                        
                        <Button onClick={saveRecoveryPhrase} className="neo-button" disabled={!recoveryPhrase}>
                          <Save className="w-4 h-4 mr-2" />
                          Save to File
                        </Button>
                        
                        <Button onClick={printRecoveryPhrase} className="neo-button" disabled={!recoveryPhrase}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </Button>
                        
                        <Button 
                          onClick={() => setShowRecoveryPhrase(!showRecoveryPhrase)}
                          variant="outline"
                          className="neo-button-secondary"
                        >
                          {showRecoveryPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      {recoveryPhrase && (
                        <div className="mt-4">
                          <p className="text-sm font-bold mb-2 text-destructive">
                            Save this recovery phrase securely:
                          </p>
                          <div className="p-4 bg-muted rounded max-w-full">
                            {showRecoveryPhrase ? (
                              <div className="font-mono text-sm break-words whitespace-pre-wrap max-h-32 overflow-y-auto overflow-x-auto">
                                {recoveryPhrase}
                              </div>
                            ) : (
                              <div className="font-mono text-sm">
                                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="neo-card p-4 neo-pink">
          <h4 className="font-black text-lg mb-2 text-black">Security Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {apiKeysEncrypted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-bold text-black">API Keys {apiKeysEncrypted ? 'Encrypted' : 'Unencrypted'}</span>
            </div>
            <div className="flex items-center gap-2">
              {secureRepoAccess ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-bold text-black">Secure Repository Access</span>
            </div>
            <div className="flex items-center gap-2">
              {passkeyPending ? (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <span className="font-bold text-black">{passkeyPending ? 'Passkey Authentication Pending' : 'Passkey Configured'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );};