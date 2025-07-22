import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Github, Server, Key } from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import { getSocketService } from '@/services/SocketService';

import { ApiKey } from '@/types/dashboard';

interface ConnectionManagerProps {
  apiKeys: ApiKey[];
  compact?: boolean;
  checkInterval?: number;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ apiKeys, compact = false, checkInterval = 10000 }) => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [publicApiConnected, setPublicApiConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { logInfo } = useLogger();

  const activeApiKeys = apiKeys.filter(k => k.isActive).length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const svc = getSocketService();
      setGithubConnected(activeApiKeys > 0);
      setPublicApiConnected(activeApiKeys > 0);
      setSocketConnected(svc.isConnected);
      setLatency(svc.latency);
    } catch (error) {
      console.error('Connection check failed:', error);
      setGithubConnected(false);
      setPublicApiConnected(false);
      setSocketConnected(false);
      setLatency(0);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeApiKeys]);

  // Periodic server checks
  useEffect(() => {
    handleRefresh(); // Initial check
    
    const interval = setInterval(() => {
      handleRefresh();
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkInterval, activeApiKeys, handleRefresh]);

  // update latency regularly
  useEffect(() => {
    const svc = getSocketService();
    const interval = setInterval(() => {
      setSocketConnected(svc.isConnected);
      setLatency(svc.latency);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
        Server {socketConnected ? `Connected (${latency}ms)` : 'Disconnected'}
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
    </div>
  );
};

