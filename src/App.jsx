import { useEffect, useMemo, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import './pdf/browserFonts.js';
import InvoiceDocument from './pdf/InvoiceDocument.jsx';
import { defaultData, blankData } from './pdf/defaults.js';
import { fileNameFor, money, toNumber } from './pdf/format.js';

const STORAGE_KEY = 'rl-invoice-form-v1';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultData, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return defaultData;
}

function Field({ label, hint, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Group({ title, children, defaultOpen = true }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="grid">{children}</div>
    </details>
  );
}

export default function App() {
  const [data, setData] = useState(loadSaved);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  // Debounced live preview
  useEffect(() => {
    clearTimeout(timer.current);
    let url;
    let cancelled = false;
    timer.current = setTimeout(async () => {
      try {
        const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setError('');
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer.current); };
  }, [data]);

  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }));
  const setPhase = (i, key) => (e) =>
    setData((d) => ({
      ...d,
      phases: d.phases.map((p, j) => (j === i ? { ...p, [key]: e.target.value } : p)),
    }));

  const total = useMemo(() => data.phases.reduce((s, p) => s + toNumber(p.amount), 0), [data.phases]);
  const fileName = fileNameFor(data.clientName);

  async function download() {
    setBusy(true);
    try {
      const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const input = (key, props = {}) => <input value={data[key] ?? ''} onChange={set(key)} {...props} />;
  const area = (key, rows = 3, props = {}) => <textarea rows={rows} value={data[key] ?? ''} onChange={set(key)} {...props} />;

  return (
    <div className="app">
      <header className="topbar">
        <img src="/round-logics-logo.svg" alt="Round Logics" className="logo" />
        <div className="topbar-text">
          <h1>T&amp;C + Invoice Generator</h1>
          <p>Fill in the project details. Blank fields print as editable [PLACEHOLDERS].</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setData(blankData())}>Clear form</button>
          <button className="ghost" onClick={() => setData(defaultData)}>Load sample</button>
          <button className="primary" onClick={download} disabled={busy}>
            {busy ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </header>

      <main className="layout">
        <form className="form" onSubmit={(e) => { e.preventDefault(); download(); }}>
          <Group title="Client & invoice">
            <Field label="Client name" wide>{input('clientName', { placeholder: 'e.g. Venee Art Sculptures' })}</Field>
            <Field label="Client contact person">{input('clientContactPerson')}</Field>
            <Field label="Client email">{input('clientEmail', { type: 'email' })}</Field>
            <Field label="Client phone">{input('clientPhone')}</Field>
            <Field label="Client address" wide>{area('clientAddress', 2)}</Field>
            <Field label="Invoice number">{input('invoiceNumber', { placeholder: 'INVOICE NUMBER' })}</Field>
            <Field label="Invoice date">{input('invoiceDate', { type: 'date' })}</Field>
            <Field label="Due date" hint="Optional — otherwise “As per payment terms”">{input('dueDate', { type: 'date' })}</Field>
          </Group>

          <Group title="Provider (Round Logics)" defaultOpen={false}>
            <Field label="Provider name">{input('providerName')}</Field>
            <Field label="Provider email">{input('providerEmail', { type: 'email' })}</Field>
            <Field label="Provider phone">{input('providerPhone')}</Field>
            <Field label="Provider address" wide>{area('providerAddress', 2)}</Field>
          </Group>

          <Group title="Website scope">
            <Field label="Agreed website pages" hint="Separate with commas" wide>
              {input('pages', { placeholder: 'Home, About, Contact…' })}
            </Field>
            {data.phases.map((p, i) => (
              <fieldset className="phase wide" key={i}>
                <legend>Phase {i + 1}</legend>
                <Field label="Title" wide>
                  <input value={p.title} onChange={setPhase(i, 'title')} />
                </Field>
                <Field label="Deliverables" wide>
                  <textarea rows={2} value={p.deliverables} onChange={setPhase(i, 'deliverables')} />
                </Field>
                <Field label="Amount (₹)">
                  <input inputMode="numeric" value={p.amount} onChange={setPhase(i, 'amount')} />
                </Field>
              </fieldset>
            ))}
            <div className="total wide">Total project value <strong>{money(total)}</strong></div>
            <Field label="Additional features / exclusions" hint="One per line — quoted separately" wide>
              {area('exclusions', 3, { placeholder: 'Leave blank to print a placeholder' })}
            </Field>
          </Group>

          <Group title="Terms & conditions">
            <Field label="Timeline (days)">{input('timelineDays', { inputMode: 'numeric' })}</Field>
            <Field label="Phase 2 suspension (days after due)">{input('suspensionDays', { inputMode: 'numeric' })}</Field>
            <Field label="Included minor reviews">{input('includedMinorReviews', { inputMode: 'numeric' })}</Field>
            <Field label="Included major reviews">{input('includedMajorReviews', { inputMode: 'numeric' })}</Field>
            <Field label="Extra minor revision (₹)">{input('minorRevisionCharge', { inputMode: 'numeric' })}</Field>
            <Field label="Extra major revision (₹)">{input('majorRevisionCharge', { inputMode: 'numeric' })}</Field>
            <Field label="Annual domain & hosting renewal (₹)">{input('renewalCharge', { inputMode: 'numeric' })}</Field>
            <Field label="Payment terms" wide>{area('paymentTerms', 3)}</Field>
            <Field label="Additional notes" hint="Optional — printed under Acceptance" wide>{area('additionalNotes', 2)}</Field>
          </Group>

          <Group title="Payment instructions">
            <Field label="Account name">{input('bankAccountName')}</Field>
            <Field label="Bank name">{input('bankName')}</Field>
            <Field label="Account number">{input('bankAccountNumber')}</Field>
            <Field label="IFSC">{input('bankIfsc')}</Field>
            <Field label="Branch" hint="Optional">{input('bankBranch')}</Field>
            <Field label="UPI ID">{input('upiId')}</Field>
          </Group>

          <button className="primary block" type="submit" disabled={busy}>
            {busy ? 'Generating…' : `Download ${fileName}`}
          </button>
        </form>

        <section className="preview">
          {error && <div className="error">PDF error: {error}</div>}
          {previewUrl ? (
            <>
              <div className="preview-bar">
                <span>Live preview</span>
                <a href={previewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
              </div>
              <iframe title="PDF preview" src={previewUrl} />
            </>
          ) : (
            <div className="placeholder">Building preview…</div>
          )}
        </section>
      </main>
    </div>
  );
}
