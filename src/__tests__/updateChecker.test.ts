import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkUserscriptUpdates, UPDATE_API } from '@/utils/updateChecker';

describe('checkUserscriptUpdates', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal('GM_info', { script: { version: '1.0.0' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns hasUpdate true when newer version available', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.1.0' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkUserscriptUpdates();
    expect(fetchMock).toHaveBeenCalledWith(UPDATE_API);
    expect(result).toEqual({ hasUpdate: true, latestVersion: '1.1.0' });
  });

  it('returns hasUpdate false when up to date', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.0.0' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkUserscriptUpdates();
    expect(result).toEqual({ hasUpdate: false });
  });

  it('returns hasUpdate false when response not ok', async () => {
    const jsonMock = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jsonMock
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkUserscriptUpdates();
    expect(result).toEqual({ hasUpdate: false });
    expect(jsonMock).not.toHaveBeenCalled();
  });
});
