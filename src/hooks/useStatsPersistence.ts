import { useState, useEffect } from 'react';
import { MergeStats } from '@/types/dashboard';

const STATS_STORAGE_KEY = 'automerger-stats';

export const useStatsPersistence = () => {
  const [mergeStats, setMergeStats] = useState<MergeStats>(() => {
    const savedStats = localStorage.getItem(STATS_STORAGE_KEY);
    if (savedStats) {
      try {
        return JSON.parse(savedStats);
      } catch (error) {
        console.error('Error parsing saved stats:', error);
      }
    }
    
    return {
      session: {
        pending: 3,
        merged: 12,
        failed: 2
      },
      total: {
        pending: 23,
        merged: 156,
        failed: 18
      }
    };
  });

  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(mergeStats));
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