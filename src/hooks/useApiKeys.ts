import { useState } from 'react';
import { ApiKey } from '@/types/dashboard';
import { useToast } from './use-toast';
import { useLogger } from './useLogger';

export const useApiKeys = () => {
  const { toast } = useToast();
  const { logInfo } = useLogger();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production Key',
      key: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      created: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      isActive: true,
      encrypted: true,
      connectionStatus: 'connected'
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      created: new Date('2024-01-10'),
      isActive: false,
      encrypted: false,
      connectionStatus: 'disconnected'
    }
  ]);

  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [deletedApiKeys, setDeletedApiKeys] = useState<Map<string, { key: ApiKey; timeout: NodeJS.Timeout }>>(new Map());

  const addApiKey = (name: string, key: string) => {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      key,
      created: new Date(),
      isActive: true,
      encrypted: true
    };
    setApiKeys(prev => [...prev, newKey]);
    logInfo('api-key', `API Key "${name}" added`, { keyName: name });
    toast({ title: `API Key "${name}" added successfully!` });
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(keys =>
      keys.map(key => {
        if (key.id === id) {
          const newActive = !key.isActive;
          logInfo('api-key', `API Key "${key.name}" ${newActive ? 'activated' : 'deactivated'}`, { keyName: key.name, active: newActive });
          toast({ 
            title: `API Key "${key.name}" ${newActive ? 'activated' : 'deactivated'}`,
            description: newActive ? 'API key is now active and ready to use' : 'API key is now inactive'
          });
          return { ...key, isActive: newActive };
        }
        return key;
      })
    );
  };

  const deleteApiKey = (id: string) => {
    const key = apiKeys.find(k => k.id === id);
    if (!key) return;
    
    setApiKeys(keys => keys.filter(key => key.id !== id));
    logInfo('api-key', `API Key "${key.name}" deleted`, { keyName: key.name });
    
    // Set up revert functionality
    const timeout = setTimeout(() => {
      setDeletedApiKeys(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, 15000);
    
    setDeletedApiKeys(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { key, timeout });
      return newMap;
    });
    
    toast({
      title: `API Key "${key.name}" deleted`,
      description: "You can revert this action within 15 seconds"
    });
  };

  const revertApiKeyDeletion = (id: string) => {
    const deleted = deletedApiKeys.get(id);
    if (deleted) {
      clearTimeout(deleted.timeout);
      setApiKeys(keys => [...keys, deleted.key]);
      setDeletedApiKeys(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      toast({ title: `API Key "${deleted.key.name}" restored` });
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey(showApiKey === id ? null : id);
  };

  return {
    apiKeys,
    showApiKey,
    deletedApiKeys,
    addApiKey,
    toggleApiKey,
    deleteApiKey,
    revertApiKeyDeletion,
    toggleShowApiKey
  };
};