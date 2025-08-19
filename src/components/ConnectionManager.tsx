import React, { useState, useEffect, useCallback } from 'react';
import fetch from 'cross-fetch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Github, Server, Key, Lock } from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';

import { ApiKey } from '@/types/dashboard';

interface ConnectionManagerProps {
  apiKeys: ApiKey[];
  compact?: boolean;
  checkInterval?: number;
  isUnlocked?: boolean;
  authInProgress?: boolean;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  apiKeys,
  compact = false,
  checkInterval = 10000,
  isUnlocked = false,
  authInProgress = false
}) => {
  const { globalConfig } = useGlobalConfig();
  const socketConnected = globalConfig.socketConnected;
  const latency = globalConfig.latencyMs;
  const [githubConnected, setGithubConnected] = useState(false);
  const [publicApiConnected, setPublicApiConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { logInfo } = useLogger();

  const activeApiKeys = apiKeys.filter(k => k.isActive).length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    logInfo('system', 'Checking connection status');

    try {
      const backendUrl = `http://${globalConfig.socketServerAddress}:${globalConfig.socketServerPort}/logs`;

      const [apiRes, githubRes] = await Promise.all([
        fetch(backendUrl, { method: 'HEAD' }),
        fetch('https://api.github.com/rate_limit')
      ]);

      setPublicApiConnected(apiRes.ok);
      setGithubConnected(githubRes.ok);
    } catch (error) {
      console.error('Connection check failed:', error);
      setGithubConnected(false);
      setPublicApiConnected(false);
      logInfo('socket', 'Connection check failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [globalConfig.socketServerAddress, globalConfig.socketServerPort, logInfo]);

  // Periodic server checks
  useEffect(() => {
    handleRefresh(); // Initial check
    
    const interval = setInterval(() => {
      handleRefresh();
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkInterval, activeApiKeys, handleRefresh]);

  // No local socket listeners - status comes from global config

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="secondary" className={`neo-card ${socketConnected ? 'neo-green' : 'neo-red'} text-white text-xs px-2 py-1`}>
          {socketConnected ? <Server className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {socketConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        {socketConnected && latency > 0 && (
          <Badge variant="secondary" className="neo-card neo-blue text-white text-xs px-2 py-1">
            {latency}ms
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="neo-button-secondary"
        size="sm"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      
      <Badge variant="secondary" className={`neo-card ${socketConnected ? 'neo-green' : 'neo-red'} text-white font-bold`}>
        {socketConnected ? <Server className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
        {socketConnected
          ? `Server Connected${latency > 0 ? ` (${latency}ms)` : ''}`
          : 'Server Disconnected'}
      </Badge>
      
      <Badge variant="secondary" className={`neo-card ${githubConnected ? 'neo-blue' : 'neo-red'} text-white font-bold`}>
        <Github className="w-4 h-4 mr-2" />
        GitHub {githubConnected ? 'Connected' : 'Error'}
      </Badge>

      <Badge variant="secondary" className={`neo-card ${publicApiConnected ? 'neo-yellow' : 'neo-red'} text-white font-bold`}>
        <Wifi className="w-4 h-4 mr-2" />
        Public API {publicApiConnected ? 'OK' : 'Failed'}
      </Badge>

      <Badge variant="secondary" className={`neo-card ${activeApiKeys > 0 ? 'neo-purple' : 'neo-red'} text-white font-bold`}>
        <Key className="w-4 h-4 mr-2" />
        {activeApiKeys} Keys Active
      </Badge>
      <Badge
        variant="secondary"
        className={`neo-card ${authInProgress ? 'neo-yellow' : isUnlocked ? 'neo-green' : 'neo-red'} text-white font-bold`}
      >
        <Lock className="w-4 h-4 mr-2" />
        {authInProgress ? 'Authenticating' : isUnlocked ? 'Authenticated' : 'Locked'}
      </Badge>
    </div>
  );
};

