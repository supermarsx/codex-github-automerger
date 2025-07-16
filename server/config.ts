import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.CONFIG_STORAGE_PATH ||
  path.join(process.cwd(), 'server', 'config.json');

let configs: Record<string, any> = {};

export async function load() {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    configs = JSON.parse(data);
  } catch {
    configs = {};
  }
}

export const loadPromise = load();

async function save() {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(configs, null, 2));
}

export function getClientConfig(clientId: string) {
  return configs[clientId] || {};
}

export async function setClientConfig(clientId: string, cfg: any) {
  configs[clientId] = { ...configs[clientId], ...cfg };
  await save();
}

export const __test = { load, loadPromise, save, configs, STORAGE_PATH };
