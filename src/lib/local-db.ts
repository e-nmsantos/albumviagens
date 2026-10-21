// Local mode storage: one IndexedDB database in this browser.
import { SAMPLE_MEMORIES, SAMPLE_TRIPS, SAMPLE_WISHES } from "@/lib/samples";

const DB_NAME = "MemoriasViagensDB";
const DB_VERSION = 2;

export type StoreName = "memories" | "wishes" | "trips";
const STORES: StoreName[] = ["memories", "wishes", "trips"];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Este navegador não permite guardar dados localmente."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
      // Brand-new database: add the examples once, so they never come back after being deleted.
      if (e.oldVersion === 0) {
        const tx = req.transaction!;
        SAMPLE_MEMORIES.forEach((m) => tx.objectStore("memories").put(m));
        SAMPLE_WISHES.forEach((w) => tx.objectStore("wishes").put(w));
        SAMPLE_TRIPS.forEach((t) => tx.objectStore("trips").put(t));
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Não foi possível abrir a base de dados local."));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

async function run<T>(
  store: StoreName | "photos",
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
    tx.onerror = () => reject(tx.error ?? new Error("Erro na base de dados local."));
    tx.onabort = () => reject(tx.error ?? new Error("Operação cancelada na base de dados local."));
  });
}

export const localDB = {
  getAll<T>(store: StoreName): Promise<T[]> {
    return run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
  },
  get<T>(store: StoreName, id: string): Promise<T | undefined> {
    return run<T | undefined>(store, "readonly", (s) => s.get(id) as IDBRequest<T | undefined>);
  },
  async put<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
    await run(store, "readwrite", (s) => {
      s.put(value);
    });
    return value;
  },
  async remove(store: StoreName, id: string): Promise<void> {
    await run(store, "readwrite", (s) => {
      s.delete(id);
    });
  },

  async putPhoto(key: string, dataUrl: string): Promise<void> {
    await run("photos", "readwrite", (s) => {
      s.put(dataUrl, key);
    });
  },
  async getPhoto(key: string): Promise<string | null> {
    const v = await run<unknown>("photos", "readonly", (s) => s.get(key));
    return typeof v === "string" ? v : null;
  },
  async removePhotos(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await run("photos", "readwrite", (s) => {
      keys.forEach((k) => s.delete(k));
    });
  },
};
