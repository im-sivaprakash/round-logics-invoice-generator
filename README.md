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
| `src/pdf/InvoiceDocument.jsx` | PDF layout and T&C wording |
| `src/pdf/defaults.js` | Default / sample values |
| `src/pdf/logo.js` | Round Logics logo paths (from the original SVG) |
| `public/round-logics-logo.svg` | Original logo file |
