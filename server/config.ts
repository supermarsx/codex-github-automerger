import fs from 'fs/promises';
import path from 'path';
import type { WatcherConfig } from './watchers.js';
import { deepMerge } from './utils/deepMerge.js';

const STORAGE_PATH =
  process.env.CONFIG_STORAGE_PATH ||
  path.join(process.cwd(), 'server', 'config.json');

export interface ConfigFile {
  [clientId: string]: WatcherConfig;
}

let configs: ConfigFile = {};

export async function load(): Promise<void> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    configs = JSON.parse(data) as ConfigFile;
  } catch {
    configs = {};
  }
}

export const loadPromise: Promise<void> = load();

async function save(): Promise<void> {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(configs, null, 2));
}

export function getClientConfig(clientId: string): WatcherConfig {
  return configs[clientId] || {};
}

export async function setClientConfig(
  clientId: string,
  cfg: WatcherConfig
): Promise<void> {
  configs[clientId] = deepMerge(configs[clientId] || {}, cfg);
  await save();
}

export const __test = { load, loadPromise, save, configs, STORAGE_PATH };
