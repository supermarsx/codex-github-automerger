import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkForUpdate } from '../utils/updateChecker';

const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => (k in storage ? storage[k] : null),
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
vi.stubGlobal('localStorage', mockLocalStorage);

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  mockLocalStorage.clear();
  vi.useRealTimers();
});

describe('checkForUpdate', () => {
  it('aborts when the request times out', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url, options: any) => {
      const signal: AbortSignal | undefined = options?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    global.fetch = fetchMock as any;

    const promise = checkForUpdate('https://example.com/manifest.json', { timeout: 100 });
    vi.advanceTimersByTime(150);
    await expect(promise).rejects.toThrow(/aborted/i);
  });

  it('caches ETag and sends If-None-Match on subsequent requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.0.0' }), {
          status: 200,
          headers: { ETag: 'etag-123' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    global.fetch = fetchMock as any;

    const first = await checkForUpdate('https://example.com/manifest.json');
    expect(first.hasUpdate).toBe(true);
    expect(localStorage.getItem('update-checker-etag')).toBe('etag-123');

    const second = await checkForUpdate('https://example.com/manifest.json');
    const headers = fetchMock.mock.calls[1][1]?.headers as any;
    expect(headers['If-None-Match']).toBe('etag-123');
    expect(second.hasUpdate).toBe(false);
  });
});
