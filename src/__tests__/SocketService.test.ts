import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unmock('../services/BasicSocket.ts');
});

describe('SocketService initialization', () => {
  it('uses configuration values when connecting', async () => {
    const { SocketService } = await import('../services/SocketService.ts');
    const { logger } = await import('../services/Logger');
    const infoSpy = vi.spyOn(logger, 'logInfo').mockImplementation(() => {});
    const svc = new SocketService();
    const ok = svc.initialize('example.com', 1234, 1);
    expect(ok).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith(
      'socket',
      'Socket service initialized',
      expect.objectContaining({ url: 'http://example.com:1234' })
    );
    svc.disconnect();
  });

  it('respects retry limit on failed connections', async () => {
    const connectMock = vi.fn();
    vi.doMock('../services/BasicSocket.ts', () => {
      return {
        BasicSocket: vi.fn().mockImplementation(() => ({
          isConnected: false,
          latency: 0,
          connect: connectMock,
          disconnect: vi.fn(),
          sendMessage: vi.fn(),
          sendRequest: vi.fn(),
          onMessage: vi.fn()
        }))
      };
    });
    const { SocketService } = await import('../services/SocketService.ts');
    const { logger } = await import('../services/Logger');
    const svc = new SocketService();
    const ok = svc.initialize('host', 1111, 2);
    expect(ok).toBe(false);
    expect(connectMock).toHaveBeenCalledTimes(3);
  });
});
