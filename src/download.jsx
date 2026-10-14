import { pdf } from '@react-pdf/renderer';
import './pdf/browserFonts.js';
import InvoiceDocument from './pdf/InvoiceDocument.jsx';
import { fileNameFor } from './pdf/format.js';
import { resolveData } from './settings.js';

export const renderBlob = (data) => pdf(<InvoiceDocument data={resolveData(data)} />).toBlob();

export async function downloadPdf(data) {
  const blob = await renderBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(data.clientName, data.docType);
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
