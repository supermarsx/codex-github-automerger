import { useRepositories } from './useRepositories';
import { useApiKeys } from './useApiKeys';
import { useGlobalConfig } from './useGlobalConfig';
import { GlobalConfig } from '@/types/dashboard';
import { useActivities } from './useActivities';
import { useLogger } from './useLogger';
import { useWatchModePersistence } from './useWatchModePersistence';

export const useDashboardData = () => {


  const { clearWatchModeState } = useWatchModePersistence();

  const { logs, exportLogs, clearLogs, fetchServerLogs } = useLogger();


  
  const {
    repositories,
    toggleRepository,
    toggleAutoMergeOnClean,
    toggleAutoMergeOnUnstable,
    toggleWatch,
    toggleDeleteOnDirty,
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
    setGlobalConfig: baseSetGlobalConfig,
    resetConfig,
    exportConfig,
    importConfig
  } = useGlobalConfig();

  const setGlobalConfig = (updates: Partial<GlobalConfig>) => {
    const prev = globalConfig;
    baseSetGlobalConfig(updates);
    if (
      updates.autoMergeOnClean !== undefined &&
      updates.autoMergeOnClean !== prev.autoMergeOnClean
    ) {
      repositories.forEach(repo =>
        addRepositoryActivity(repo.id, {
          type: 'alert',
          message: `${updates.autoMergeOnClean ? 'enabled' : 'disabled'} auto merge on clean (global)`,
          repo: `${repo.owner}/${repo.name}`,
          timestamp: new Date()
        })
      );
    }
    if (
      updates.autoMergeOnUnstable !== undefined &&
      updates.autoMergeOnUnstable !== prev.autoMergeOnUnstable
    ) {
      repositories.forEach(repo =>
        addRepositoryActivity(repo.id, {
          type: 'alert',
          message: `${updates.autoMergeOnUnstable ? 'enabled' : 'disabled'} auto merge on unstable (global)`,
          repo: `${repo.owner}/${repo.name}`,
          timestamp: new Date()
        })
      );
    }
    if (
      updates.autoDeleteOnDirty !== undefined &&
      updates.autoDeleteOnDirty !== prev.autoDeleteOnDirty
    ) {
      repositories.forEach(repo =>
        addRepositoryActivity(repo.id, {
          type: 'alert',
          message: `${updates.autoDeleteOnDirty ? 'enabled' : 'disabled'} auto del on dirty (global)`,
          repo: `${repo.owner}/${repo.name}`,
          timestamp: new Date()
        })
      );
    }
  };

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
    toggleAutoMergeOnClean,
    toggleAutoMergeOnUnstable,
    toggleWatch,
    toggleDeleteOnDirty,
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
    fetchServerLogs,
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