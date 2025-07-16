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
  await mod.loadPromise;
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

describe('setClientConfig / getClientConfig', () => {
  it('merges subsequent writes and persists to disk', async () => {
    await mod.setClientConfig('c1', { foo: 'bar' });
    await mod.setClientConfig('c1', { baz: 'qux' });
    const stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(stored).toEqual({ c1: { foo: 'bar', baz: 'qux' } });
  });

  it('returns empty object for unknown id', () => {
    expect(mod.getClientConfig('missing')).toEqual({});
  });

  it('loads changes from disk via __test.load', async () => {
    fs.writeFileSync(configPath, JSON.stringify({ c1: { foo: 'bar' } }, null, 2));
    await mod.__test.load();
    expect(mod.getClientConfig('c1')).toEqual({ foo: 'bar' });
  });
});
