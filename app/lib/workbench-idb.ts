// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

/**
 * Lightweight IndexedDB persistence layer for Workbench OS.
 * Provides high-capacity, asynchronous local-first storage
 * mirroring localStorage without blocking the main UI thread.
 */

const DB_NAME = "sam-workbench-idb";
const DB_VERSION = 1;
const STORE_NAME = "workbench-state";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  operate: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operate(transaction.objectStore(STORE_NAME));

    transaction.oncomplete = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function withDatabase<T>(operate: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await operate(db);
  } finally {
    db.close();
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    return await withDatabase((db) =>
      runRequest<T | null>(db, "readonly", (store) => store.get(key)),
    ).then((result) => result ?? null);
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    await withDatabase((db) =>
      runRequest<IDBValidKey>(db, "readwrite", (store) => store.put(value, key)),
    );
    return true;
  } catch {
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    await withDatabase((db) =>
      runRequest<undefined>(db, "readwrite", (store) => store.delete(key)),
    );
    return true;
  } catch {
    return false;
  }
}
