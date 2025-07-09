import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-4">
      <Badge variant="secondary" className={`neo-card ${isConnected ? 'neo-green' : 'neo-red'} text-black font-bold`}>
        {isConnected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
        {isConnected ? 'Connected' : 'Disconnected'}
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