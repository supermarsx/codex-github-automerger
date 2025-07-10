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
  isLoading?: boolean;
}

export const RealtimeFeed: React.FC<RealtimeFeedProps> = ({ activities, onExportReport, isLoading }) => {
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
    <Card className="neo-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Button onClick={onExportReport} size="sm" className="neo-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Enable repositories and API keys to see activity</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded neo-card">
                    <div className={`neo-card p-2 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{activity.message}</p>
                      <p className="text-sm text-muted-foreground">{activity.repo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Badge>
                      <Button
                        onClick={() => window.open(`https://github.com/${activity.repo}`, '_blank')}
                        variant="outline"
                        size="sm"
                        className="neo-button-secondary"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
  );
};