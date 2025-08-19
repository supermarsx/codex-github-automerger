// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('cross-fetch', () => ({
  default: vi.fn()
}));
vi.mock('@/hooks/useGlobalConfig', () => ({
  useGlobalConfig: () => ({
    globalConfig: {
      socketServerAddress: 'localhost',
      socketServerPort: 8080,
      socketConnected: false,
      latencyMs: 0
    }
  })
}));
vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({ logInfo: vi.fn() })
}));

import fetch from 'cross-fetch';
import { ConnectionManager } from '@/components/ConnectionManager';
import { ApiKey } from '@/types/dashboard';

describe('ConnectionManager handleRefresh', () => {
  const apiKeys: ApiKey[] = [
    { id: '1', name: 'k', key: 'abc', created: new Date(), isActive: true, encrypted: false }
  ];
  const fetchMock = fetch as unknown as vi.Mock;

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('sets connected states on successful requests', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConnectionManager apiKeys={apiKeys} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(screen.getByText(/GitHub Connected/i)).toBeTruthy();
      expect(screen.getByText(/Public API OK/i)).toBeTruthy();
    });
  });

  it('sets error states on failed requests', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: true });

    render(<ConnectionManager apiKeys={apiKeys} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(screen.getByText(/GitHub Error/i)).toBeTruthy();
      expect(screen.getByText(/Public API Failed/i)).toBeTruthy();
    });
  });
});
