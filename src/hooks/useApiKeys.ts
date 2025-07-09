import { useState, useEffect } from 'react';
import { ApiKey } from '@/types/dashboard';
import { useToast } from './use-toast';
import { useLogger } from './useLogger';
import { EncryptionService } from '@/utils/encryption';
import { PasskeyService } from '@/utils/passkeyAuth';

const API_KEYS_STORAGE_KEY = 'automerger-api-keys';

export const useApiKeys = () => {
  const { toast } = useToast();
  const { logInfo } = useLogger();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    const savedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        return parsed.map((key: any) => ({
          ...key,
          created: new Date(key.created),
          lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined
        }));
      } catch (error) {
        console.error('Error parsing saved API keys:', error);
        return [];
      }
    }
    return [];
  });

  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [deletedApiKeys, setDeletedApiKeys] = useState<Map<string, { key: ApiKey; timeout: NodeJS.Timeout }>>(new Map());

  const [unlocked, setUnlocked] = useState(false);
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});

  // Persist API keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    const unlock = async () => {
      try {
        if (PasskeyService.getStoredCredentials().length === 0) {
          logInfo('api-key', 'No passkey registered, skipping unlock');
          const map: Record<string, string> = {};
          apiKeys.forEach(k => {
            try { map[k.id] = atob(k.key); } catch {}
          });
          setDecryptedKeys(map);
          setUnlocked(true);
          return;
        }

        logInfo('api-key', 'Authenticating passkey to unlock API keys');
        const result = await PasskeyService.authenticate();
        if (result.success) {
          const map: Record<string, string> = {};
          apiKeys.forEach(k => {
            try { map[k.id] = atob(k.key); } catch {}
          });
          setDecryptedKeys(map);
          setUnlocked(true);
          logInfo('api-key', 'API keys unlocked');
        } else {
          logInfo('api-key', 'Passkey authentication failed', { error: result.error });
        }
      } catch (error) {
        logInfo('api-key', 'Error unlocking API keys', error);
      }
    };

    unlock();
    // intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${key}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  };

  const addApiKey = async (name: string, key: string) => {
    if (!name.trim() || !key.trim()) {
      toast({ 
        title: 'Invalid input',
        description: 'Both name and API key are required',
        variant: 'destructive'
      });
      return;
    }

    // Check if API key already exists (compare original key)
    const existingKey = apiKeys.find(k => {
      try {
        return atob(k.key) === key;
      } catch {
        return false;
      }
    });
    
    if (existingKey) {
      toast({ 
        title: 'API key already exists',
        description: 'This API key is already in your list',
        variant: 'destructive'
      });
      return;
    }

    // Validate API key
    const isValid = await validateApiKey(key);
    
    // For now, store API keys in a simple obfuscated form
    // In a real app, you'd use proper encryption with a master password
    const obfuscatedKey = btoa(key); // Simple base64 encoding
    
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: name.trim(),
      key: obfuscatedKey,
      created: new Date(),
      isActive: isValid,
      encrypted: true,
      connectionStatus: isValid ? 'connected' : 'disconnected'
    };

    setApiKeys(prev => [...prev, newKey]);
    if (unlocked) {
      setDecryptedKeys(prev => ({ ...prev, [newKey.id]: key }));
    }
    logInfo('api-key', `API Key "${name}" added`, { keyName: name, valid: isValid });
    
    toast({ 
      title: `API Key "${name}" added ${isValid ? 'successfully' : 'with issues'}!`,
      description: isValid 
        ? 'API key validated and ready to use' 
        : 'API key added but validation failed - please check the key',
      variant: isValid ? 'default' : 'destructive'
    });
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
          return { 
            ...key, 
            isActive: newActive,
            lastUsed: newActive ? new Date() : key.lastUsed
          };
        }
        return key;
      })
    );
  };

  const deleteApiKey = (id: string) => {
    const key = apiKeys.find(k => k.id === id);
    if (!key) return;

    setApiKeys(keys => keys.filter(key => key.id !== id));
    setDecryptedKeys(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
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
      if (unlocked) {
        setDecryptedKeys(prev => ({ ...prev, [deleted.key.id]: atob(deleted.key.key) }));
      }
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

  const updateApiKeyConnectionStatus = (id: string, status: ApiKey['connectionStatus']) => {
    setApiKeys(keys =>
      keys.map(key =>
        key.id === id 
          ? { ...key, connectionStatus: status, lastUsed: new Date() }
          : key
      )
    );
  };

  const getDecryptedApiKey = (id: string): string | null => {
    return decryptedKeys[id] || null;
  };

  const refreshApiKeyStatus = async (id: string) => {
    const decryptedKey = getDecryptedApiKey(id);
    if (!decryptedKey) return;

    const isValid = await validateApiKey(decryptedKey);
    updateApiKeyConnectionStatus(id, isValid ? 'connected' : 'disconnected');
  };

  const clearAllApiKeys = () => {
    setApiKeys([]);
    setDeletedApiKeys(new Map());
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
    toast({ 
      title: 'All API keys cleared',
      description: 'API key data has been reset'
    });
  };

  return {
    apiKeys,
    isUnlocked: unlocked,
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
  };};