import { useState, useEffect, useRef, useCallback } from 'react';

interface SocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  checkInterval?: number;
}

interface SocketMessage {
  type: string;
  data: unknown;
  timestamp: Date;
}

export const useSocket = (config: SocketConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const connectionAttemptsRef = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  
  const ws = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastPingTime = useRef<number>(0);
  const listeners = useRef(new Map<string, Set<(data: unknown) => void>>());

  const connect = useCallback(() => {
    try {
      if (ws.current) ws.current.close();
      ws.current = new WebSocket(config.url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionAttempts(0);
        connectionAttemptsRef.current = 0;

        sendPing();
        if (pingInterval.current) clearInterval(pingInterval.current);
        pingInterval.current = setInterval(() => sendPing(), config.checkInterval || 10000);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        scheduleReconnect();
      };

      ws.current.onmessage = evt => {
        try {
          const msg = JSON.parse(evt.data);
          emitMessage(msg.type, msg.data);
        } catch (err) {
          console.error('Invalid message', err);
        }
      };
    } catch (error) {
      console.error('Socket connection failed:', error);
      scheduleReconnect();
    }
  }, [config.url, config.checkInterval, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
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
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (connectionAttemptsRef.current >= (config.maxReconnectAttempts || 5)) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = (config.reconnectInterval || 5000) * Math.pow(2, connectionAttemptsRef.current);
    connectionAttemptsRef.current += 1;
    setConnectionAttempts(connectionAttemptsRef.current);

    reconnectTimeout.current = setTimeout(() => {
      console.log(`Reconnecting... attempt ${connectionAttemptsRef.current}`);
      connectRef.current();
    }, delay);
  }, [config]);

  const sendMessage = (type: string, data: unknown) => {
    if (isConnected && ws.current) {
      const message = {
        type,
        data,
        timestamp: Date.now()
      };
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error('Failed to send message', err);
      }
    }
    return false;
  };

  const emitMessage = (type: string, data: unknown) => {
    setLastMessage({ type, data, timestamp: new Date() });
    if (type === 'pong') {
      const ts = (data as any)?.timestamp;
      const now = Date.now();
      if (typeof ts === 'number') {
        setLatency(now - ts);
      } else if (lastPingTime.current) {
        setLatency(now - lastPingTime.current);
      }
    }
    const setListeners = listeners.current.get(type);
    if (setListeners) {
      for (const cb of setListeners) cb(data);
    }
  };

  const onMessage = (type: string, cb: (data: unknown) => void) => {
    let setListeners = listeners.current.get(type);
    if (!setListeners) {
      setListeners = new Set();
      listeners.current.set(type, setListeners);
    }
    setListeners.add(cb);
    return () => setListeners!.delete(cb);
  };

  const sendPing = () => {
    lastPingTime.current = Date.now();
    return sendMessage('ping', { timestamp: lastPingTime.current });
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    latency,
    lastMessage,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
    sendPing,
    onMessage,
    emitMessage
  };
};