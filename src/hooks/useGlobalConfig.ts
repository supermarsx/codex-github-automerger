import { useState, useEffect } from 'react';
import { getItem, setItem } from '@/utils/storage';
import { GlobalConfig } from '@/types/dashboard';
import { hexToHSL } from '@/lib/utils';

const GLOBAL_CONFIG_STORAGE_KEY = 'automerger-global-config';

const getDefaultConfig = (): GlobalConfig => ({
  requireApproval: true,   // Default to true for safety
  alertsEnabled: true,
  encryptionEnabled: true,
  defaultBranchPatterns: ['codex-*', 'feature/*', 'fix/*'],
  defaultAllowedUsers: ['github-actions[bot]'],
  alertThreshold: 30,
  maxRetries: 3,
  autoDeleteBranch: false, // Default to false for safety
  allowAllBranches: false,
  allowAllUsers: false,
  fetchMode: 'github-api',
  serverCheckInterval: 30000, // 30 seconds
  refreshInterval: 30000,
  logLevel: 'info',
  darkMode: true,
  accentColor: '#313135',
  customCss: '',
  customJs: '',
  feedActions: [],
  statsPeriod: 'session',
  webhooks: [],
  hideHeader: false,
  logsDisabled: false,
  protectedBranches: ['main'],
  confirmBranchDeletion: true
});

export const useGlobalConfig = () => {
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(getDefaultConfig());

  useEffect(() => {
    (async () => {
      const savedConfig = await getItem<any>(GLOBAL_CONFIG_STORAGE_KEY);
      if (savedConfig) {
        try {
          const parsed = typeof savedConfig === 'string' ? JSON.parse(savedConfig) : savedConfig;
          setGlobalConfig(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error parsing saved config:', error);
        }
      }
    })();
  }, []);

  // Persist config to IndexedDB whenever it changes
  useEffect(() => {
    setItem(GLOBAL_CONFIG_STORAGE_KEY, globalConfig).catch(err => {
      console.error('Error saving global config:', err);
    });
  }, [globalConfig]);

  // Update theme in IndexedDB when darkMode changes
  useEffect(() => {
    const theme = globalConfig.darkMode ? 'dark' : 'light';
    setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    // Apply theme to document
    if (globalConfig.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [globalConfig.darkMode]);

  // Update accent color
  useEffect(() => {
    const hsl = hexToHSL(globalConfig.accentColor);
    document.documentElement.style.setProperty('--accent', hsl);
    document.documentElement.style.setProperty('--sidebar-accent', hsl);
    document.documentElement.style.setProperty('--primary', hsl);
  }, [globalConfig.accentColor]);

  const updateConfig = (updates: Partial<GlobalConfig>) => {
    setGlobalConfig(prev => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    const defaultConfig = getDefaultConfig();
    setGlobalConfig(defaultConfig);
    setItem(GLOBAL_CONFIG_STORAGE_KEY, defaultConfig).catch(err => {
      console.error('Error resetting config:', err);
    });
  };

  const exportConfig = () => {
    const configData = {
      exported: new Date().toISOString(),
      version: '1.0',
      config: globalConfig
    };
    
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automerger-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfig = (configData: string) => {
    try {
      const parsed = JSON.parse(configData);
      const config = parsed.config || parsed;
      // Validate and merge with defaults
      const validatedConfig = { ...getDefaultConfig(), ...config };
      setGlobalConfig(validatedConfig);
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  };

  return {
    globalConfig,
    setGlobalConfig: updateConfig,
    resetConfig,
    exportConfig,
    importConfig
  };
};