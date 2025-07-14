
import { useState, useEffect } from 'react';
import { getItem, setItem, removeItem } from '@/utils/storage';
import { ActivityItem } from '@/types/dashboard';

const WATCH_MODE_STORAGE_KEY = 'automerger-watch-mode';
// Maximum number of items persisted per repository history list.
// Older entries are trimmed before being saved to IndexedDB.
const MAX_ITEMS = 50;

interface PullRequest {
  id: number;
  number: number;
  title: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  html_url: string;
  mergeable?: boolean | null;
  mergeable_state?: string;
}

export interface WatchModeState {
  lastUpdateTime: Date;
  repoActivities: Record<string, ActivityItem[]>;
  repoPullRequests: Record<string, PullRequest[]>;
  repoStrayBranches: Record<string, string[]>;
  repoLastFetched: Record<string, number>;
}

export const useWatchModePersistence = () => {
  const [watchModeState, setWatchModeState] = useState<WatchModeState>({
    lastUpdateTime: new Date(),
    repoActivities: {},
    repoPullRequests: {},
    repoStrayBranches: {},
    repoLastFetched: {}
  });

  useEffect(() => {
    (async () => {
      const saved = await getItem<WatchModeState>(WATCH_MODE_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          const capActivities = (obj: Record<string, any[]>) =>
            Object.fromEntries(
              Object.entries(obj || {}).map(([k, v]) => [k, v.slice(0, 50)])
            );
          const capBranches = (obj: Record<string, any[]>) =>
            Object.fromEntries(
              Object.entries(obj || {}).map(([k, v]) => [k, (v || []).filter((item: any) => typeof item === 'string').slice(0, 50)])
            );
          setWatchModeState({
            lastUpdateTime: new Date(parsed.lastUpdateTime),
            repoActivities: capActivities(parsed.repoActivities),
            repoPullRequests: capActivities(parsed.repoPullRequests),
            repoStrayBranches: capBranches(parsed.repoStrayBranches),
            repoLastFetched: parsed.repoLastFetched || {}
          });
        } catch (error) {
          console.error('Error parsing saved watch mode state:', error);
        }
      }
    })();
  }, []);

  const clearWatchModeState = () => {
    const initialState: WatchModeState = {
      lastUpdateTime: new Date(),
      repoActivities: {},
      repoPullRequests: {},
      repoStrayBranches: {},
      repoLastFetched: {}
    };
    setWatchModeState(initialState);
    removeItem(WATCH_MODE_STORAGE_KEY);
  };

  // No storage events for IndexedDB; state is local to the tab

  useEffect(() => {
    setItem(WATCH_MODE_STORAGE_KEY, watchModeState).catch(err => {
      console.error('Error saving watch mode state:', err);
    });
  }, [watchModeState]);

  const updateRepoActivities = (repoId: string, activities: ActivityItem[]) => {
    const trimmed = activities.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoActivities: {
        ...prev.repoActivities,
        [repoId]: activities.slice(0, 50)
      }

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

  const updateRepoPullRequests = (repoId: string, prs: PullRequest[]) => {
    const trimmed = prs.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoPullRequests: {
        ...prev.repoPullRequests,
        [repoId]: prs.slice(0, 50)
      }

    }));
  };

  const updateRepoStrayBranches = (repoId: string, branches: string[]) => {
    const trimmed = branches.slice(-MAX_ITEMS);
    setWatchModeState(prev => ({
      ...prev,
      repoStrayBranches: {
        ...prev.repoStrayBranches,
        [repoId]: branches.slice(0, 50)
      }

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
    reorderRepoActivity,
    clearWatchModeState
  };
};
