# Round Logics · T&C + Invoice Generator

A React (Vite) app that turns a short project form into one client-ready PDF:
**Terms & Conditions first, then the invoice on its own page**, branded with the Round Logics logo.

- Everything renders in the browser with `@react-pdf/renderer` — no server, no data leaves the device.
- Any field left blank is left out of the PDF — no placeholders, nothing invented.
- Add, remove and reorder invoice items; they appear identically in the T&C and the invoice, and the total is calculated automatically.
- Every invoice autosaves to the browser's localStorage. **Manage invoices** lists them with search, status (Draft / Sent / Paid / Cancelled), totals, edit, PDF download, duplicate, delete, and JSON backup / import.
- **Document type**: Invoice, Quotation, Proforma Invoice, Estimate, or your own title (e.g. Receipt). The PDF title, labels ("Valid until" for quotes) and file name follow it.
- **Quantity**: each item has Quantity and Unit price; Amount = quantity × unit price. Qty and Unit price columns appear in the PDF when any item has a quantity other than 1.
- **Payments**: tick each item as paid and record the method (UPI, bank transfer, cash, cheque, card…), date and reference. The PDF shows Paid/Due per item, Amount paid, Balance due, a PAID / PARTLY PAID badge and a Payments received list. "Mark all paid" in the editor or "Mark paid" on the Manage page marks the whole invoice. Quotes and estimates don't track payments.
- **Your own Terms & Conditions** (*Terms & Conditions document* section of the editor):
  - **Standard T&C** — the built-in terms, filled from the invoice (unchanged default).
  - **Write / edit my own** — large Markdown editor with a formatting toolbar, live preview and full-screen mode. *Start from standard template* copies the built-in text in so you can edit it; *Upload file to edit* imports **.txt, .md, .doc, .docx or .pdf** into the editor.
  - **Attach my PDF as-is** — your PDF pages are placed before the invoice, unchanged.
  - **Templates** — *Save as template* on any invoice; manage, edit, set a default (applied to new invoices) or delete them in **Settings → Terms & Conditions templates**.
- **Without T&C** switch: skip the T&C pages and download just the invoice (`Round_Logics_<Client>_Invoice.pdf`).
- **Settings** page (saves automatically): currency (₹, $, €, £, AED, S$, A$, C$), default document type, invoice-number prefix, provider details, payment details and default terms. Provider and bank details apply to every invoice unless overridden on that invoice; currency and terms pre-fill new invoices.
- "Load sample" fills in the Venee Art Sculptures brief.
- File name: `Round_Logics_<Client_Name>_T&C_Invoice.pdf`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run sample       # writes a sample PDF in the current folder (Node)
```

## Deploy on Vercel

1. vercel.com → **Add New… → Project** → import this GitHub repo.
2. Framework preset: **Vite** (auto-detected). Build: `npm run build`, output: `dist`.
3. Deploy. Every push to `main` redeploys automatically.

## Where things live

| File | What it does |
| --- | --- |
| `src/App.jsx` | Navigation between New invoice and Manage invoices |
| `src/Editor.jsx` | Invoice form, live preview, download |
| `src/Manage.jsx` | Saved invoices list |
| `src/storage.js` | localStorage save / load / backup |
| `src/Settings.jsx`, `src/settings.js` | Settings page and saved defaults |
| `src/data/` | Data layer: adapters (localStorage, IndexedDB files, example API adapter) and repositories — swap the adapter to move to a database |
| `src/terms/` | Custom T&C: editor, file importers, standard template, templates |
| `src/pdf/MarkdownPdf.jsx` | Renders custom T&C Markdown into the PDF |
| `src/pdf/InvoiceDocument.jsx` | PDF layout and T&C wording |
| `src/pdf/defaults.js` | Default / sample values |
| `src/pdf/logo.js` | Round Logics logo paths (from the original SVG) |
| `public/round-logics-logo.svg` | Original logo file |

## Data layer (moving to a database later)

All data goes through `src/data/index.js`:

```js
import { db } from './data';
await db.invoices.list();          // invoices
await db.termsTemplates.save(tpl); // T&C templates
await db.files.put(file);          // uploaded files (IndexedDB)
```

Repositories are async and sit on a small collection interface (`list / get / put / remove / replaceAll`).
Today that interface is backed by localStorage; `src/data/adapters/apiAdapter.example.js` shows the same
interface over a REST API. To switch to a database, implement that adapter against your API and swap it in
`src/data/index.js`. The existing invoice screens still use the synchronous helpers in `src/storage.js`
(which already read and write through the same collection) — move those calls to `db.invoices` at the same time.
