export const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// Text value or an editable [PLACEHOLDER]
export const val = (v, placeholder) => (has(v) ? String(v).trim() : `[${placeholder}]`);

export const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

// ₹28,000 — or a placeholder when no amount was given
export const money = (v, placeholder = 'AMOUNT') =>
  has(v) ? `₹${inr.format(toNumber(v))}` : `₹[${placeholder}]`;

export const formatDate = (iso, placeholder = 'DATE') => {
  if (!has(iso)) return `[${placeholder}]`;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const splitList = (text) =>
  String(text ?? '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export const splitLines = (text) =>
  String(text ?? '')
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

export const phaseLabel = (i) => `Phase ${i + 1}`;

export const fileNameFor = (client) => {
  const safe = String(client || 'Client')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `Round_Logics_${safe || 'Client'}_T&C_Invoice.pdf`;
};

export const countWord = (n) => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const k = toNumber(n);
  return words[k] ?? String(k);
};
