// Default form values. Pre-filled with the Venee Art Sculptures project brief.
// Leave any field blank and the PDF prints an editable [PLACEHOLDER] in its place.

export const emptyPhase = () => ({ title: '', deliverables: '', amount: '' });

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
};

export const blankData = () => ({
  ...Object.fromEntries(Object.keys(defaultData).map((k) => [k, ''])),
  providerName: 'Round Logics',
  providerEmail: 'sivaprakash.m@roundlogics.com',
  phases: [emptyPhase(), emptyPhase()],
  includedMinorReviews: '1',
  includedMajorReviews: '1',
});
