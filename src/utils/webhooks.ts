export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  created: Date;
  lastTriggered?: Date;
}

export type WebhookEvent = 
  | 'pull_request.opened'
  | 'pull_request.closed'
  | 'pull_request.merged'
  | 'merge.success'
  | 'merge.failure'
  | 'security.alert'
  | 'config.updated'
  | 'all_events';

export interface WebhookPayload {
  event: WebhookEvent;
  repository: string;
  timestamp: string;
  data: any;
}

import { getItem, setItem } from '@/utils/storage';

export class WebhookService {
  private static readonly WEBHOOK_CONFIGS_KEY = 'webhook_configs';

  static async getWebhooks(): Promise<WebhookConfig[]> {
    try {
      const stored = await getItem<any>(this.WEBHOOK_CONFIGS_KEY);
      if (!stored) return [];
      const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
      return parsed.map((w: any) => ({
        ...w,
        created: new Date(w.created),
        lastTriggered: w.lastTriggered ? new Date(w.lastTriggered) : undefined,
      }));
    } catch {
      return [];
    }
  }

  static async saveWebhook(webhook: WebhookConfig): Promise<void> {
    const webhooks = await this.getWebhooks();
    const existingIndex = webhooks.findIndex(w => w.id === webhook.id);
    
    if (existingIndex >= 0) {
      webhooks[existingIndex] = webhook;
    } else {
      webhooks.push(webhook);
    }
    
    await setItem(this.WEBHOOK_CONFIGS_KEY, webhooks);
  }

  static async deleteWebhook(id: string): Promise<void> {
    const webhooks = (await this.getWebhooks()).filter(w => w.id !== id);
    await setItem(this.WEBHOOK_CONFIGS_KEY, webhooks);
  }

  static async triggerWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const signature = await this.generateSignature(JSON.stringify(payload), webhook.secret);
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'AutoMerger-Webhook/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update last triggered timestamp
      const webhooks = await this.getWebhooks();
      const updatedWebhooks = webhooks.map(w =>
        w.id === webhook.id
          ? { ...w, lastTriggered: new Date() }
          : w
      );
      await setItem(this.WEBHOOK_CONFIGS_KEY, updatedWebhooks);

      return { success: true };
    } catch (error) {
      console.error('Webhook trigger error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async triggerWebhooks(event: WebhookEvent, repository: string, data: any): Promise<void> {
    const webhooks = (await this.getWebhooks()).filter(w =>
      w.active && w.events.includes(event)
    );

    const payload: WebhookPayload = {
      event,
      repository,
      timestamp: new Date().toISOString(),
      data,
    };

    const promises = webhooks.map(webhook => this.triggerWebhook(webhook, payload));
    await Promise.allSettled(promises);
  }

  private static async generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static validateSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    return this.generateSignature(payload, secret).then(expected => 
      `sha256=${expected}` === signature
    );
  }
}