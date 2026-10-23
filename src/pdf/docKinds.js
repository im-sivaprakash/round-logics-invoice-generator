// What the document is: Invoice, Quotation, Proforma, Estimate, or any label you type.
import { has, clean, toNumber } from './format.js';

export const DOC_KINDS = [
  { value: 'invoice', label: 'Invoice', short: 'Invoice' },
  { value: 'quotation', label: 'Quotation', short: 'Quote' },
  { value: 'proforma', label: 'Proforma Invoice', short: 'Proforma' },
  { value: 'estimate', label: 'Estimate', short: 'Estimate' },
  { value: 'custom', label: 'Other (type your own)', short: 'Document' },
];

export const PAYMENT_METHODS = [
  'UPI', 'Bank transfer (NEFT/IMPS/RTGS)', 'Cash', 'Cheque', 'Card', 'Other',
];

const kindOf = (d) => DOC_KINDS.find((k) => k.value === (d?.docKind || 'invoice')) || DOC_KINDS[0];

// "Invoice", "Quotation", or the custom label typed in (e.g. "Receipt")
export const kindLabel = (d) => {
  const k = kindOf(d);
  if (k.value === 'custom') return clean(d.docKindCustom) || 'Document';
  return k.label;
};

export const kindShort = (d) => {
  const k = kindOf(d);
  if (k.value === 'custom') return clean(d.docKindCustom) || 'Document';
  return k.short;
};

// Quotes and estimates are offers, so they have no payments to track.
export const isOffer = (d) => ['quotation', 'estimate'].includes(d?.docKind);
export const tracksPayment = (d) => !isOffer(d);

const isPaid = (it) => it?.paid === true;

// Totals for paid / balance. Items with no amount are ignored.
export function paymentSummary(d, recordStatus) {
  const items = (d?.phases || []).filter((it) => has(it.amount));
  const total = items.reduce((s, it) => s + toNumber(it.amount), 0);
  let paid = items.filter(isPaid).reduce((s, it) => s + toNumber(it.amount), 0);
  // Invoices marked "Paid" before item-level tracking existed count as fully paid
  if (recordStatus === 'paid' && paid === 0 && !items.some(isPaid)) paid = total;
  const balance = Math.max(total - paid, 0);
  let state = 'unpaid';
  if (total > 0 && balance === 0) state = 'paid';
  else if (paid > 0) state = 'partial';
  return { total, paid, balance, state, paidItems: items.filter(isPaid) };
}

export const PAY_STATE_LABEL = { unpaid: 'Unpaid', partial: 'Partly paid', paid: 'Paid' };
