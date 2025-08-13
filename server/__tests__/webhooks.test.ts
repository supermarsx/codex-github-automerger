import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebhookService, type StoredWebhook } from '../webhooks.ts';
import { logger } from '../logger.ts';

let tmpDir: string;
let storagePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-'));
  storagePath = path.join(tmpDir, 'webhooks.json');
  fs.writeFileSync(storagePath, '[]');
  process.env.WEBHOOK_STORAGE_PATH = storagePath;
});

afterEach(() => {
  delete process.env.WEBHOOK_STORAGE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('WebhookService signatures', () => {
  it('validates signatures correctly', () => {
    const payload = JSON.stringify({ hello: 'world' });
    const secret = 'testsecret';
    const sig = WebhookService.generateSignature(payload, secret);
    expect(WebhookService.validateSignature(payload, `sha256=${sig}`, secret)).toBe(true);
    expect(WebhookService.validateSignature(payload, 'sha256=bad', secret)).toBe(false);
  });
});

describe('WebhookService storage', () => {
  it('persists webhooks to disk', async () => {
    const hook: StoredWebhook = {
      id: '1',
      name: 'test',
      url: 'http://example.com',
      secret: 's',
      events: ['a'],
      active: true,
      created: new Date().toISOString()
    };

    await WebhookService.saveWebhook(hook);
    const all = await WebhookService.getWebhooks();
    expect(all).toEqual([hook]);

    await WebhookService.deleteWebhook('1');
    const empty = await WebhookService.getWebhooks();
    expect(empty).toEqual([]);
  });
});

describe('WebhookService triggerWebhook', () => {
  const makeHook = (id: string): StoredWebhook => ({
    id,
    name: 'test',
    url: 'http://example.com',
    secret: 's',
    events: ['a'],
    active: true,
    created: new Date().toISOString()
  });

  const payload = {
    event: 'a',
    repository: 'r',
    timestamp: new Date().toISOString(),
    data: {}
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('updates lastTriggered only on successful calls', async () => {
    const hook = makeHook('s1');
    await WebhookService.saveWebhook(hook);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await WebhookService.triggerWebhook(hook, payload);
    expect(res).toEqual({ success: true });

    const stored = await WebhookService.getWebhooks();
    expect(stored[0].lastTriggered).toBeDefined();

    await WebhookService.deleteWebhook(hook.id);
  });

  it('returns error when fetch responds non-200', async () => {
    const hook = makeHook('f1');
    await WebhookService.saveWebhook(hook);

    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'boom' });
    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(logger, 'error');

    const res = await WebhookService.triggerWebhook(hook, payload);
    expect(res).toEqual({ success: false, error: 'HTTP 500: boom' });
    expect(logSpy).toHaveBeenCalled();

    const stored = await WebhookService.getWebhooks();
    expect(stored[0].lastTriggered).toBeUndefined();

    await WebhookService.deleteWebhook(hook.id);
  });

  it('returns error when fetch rejects', async () => {
    const hook = makeHook('f2');
    await WebhookService.saveWebhook(hook);

    const fetchMock = vi.fn().mockRejectedValue(new Error('net fail'));
    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(logger, 'error');

    const res = await WebhookService.triggerWebhook(hook, payload);
    expect(res).toEqual({ success: false, error: 'net fail' });
    expect(logSpy).toHaveBeenCalled();

    const stored = await WebhookService.getWebhooks();
    expect(stored[0].lastTriggered).toBeUndefined();

    await WebhookService.deleteWebhook(hook.id);
  });
});
