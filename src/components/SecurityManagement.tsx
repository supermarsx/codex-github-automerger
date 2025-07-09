import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, Settings, CheckCircle, AlertCircle, Plus, Trash2, Webhook, Key, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasskeyService, PasskeyCredential } from '@/utils/passkeyAuth';
import { WebhookService, WebhookConfig, WebhookEvent } from '@/utils/webhooks';
import { EncryptionService, BenchmarkResult } from '@/utils/encryption';

export const SecurityManagement: React.FC = () => {
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
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
    setCredentials(PasskeyService.getStoredCredentials());
    setWebhooks(WebhookService.getWebhooks());
  }, []);

  const handleRegisterPasskey = async () => {
    if (!username) {
      toast({ title: "Username required", variant: "destructive" });
      return;
    }

    const result = await PasskeyService.register(username);
    if (result.success) {
      setCredentials(PasskeyService.getStoredCredentials());
      toast({ title: "Passkey registered successfully!" });
      setShowPasskeyDialog(false);
      setUsername('');
    } else {
      toast({ title: "Registration failed", description: result.error, variant: "destructive" });
    }
  };

  const handleAuthenticatePasskey = async () => {
    const result = await PasskeyService.authenticate();
    if (result.success) {
      toast({ title: "Authentication successful!" });
    } else {
      toast({ title: "Authentication failed", description: result.error, variant: "destructive" });
    }
  };

  const handleRemoveCredential = (credentialId: string) => {
    PasskeyService.removeCredential(credentialId);
    setCredentials(PasskeyService.getStoredCredentials());
    toast({ title: "Passkey removed" });
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

    WebhookService.saveWebhook(webhook);
    setWebhooks(WebhookService.getWebhooks());
    setNewWebhook({ name: '', url: '', secret: '', events: [] });
    setShowWebhookDialog(false);
    toast({ title: "Webhook configured successfully!" });
  };

  const handleDeleteWebhook = (id: string) => {
    WebhookService.deleteWebhook(id);
    setWebhooks(WebhookService.getWebhooks());
    toast({ title: "Webhook deleted" });
  };

  const handleBenchmarkEncryption = async () => {
    toast({ title: "Running encryption benchmark..." });
    const results = await EncryptionService.benchmarkIterations();
    setBenchmarkResults(results);
    toast({ title: "Benchmark completed!" });
  };

  const handleGenerateRecoveryPhrase = () => {
    const phrase = EncryptionService.generateRecoveryPhrase();
    setRecoveryPhrase(phrase);
    toast({ title: "Recovery phrase generated" });
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
  return (
    <Card className="neo-card">
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
                <Button onClick={handleAuthenticatePasskey} className="neo-button bg-black text-white w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Authenticate
                </Button>
              )}
              <Dialog open={showPasskeyDialog} onOpenChange={setShowPasskeyDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="neo-button bg-black text-white w-full" 
                    disabled={!passkeySupported}
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
                    <span className="text-xs font-bold truncate">{cred.id.slice(0, 8)}...</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveCredential(cred.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
                      <Button onClick={handleBenchmarkEncryption} className="neo-button">
                        <Timer className="w-4 h-4 mr-2" />
                        Run Benchmark
                      </Button>
                      {benchmarkResults.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {benchmarkResults.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{result.iterations.toLocaleString()} iterations</span>
                              <span className="text-sm">{result.timeMs.toFixed(0)}ms</span>
                              {result.recommended && (
                                <Badge variant="secondary">Recommended</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-bold mb-2">Recovery Phrase</h4>
                      <Button onClick={handleGenerateRecoveryPhrase} className="neo-button">
                        Generate Recovery Phrase
                      </Button>
                      {recoveryPhrase.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-bold mb-2 text-destructive">
                            Save this recovery phrase securely:
                          </p>
                          <div className="grid grid-cols-3 gap-2 p-4 bg-muted rounded">
                            {recoveryPhrase.map((word, index) => (
                              <div key={index} className="text-sm p-2 bg-background rounded text-center">
                                {index + 1}. {word}
                              </div>
                            ))}
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
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-black">API Keys Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-black">Secure Repository Access</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-black">Passkey Authentication Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};