import { useState, useEffect } from 'react';

const WATCH_MODE_STORAGE_KEY = 'automerger-watch-mode';

export interface WatchModeState {
  watchEnabled: Record<string, boolean>;
  lastUpdateTime: Date;
  repoActivities: Record<string, any[]>;
  repoPullRequests: Record<string, any[]>;
}

export const useWatchModePersistence = () => {
  const [watchModeState, setWatchModeState] = useState<WatchModeState>(() => {
    const saved = localStorage.getItem(WATCH_MODE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          watchEnabled: parsed.watchEnabled ??
            (Array.isArray(parsed.watchedRepos)
              ? Object.fromEntries(parsed.watchedRepos.map((id: string) => [id, true]))
              : {}),
          lastUpdateTime: new Date(parsed.lastUpdateTime),
          repoActivities: parsed.repoActivities || {},
          repoPullRequests: parsed.repoPullRequests || {}
        };
      } catch (error) {
        console.error('Error parsing saved watch mode state:', error);
      }
    }

    return {
      watchEnabled: {},
      lastUpdateTime: new Date(),
      repoActivities: {},
      repoPullRequests: {}
    };
  });

  useEffect(() => {
    localStorage.setItem(WATCH_MODE_STORAGE_KEY, JSON.stringify(watchModeState));
  }, [watchModeState]);

  const updateWatchEnabled = (repoId: string, enabled: boolean) => {
    setWatchModeState(prev => ({
      ...prev,
      watchEnabled: { ...prev.watchEnabled, [repoId]: enabled }
    }));
  };

  const updateRepoActivities = (repoActivities: Record<string, any[]>) => {
    setWatchModeState(prev => ({ ...prev, repoActivities }));
  };

  const updateRepoPullRequests = (repoPullRequests: Record<string, any[]>) => {
    setWatchModeState(prev => ({ ...prev, repoPullRequests }));
  };

  const updateLastUpdateTime = (lastUpdateTime: Date) => {
    setWatchModeState(prev => ({ ...prev, lastUpdateTime }));
  };

  return {
    watchModeState,
    updateWatchEnabled,
    updateRepoActivities,
    updateRepoPullRequests,
    updateLastUpdateTime
  };};