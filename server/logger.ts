import { EventEmitter } from 'events';

export type LogEntry = {
  id: string;
  timestamp: Date;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
};

export const logEmitter = new EventEmitter();

// Allow overriding the default log cap via environment variable.
// Falls back to 1000 entries if the variable is not set or invalid.
const envMax = Number.parseInt(process.env.LOG_MAX_ENTRIES ?? '', 10);
export const MAX_LOGS = Number.isFinite(envMax) && envMax > 0 ? envMax : 1000;
const logs: LogEntry[] = [];

function addLog(level: LogEntry['level'], args: unknown[]) {
  const message = args
    .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const entry = { id, timestamp: new Date(), level, message };
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  logEmitter.emit('log', entry);
}

function clearLogs() {
  logs.length = 0;
}

export const logger = {
  info: (...args: unknown[]) => {
    addLog('info', args);
    console.log('[info]', ...args);
  },
  error: (...args: unknown[]) => {
    addLog('error', args);
    console.error('[error]', ...args);
  },
  warn: (...args: unknown[]) => {
    addLog('warn', args);
    console.warn('[warn]', ...args);
  },
  debug: (...args: unknown[]) => {
    addLog('debug', args);
    console.debug('[debug]', ...args);
  },
  getLogs: () => logs,
  clearLogs
};

export function onLog(cb: (entry: LogEntry) => void): () => void {
  logEmitter.on('log', cb);
  return () => logEmitter.off('log', cb);
}

// Capture native console output so it also appears in the logs endpoint
const origConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};
console.log = (...args: unknown[]) => {
  addLog('info', args);
  origConsole.log(...args);
};
console.warn = (...args: unknown[]) => {
  addLog('warn', args);
  origConsole.warn(...args);
};
console.error = (...args: unknown[]) => {
  addLog('error', args);
  origConsole.error(...args);
};
console.debug = (...args: unknown[]) => {
  addLog('debug', args);
  origConsole.debug(...args);
};
