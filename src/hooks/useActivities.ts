import { useState, useEffect } from 'react';
import { ActivityItem } from '@/types/dashboard';
import { useStatsPersistence } from './useStatsPersistence';
import { createGitHubService } from '@/components/GitHubService';
import type { LogEntry } from './useLogger';

export const useActivities = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { mergeStats, updateStats, resetSessionStats } = useStatsPersistence();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LogEntry>).detail;
      const item: ActivityItem = {
        id: detail.id,
        type: detail.level === 'error' ? 'failure' : detail.level === 'warn' ? 'alert' : 'success',
        message: detail.message,
        repo: detail.category,
        timestamp: detail.timestamp,
        details: detail.details
      };
      setActivities(prev => [item, ...prev].slice(0, 50));
    };
    window.addEventListener('log-entry', handler);
    return () => window.removeEventListener('log-entry', handler);
  }, []);

  const fetchActivities = async (repositories: any[], apiKeys: any[], getKey: (id: string) => string | null) => {
    if (!repositories.length || !apiKeys.length) {
      setActivities([]);
      return;
    }

    setIsLoading(true);
    try {
      const allActivities: ActivityItem[] = [];
      
      for (const apiKey of apiKeys.filter(k => k.isActive)) {
        const token = getKey(apiKey.id);
        if (!token) continue;
        const service = createGitHubService(token);
        const enabledRepos = repositories.filter(r => r.enabled && r.apiKeyId === apiKey.id);
        
        if (enabledRepos.length > 0) {
          const repoActivities = await service.fetchRecentActivity(enabledRepos);
          allActivities.push(...repoActivities);
        }
      }

      // Sort by timestamp and limit to 50 most recent
      const sortedActivities = allActivities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50);

      setActivities(sortedActivities);
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