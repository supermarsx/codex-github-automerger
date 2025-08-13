import { describe, it, expect, beforeEach, vi } from 'vitest';

let logger: typeof import('../logger.ts').logger;
let MAX_LOGS: number;

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

async function loadLogger() {
  ({ logger, MAX_LOGS } = await import('../logger.ts'));
}

describe('logger ring buffer', () => {
  beforeEach(async () => {
    restoreConsole();
    vi.resetModules();
    delete process.env.LOG_MAX_ENTRIES;
    await loadLogger();
    logger.clearLogs();
  });

  it('caps logs at MAX_LOGS entries', () => {
    for (let i = 0; i < MAX_LOGS + 100; i++) {
      console.log(`log ${i}`);
    }
    const logs = logger.getLogs();
    expect(logs.length).toBe(MAX_LOGS);
    expect(logs[0].message).toContain('log 100');
  });

  it('clears logs', () => {
    console.log('hello');
    expect(logger.getLogs().length).toBe(1);
    logger.clearLogs();
    expect(logger.getLogs().length).toBe(0);
  });

  it('respects LOG_MAX_ENTRIES env var', async () => {
    restoreConsole();
    vi.resetModules();
    process.env.LOG_MAX_ENTRIES = '5';
    await loadLogger();
    for (let i = 0; i < 10; i++) {
      console.log(`log ${i}`);
    }
    const logs = logger.getLogs();
    expect(MAX_LOGS).toBe(5);
    expect(logs.length).toBe(5);
    expect(logs[0].message).toContain('log 5');
  });
});

