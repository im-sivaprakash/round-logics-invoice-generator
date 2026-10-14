export const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label ?? 'Draft';
