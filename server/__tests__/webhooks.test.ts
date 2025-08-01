import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebhookService, type StoredWebhook } from '../webhooks.ts';

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
