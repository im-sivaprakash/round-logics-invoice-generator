// File store for uploaded documents (e.g. a T&C PDF) using IndexedDB, which — unlike
// localStorage — can hold binary files of several MB.
//
// Interface (keep it when swapping to cloud/object storage):
//   putFile(file: Blob, meta?) -> Promise<{ id, name, type, size, createdAt }>
//   getFile(id)                -> Promise<{ meta, blob } | null>
//   deleteFile(id)             -> Promise<void>

const DB_NAME = 'round-logics-invoices';
const STORE = 'files';
const VERSION = 1;

let dbPromise;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('This browser cannot store files (IndexedDB unavailable).'));
        return;
      }
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function putFile(file, meta = {}) {
  const record = {
    id: meta.id || uid(),
    name: meta.name || file.name || 'file',
    type: meta.type || file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  await tx('readwrite', (store) => store.put(record));
  const { blob: _blob, ...info } = record;
  return info;
}

export async function getFile(id) {
  if (!id) return null;
  const rec = await tx('readonly', (store) => store.get(id));
  if (!rec) return null;
  const { blob, ...meta } = rec;
  return { meta, blob };
}

export async function deleteFile(id) {
  if (!id) return;
  await tx('readwrite', (store) => store.delete(id));
}
