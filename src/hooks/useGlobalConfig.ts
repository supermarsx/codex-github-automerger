import { useState } from 'react';
import { GlobalConfig } from '@/types/dashboard';

export const useGlobalConfig = () => {
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    autoMergeEnabled: true,
    requireApproval: false,
    alertsEnabled: true,
    encryptionEnabled: true,
    defaultBranchPatterns: ['codex-*'],
    defaultAllowedUsers: ['github-actions[bot]'],
    alertThreshold: 30,
    maxRetries: 3,
    autoDeleteBranch: true,
    allowAllBranches: false,
    allowAllUsers: false,
    fetchMode: 'github-api',
    serverCheckInterval: 10000,
    logLevel: 'info',
    darkMode: localStorage.getItem('theme') === 'light' ? false : true,
    customCss: '',
    customJs: '',
    feedActions: [],
    statsPeriod: 'session'
  });

  return {
    globalConfig,
    setGlobalConfig
  };
};