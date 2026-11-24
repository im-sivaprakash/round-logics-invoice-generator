import { pdf } from '@react-pdf/renderer';
import './pdf/browserFonts.js';
import InvoiceDocument from './pdf/InvoiceDocument.jsx';
import { fileNameFor } from './pdf/format.js';
import { resolveData } from './settings.js';
import { kindLabel } from './pdf/docKinds.js';

import { termsModeOf } from './terms/constants.js';
import { db } from './data/index.js';

const renderInvoice = (data, recordStatus) =>
  pdf(<InvoiceDocument data={{ ...resolveData(data), recordStatus }} />).toBlob();

// "Attach my PDF as-is": put the uploaded T&C pages first, then the invoice page(s).
async function mergeTermsPdf(termsBlob, invoiceBlob) {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (const blob of [termsBlob, invoiceBlob]) {
    const src = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  out.setTitle(`Round Logics – Terms & Conditions and Invoice`);
  out.setAuthor('Round Logics');
  return new Blob([await out.save()], { type: 'application/pdf' });
}

// recordStatus lets old invoices marked "Paid" (before item-level tracking) still print as paid
export async function renderBlob(data, recordStatus) {
  const withTerms = data.docType !== 'invoice';
  if (withTerms && termsModeOf(data) === 'pdf') {
    const file = await db.files.get(data.termsFile.id).catch(() => null);
    // The PDF is rendered without the standard T&C pages; the uploaded pages go in front.
    const invoiceBlob = await renderInvoice({ ...data, docType: 'invoice', _termsAttached: true }, recordStatus);
    if (file?.blob) return mergeTermsPdf(file.blob, invoiceBlob);
    return renderInvoice(data, recordStatus); // file missing in this browser → keep standard T&C
  }
  return renderInvoice(data, recordStatus);
}

export async function downloadPdf(data, recordStatus) {
  const blob = await renderBlob(data, recordStatus);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(data.clientName, data.docType, kindLabel(data));
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
