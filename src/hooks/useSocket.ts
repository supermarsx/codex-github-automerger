import { useState, useEffect, useRef } from 'react';

interface SocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface SocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export const useSocket = (config: SocketConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const ws = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastPingTime = useRef<number>(0);

  const connect = () => {
    try {
      // Simulate WebSocket connection for demo
      setIsConnected(true);
      setLatency(Math.floor(Math.random() * 100) + 20);
      setConnectionAttempts(0);
      
      // Simulate periodic latency updates
      if (pingInterval.current) clearInterval(pingInterval.current);
      pingInterval.current = setInterval(() => {
        setLatency(Math.floor(Math.random() * 100) + 20);
      }, 5000);
      
    } catch (error) {
      console.error('Socket connection failed:', error);
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    setIsConnected(false);
  };

  const scheduleReconnect = () => {
    if (connectionAttempts >= (config.maxReconnectAttempts || 5)) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = (config.reconnectInterval || 5000) * Math.pow(2, connectionAttempts);
    setConnectionAttempts(prev => prev + 1);
    
    reconnectTimeout.current = setTimeout(() => {
      console.log(`Reconnecting... attempt ${connectionAttempts + 1}`);
      connect();
    }, delay);
  };

  const sendMessage = (type: string, data: any) => {
    if (isConnected && ws.current) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      // Simulate sending message
      console.log('Sending message:', message);
      return true;
    }
    return false;
  };

  const sendPing = () => {
    lastPingTime.current = Date.now();
    return sendMessage('ping', {});
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    latency,
    lastMessage,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
    sendPing
  };
};