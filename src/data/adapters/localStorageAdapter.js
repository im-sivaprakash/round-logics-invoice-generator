// localStorage adapter: one JSON array of records per collection key.
//
// Every adapter (this one, IndexedDB, or a future REST/DB adapter) exposes the same
// collection interface, so repositories and the UI never touch the storage directly:
//
//   list()            -> Promise<Record[]>
//   get(id)           -> Promise<Record | null>
//   put(record)       -> Promise<Record>         (insert or replace by id)
//   remove(id)        -> Promise<void>
//   replaceAll(list)  -> Promise<void>
//
// localStorage is synchronous, so this adapter also offers `sync` versions of the same
// calls. The existing invoice screens use those today; new code should use the async ones
// so it keeps working unchanged once a server-side database adapter is plugged in.

const safeParse = (raw) => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function createLocalStorageCollection(key, { changeEvent } = {}) {
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? safeParse(raw) : [];
    } catch {
      return [];
    }
  };

  const write = (list) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      if (changeEvent) window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch {
      return false;
    }
  };

  const sync = {
    list: () => read(),
    get: (id) => read().find((r) => r.id === id) || null,
    put: (record) => {
      const list = read();
      const i = list.findIndex((r) => r.id === record.id);
      if (i >= 0) list[i] = record; else list.push(record);
      return write(list) ? record : null;
    },
    remove: (id) => write(read().filter((r) => r.id !== id)),
    replaceAll: (list) => write(list),
    /** true when the key has never been written (used for one-time migrations) */
    isEmpty: () => {
      try { return localStorage.getItem(key) === null; } catch { return true; }
    },
  };

  return {
    key,
    sync,
    list: async () => sync.list(),
    get: async (id) => sync.get(id),
    put: async (record) => {
      const saved = sync.put(record);
      if (!saved) throw new Error('Could not save — browser storage is full or unavailable.');
      return saved;
    },
    remove: async (id) => { sync.remove(id); },
    replaceAll: async (list) => {
      if (!sync.replaceAll(list)) throw new Error('Could not save — browser storage is full or unavailable.');
    },
  };
}
