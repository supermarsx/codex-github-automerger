import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, GitMerge, GitPullRequest, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { ActivityItem } from '@/types/dashboard';

interface RealtimeFeedProps {
  activities: ActivityItem[];
  onExportReport: () => void;
  isLoading?: boolean;
  isUnlocked: boolean;
}

export const RealtimeFeed: React.FC<RealtimeFeedProps> = ({ activities, onExportReport, isLoading, isUnlocked }) => {
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
      case 'merge': return 'nb-green';
      case 'pull': return 'nb-blue';
      case 'alert': return 'nb-yellow';
      case 'success': return 'nb-green';
      case 'failure': return 'nb-red';
      default: return 'nb-purple';
    }
  };

  return (
    <Card className="nb-card relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-3 text-shadow">
            <div className="nb-card nb-blue p-2">
              <Activity className="w-6 h-6 text-white" />
            </div>
            Recent Activity
          </CardTitle>
          <Button onClick={onExportReport} size="sm" className="nb-button-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <div className="nb-card nb-purple p-6 mx-auto w-fit mb-6">
                  <Activity className="w-12 h-12 text-white mx-auto" />
                </div>
                <h3 className="font-black text-lg mb-2">No Recent Activity</h3>
                <p className="text-muted-foreground font-bold">Enable repositories and API keys to see activity</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 nb-card bg-card/50 hover:bg-card/80 transition-colors">
                  <div className={`nb-card p-3 ${getActivityColor(activity.type)} flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-foreground truncate">{activity.message}</p>
                    <p className="text-sm text-muted-foreground font-bold truncate">{activity.repo}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="outline" className="text-xs nb-card bg-card/50 font-bold">
                      {new Date(activity.timestamp).toLocaleString()}
                    </Badge>
                    <Button
                      onClick={() => window.open(`https://github.com/${activity.repo}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="nb-button-secondary"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
      </CardContent>
    </Card>
  );
};
