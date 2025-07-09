import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Github, Server, Key } from 'lucide-react';

interface ConnectionManagerProps {
  apiKeys: any[];
  compact?: boolean;
  checkInterval?: number;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ apiKeys, compact = false, checkInterval = 10000 }) => {
  const [socketConnected, setSocketConnected] = useState(true);
  const [githubConnected, setGithubConnected] = useState(true);
  const [publicApiConnected, setPublicApiConnected] = useState(true);
  const [latency, setLatency] = useState(42);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeApiKeys = apiKeys.filter(k => k.isActive).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLatency(Math.floor(Math.random() * 100) + 20);
    }, 1000);
  };

  // Simulate periodic server checks
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 100) + 20);
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkInterval]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="secondary" className={`neo-card ${socketConnected ? 'neo-green' : 'neo-red'} text-white text-xs px-2 py-1`}>
          <Server className="w-3 h-3 mr-1" />
          {latency}ms
        </Badge>
        <Badge variant="secondary" className={`neo-card ${githubConnected ? 'neo-blue' : 'neo-red'} text-white text-xs px-2 py-1`}>
          <Github className="w-3 h-3 mr-1" />
          GH
        </Badge>
        <Badge variant="secondary" className={`neo-card ${activeApiKeys > 0 ? 'neo-yellow' : 'neo-red'} text-white text-xs px-2 py-1`}>
          <Key className="w-3 h-3 mr-1" />
          {activeApiKeys}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <Badge variant="secondary" className={`neo-card ${socketConnected ? 'neo-green' : 'neo-red'} text-white font-bold`}>
        {socketConnected ? <Server className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
        Server {socketConnected ? `(${latency}ms)` : 'Disconnected'}
      </Badge>
      
      <Badge variant="secondary" className={`neo-card ${githubConnected ? 'neo-blue' : 'neo-red'} text-white font-bold`}>
        <Github className="w-4 h-4 mr-2" />
        GitHub API {githubConnected ? 'Connected' : 'Error'}
      </Badge>

      <Badge variant="secondary" className={`neo-card ${publicApiConnected ? 'neo-yellow' : 'neo-red'} text-white font-bold`}>
        <Wifi className="w-4 h-4 mr-2" />
        Public API {publicApiConnected ? 'OK' : 'Failed'}
      </Badge>

      <Badge variant="secondary" className={`neo-card ${activeApiKeys > 0 ? 'neo-purple' : 'neo-red'} text-white font-bold`}>
        <Key className="w-4 h-4 mr-2" />
        {activeApiKeys} Active Keys
      </Badge>
      
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="neo-button-secondary"
        size="sm"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};