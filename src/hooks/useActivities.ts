import { useState } from 'react';
import { ActivityItem } from '@/types/dashboard';
import { useStatsPersistence } from './useStatsPersistence';

export const useActivities = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', type: 'merge', message: 'PR #123 merged successfully', repo: 'my-project', timestamp: new Date() },
    { id: '2', type: 'alert', message: 'Non-mergeable PR detected', repo: 'another-repo', timestamp: new Date() }
  ]);

  const mergeStats: MergeStats = {
    session: { pending: 3, merged: 12, failed: 1 },
    total: { pending: 5, merged: 67, failed: 8 }
  };

  const exportReport = () => {
    console.log('Exporting report...');
  };

  return {
    activities,
    mergeStats,
    updateStats,
    resetSessionStats,
    exportReport
  };
};