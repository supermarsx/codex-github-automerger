import { useState, useEffect } from 'react';

const WATCH_MODE_STORAGE_KEY = 'automerger-watch-mode';

export interface WatchModeState {
  watchedRepos: string[];
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
          ...parsed,
          lastUpdateTime: new Date(parsed.lastUpdateTime)
        };
      } catch (error) {
        console.error('Error parsing saved watch mode state:', error);
      }
    }
    
    return {
      watchedRepos: [],
      lastUpdateTime: new Date(),
      repoActivities: {},
      repoPullRequests: {}
    };
  });

  useEffect(() => {
    localStorage.setItem(WATCH_MODE_STORAGE_KEY, JSON.stringify(watchModeState));
  }, [watchModeState]);

  const updateWatchedRepos = (watchedRepos: string[]) => {
    setWatchModeState(prev => ({ ...prev, watchedRepos }));
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
    updateWatchedRepos,
    updateRepoActivities,
    updateRepoPullRequests,
    updateLastUpdateTime
  };
};