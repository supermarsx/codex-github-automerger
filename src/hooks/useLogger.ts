import { useState, useCallback, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  details?: any;
}

export const useLogger = (logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
        const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
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
  }, []);

  // Initialize with startup logs
  useEffect(() => {
    addLog('info', 'system', 'Logger initialized');
    addLog('info', 'system', `Log level set to: ${logLevel}`);
  }, []);

  const shouldLog = (level: LogEntry['level']): boolean => {
    const levels = ['debug', 'info', 'warn', 'error', 'success'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevel = levels.indexOf(level);
    
    return messageLevel >= currentLevelIndex;
  };

  const addLog = useCallback((
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

    setLogs(prev => [entry, ...prev].slice(0, 1000)); // Keep only last 1000 logs
    window.dispatchEvent(new CustomEvent<LogEntry>('log-entry', { detail: entry }));
    
    // Also log to console for debugging
    const orig = (window as any).__origConsole || console;
    const consoleMethod = level === 'debug' ? 'log' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';
    orig[consoleMethod](`[${category}] ${message}`, details ? details : '');
  }, [logLevel]);

  const logInfo = useCallback((category: string, message: string, details?: any) => {
    addLog('info', category, message, details);
  }, [addLog]);

  const logWarn = useCallback((category: string, message: string, details?: any) => {
    addLog('warn', category, message, details);
  }, [addLog]);

  const logError = useCallback((category: string, message: string, details?: any) => {
    addLog('error', category, message, details);
  }, [addLog]);

  const logDebug = useCallback((category: string, message: string, details?: any) => {
    addLog('debug', category, message, details);
  }, [addLog]);

  const logSuccess = useCallback((category: string, message: string, details?: any) => {
    addLog('success', category, message, details);
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const logData = {
      exported: new Date().toISOString(),
      logs: logs
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automerger-logs-${new Date().toISOString().split('T')[0]}.json`;
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
    exportLogs
  };
};