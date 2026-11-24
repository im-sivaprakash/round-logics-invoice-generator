// Generic repository: adds ids and timestamps on top of any collection adapter.
// All methods are async, so a server/database adapter can be dropped in later without
// changing the code that calls them.

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createRepository(collection, { sortBy = 'updatedAt' } = {}) {
  const sort = (list) =>
    [...list].sort((a, b) => String(b[sortBy] || '').localeCompare(String(a[sortBy] || '')));

  return {
    collection,

    async list(filter) {
      const all = sort(await collection.list());
      return filter ? all.filter(filter) : all;
    },

    get: (id) => collection.get(id),

    /** Insert (no id) or update (existing id). Returns the saved record. */
    async save(record) {
      const now = new Date().toISOString();
      const existing = record.id ? await collection.get(record.id) : null;
      const next = {
        ...existing,
        ...record,
        id: record.id || uid(),
        createdAt: existing?.createdAt || record.createdAt || now,
        updatedAt: now,
      };
      return collection.put(next);
    },

    remove: (id) => collection.remove(id),
  };
}
