import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import supertest from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { registerSocketHandlers } from '../socketHandlers.ts';

let svcMock: any;

vi.mock('../github.ts', () => ({
  createGitHubService: vi.fn(() => svcMock)
}));

let ioServer: Server;
let httpServer: http.Server;
let request: supertest.SuperTest<supertest.Test>;
let client: ReturnType<typeof Client>;
let tmpDir: string;
let configPath: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  configPath = path.join(tmpDir, 'config.json');
  fs.writeFileSync(configPath, '{}');
  process.env.CONFIG_STORAGE_PATH = configPath;
  const cfgMod = await import('../config.ts');
  await cfgMod.loadPromise;

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
  svcMock = {
    fetchRepositories: vi.fn(async () => ['repo']),
    fetchStrayBranches: vi.fn(async () => []),
    deleteBranch: vi.fn(async () => true)
  };
});

afterEach(() => {
  client.disconnect();
  ioServer.close();
  httpServer.close();
  delete process.env.CONFIG_STORAGE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
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

  it('honours synced protected branches', async () => {
    svcMock.fetchStrayBranches.mockResolvedValue(['keep', 'remove']);
    const token = await new Promise<string>(resolve => {
      client.once('pair_token', ({ token }) => resolve(token));
      client.emit('pair_request', { clientId: 'c1' });
    });
    const resultPromise = new Promise(resolve => {
      client.once('pair_result', resolve);
    });
    await request.post(`/pairings/${token}/approve`).send({ secret: 'secret' });
    await resultPromise;

    const syncRes = await new Promise<any>(resolve => {
      client.emit('syncConfig', { protectedBranches: ['keep'] }, resolve);
    });
    expect(syncRes).toEqual({ ok: true });

    const strayResp = await new Promise<any>(resolve => {
      client.emit('fetchStrayBranches', { token: 't', owner: 'o', repo: 'r' }, resolve);
    });
    expect(strayResp).toEqual({ ok: true, data: ['remove'] });

    const delResp = await new Promise<any>(resolve => {
      client.emit('deleteBranch', { token: 't', owner: 'o', repo: 'r', branch: 'keep' }, resolve);
    });
    expect(delResp).toEqual({ ok: false, error: 'branch protected' });
    expect(svcMock.deleteBranch).not.toHaveBeenCalled();
  }, 10000);

  it('loads config before handlers run', async () => {
    fs.writeFileSync(configPath, JSON.stringify({ c1: { protectedBranches: ['keep'] } }, null, 2));
    const cfgMod = await import('../config.ts');
    await cfgMod.loadPromise;

    svcMock.fetchStrayBranches.mockResolvedValue(['keep', 'remove']);

    const token = await new Promise<string>(resolve => {
      client.once('pair_token', ({ token }) => resolve(token));
      client.emit('pair_request', { clientId: 'c1' });
    });
    await request.post(`/pairings/${token}/approve`).send({ secret: 'secret' });

    const resp = await new Promise<any>(resolve => {
      client.emit('fetchStrayBranches', { token: 't', owner: 'o', repo: 'r' }, resolve);
    });
    expect(resp).toEqual({ ok: true, data: ['remove'] });
  });
});
