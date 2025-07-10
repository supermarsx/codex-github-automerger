import { useState, useEffect } from 'react';
import { getItem, setItem } from '@/utils/storage';

const APP_STATE_STORAGE_KEY = 'automerger-app-state';

export interface AppState {
  activeTab: string;
  lastActivity: Date;
  sessionStartTime: Date;
  userPreferences: {
    compactMode: boolean;
    autoRefresh: boolean;
    notificationsEnabled: boolean;
  };
}

export const useAppPersistence = () => {
  const [appState, setAppState] = useState<AppState>({
    activeTab: 'feed',
    lastActivity: new Date(),
    sessionStartTime: new Date(),
    userPreferences: {
      compactMode: false,
      autoRefresh: true,
      notificationsEnabled: true,
    },
  });

  useEffect(() => {
    (async () => {
      const saved = await getItem<any>(APP_STATE_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          setAppState({
            ...parsed,
            lastActivity: new Date(parsed.lastActivity),
            sessionStartTime: new Date(parsed.sessionStartTime),
          });
        } catch (error) {
          console.error('Error parsing saved app state:', error);
        }
      }
    })();
  }, []);

  useEffect(() => {
    setItem(APP_STATE_STORAGE_KEY, appState).catch(err => {
      console.error('Error saving app state:', err);
    });
  }, [appState]);

  const updateActiveTab = (tab: string) => {
    setAppState(prev => ({ 
      ...prev, 
      activeTab: tab,
      lastActivity: new Date()
    }));
  };

  const updateUserPreferences = (preferences: Partial<AppState['userPreferences']>) => {
    setAppState(prev => ({ 
      ...prev, 
      userPreferences: { ...prev.userPreferences, ...preferences },
      lastActivity: new Date()
    }));
  };

  const markActivity = () => {
    setAppState(prev => ({ ...prev, lastActivity: new Date() }));
  };

  return {
    appState,
    updateActiveTab,
    updateUserPreferences,
    markActivity
  };
};