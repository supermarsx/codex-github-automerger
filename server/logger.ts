type LogEntry = {
  id: string;
  timestamp: Date;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
};
const logs: LogEntry[] = [];

function addLog(level: LogEntry['level'], args: unknown[]) {
  const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  logs.push({ id: Date.now().toString(36), timestamp: new Date(), level, message });
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
  getLogs: () => logs
};

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
