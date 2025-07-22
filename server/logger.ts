export type ServerLogEntry = {
  id: string;
  timestamp: Date;
  level: 'info' | 'error';
  message: string;
};

const logs: ServerLogEntry[] = [];

function addLog(level: 'info' | 'error', args: unknown[]) {
  const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  logs.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    timestamp: new Date(),
    level,
    message
  });
}

export const logger = {
  info: (...args: unknown[]) => {
    addLog('info', args);
    console.log('[info]', ...args);
  },
  error: (...args: unknown[]) => {
    addLog('error', args);
    console.error('[error]', ...args);
  }
};

export function getLogs(): ServerLogEntry[] {
  return [...logs];
}

export function clearLogs(): void {
  logs.length = 0;
}
