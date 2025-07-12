import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { app, __test } from '../index.js';

const request = supertest(app);

describe('pairing routes', () => {
  beforeEach(() => {
    __test.pendingPairings.clear();
  });

  it('approves a pairing request', async () => {
    const socket: any = { emit: vi.fn(), disconnected: false };
    __test.pendingPairings.set('tok', { socket, clientId: 'c', expiry: Date.now() + 1000 });
    const res = await request.post('/pairings/tok/approve').send({ secret: 'secret' });
    expect(res.status).toBe(200);
    expect(socket.emit).toHaveBeenCalledWith('pair_result', { success: true });
  });

  it('denies a pairing request', async () => {
    const socket: any = { emit: vi.fn(), disconnected: false };
    __test.pendingPairings.set('tok', { socket, clientId: 'c', expiry: Date.now() + 1000 });
    const res = await request.post('/pairings/tok/deny').send({ secret: 'secret' });
    expect(res.status).toBe(200);
    expect(socket.emit).toHaveBeenCalledWith('pair_result', { success: false });
  });
});
