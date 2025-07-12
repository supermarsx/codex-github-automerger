import { describe, it, expect } from 'vitest';
import { WebhookService } from '../webhooks.ts';

describe('WebhookService signatures', () => {
  it('validates signatures correctly', () => {
    const payload = JSON.stringify({ hello: 'world' });
    const secret = 'testsecret';
    const sig = WebhookService.generateSignature(payload, secret);
    expect(WebhookService.validateSignature(payload, `sha256=${sig}`, secret)).toBe(true);
    expect(WebhookService.validateSignature(payload, 'sha256=bad', secret)).toBe(false);
  });
});
