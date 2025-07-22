import { useState, useCallback, useEffect } from 'react';
import { getSocketService } from '@/services/SocketService';
import { useLogger } from './useLogger';

export interface ServerLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'error';
  message: string;
  category?: string;
}

export const useServerLogs = () => {
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([]);
  const { logError } = useLogger();

  const fetchServerLogs = useCallback(async () => {
    try {
      const logs = await getSocketService().fetchLogs();
      if (Array.isArray(logs)) {
        setServerLogs(
          logs.map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
            category: 'server'
          }))
        );
      }
    } catch (err) {
      logError('server-logs', 'Error fetching server logs', err);
    }
  }, [logError]);

  const clearServerLogs = useCallback(async () => {
    try {
      await getSocketService().clearLogs();
      setServerLogs([]);
    } catch (err) {
      logError('server-logs', 'Error clearing server logs', err);
    }
  }, [logError]);

  useEffect(() => {
    fetchServerLogs();
  }, [fetchServerLogs]);

  return { serverLogs, fetchServerLogs, clearServerLogs };
};
