import { useRepositories } from './useRepositories';
import { useApiKeys } from './useApiKeys';
import { useGlobalConfig } from './useGlobalConfig';
import { useActivities } from './useActivities';
import { useLogger } from './useLogger';

export const useDashboardData = () => {
  const { logs, exportLogs } = useLogger();
  
  const {
    repositories,
    toggleRepository,
    toggleAutoMerge,
    addRepository,
    deleteRepository,
    updateRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    updateRepositoryStats,
    addRepositoryActivity,
    clearAllRepositories
  } = useRepositories();

  const {
    apiKeys,
    isUnlocked,
    showApiKey,
    deletedApiKeys,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    updateApiKeyConnectionStatus,
    getDecryptedApiKey,
    refreshApiKeyStatus,
    clearAllApiKeys
  } = useApiKeys();

  const {
    globalConfig,
    setGlobalConfig,
    resetConfig,
    exportConfig,
    importConfig
  } = useGlobalConfig();

  const {
    activities,
    mergeStats,
    isLoading,
    updateStats,
    resetSessionStats,
    exportReport,
    fetchActivities
  } = useActivities();

  return {
    repositories,
    apiKeys,
    isUnlocked,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    logs,
    deletedApiKeys,
    isLoading,
    toggleRepository,
    toggleAutoMerge,
    addRepository,
    deleteRepository,
    updateRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    updateRepositoryStats,
    addRepositoryActivity,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    updateApiKeyConnectionStatus,
    getDecryptedApiKey,
    refreshApiKeyStatus,
    setGlobalConfig,
    resetConfig,
    exportConfig,
    importConfig,
    exportReport,
    fetchActivities,
    updateStats,
    resetSessionStats,
    exportLogs,
    clearAllRepositories,
    clearAllApiKeys
  };
};