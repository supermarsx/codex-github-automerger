import { Repository, Activity } from '@/types/dashboard';

export interface RealDetailedStats {
  period: string;
  repositories: Record<string, {
    name: string;
    merges: number;
    successes: number;
    failures: number;
    pullRequests: number;
    alerts: number;
    avgMergeTime: number;
    dailyStats: Record<string, { merges: number; successes: number; failures: number }>;
    weeklyTrend: number;
    monthlyTrend: number;
  }>;
  overall: {
    totalMerges: number;
    totalSuccesses: number;
    totalFailures: number;
    totalPullRequests: number;
    totalAlerts: number;
    avgSuccessRate: number;
    topRepository: string;
    peakDay: string;
    peakHour: string;
    avgMergeTime: number;
    weeklyGrowth: number;
    monthlyGrowth: number;
  };
}

export class StatisticsEngine {
  static calculateStats(repositories: Repository[], activities: Activity[], period: string): RealDetailedStats {
    const now = new Date();
    const startDate = this.getStartDate(period, now);
    
    // Filter activities by period
    const filteredActivities = activities.filter(activity => 
      new Date(activity.timestamp) >= startDate
    );

    const repoStats: Record<string, any> = {};
    let totalMerges = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let totalPullRequests = 0;
    let totalAlerts = 0;
    let totalMergeTime = 0;
    let mergeTimeCount = 0;
    
    const dailyStats: Record<string, { merges: number; successes: number; failures: number }> = {};
    const hourlyStats: Record<string, number> = {};

    repositories.forEach(repo => {
      const repoActivities = filteredActivities.filter(activity => 
        activity.repository === `${repo.owner}/${repo.name}`
      );

      const mergeActivities = repoActivities.filter(activity => 
        activity.type === 'merged' || activity.type === 'merge_failed'
      );

      const successfulMerges = mergeActivities.filter(activity => activity.type === 'merged');
      const failedMerges = mergeActivities.filter(activity => activity.type === 'merge_failed');
      const pullRequests = repoActivities.filter(activity => activity.type === 'pull_request');
      const alerts = repoActivities.filter(activity => activity.type === 'alert');

      // Calculate daily stats for this repo
      const repoDailyStats: Record<string, { merges: number; successes: number; failures: number }> = {};
      mergeActivities.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        if (!repoDailyStats[date]) {
          repoDailyStats[date] = { merges: 0, successes: 0, failures: 0 };
        }
        repoDailyStats[date].merges++;
        if (activity.type === 'merged') {
          repoDailyStats[date].successes++;
        } else {
          repoDailyStats[date].failures++;
        }

        // Add to overall daily stats
        if (!dailyStats[date]) {
          dailyStats[date] = { merges: 0, successes: 0, failures: 0 };
        }
        dailyStats[date].merges++;
        if (activity.type === 'merged') {
          dailyStats[date].successes++;
        } else {
          dailyStats[date].failures++;
        }
      });

      // Calculate hourly stats
      mergeActivities.forEach(activity => {
        const hour = new Date(activity.timestamp).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      });

      // Calculate average merge time (mock calculation)
      const avgMergeTime = successfulMerges.length > 0 ? 
        Math.floor(Math.random() * 120) + 30 : 0;

      // Calculate trends (mock calculation)
      const weeklyTrend = this.calculateTrend(repoDailyStats, 7);
      const monthlyTrend = this.calculateTrend(repoDailyStats, 30);

      repoStats[repo.id] = {
        name: `${repo.owner}/${repo.name}`,
        merges: mergeActivities.length,
        successes: successfulMerges.length,
        failures: failedMerges.length,
        pullRequests: pullRequests.length,
        alerts: alerts.length,
        avgMergeTime,
        dailyStats: repoDailyStats,
        weeklyTrend,
        monthlyTrend
      };

      totalMerges += mergeActivities.length;
      totalSuccesses += successfulMerges.length;
      totalFailures += failedMerges.length;
      totalPullRequests += pullRequests.length;
      totalAlerts += alerts.length;
      totalMergeTime += avgMergeTime * successfulMerges.length;
      mergeTimeCount += successfulMerges.length;
    });

    // Find peak day and hour
    const peakDay = Object.entries(dailyStats)
      .sort(([, a], [, b]) => b.merges - a.merges)[0]?.[0] || 'N/A';
    
    const peakHour = Object.entries(hourlyStats)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Find top repository
    const topRepository = Object.values(repoStats)
      .sort((a, b) => b.merges - a.merges)[0]?.name || 'N/A';

    // Calculate overall trends
    const weeklyGrowth = this.calculateTrend(dailyStats, 7);
    const monthlyGrowth = this.calculateTrend(dailyStats, 30);

    return {
      period,
      repositories: repoStats,
      overall: {
        totalMerges,
        totalSuccesses,
        totalFailures,
        totalPullRequests,
        totalAlerts,
        avgSuccessRate: totalMerges > 0 ? (totalSuccesses / totalMerges) * 100 : 0,
        topRepository,
        peakDay,
        peakHour: peakHour !== 'N/A' ? `${peakHour}:00` : 'N/A',
        avgMergeTime: mergeTimeCount > 0 ? Math.floor(totalMergeTime / mergeTimeCount) : 0,
        weeklyGrowth,
        monthlyGrowth
      }
    };
  }

  private static getStartDate(period: string, now: Date): Date {
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return weekStart;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        return monthStart;
      case 'year':
        const yearStart = new Date(now);
        yearStart.setFullYear(now.getFullYear() - 1);
        return yearStart;
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  private static calculateTrend(dailyStats: Record<string, { merges: number; successes: number; failures: number }>, days: number): number {
    const dates = Object.keys(dailyStats).sort();
    if (dates.length < days) return 0;

    const recent = dates.slice(-days).reduce((sum, date) => sum + dailyStats[date].merges, 0);
    const previous = dates.slice(-days * 2, -days).reduce((sum, date) => sum + (dailyStats[date]?.merges || 0), 0);

    if (previous === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - previous) / previous) * 100);
  }
}