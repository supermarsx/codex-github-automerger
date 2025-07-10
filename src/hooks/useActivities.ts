import { useState } from 'react';
import { ActivityItem } from '@/types/dashboard';
import { useStatsPersistence } from './useStatsPersistence';
import { createGitHubService } from '@/components/GitHubService';

export const useActivities = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { mergeStats, updateStats, resetSessionStats } = useStatsPersistence();

  const fetchActivities = async (
    repositories: any[],
    apiKeys: any[],
    getKey: (id: string) => string | null,
    addRepoActivity?: (repoId: string, activity: Omit<ActivityItem, 'id'>) => void
  ) => {
    if (!repositories.length || !apiKeys.length) {
      setActivities([]);
      return;
    }

    setIsLoading(true);
    try {
      const allActivities: ActivityItem[] = [];
      const repoMap = new Map<string, string>();
      repositories.forEach(r => repoMap.set(`${r.owner}/${r.name}`, r.id));

      for (const apiKey of apiKeys.filter(k => k.isActive)) {
        const token = getKey(apiKey.id);
        if (!token) continue;
        const service = createGitHubService(token);
        const enabledRepos = repositories.filter(r => r.enabled && r.apiKeyId === apiKey.id);

        if (enabledRepos.length > 0) {
          const repoActivities = await service.fetchRecentActivity(enabledRepos);
          repoActivities.forEach(act => {
            allActivities.push(act);
            const repoId = repoMap.get(act.repo);
            if (repoId && addRepoActivity) {
              const { id, ...rest } = act;
              addRepoActivity(repoId, rest);
            }
          });
        }
      }

      // Sort by timestamp and limit to 50 most recent
      const sortedActivities = allActivities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50);

      setActivities(sortedActivities);

      const session = {
        pending: sortedActivities.filter(a => a.type === 'pull').length,
        merged: sortedActivities.filter(a => a.type === 'merge').length,
        failed: sortedActivities.filter(a => a.type === 'failure').length
      };

      updateStats({ session });
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      statistics: mergeStats,
      activities: activities.slice(0, 100), // Last 100 activities
      summary: {
        totalActivities: activities.length,
        repositories: [...new Set(activities.map(a => a.repo))],
        activityTypes: activities.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    activities,
    mergeStats,
    isLoading,
    updateStats,
    resetSessionStats,
    exportReport,
    fetchActivities
  };
};