import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;
let configPath: string;
let mod: typeof import('../config.js');

async function loadModule() {
  vi.resetModules();
  mod = await import('../config.ts');
}

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  configPath = path.join(tmpDir, 'config.json');
  fs.writeFileSync(configPath, '{}');
  process.env.CONFIG_STORAGE_PATH = configPath;
  await loadModule();
});

afterEach(() => {
  vi.resetModules();
  delete process.env.CONFIG_STORAGE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('client config storage', () => {
  it('writes config to disk', async () => {
    await mod.setClientConfig('c1', { foo: 'bar' });
    const stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(stored).toEqual({ c1: { foo: 'bar' } });
  });

  it('loads config from disk', async () => {
    fs.writeFileSync(configPath, JSON.stringify({ c1: { foo: 'bar' } }, null, 2));
    await mod.__test.load();
    expect(mod.getClientConfig('c1')).toEqual({ foo: 'bar' });
  });

  it('persists across module reload', async () => {
    await mod.setClientConfig('c1', { foo: 'bar' });
    await loadModule();
    expect(mod.getClientConfig('c1')).toEqual({ foo: 'bar' });
  });
});
