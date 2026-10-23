import { getSettings, SHARED_KEYS, TERMS_KEYS, pick } from '../settings.js';

// Default form values. Pre-filled with the Venee Art Sculptures project brief.
// Any field left blank is left out of the PDF.

export const emptyPhase = () => ({ title: '', deliverables: '', amount: '', paid: false, paidMethod: '', paidDate: '', paidRef: '' });

export const defaultData = {
  // Provider
  providerName: 'Round Logics',
  providerEmail: 'sivaprakash.m@roundlogics.com',
  providerPhone: '',
  providerAddress: '',

  // Client
  clientName: 'Venee Art Sculptures',
  clientContactPerson: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',

  // Invoice
  invoiceNumber: '',
  invoiceDate: '2026-10-15',
  dueDate: '',

  // Scope
  pages: 'Home, About, Contact, Gallery, Blog',
  phases: [
    {
      title: 'Phase 1 – Website Design & Development',
      deliverables: 'Design and development of the agreed core website pages',
      amount: '20000',
    },
    {
      title: 'Phase 2 – Additional Features & Optimisation',
      deliverables: 'Blog, content management, SEO and GEO/AI visibility',
      amount: '8000',
    },
  ],
  exclusions: '',

  // Terms
  timelineDays: '30',
  includedMinorReviews: '1',
  includedMajorReviews: '1',
  minorRevisionCharge: '1500',
  majorRevisionCharge: '2500',
  renewalCharge: '3800',
  suspensionDays: '20',
  paymentTerms:
    'Phase-wise payment: Phase 1 and Phase 2 are billed separately as specified in the invoice. Work on each phase is subject to the agreed payment terms.',
  additionalNotes: '',

  // Payment instructions
  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankBranch: '',
  upiId: '',

  currency: 'INR',
  docType: 'tc-invoice',
  docKind: 'invoice',
  docKindCustom: '',
};

// A fresh invoice: currency and standard terms are copied from Settings.
// Provider and bank fields stay blank so they always follow Settings (see resolveData).
export const newInvoiceData = (settings = getSettings()) => ({
  ...Object.fromEntries(Object.keys(defaultData).map((k) => [k, ''])),
  ...pick(settings, TERMS_KEYS),
  currency: settings.currency,
  docType: settings.docType,
  docKind: 'invoice',
  invoiceNumber: settings.invoicePrefix || '',
  invoiceDate: new Date().toLocaleDateString('en-CA'), // local YYYY-MM-DD
  phases: [emptyPhase()],
});

// The Venee Art Sculptures sample, using your saved provider, bank and currency settings.
export const sampleData = (settings = getSettings()) => ({
  ...defaultData,
  ...Object.fromEntries(SHARED_KEYS.map((k) => [k, ''])),
  currency: settings.currency,
  docType: settings.docType,
});
