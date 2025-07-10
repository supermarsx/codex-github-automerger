import { useState, useEffect } from 'react';

const WATCH_MODE_STORAGE_KEY = 'automerger-watch-mode';

export interface WatchModeState {
  lastUpdateTime: Date;
  repoActivities: Record<string, unknown[]>;
  repoPullRequests: Record<string, unknown[]>;
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

  const updateRepoActivities = (repoActivities: Record<string, unknown[]>) => {
    setWatchModeState(prev => ({ ...prev, repoActivities }));
  };

  const updateRepoPullRequests = (repoPullRequests: Record<string, unknown[]>) => {
    setWatchModeState(prev => ({ ...prev, repoPullRequests }));
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
    updateLastUpdateTime,
    updateRepoLastFetched
  };
};