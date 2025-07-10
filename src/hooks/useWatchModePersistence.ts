import { useState, useEffect } from 'react';

const WATCH_MODE_STORAGE_KEY = 'automerger-watch-mode';
// Maximum number of items persisted per repository history list.
// Older entries are trimmed before being saved to localStorage.
const MAX_ITEMS = 50;

export interface WatchModeState {
  lastUpdateTime: Date;
  repoActivities: Record<string, unknown[]>;
  repoPullRequests: Record<string, unknown[]>;
  repoStrayBranches: Record<string, string[]>;
  repoLastFetched: Record<string, number>;
}

export const useWatchModePersistence = () => {
  const [watchModeState, setWatchModeState] = useState<WatchModeState>(() => {
    const saved = localStorage.getItem(WATCH_MODE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          lastUpdateTime: new Date(parsed.lastUpdateTime),
          repoActivities: parsed.repoActivities || {},
          repoPullRequests: parsed.repoPullRequests || {},
          repoStrayBranches: parsed.repoStrayBranches || {},
          repoLastFetched: parsed.repoLastFetched || {}
        };
      } catch (error) {
        console.error('Error parsing saved watch mode state:', error);
      }
    }

    return {
      lastUpdateTime: new Date(),
      repoActivities: {},
      repoPullRequests: {},
      repoStrayBranches: {},
      repoLastFetched: {}
    };
  });

  // keep state in sync across components using storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === WATCH_MODE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWatchModeState({
            lastUpdateTime: new Date(parsed.lastUpdateTime),
            repoActivities: parsed.repoActivities || {},
            repoPullRequests: parsed.repoPullRequests || {},
            repoStrayBranches: parsed.repoStrayBranches || {},
            repoLastFetched: parsed.repoLastFetched || {},
          });
        } catch (error) {
          console.error('Error parsing watch mode state from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCH_MODE_STORAGE_KEY, JSON.stringify(watchModeState));
  }, [watchModeState]);

  const updateRepoActivities = (repoId: string, activities: unknown[]) => {
    const trimmed = activities.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoActivities: { ...prev.repoActivities, [repoId]: trimmed }
    }));
  };

  const reorderRepoActivity = (repoId: string, from: number, to: number) => {
    setWatchModeState(prev => {
      const list = [...(prev.repoActivities[repoId] || [])];
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return {
        ...prev,
        repoActivities: { ...prev.repoActivities, [repoId]: list }
      };
    });
  };

  const updateRepoPullRequests = (repoId: string, prs: unknown[]) => {
    const trimmed = prs.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoPullRequests: { ...prev.repoPullRequests, [repoId]: trimmed }
    }));
  };

  const updateRepoStrayBranches = (repoId: string, branches: string[]) => {
    const trimmed = branches.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoStrayBranches: { ...prev.repoStrayBranches, [repoId]: trimmed }
    }));
  };

  const updateRepoLastFetched = (repoId: string) => {
    setWatchModeState(prev => ({
      ...prev,
      repoLastFetched: { ...prev.repoLastFetched, [repoId]: Date.now() }
    }));
  };

  const updateLastUpdateTime = (lastUpdateTime: Date) => {
    setWatchModeState(prev => ({ ...prev, lastUpdateTime }));
  };

  return {
    watchModeState,
    updateRepoActivities,
    updateRepoPullRequests,
    updateRepoStrayBranches,
    updateLastUpdateTime,
    updateRepoLastFetched,
    reorderRepoActivity
  };
};