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
    const ok = await svc.initialize('example.com', 1234, 1);
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
          onMessage: vi.fn(),
          onConnect: vi.fn().mockImplementation(() => () => {}),
          onDisconnect: vi.fn().mockImplementation(() => () => {})
        }))
      };
    });
    const { SocketService } = await import('../services/SocketService.ts');
    const { logger } = await import('../services/Logger');
    const svc = new SocketService();
    const ok = await svc.initialize('host', 1111, 2);
    expect(ok).toBe(false);
    expect(connectMock).toHaveBeenCalledTimes(3);
  });

  it('uses defaults from config supplier when params omitted', async () => {
    const { SocketService } = await import('../services/SocketService.ts');
    const { logger } = await import('../services/Logger');
    const debugSpy = vi.spyOn(logger, 'logDebug').mockImplementation(() => {});
    const svc = new SocketService();
    svc.setConfigSupplier(() => ({
      socketServerAddress: 'cfg.host',
      socketServerPort: 9876,
      socketMaxRetries: 0
    }));
    await svc.initialize();
    expect(debugSpy).toHaveBeenCalledWith(
      'socket',
      'attempting connection',
      expect.objectContaining({ url: 'http://cfg.host:9876' })
    );
    svc.disconnect();
  });
});

describe('deleteBranch', () => {
  it('forwards protected and allowed patterns to the server', async () => {
    const { SocketService } = await import('../services/SocketService.ts');
    const svc = new SocketService();
    const reqSpy = vi
      .spyOn(svc as any, 'request')
      .mockResolvedValue({} as any);
    await svc.deleteBranch('t', 'o', 'r', 'b', ['p'], ['a']);
    expect(reqSpy).toHaveBeenCalledWith(
      'deleteBranch',
      expect.objectContaining({
        token: 't',
        owner: 'o',
        repo: 'r',
        branch: 'b',
        protectedPatterns: ['p'],
        allowedPatterns: ['a']
      })
    );
  });
});
