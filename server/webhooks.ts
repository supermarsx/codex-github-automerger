import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.js';
import { encryptSecret, decryptSecret } from './utils/encryption.js';

export interface StoredWebhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created: string;
  lastTriggered?: string;
}

export type WebhookFile = StoredWebhook[];

export interface WebhookPayload {
  event: string;
  repository: string;
  timestamp: string;
  data: any;
}

const STORAGE_PATH = process.env.WEBHOOK_STORAGE_PATH ||
  path.join(process.cwd(), 'server', 'webhooks.json');
const LOCK_PATH = `${STORAGE_PATH}.lock`;

const FETCH_TIMEOUT_MS = 5000;

let cache: WebhookFile | null = null;

export async function loadCache(force = false): Promise<WebhookFile> {
  if (force || cache === null) {
    cache = await readConfigs();
  }
  return cache!;
}

await loadCache();

async function readConfigs(): Promise<WebhookFile> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    const parsed = JSON.parse(data) as WebhookFile;
    let needsMigration = false;
    const decrypted = parsed.map(w => {
      if (process.env.WEBHOOK_SECRET_KEY) {
        if (w.secret.startsWith('enc:')) {
          return { ...w, secret: decryptSecret(w.secret) };
        } else {
          needsMigration = true;
          return { ...w };
        }
      }
      return { ...w };
    });
    if (needsMigration && process.env.WEBHOOK_SECRET_KEY) {
      await writeConfigs(decrypted);
    }
    return decrypted;
  } catch {
    return [];
  }
}

async function acquireLock(): Promise<void> {
  while (true) {
    try {
      await fs.mkdir(LOCK_PATH);
      return;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        await new Promise(res => setTimeout(res, 50));
      } else {
        throw err;
      }
    }
  }
}

async function releaseLock(): Promise<void> {
  await fs.rm(LOCK_PATH, { recursive: true, force: true });
}

async function writeConfigs(list: WebhookFile): Promise<void> {
  const toWrite = process.env.WEBHOOK_SECRET_KEY
    ? list.map(w => ({ ...w, secret: encryptSecret(w.secret) }))
    : list;
  const tmpPath = `${STORAGE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(toWrite, null, 2));
  await fs.rename(tmpPath, STORAGE_PATH);
}

export class WebhookService {
  static async getWebhooks(): Promise<WebhookFile> {
    const hooks = await loadCache();
    return hooks.map(w => ({ ...w, secret: decryptSecret(w.secret) }));
  }

  static async reload(): Promise<WebhookFile> {
    return loadCache(true);
  }

  static async saveWebhook(webhook: StoredWebhook): Promise<void> {
    await acquireLock();
    try {
      const webhooks = await loadCache(true);
      const idx = webhooks.findIndex(w => w.id === webhook.id);
      if (idx >= 0) webhooks[idx] = webhook;
      else webhooks.push(webhook);
      await writeConfigs(webhooks);
      cache = webhooks;
    } finally {
      await releaseLock();
    }
  }

  static async deleteWebhook(id: string): Promise<void> {
    await acquireLock();
    try {
      const webhooks = await loadCache(true);
      const filtered = webhooks.filter(w => w.id !== id);
      await writeConfigs(filtered);
      cache = filtered;
    } finally {
      await releaseLock();
    }
  }

  static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static validateSignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    const expectedBuffer = Buffer.from(`sha256=${expected}`);
    const receivedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  static async triggerWebhook(
    webhook: StoredWebhook,
    payload: WebhookPayload
  ): Promise<{ success: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const secret = decryptSecret(webhook.secret);
      const signature = this.generateSignature(JSON.stringify(payload), secret);
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'AutoMerger-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      await this.saveWebhook({ ...webhook, lastTriggered: new Date().toISOString() });
      return { success: true };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        logger.error('Webhook trigger timeout');
        return { success: false, error: 'Request timed out' };
      }
      logger.error('Webhook trigger error:', err);
      return { success: false, error: err.message };
    }
  }

  static async triggerWebhooks(
    event: string,
    repository: string,
    data: any
  ): Promise<void> {
    const webhooks = (await loadCache()).filter(w =>
      w.active && (w.events.includes(event) || w.events.includes('all_events'))
    );
    const payload: WebhookPayload = {
      event,
      repository,
      timestamp: new Date().toISOString(),
      data
    };
    await Promise.all(webhooks.map(w => this.triggerWebhook(w, payload)));
  }
}
