import { useEffect, useMemo, useRef, useState } from 'react';
import { renderBlob, downloadPdf } from './download.jsx';
import { defaultData, newInvoiceData, emptyPhase } from './pdf/defaults.js';
import { fileNameFor, money, itemsTotal, has } from './pdf/format.js';
import { getInvoice, makeRecord, saveInvoice } from './storage.js';
import { STATUSES } from './statuses.js';

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

const worthSaving = (d) =>
  has(d.clientName) || has(d.invoiceNumber) ||
  (d.phases || []).some((p) => has(p.title) || has(p.amount));

export default function Editor({ id, navigate }) {
  const [record, setRecord] = useState(() => (id && getInvoice(id)) || makeRecord(newInvoiceData()));
  const [saved, setSaved] = useState(Boolean(id && getInvoice(id)));
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const missing = id && !getInvoice(id) && !saved;
  const data = record.data;

  // Autosave to localStorage
  const saveTimer = useRef();
  useEffect(() => {
    if (!worthSaving(data)) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (saveInvoice(record)) {
        if (!saved) {
          setSaved(true);
          history.replaceState(null, '', `#/edit/${record.id}`);
        }
      } else {
        setError('Could not save to this browser’s storage.');
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [record, data, saved]);

  // Debounced live preview
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const blob = await renderBlob(data);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setError('');
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [data]);

  const setData = (fn) => setRecord((r) => ({ ...r, data: typeof fn === 'function' ? fn(r.data) : fn }));
  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }));
  const setItem = (i, key) => (e) =>
    setData((d) => ({ ...d, phases: d.phases.map((p, j) => (j === i ? { ...p, [key]: e.target.value } : p)) }));
  const addItem = () => setData((d) => ({ ...d, phases: [...(d.phases || []), emptyPhase()] }));
  const removeItem = (i) => setData((d) => ({ ...d, phases: d.phases.filter((_, j) => j !== i) }));
  const moveItem = (i, dir) =>
    setData((d) => {
      const list = [...d.phases];
      const j = i + dir;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, phases: list };
    });

  const total = useMemo(() => itemsTotal(data.phases), [data.phases]);
  const fileName = fileNameFor(data.clientName);

  async function download() {
    setBusy(true);
    try { await downloadPdf(data); } catch (e) { setError(String(e?.message || e)); } finally { setBusy(false); }
  }

  const input = (key, props = {}) => <input value={data[key] ?? ''} onChange={set(key)} {...props} />;
  const area = (key, rows = 3, props = {}) => <textarea rows={rows} value={data[key] ?? ''} onChange={set(key)} {...props} />;

  if (missing) {
    return (
      <div className="empty">
        <p>This invoice isn’t saved in this browser.</p>
        <button className="primary" onClick={() => navigate('#/invoices')}>Back to invoices</button>
      </div>
    );
  }

  return (
    <main className="layout">
      <form className="form" onSubmit={(e) => { e.preventDefault(); download(); }}>
        <div className="editor-bar">
          <div>
            <strong>{data.invoiceNumber || data.clientName || 'New invoice'}</strong>
            <span className="saved">{saved ? 'Saved in this browser' : 'Fill in a client or item to save'}</span>
          </div>
          <div className="editor-actions">
            <select
              value={record.status}
              onChange={(e) => setRecord((r) => ({ ...r, status: e.target.value }))}
              aria-label="Status"
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button type="button" className="ghost" onClick={() => setData({ ...defaultData, invoiceDate: data.invoiceDate })}>
              Load sample
            </button>
          </div>
        </div>

        <Group title="Client & invoice">
          <Field label="Client name" wide>{input('clientName', { placeholder: 'e.g. Venee Art Sculptures' })}</Field>
          <Field label="Client contact person">{input('clientContactPerson')}</Field>
          <Field label="Client email">{input('clientEmail', { type: 'email' })}</Field>
          <Field label="Client phone">{input('clientPhone')}</Field>
          <Field label="Client address" wide>{area('clientAddress', 2)}</Field>
          <Field label="Invoice number">{input('invoiceNumber', { placeholder: 'e.g. RL-2026-014' })}</Field>
          <Field label="Invoice date">{input('invoiceDate', { type: 'date' })}</Field>
          <Field label="Due date" hint="Optional">{input('dueDate', { type: 'date' })}</Field>
        </Group>

        <Group title="Invoice items">
          <Field label="Agreed website pages" hint="Separate with commas" wide>
            {input('pages', { placeholder: 'Home, About, Contact…' })}
          </Field>
          {(data.phases || []).map((p, i) => (
            <fieldset className="phase wide" key={i}>
              <legend>Item {i + 1}</legend>
              <div className="item-tools">
                <button type="button" className="icon" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="icon" onClick={() => moveItem(i, 1)} disabled={i === data.phases.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="icon danger" onClick={() => removeItem(i)} aria-label={`Remove item ${i + 1}`}>✕</button>
              </div>
              <Field label="Title" wide>
                <input value={p.title} onChange={setItem(i, 'title')} placeholder="e.g. Phase 1 – Website Design & Development" />
              </Field>
              <Field label="Description / deliverables" wide>
                <textarea rows={2} value={p.deliverables} onChange={setItem(i, 'deliverables')} />
              </Field>
              <Field label="Amount (₹)">
                <input inputMode="numeric" value={p.amount} onChange={setItem(i, 'amount')} />
              </Field>
            </fieldset>
          ))}
          <button type="button" className="ghost wide add" onClick={addItem}>+ Add item</button>
          <div className="total wide">Total <strong>{money(total) || '₹0'}</strong></div>
          <Field label="Additional features / exclusions" hint="One per line — quoted separately" wide>
            {area('exclusions', 3)}
          </Field>
        </Group>

        <Group title="Terms & conditions" defaultOpen={false}>
          <Field label="Timeline (days)">{input('timelineDays', { inputMode: 'numeric' })}</Field>
          <Field label="Suspension (days after final payment due)">{input('suspensionDays', { inputMode: 'numeric' })}</Field>
          <Field label="Included minor reviews">{input('includedMinorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Included major reviews">{input('includedMajorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Extra minor revision (₹)">{input('minorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Extra major revision (₹)">{input('majorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Annual domain & hosting renewal (₹)">{input('renewalCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Payment terms" wide>{area('paymentTerms', 3)}</Field>
          <Field label="Additional notes" hint="Printed under Acceptance" wide>{area('additionalNotes', 2)}</Field>
        </Group>

        <Group title="Payment instructions" defaultOpen={false}>
          <Field label="Account name">{input('bankAccountName')}</Field>
          <Field label="Bank name">{input('bankName')}</Field>
          <Field label="Account number">{input('bankAccountNumber')}</Field>
          <Field label="IFSC">{input('bankIfsc')}</Field>
          <Field label="Branch">{input('bankBranch')}</Field>
          <Field label="UPI ID">{input('upiId')}</Field>
        </Group>

        <Group title="Provider (Round Logics)" defaultOpen={false}>
          <Field label="Provider name">{input('providerName')}</Field>
          <Field label="Provider email">{input('providerEmail', { type: 'email' })}</Field>
          <Field label="Provider phone">{input('providerPhone')}</Field>
          <Field label="Provider address" wide>{area('providerAddress', 2)}</Field>
        </Group>

        <p className="hint center">Anything left blank is left out of the PDF.</p>
        <button className="primary block" type="submit" disabled={busy}>
          {busy ? 'Generating…' : `Download ${fileName}`}
        </button>
      </form>

      <section className="preview">
        {error && <div className="error">{error}</div>}
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
  );
}
