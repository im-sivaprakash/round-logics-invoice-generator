import React from 'react';
// Renders a sample PDF in Node for checking layout: npm run sample

import path from 'node:path';
import { renderToFile } from '@react-pdf/renderer';
import InvoiceDocument from '../src/pdf/InvoiceDocument.jsx';
import { registerFonts } from '../src/pdf/fonts.js';
import { defaultData, newInvoiceData } from '../src/pdf/defaults.js';
import { fileNameFor } from '../src/pdf/format.js';

const f = (n) => path.resolve('src/assets/fonts', n);
registerFonts(Object.fromEntries([400, 600, 700].map((w) => [w, { latin: f(`NotoSans-${w}.woff`), ext: f(`NotoSansExt-${w}.woff`) }])));

const dir = process.argv[2] || '.';
const out = path.resolve(dir, fileNameFor(defaultData.clientName));
await renderToFile(<InvoiceDocument data={defaultData} />, out);
console.log(out);
if (process.argv.includes('--blank')) {
  const blank = path.resolve(dir, 'blank-check.pdf');
  await renderToFile(<InvoiceDocument data={{ ...newInvoiceData(), clientName: 'Test Client', phases: [{ title: 'Landing page', deliverables: '', amount: '5000' }] }} />, blank);
  console.log(blank);
}
