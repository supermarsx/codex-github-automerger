import { describe, it, expect, beforeEach } from 'vitest';
import { logger, MAX_LOGS } from '../logger.ts';

describe('logger ring buffer', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('caps logs at MAX_LOGS entries', () => {
    for (let i = 0; i < MAX_LOGS + 100; i++) {
      console.log(`log ${i}`);
    }
    const logs = logger.getLogs();
    expect(logs.length).toBe(MAX_LOGS);
    expect(logs[0].message).toContain(`log 100`);
  });

  it('clears logs', () => {
    console.log('hello');
    expect(logger.getLogs().length).toBe(1);
    logger.clearLogs();
    expect(logger.getLogs().length).toBe(0);
  });
});
