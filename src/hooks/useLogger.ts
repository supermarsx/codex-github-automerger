import { useState, useCallback, useEffect } from 'react';
import { useGlobalConfig } from './useGlobalConfig';
import { getSocketService } from '@/services/SocketService';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  details?: any;
}

export const useLogger = (
  logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info'
) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { globalConfig } = useGlobalConfig();

  const shouldLog = useCallback((level: LogEntry['level']): boolean => {
    const levels = ['debug', 'info', 'warn', 'error', 'success'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevel = levels.indexOf(level);

    return messageLevel >= currentLevelIndex;
  }, [logLevel]);

  const addLog = useCallback(
    (
      level: LogEntry['level'],
      category: string,
      message: string,
      details?: any
    ) => {
      if (!shouldLog(level)) return;

      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        category,
        message,
        details
      };

      setLogs(prev => [entry, ...prev].slice(0, 1000));
      window.dispatchEvent(
        new CustomEvent<LogEntry>('log-entry', { detail: entry })
      );

      const orig = (window as any).__origConsole || console;
      const consoleMethod =
        level === 'debug'
          ? 'log'
          : level === 'info'
          ? 'info'
          : level === 'warn'
          ? 'warn'
          : 'error';
      orig[consoleMethod](`[${category}] ${message}`, details ? details : '');
    },
    [shouldLog]
  );

  useEffect(() => {
    const orig = (window as any).__origConsole || {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
    (window as any).__origConsole = orig;

    const intercept = (level: LogEntry['level'], method: keyof typeof orig) =>
      (...args: any[]) => {
        orig[method](...args);
        const msg = args
          .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        addLog(level, 'console', msg);
      };

    console.log = intercept('debug', 'log');
    console.info = intercept('info', 'info');
    console.warn = intercept('warn', 'warn');
    console.error = intercept('error', 'error');

    return () => {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
    };
  }, [addLog, globalConfig.socketServerAddress, globalConfig.socketServerPort]);

  useEffect(() => {
    addLog('info', 'system', 'Logger initialized');
    addLog('info', 'system', `Log level set to: ${logLevel}`);
  }, [addLog, logLevel]);

  useEffect(() => {
    const svc = getSocketService();
    const offConnect = svc.onConnect(() =>
      addLog('debug', 'socket', 'connected')
    );
    const offDisconnect = svc.onDisconnect(() =>
      addLog('debug', 'socket', 'disconnected')
    );
    const offLog = svc.on('server_log', (entry: any) => {
      setLogs(prev => [
        {
          id: `srv-${entry.id}`,
          timestamp: new Date(entry.timestamp),
          level: (entry.level || 'info') as LogEntry['level'],
          category: 'server',
          message: entry.message
        },
        ...prev
      ].slice(0, 1000));
    });
    return () => {
      offConnect();
      offDisconnect();
      offLog();
    };
  }, [addLog]);

  const logInfo = useCallback(
    (category: string, message: string, details?: any) => {
      addLog('info', category, message, details);
    },
    [addLog]
  );

  const logWarn = useCallback(
    (category: string, message: string, details?: any) => {
      addLog('warn', category, message, details);
    },
    [addLog]
  );

  const logError = useCallback(
    (category: string, message: string, details?: any) => {
      addLog('error', category, message, details);
    },
    [addLog]
  );

  const logDebug = useCallback(
    (category: string, message: string, details?: any) => {
      addLog('debug', category, message, details);
    },
    [addLog]
  );

  const logSuccess = useCallback(
    (category: string, message: string, details?: any) => {
      addLog('success', category, message, details);
    },
    [addLog]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    const url = `http://${globalConfig.socketServerAddress}:${globalConfig.socketServerPort}/logs`;
    fetch(url, { method: 'DELETE' }).catch(err => {
      addLog('error', 'logger', 'Failed to clear server logs', err);
    });
  }, [addLog, globalConfig.socketServerAddress, globalConfig.socketServerPort]);

  const fetchServerLogs = useCallback(async () => {
    try {
      const url = `http://${globalConfig.socketServerAddress}:${globalConfig.socketServerPort}/logs`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        const serverEntries = data.logs.map((l: any) => ({
          id: `srv-${l.id}`,
          timestamp: new Date(l.timestamp),
          level: (l.level || 'info') as LogEntry['level'],
          category: 'server',
          message: l.message,
        }));
        const seen = new Set<string>();
        const deduped = serverEntries.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
        setLogs(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const unique = deduped.filter(e => !existingIds.has(e.id));
          return [...unique, ...prev];
        });
      }
    } catch (err) {
      addLog('error', 'logger', 'Failed to fetch server logs', err);
    }
  }, [addLog, globalConfig.socketServerAddress, globalConfig.socketServerPort]);

  const exportLogs = useCallback(() => {
    const logData = {
      exported: new Date().toISOString(),
      logs: logs
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automerger-logs-${new Date()
      .toISOString()
      .split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  return {
    logs,
    logInfo,
    logWarn,
    logError,
    logDebug,
    logSuccess,
    clearLogs,
    exportLogs,
    fetchServerLogs
  };
};

