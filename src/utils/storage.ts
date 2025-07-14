import { createStore, get, set, del } from 'idb-keyval';

let store = createStore('automerger-db', 'store');

function resetStore() {
  indexedDB.deleteDatabase('automerger-db');
  store = createStore('automerger-db', 'store');
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await get<T>(key, store);
    return value ?? null;
  } catch (err) {
    if (
      err instanceof DOMException &&
      err.message.includes('is not a known object store name')
    ) {
      resetStore();
      try {
        const value = await get<T>(key, store);
        return value ?? null;
      } catch (err2) {
        console.error('IndexedDB getItem error', err2);
        return null;
      }
    }
    console.error('IndexedDB getItem error', err);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch (err) {
    if (
      err instanceof DOMException &&
      err.message.includes('is not a known object store name')
    ) {
      resetStore();
      try {
        await set(key, value, store);
        return;
      } catch (err2) {
        console.error('IndexedDB setItem error', err2);
        return;
      }
    }
    console.error('IndexedDB setItem error', err);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await del(key, store);
  } catch (err) {
    if (
      err instanceof DOMException &&
      err.message.includes('is not a known object store name')
    ) {
      resetStore();
      try {
        await del(key, store);
        return;
      } catch (err2) {
        console.error('IndexedDB removeItem error', err2);
        return;
      }
    }
    console.error('IndexedDB removeItem error', err);
  }
}
