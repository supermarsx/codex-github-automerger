// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.ts';

const STORAGE_PATH = process.env.WEBHOOK_STORAGE_PATH ||
  path.join(process.cwd(), 'server', 'webhooks.json');

async function readConfigs() {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeConfigs(list) {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(list, null, 2));
}

export class WebhookService {
  static async getWebhooks() {
    return readConfigs();
  }

  static async saveWebhook(webhook) {
    const webhooks = await readConfigs();
    const idx = webhooks.findIndex(w => w.id === webhook.id);
    if (idx >= 0) webhooks[idx] = webhook; else webhooks.push(webhook);
    await writeConfigs(webhooks);
  }

  static async deleteWebhook(id) {
    const webhooks = await readConfigs();
    await writeConfigs(webhooks.filter(w => w.id !== id));
  }

  static generateSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static validateSignature(payload, signature, secret) {
    const expected = this.generateSignature(payload, secret);
    return `sha256=${expected}` === signature;
  }

  static async triggerWebhook(webhook, payload) {
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.saveWebhook({ ...webhook, lastTriggered: new Date().toISOString() });
      return { success: true };
    } catch (err) {
      logger.error('Webhook trigger error:', err);
      return { success: false, error: err.message };
    }
  }

  static async triggerWebhooks(event, repository, data) {
    const webhooks = (await readConfigs()).filter(w =>
      w.active && (w.events.includes(event) || w.events.includes('all_events'))
    );
    const payload = {
      event,
      repository,
      timestamp: new Date().toISOString(),
      data
    };
    await Promise.all(webhooks.map(w => this.triggerWebhook(w, payload)));
  }
}
