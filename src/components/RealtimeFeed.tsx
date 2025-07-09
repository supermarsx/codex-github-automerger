import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, GitMerge, GitPullRequest, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { ActivityItem } from '@/types/dashboard';

interface RealtimeFeedProps {
  activities: ActivityItem[];
  onExportReport: () => void;
}

export const RealtimeFeed: React.FC<RealtimeFeedProps> = ({ activities, onExportReport }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'merge': return <GitMerge className="w-4 h-4" />;
      case 'pull': return <GitPullRequest className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'failure': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={onExportReport} className="neo-button-secondary">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      <Card className="neo-card">
        <CardHeader>
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded neo-card">
                  <div className={`neo-card p-2 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-foreground">{activity.message}</p>
                  <p className="text-sm text-muted-foreground">{activity.repo} • {new Date(activity.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(`https://github.com/${activity.repo}`, '_blank')}
                    variant="outline"
                    size="sm"
                    className="neo-button-secondary"
                  >
                    View
                  </Button>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};