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
    addRepository,
    deleteRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser
  } = useRepositories();

  const {
    apiKeys,
    showApiKey,
    deletedApiKeys,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey
  } = useApiKeys();

  const {
    globalConfig,
    setGlobalConfig
  } = useGlobalConfig();

  const {
    activities,
    mergeStats,
    isLoading,
    exportReport,
    fetchActivities
  } = useActivities();

  return {
    repositories,
    apiKeys,
    showApiKey,
    globalConfig,
    activities,
    mergeStats,
    logs,
    deletedApiKeys,
    isLoading,
    toggleRepository,
    addRepository,
    deleteRepository,
    addBranch,
    removeBranch,
    addUser,
    removeUser,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey,
    exportReport,
    setGlobalConfig,
    exportLogs,
    fetchActivities
  };
};