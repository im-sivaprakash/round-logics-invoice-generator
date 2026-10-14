import React from 'react';
// Renders a sample PDF in Node for checking layout: npm run sample

import path from 'node:path';
import { renderToFile } from '@react-pdf/renderer';
import InvoiceDocument from '../src/pdf/InvoiceDocument.jsx';
import { registerFonts } from '../src/pdf/fonts.js';
import { defaultData } from '../src/pdf/defaults.js';
import { fileNameFor } from '../src/pdf/format.js';

const f = (n) => path.resolve('src/assets/fonts', n);
registerFonts(Object.fromEntries([400, 600, 700].map((w) => [w, { latin: f(`NotoSans-${w}.woff`), ext: f(`NotoSansExt-${w}.woff`) }])));

const out = path.resolve(process.argv[2] || '.', fileNameFor(defaultData.clientName));
await renderToFile(<InvoiceDocument data={defaultData} />, out);
console.log(out);
