import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Webhook, Plus, Trash2, Edit, Copy, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Webhook as WebhookType } from '@/types/dashboard';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface WebhookManagementProps {
  webhooks: WebhookType[];
  onWebhooksChange: (webhooks: WebhookType[]) => void;
}

export const WebhookManagement: React.FC<WebhookManagementProps> = ({ 
  webhooks, 
  onWebhooksChange 
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; webhook: WebhookType | null }>({ 
    open: false, 
    webhook: null 
  });
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    headers: {} as Record<string, string>,
    enabled: true
  });
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const { toast } = useToast();

  const availableEvents = [
    'pull_request.opened',
    'pull_request.closed',
    'pull_request.merged',
    'workflow_run.completed',
    'repository.pushed',
    'repository.error',
    'all'
  ];

  const handleAddWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Validation Error",
        description: "Name and URL are required",
        variant: "destructive"
      });
      return;
    }

    const webhook: WebhookType = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      enabled: newWebhook.enabled,
      secret: newWebhook.secret || undefined,
      headers: Object.keys(newWebhook.headers).length > 0 ? newWebhook.headers : undefined,
      created: new Date()
    };

    onWebhooksChange([...webhooks, webhook]);
    setNewWebhook({ name: '', url: '', events: [], secret: '', headers: {}, enabled: true });
    setShowAddDialog(false);
    
    toast({
      title: "Webhook added successfully!",
      description: `${webhook.name} has been configured`
    });
  };

  const handleEditWebhook = (webhook: WebhookType) => {
    setEditingWebhook(webhook);
    setNewWebhook({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || '',
      headers: webhook.headers || {},
      enabled: webhook.enabled
    });
    setShowAddDialog(true);
  };

  const handleUpdateWebhook = () => {
    if (!editingWebhook) return;

    const updatedWebhook: WebhookType = {
      ...editingWebhook,
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      enabled: newWebhook.enabled,
      secret: newWebhook.secret || undefined,
      headers: Object.keys(newWebhook.headers).length > 0 ? newWebhook.headers : undefined
    };

    const updatedWebhooks = webhooks.map(w => 
      w.id === editingWebhook.id ? updatedWebhook : w
    );

    onWebhooksChange(updatedWebhooks);
    setEditingWebhook(null);
    setNewWebhook({ name: '', url: '', events: [], secret: '', headers: {}, enabled: true });
    setShowAddDialog(false);
    
    toast({
      title: "Webhook updated successfully!",
      description: `${updatedWebhook.name} has been modified`
    });
  };

  const handleDeleteWebhook = (webhook: WebhookType) => {
    setDeleteDialog({ open: true, webhook });
  };

  const confirmDelete = () => {
    if (!deleteDialog.webhook) return;

    const updatedWebhooks = webhooks.filter(w => w.id !== deleteDialog.webhook!.id);
    onWebhooksChange(updatedWebhooks);
    setDeleteDialog({ open: false, webhook: null });
    
    toast({
      title: "Webhook deleted successfully!",
      description: `${deleteDialog.webhook.name} has been removed`
    });
  };

  const handleToggleWebhook = (webhookId: string) => {
    const updatedWebhooks = webhooks.map(w => 
      w.id === webhookId ? { ...w, enabled: !w.enabled } : w
    );
    onWebhooksChange(updatedWebhooks);
    
    const webhook = webhooks.find(w => w.id === webhookId);
    toast({
      title: `Webhook ${webhook?.enabled ? 'disabled' : 'enabled'}`,
      description: `${webhook?.name} is now ${webhook?.enabled ? 'disabled' : 'enabled'}`
    });
  };

  const handleTestWebhook = async (webhook: WebhookType) => {
    setTestingWebhook(webhook.id);
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: JSON.stringify({
          test: true,
          webhook_id: webhook.id,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Webhook test successful",
          description: `${webhook.name} responded with status ${response.status}`
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Webhook test failed",
        description: `${webhook.name} failed to respond: ${error}`,
        variant: "destructive"
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleEventToggle = (event: string, checked: boolean) => {
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
  };

  return (
    <div className="space-y-6">
      <Card className="nb-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <Webhook className="w-6 h-6" />
              Webhook Management
            </CardTitle>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="nb-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="nb-card max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingWebhook ? 'Edit Webhook' : 'Add New Webhook'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="webhook-name">Webhook Name</Label>
                      <Input
                        id="webhook-name"
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                        placeholder="e.g., Slack Notifications"
                        className="nb-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                        placeholder="https://hooks.slack.com/services/..."
                        className="nb-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Events</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableEvents.map(event => (
                        <div key={event} className="flex items-center space-x-2">
                          <Checkbox
                            id={event}
                            checked={newWebhook.events.includes(event)}
                            onCheckedChange={(checked) => handleEventToggle(event, !!checked)}
                          />
                          <Label htmlFor={event} className="text-sm">{event}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="webhook-secret">Secret (optional)</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={newWebhook.secret}
                      onChange={(e) => setNewWebhook({...newWebhook, secret: e.target.value})}
                      placeholder="Webhook secret for verification"
                      className="nb-input"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="webhook-enabled"
                      checked={newWebhook.enabled}
                      onCheckedChange={(checked) => setNewWebhook({...newWebhook, enabled: checked})}
                    />
                    <Label htmlFor="webhook-enabled">Enable webhook</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={editingWebhook ? handleUpdateWebhook : handleAddWebhook}
                      className="nb-button"
                    >
                      {editingWebhook ? 'Update' : 'Add'} Webhook
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowAddDialog(false);
                        setEditingWebhook(null);
                        setNewWebhook({ name: '', url: '', events: [], secret: '', headers: {}, enabled: true });
                      }}
                      variant="outline"
                      className="nb-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No webhooks configured yet.</p>
                <p className="text-sm">Add your first webhook to get started.</p>
              </div>
            ) : (
              webhooks.map(webhook => (
                <Card key={webhook.id} className="nb-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`nb-card p-2 ${webhook.enabled ? 'nb-green' : 'nb-red'}`}>
                            <Webhook className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{webhook.name}</h3>
                            <p className="text-sm text-muted-foreground break-all">{webhook.url}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="secondary" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.enabled}
                          onCheckedChange={() => handleToggleWebhook(webhook.id)}
                        />
                        <Button
                          onClick={() => handleTestWebhook(webhook)}
                          disabled={testingWebhook === webhook.id}
                          size="sm"
                          variant="outline"
                          className="nb-button-secondary"
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditWebhook(webhook)}
                          size="sm"
                          variant="outline"
                          className="nb-button-secondary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteWebhook(webhook)}
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Webhook"
        description={`Are you sure you want to delete "${deleteDialog.webhook?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};