import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Calendar, GitBranch, Clock, Activity as ActivityIcon } from 'lucide-react';
import { Repository as RepoType, Activity } from '@/types/dashboard';
import { StatisticsEngine, RealDetailedStats } from '@/components/StatisticsEngine';

interface DetailedStatisticsProps {
  repositories: RepoType[];
  activities: Activity[];
  period: string;
}

export const DetailedStatistics: React.FC<DetailedStatisticsProps> = ({ repositories, activities, period }) => {
  const realStats: RealDetailedStats = StatisticsEngine.calculateStats(repositories, activities, period);

  const getSuccessRate = (successes: number, total: number) => {
    return total > 0 ? ((successes / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overall Statistics */}
      <Card className="nb-card">
        <CardHeader>
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Overall Statistics - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-green-600">{realStats.overall.totalMerges}</div>
              <div className="text-sm font-bold text-muted-foreground">Total Merges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-blue-600">{realStats.overall.totalPullRequests}</div>
              <div className="text-sm font-bold text-muted-foreground">Pull Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-600">{realStats.overall.avgSuccessRate.toFixed(1)}%</div>
              <div className="text-sm font-bold text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-orange-600">{realStats.overall.totalAlerts}</div>
              <div className="text-sm font-bold text-muted-foreground">Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="nb-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{realStats.overall.topRepository}</div>
            <div className="text-sm text-muted-foreground">Most active repository</div>
          </CardContent>
        </Card>

        <Card className="nb-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Peak Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{realStats.overall.peakDay}</div>
            <div className="text-sm text-muted-foreground">Highest activity day</div>
          </CardContent>
        </Card>

        <Card className="nb-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{realStats.overall.peakHour}</div>
            <div className="text-sm text-muted-foreground">Busiest hour</div>
          </CardContent>
        </Card>

        <Card className="nb-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <ActivityIcon className="w-5 h-5" />
              Avg Merge Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{realStats.overall.avgMergeTime}min</div>
            <div className="text-sm text-muted-foreground">Average merge time</div>
          </CardContent>
        </Card>
      </div>

      {/* Repository Details */}
      <Card className="nb-card">
        <CardHeader>
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Repository Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(realStats.repositories).map(([repoId, stats]) => (
            <div key={repoId} className="nb-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg">{stats.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge className="nb-card nb-green text-black font-bold">
                    {getSuccessRate(stats.successes, stats.merges)}% success
                  </Badge>
                  <Badge variant="outline" className={`font-bold ${stats.weeklyTrend > 0 ? 'text-green-600' : stats.weeklyTrend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {stats.weeklyTrend > 0 ? '+' : ''}{stats.weeklyTrend}% weekly
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="font-bold text-muted-foreground">Merges</div>
                  <div className="text-lg font-black">{stats.merges}</div>
                </div>
                <div>
                  <div className="font-bold text-muted-foreground">Success</div>
                  <div className="text-lg font-black text-green-600">{stats.successes}</div>
                </div>
                <div>
                  <div className="font-bold text-muted-foreground">Failures</div>
                  <div className="text-lg font-black text-red-600">{stats.failures}</div>
                </div>
                <div>
                  <div className="font-bold text-muted-foreground">Avg Time</div>
                  <div className="text-lg font-black">{stats.avgMergeTime}min</div>
                </div>
                <div>
                  <div className="font-bold text-muted-foreground">Alerts</div>
                  <div className="text-lg font-black text-orange-600">{stats.alerts}</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span>Success Rate</span>
                  <span>{getSuccessRate(stats.successes, stats.merges)}%</span>
                </div>
                <Progress value={parseFloat(getSuccessRate(stats.successes, stats.merges))} className="h-2" />
              </div>
            </div>
          ))}
          
          {Object.keys(realStats.repositories).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No statistics available for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};