export const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';

export const clean = (v) => (has(v) ? String(v).trim() : '');

export const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

import { currencyInfo } from '../settings.js';

const formatters = {};
// ₹28,000 / $28,000 — or '' when no amount was given
export const money = (v, currency = 'INR') => {
  if (!has(v)) return '';
  const c = currencyInfo(currency);
  formatters[c.locale] ??= new Intl.NumberFormat(c.locale, { maximumFractionDigits: 2 });
  return `${c.symbol}${formatters[c.locale].format(toNumber(v))}`;
};

export const formatDate = (iso) => {
  if (!has(iso)) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const splitList = (text) =>
  String(text ?? '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

export const splitLines = (text) =>
  String(text ?? '').split(/\n+/).map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

// Line items that have at least one value filled in
export const activeItems = (items) =>
  (items || []).filter((it) => has(it.title) || has(it.deliverables) || has(it.amount));

export const itemTitle = (it, i) => clean(it.title) || `Item ${i + 1}`;

// "Phase 1 – Website Design" -> "Phase 1"
export const itemShort = (it, i) => {
  const t = clean(it.title);
  if (!t) return `Item ${i + 1}`;
  const head = t.split(/\s[–—-]\s/)[0];
  return head.length <= 24 ? head : `Item ${i + 1}`;
};

export const itemsTotal = (items) => (items || []).reduce((s, it) => s + toNumber(it.amount), 0);

export const fileNameFor = (client, docType = 'tc-invoice') => {
  const safe = String(client || '').trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const kind = docType === 'invoice' ? 'Invoice' : 'T&C_Invoice';
  return ['Round_Logics', safe, kind].filter(Boolean).join('_') + '.pdf';
};

export const countWord = (n) => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const k = toNumber(n);
  return words[k] ?? String(k);
};
