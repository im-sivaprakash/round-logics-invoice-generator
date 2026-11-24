// Single entry point for all app data.
//
//   import { db } from './data';
//   const templates = await db.termsTemplates.list();
//   await db.invoices.save(record);
//   const { blob } = await db.files.get(fileId);
//
// Today everything is stored in the browser (localStorage for records, IndexedDB for
// uploaded files). To move to a real database later, write an adapter with the same
// collection interface (see adapters/apiAdapter.example.js) and swap it in below —
// nothing that imports `db` needs to change.

import { createLocalStorageCollection } from './adapters/localStorageAdapter.js';
import * as fileStore from './adapters/indexedDbFileStore.js';
import { createRepository } from './repository.js';

export const COLLECTION_KEYS = {
  invoices: 'rl-invoices-v1',
  termsTemplates: 'rl-terms-templates-v1',
};

export const collections = {
  invoices: createLocalStorageCollection(COLLECTION_KEYS.invoices, { changeEvent: 'invoices-changed' }),
  termsTemplates: createLocalStorageCollection(COLLECTION_KEYS.termsTemplates, { changeEvent: 'terms-templates-changed' }),
};

export const db = {
  invoices: createRepository(collections.invoices),
  termsTemplates: createRepository(collections.termsTemplates),
  files: {
    put: fileStore.putFile,
    get: fileStore.getFile,
    remove: fileStore.deleteFile,
  },
};
