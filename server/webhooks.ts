import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.js';

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

async function readConfigs(): Promise<WebhookFile> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(data) as WebhookFile;
  } catch {
    return [];
  }
}

async function writeConfigs(list: WebhookFile): Promise<void> {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(list, null, 2));
}

export class WebhookService {
  static async getWebhooks(): Promise<WebhookFile> {
    return readConfigs();
  }

  static async saveWebhook(webhook: StoredWebhook): Promise<void> {
    const webhooks = await readConfigs();
    const idx = webhooks.findIndex(w => w.id === webhook.id);
    if (idx >= 0) webhooks[idx] = webhook; else webhooks.push(webhook);
    await writeConfigs(webhooks);
  }

  static async deleteWebhook(id: string): Promise<void> {
    const webhooks = await readConfigs();
    await writeConfigs(webhooks.filter(w => w.id !== id));
  }

  static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static validateSignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    return `sha256=${expected}` === signature;
  }

  static async triggerWebhook(
    webhook: StoredWebhook,
    payload: WebhookPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'AutoMerger-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      await this.saveWebhook({ ...webhook, lastTriggered: new Date().toISOString() });
      return { success: true };
    } catch (err: any) {
      logger.error('Webhook trigger error:', err);
      return { success: false, error: err.message };
    }
  }

  static async triggerWebhooks(
    event: string,
    repository: string,
    data: any
  ): Promise<void> {
    const webhooks = (await readConfigs()).filter(w =>
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
