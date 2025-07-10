import { useRepositories } from './useRepositories';
import { useApiKeys } from './useApiKeys';
import { useGlobalConfig } from './useGlobalConfig';
import { useActivities } from './useActivities';
import { useLogger } from './useLogger';
import { useWatchModePersistence } from './useWatchModePersistence';

export const useDashboardData = () => {


  const { clearWatchModeState } = useWatchModePersistence();

  const { logs, exportLogs, clearLogs } = useLogger();


  
  const {
    repositories,
    toggleRepository,
    toggleAutoMerge,
    toggleWatch,
    toggleDeleteBranch,
    toggleCloseBranch,
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
    authInProgress,
    deletedApiKeys,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    updateApiKeyConnectionStatus,
    getDecryptedApiKey,
    refreshApiKeyStatus,
    clearAllApiKeys,
    unlock,
    showLockedModal,
    setShowLockedModal
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
    toggleWatch,
    toggleDeleteBranch,
    toggleCloseBranch,
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
    clearLogs,
    clearAllRepositories,
    clearAllApiKeys,
    clearWatchModeState,
    unlock,
    authInProgress,
    showLockedModal,
    setShowLockedModal
  };
};