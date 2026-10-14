// App-wide settings saved in this browser. New invoices start from these values;
// invoices already created keep their own copy.
const KEY = 'rl-settings-v1';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED ', label: 'UAE Dirham (AED)', locale: 'en-US' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)', locale: 'en-SG' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
];

export const currencyInfo = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

export const DOC_TYPES = [
  { value: 'tc-invoice', label: 'T&C + Invoice' },
  { value: 'invoice', label: 'Invoice only' },
];

export const PROVIDER_KEYS = ['providerName', 'providerEmail', 'providerPhone', 'providerAddress'];
export const BANK_KEYS = ['bankAccountName', 'bankName', 'bankAccountNumber', 'bankIfsc', 'bankBranch', 'upiId'];
export const TERMS_KEYS = [
  'timelineDays', 'includedMinorReviews', 'includedMajorReviews', 'minorRevisionCharge',
  'majorRevisionCharge', 'renewalCharge', 'suspensionDays', 'paymentTerms',
];

export const defaultSettings = {
  currency: 'INR',
  docType: 'tc-invoice',
  invoicePrefix: '',

  providerName: 'Round Logics',
  providerEmail: 'sivaprakash.m@roundlogics.com',
  providerPhone: '',
  providerAddress: '',

  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankBranch: '',
  upiId: '',

  timelineDays: '30',
  includedMinorReviews: '1',
  includedMajorReviews: '1',
  minorRevisionCharge: '1500',
  majorRevisionCharge: '2500',
  renewalCharge: '3800',
  suspensionDays: '20',
  paymentTerms:
    'Phase-wise payment: Phase 1 and Phase 2 are billed separately as specified in the invoice. Work on each phase is subject to the agreed payment terms.',
};

export function getSettings() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { ...defaultSettings };
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('settings-changed'));
    return true;
  } catch {
    return false;
  }
}

export const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k] ?? '']));
