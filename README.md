# Round Logics · T&C + Invoice Generator

A React (Vite) app that turns a short project form into one client-ready PDF:
**Terms & Conditions first, then the invoice on its own page**, branded with the Round Logics logo.

- Everything renders in the browser with `@react-pdf/renderer` — no server, no data leaves the device.
- Blank fields print as editable `[PLACEHOLDERS]`; nothing (bank, tax, legal, client details) is invented.
- Phase titles, scopes and amounts appear identically in the T&C and the invoice; the total is calculated automatically.
- The form autosaves in your browser. "Load sample" restores the Venee Art Sculptures brief; "Clear form" starts fresh.
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
| `src/App.jsx` | Form, live preview, download |
| `src/pdf/InvoiceDocument.jsx` | PDF layout and T&C wording |
| `src/pdf/defaults.js` | Default / sample values |
| `src/pdf/logo.js` | Round Logics logo paths (from the original SVG) |
| `public/round-logics-logo.svg` | Original logo file |
