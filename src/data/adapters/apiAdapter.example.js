// EXAMPLE ONLY — not used yet. Shows how a server/database adapter plugs into the data layer.
//
// 1. Build an API (e.g. Next.js route handlers, Express, Supabase, Firebase) with:
//      GET    /api/:collection          -> Record[]
//      GET    /api/:collection/:id      -> Record | 404
//      PUT    /api/:collection/:id      -> Record   (insert or replace)
//      DELETE /api/:collection/:id
// 2. In src/data/index.js replace createLocalStorageCollection(...) with
//      createApiCollection('invoices') / createApiCollection('terms-templates')
// 3. Move code that still uses `collections.*.sync` (src/storage.js) to the async
//    `db.*` repository methods — the async methods already exist and return Promises.

export function createApiCollection(name, { baseUrl = '/api', headers = {} } = {}) {
  const url = (id) => `${baseUrl}/${name}${id ? `/${encodeURIComponent(id)}` : ''}`;
  const json = async (res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.status === 204 ? null : res.json();
  };

  return {
    key: name,
    list: () => fetch(url(), { headers }).then(json),
    get: async (id) => {
      const res = await fetch(url(id), { headers });
      return res.status === 404 ? null : json(res);
    },
    put: (record) =>
      fetch(url(record.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(record),
      }).then(json),
    remove: (id) => fetch(url(id), { method: 'DELETE', headers }).then(json),
    replaceAll: async (list) => {
      for (const r of list) {
        await fetch(url(r.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(r),
        }).then(json);
      }
    },
  };
}
