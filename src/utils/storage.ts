import { createStore, get, set, del } from 'idb-keyval';

const store = createStore('automerger-db', 'store');

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await get<T>(key, store);
    return value ?? null;
  } catch (err) {
    console.error('IndexedDB getItem error', err);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch (err) {
    console.error('IndexedDB setItem error', err);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await del(key, store);
  } catch (err) {
    console.error('IndexedDB removeItem error', err);
  }
}
