import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import supertest from 'supertest';

import { registerSocketHandlers } from '../socketHandlers.ts';

vi.mock('../github.ts', () => ({
  createGitHubService: vi.fn(() => ({
    fetchRepositories: vi.fn(async () => ['repo'])
  }))
}));

let ioServer: Server;
let httpServer: http.Server;
let request: supertest.SuperTest<supertest.Test>;
let client: ReturnType<typeof Client>;

beforeEach(async () => {
  const app = express();
  app.use(express.json());
  httpServer = http.createServer(app);
  ioServer = new Server(httpServer, { cors: { origin: '*' } });
  registerSocketHandlers(ioServer, app);
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const port = (httpServer.address() as any).port;
  request = supertest(app);
  client = Client(`http://localhost:${port}`, { transports: ['websocket'] });
  await new Promise(resolve => client.on('connect', resolve));
});

afterEach(() => {
  client.disconnect();
  ioServer.close();
  httpServer.close();
});

describe('socket handlers', () => {
  it('approves pairing via REST endpoint', async () => {
    const token = await new Promise<string>(resolve => {
      client.once('pair_token', ({ token }) => resolve(token));
      client.emit('pair_request', { clientId: 'c1' });
    });

    const resultPromise = new Promise(resolve => client.once('pair_result', resolve));
    const res = await request.post(`/pairings/${token}/approve`).send({ secret: 'secret' });
    expect(res.body).toEqual({ ok: true });
    const result = await resultPromise;
    expect(result).toEqual({ success: true });
  });

  it('requires pairing before processing requests', async () => {
    const resp1 = await new Promise<any>(resolve => {
      client.emit('fetchRepos', { token: 't', owner: '' }, resolve);
    });
    expect(resp1).toEqual({ ok: false, error: 'client not paired' });

    const token = await new Promise<string>(resolve => {
      client.once('pair_token', ({ token }) => resolve(token));
      client.emit('pair_request', { clientId: 'c1' });
    });
    await request.post(`/pairings/${token}/approve`).send({ secret: 'secret' });

    const resp2 = await new Promise<any>(resolve => {
      client.emit('fetchRepos', { token: 't', owner: '' }, resolve);
    });
    expect(resp2).toEqual({ ok: true, data: ['repo'] });
  });
});
