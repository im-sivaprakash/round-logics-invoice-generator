// All invoices live in this browser's localStorage under one key.
import { defaultData } from './pdf/defaults.js';
import { itemsTotal } from './pdf/format.js';

const KEY = 'rl-invoices-v1';
const LEGACY_KEY = 'rl-invoice-form-v1';

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    // One-time move of the single form saved by the first version of the app
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const rec = makeRecord({ ...defaultData, ...JSON.parse(legacy) });
      write([rec]);
      localStorage.removeItem(LEGACY_KEY);
      return [rec];
    }
  } catch { /* storage unavailable or corrupt */ }
  return [];
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('invoices-changed'));
    return true;
  } catch {
    return false;
  }
}

export function makeRecord(data, extra = {}) {
  const now = new Date().toISOString();
  return { id: uid(), status: 'draft', createdAt: now, updatedAt: now, data, ...extra };
}

export const listInvoices = () =>
  read().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

export const getInvoice = (id) => read().find((r) => r.id === id) || null;

export function saveInvoice(record) {
  const list = read();
  const next = { ...record, updatedAt: new Date().toISOString() };
  const i = list.findIndex((r) => r.id === record.id);
  if (i >= 0) list[i] = next; else list.push(next);
  return write(list) ? next : null;
}

export function deleteInvoice(id) {
  write(read().filter((r) => r.id !== id));
}

export function duplicateInvoice(id) {
  const src = getInvoice(id);
  if (!src) return null;
  const rec = makeRecord({ ...structuredClone(src.data), invoiceNumber: '' });
  saveInvoice(rec);
  return rec;
}

export function setStatus(id, status) {
  const rec = getInvoice(id);
  if (rec) saveInvoice({ ...rec, status });
}

export const recordTotal = (rec) => itemsTotal(rec?.data?.phases);

export function exportAll() {
  return JSON.stringify({ app: 'round-logics-invoice-generator', version: 1, invoices: read() }, null, 2);
}

// Merges invoices from a backup file; same id = overwritten by the backup.
export function importAll(text) {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.invoices;
  if (!Array.isArray(incoming)) throw new Error('No invoices found in this file.');
  const byId = new Map(read().map((r) => [r.id, r]));
  incoming.filter((r) => r && r.id && r.data).forEach((r) => byId.set(r.id, r));
  write([...byId.values()]);
  return incoming.length;
}
