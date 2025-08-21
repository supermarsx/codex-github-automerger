import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { encryptSecret } from '../utils/encryption.ts';
import type { StoredWebhook } from '../webhooks.ts';

let WebhookService: typeof import('../webhooks.ts').WebhookService;
let logger: typeof import('../logger.ts').logger;
let tmpDir: string;
let storagePath: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-'));
  storagePath = path.join(tmpDir, 'webhooks.json');
  fs.writeFileSync(storagePath, '[]');
  process.env.WEBHOOK_STORAGE_PATH = storagePath;
  process.env.WEBHOOK_SECRET_KEY = 'test-key-1234567890-test-key';
  vi.resetModules();
  ({ WebhookService } = await import('../webhooks.ts'));
  ({ logger } = await import('../logger.ts'));
});

afterEach(() => {
  delete process.env.WEBHOOK_STORAGE_PATH;
  delete process.env.WEBHOOK_SECRET_KEY;
  delete process.env.WEBHOOK_MAX_ATTEMPTS;
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
  it('persists webhooks to disk with encrypted secrets', async () => {
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
    const raw = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    expect(raw[0].secret).not.toBe('s');
    expect(raw[0].secret.startsWith('enc:')).toBe(true);

    await WebhookService.deleteWebhook('1');
    const empty = await WebhookService.getWebhooks();
    expect(empty).toEqual([]);
  });

  it('migrates plaintext secrets', async () => {
    const plain: StoredWebhook = {
      id: 'p1',
      name: 'plain',
      url: 'http://example.com',
      secret: 'plain',
      events: ['a'],
      active: true,
      created: new Date().toISOString()
    };
    fs.writeFileSync(storagePath, JSON.stringify([plain], null, 2));
    await WebhookService.reload();
    const loaded = await WebhookService.getWebhooks();
    expect(loaded[0].secret).toBe('plain');
    const raw = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    expect(raw[0].secret.startsWith('enc:')).toBe(true);
  });

  it('handles concurrent saves without corrupting the file', async () => {
    const hooks: StoredWebhook[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      name: `t${i}`,
      url: 'http://example.com',
      secret: `s${i}`,
      events: ['a'],
      active: true,
      created: new Date().toISOString()
    }));

    await Promise.all(hooks.map(h => WebhookService.saveWebhook(h)));
    const raw = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    expect(raw).toHaveLength(hooks.length);
    const ids = raw.map((r: any) => r.id).sort();
    expect(ids).toEqual(hooks.map(h => h.id).sort());
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

  it('aborts fetch and logs error on timeout', async () => {
    const hook = makeHook('t1');
    await WebhookService.saveWebhook(hook);

    vi.useFakeTimers();
    const fetchMock = vi.fn((_url, opts) => new Promise((_, reject) => {
      opts?.signal?.addEventListener('abort', () => {
        const err = new Error('aborted');
        (err as any).name = 'AbortError';
        reject(err);
      });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(logger, 'error');

    const resPromise = WebhookService.triggerWebhook(hook, payload);
    await vi.advanceTimersByTimeAsync(5000);
    const res = await resPromise;

    expect(res).toEqual({ success: false, error: 'Request timed out' });
    expect(logSpy).toHaveBeenCalled();

    vi.useRealTimers();
    await WebhookService.deleteWebhook(hook.id);
  });

  it('uses decrypted secret when triggering', async () => {
    const hook = makeHook('enc1');
    const encHook = { ...hook, secret: encryptSecret(hook.secret) };

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await WebhookService.triggerWebhook(encHook, payload);
    expect(res).toEqual({ success: true });
    const sentSig = fetchMock.mock.calls[0][1].headers['X-Hub-Signature-256'];
    const expectedSig = WebhookService.generateSignature(JSON.stringify(payload), hook.secret);
    expect(sentSig).toBe(`sha256=${expectedSig}`);
  });

  it('retries failed calls and eventually succeeds', async () => {
    const hook = makeHook('r1');
    await WebhookService.saveWebhook(hook);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'fail' })
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', fetchMock);
    const warnSpy = vi.spyOn(logger, 'warn');

    vi.useFakeTimers();
    const resPromise = WebhookService.triggerWebhook(hook, payload);
    await vi.advanceTimersByTimeAsync(1000); // backoff before retry
    const res = await resPromise;

    expect(res).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const stored = await WebhookService.getWebhooks();
    expect(stored[0].lastTriggered).toBeDefined();
    vi.useRealTimers();
    await WebhookService.deleteWebhook(hook.id);
  });

  it('stops after max retries when failures persist', async () => {
    process.env.WEBHOOK_MAX_ATTEMPTS = '2';
    const hook = makeHook('r2');
    await WebhookService.saveWebhook(hook);

    const fetchMock = vi.fn().mockRejectedValue(new Error('net fail'));
    vi.stubGlobal('fetch', fetchMock);
    const warnSpy = vi.spyOn(logger, 'warn');
    const errSpy = vi.spyOn(logger, 'error');

    vi.useFakeTimers();
    const resPromise = WebhookService.triggerWebhook(hook, payload);
    await vi.advanceTimersByTimeAsync(1000);
    const res = await resPromise;

    expect(res).toEqual({ success: false, error: 'net fail' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    const stored = await WebhookService.getWebhooks();
    expect(stored[0].lastTriggered).toBeUndefined();
    vi.useRealTimers();
    await WebhookService.deleteWebhook(hook.id);
  });
});
