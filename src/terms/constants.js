// Pure T&C helpers (no storage imports) — safe to use inside the PDF renderer.
import { has } from '../pdf/format.js';

export const TERMS_MODES = [
  { value: 'standard', label: 'Standard T&C', hint: 'The built-in Round Logics terms, filled from this invoice' },
  { value: 'custom', label: 'Write / edit my own', hint: 'Type or paste your terms, or upload a .txt, .md, .doc, .docx or .pdf to edit' },
  { value: 'pdf', label: 'Attach my PDF as-is', hint: 'Your PDF pages are placed before the invoice, unchanged' },
];

export const DEFAULT_TERMS_TITLE = 'Terms & Conditions';

// What the PDF will actually use. Custom with an empty editor, or PDF mode with no file,
// fall back to the standard T&C so a document is never left without terms by accident.
export const termsModeOf = (d) => {
  if (d?.termsMode === 'custom' && has(d.termsBody)) return 'custom';
  if (d?.termsMode === 'pdf' && d.termsFile?.id) return 'pdf';
  return 'standard';
};
