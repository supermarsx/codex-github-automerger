import { useState, useEffect } from 'react';
import { getItem, setItem } from '@/utils/storage';
import { MergeStats } from '@/types/dashboard';

const STATS_STORAGE_KEY = 'automerger-stats';

export const useStatsPersistence = () => {
  const [mergeStats, setMergeStats] = useState<MergeStats>({
    session: { pending: 0, merged: 0, failed: 0 },
    total: { pending: 0, merged: 0, failed: 0 }
  });

  useEffect(() => {
    (async () => {
      const savedStats = await getItem<MergeStats>(STATS_STORAGE_KEY);
      if (savedStats) {
        try {
          const parsed = typeof savedStats === 'string' ? JSON.parse(savedStats) : savedStats;
          setMergeStats(parsed);
        } catch (error) {
          console.error('Error parsing saved stats:', error);
        }
      }
    })();
  }, []);


  useEffect(() => {
    setItem(STATS_STORAGE_KEY, mergeStats).catch(err => {
      console.error('Error saving stats:', err);
    });
  }, [mergeStats]);

  const updateStats = (newStats: Partial<MergeStats>) => {
    setMergeStats(prev => ({
      ...prev,
      ...newStats
    }));
  };

  const resetSessionStats = () => {
    setMergeStats(prev => ({
      ...prev,
      session: {
        pending: 0,
        merged: 0,
        failed: 0
      }
    }));
  };

  return {
    mergeStats,
    updateStats,
    resetSessionStats
  };
};