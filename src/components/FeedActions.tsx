import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Webhook, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { FeedAction } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';

interface FeedActionsProps {
  actions: FeedAction[];
  onActionsChange: (actions: FeedAction[]) => void;
}

export const FeedActions: React.FC<FeedActionsProps> = ({
  actions,
  onActionsChange
}) => {
  const [newAction, setNewAction] = useState({
    name: '',
    eventType: 'all' as const,
    actionType: 'webhook' as const,
    endpoint: ''
  });
  const { toast } = useToast();

  const addAction = () => {
    if (newAction.name && newAction.endpoint) {
      const action: FeedAction = {
        id: Date.now().toString(),
        ...newAction,
        enabled: true
      };
      onActionsChange([...actions, action]);
      setNewAction({ name: '', eventType: 'all', actionType: 'webhook', endpoint: '' });
      toast({ title: "Feed action added successfully!" });
    }
  };

  const toggleAction = (id: string) => {
    const updated = actions.map(action =>
      action.id === id ? { ...action, enabled: !action.enabled } : action
    );
    onActionsChange(updated);
    toast({ title: "Feed action updated" });
  };

  const deleteAction = (id: string) => {
    const updated = actions.filter(action => action.id !== id);
    onActionsChange(updated);
    toast({ title: "Feed action deleted" });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'webhook': return <Webhook className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      default: return <Webhook className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'merge': return 'neo-green';
      case 'pull': return 'neo-blue';
      case 'alert': return 'neo-yellow';
      case 'success': return 'neo-green';
      case 'failure': return 'neo-red';
      default: return 'neo-purple';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Action */}
      <Card className="neo-card">
        <CardHeader>
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Add Feed Action
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Action Name</Label>
              <Input
                placeholder="e.g., Slack Notifications"
                value={newAction.name}
                onChange={(e) => setNewAction({ ...newAction, name: e.target.value })}
                className="neo-input"
              />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select
                value={newAction.eventType}
                onValueChange={(value: FeedAction['eventType']) =>
                  setNewAction({ ...newAction, eventType: value })
                }
              >
                <SelectTrigger className="neo-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="merge">Merge Events</SelectItem>
                  <SelectItem value="pull">Pull Request Events</SelectItem>
                  <SelectItem value="alert">Alert Events</SelectItem>
                  <SelectItem value="success">Success Events</SelectItem>
                  <SelectItem value="failure">Failure Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action Type</Label>
              <Select
                value={newAction.actionType}
                onValueChange={(value: FeedAction['actionType']) =>
                  setNewAction({ ...newAction, actionType: value })
                }
              >
                <SelectTrigger className="neo-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Endpoint/URL</Label>
              <Input
                placeholder="https://hooks.slack.com/..."
                value={newAction.endpoint}
                onChange={(e) => setNewAction({ ...newAction, endpoint: e.target.value })}
                className="neo-input"
              />
            </div>
          </div>
          <Button onClick={addAction} className="neo-button">
            <Plus className="w-4 h-4 mr-2" />
            Add Action
          </Button>
        </CardContent>
      </Card>

      {/* Actions List */}
      <div className="grid gap-4">
        {actions.map((action) => (
          <Card key={action.id} className="neo-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`neo-card p-2 ${action.enabled ? 'neo-green' : 'neo-red'}`}>
                    {getActionIcon(action.actionType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg">{action.name}</h3>
                      <Badge variant="secondary" className={`neo-card ${getEventColor(action.eventType)} text-black font-bold`}>
                        {action.eventType}
                      </Badge>
                      <Badge variant="secondary" className="neo-card neo-blue text-black font-bold">
                        {action.actionType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-bold truncate max-w-md">
                      {action.endpoint}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={action.enabled}
                    onCheckedChange={() => toggleAction(action.id)}
                    className="scale-125"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAction(action.id)}
                    className="neo-button bg-red-500 hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};