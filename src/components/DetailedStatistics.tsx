import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Calendar, GitBranch } from 'lucide-react';
import { DetailedStats, Repository as RepoType } from '@/types/dashboard';

interface DetailedStatisticsProps {
  repositories: RepoType[];
  period: string;
}

export const DetailedStatistics: React.FC<DetailedStatisticsProps> = ({ repositories, period }) => {
  // Mock detailed statistics - in a real app this would come from API
  const mockStats: DetailedStats = {
    period: period as any,
    repositories: repositories.reduce((acc, repo) => {
      acc[repo.id] = {
        name: `${repo.owner}/${repo.name}`,
        merges: repo.stats.totalMerges,
        successes: repo.stats.successfulMerges,
        failures: repo.stats.failedMerges,
        pullRequests: repo.stats.totalMerges + repo.stats.pendingMerges,
        alerts: Math.floor(Math.random() * 10),
        avgMergeTime: Math.floor(Math.random() * 120) + 30,
        dailyStats: {
          '2024-01-20': { merges: 5, successes: 4, failures: 1 },
          '2024-01-19': { merges: 3, successes: 3, failures: 0 },
          '2024-01-18': { merges: 7, successes: 6, failures: 1 },
        }
      };
      return acc;
    }, {} as any),
    overall: {
      totalMerges: repositories.reduce((sum, repo) => sum + repo.stats.totalMerges, 0),
      totalSuccesses: repositories.reduce((sum, repo) => sum + repo.stats.successfulMerges, 0),
      totalFailures: repositories.reduce((sum, repo) => sum + repo.stats.failedMerges, 0),
      totalPullRequests: repositories.reduce((sum, repo) => sum + repo.stats.totalMerges + repo.stats.pendingMerges, 0),
      totalAlerts: Math.floor(Math.random() * 50),
      avgSuccessRate: 92.5,
      topRepository: repositories[0]?.name || 'N/A',
      peakDay: '2024-01-18'
    }
  };

  const getSuccessRate = (successes: number, total: number) => {
    return total > 0 ? ((successes / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overall Statistics */}
      <Card className="neo-card">
        <CardHeader>
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Overall Statistics - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-green-600">{mockStats.overall.totalMerges}</div>
              <div className="text-sm font-bold text-muted-foreground">Total Merges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-blue-600">{mockStats.overall.totalPullRequests}</div>
              <div className="text-sm font-bold text-muted-foreground">Pull Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-600">{mockStats.overall.avgSuccessRate}%</div>
              <div className="text-sm font-bold text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-orange-600">{mockStats.overall.totalAlerts}</div>
              <div className="text-sm font-bold text-muted-foregorund">Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{mockStats.overall.topRepository}</div>
            <div className="text-sm text-muted-foreground">Most active repository</div>
          </CardContent>
        </Card>

        <Card className="neo-card">
          <CardHeader>
            <CardTitle className="font-black flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Peak Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black">{mockStats.overall.peakDay}</div>
            <div className="text-sm text-muted-foreground">Highest activity day</div>
          </CardContent>
        </Card>
      </div>

      {/* Repository Details */}
      <Card className="neo-card">
        <CardHeader>
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Repository Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(mockStats.repositories).map(([repoId, stats]) => (
            <div key={repoId} className="neo-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg">{stats.name}</h3>
                <Badge className="neo-card neo-green text-black font-bold">
                  {getSuccessRate(stats.successes, stats.merges)}% success
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
        </CardContent>
      </Card>
    </div>
  );
};