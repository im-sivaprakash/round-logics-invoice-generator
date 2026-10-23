import { useEffect, useMemo, useRef, useState } from 'react';
import { renderBlob, downloadPdf } from './download.jsx';
import { sampleData, newInvoiceData, emptyPhase } from './pdf/defaults.js';
import { CURRENCIES, DOC_TYPES, BANK_KEYS, PROVIDER_KEYS, getSettings } from './settings.js';
import { fileNameFor, money, itemsTotal, has } from './pdf/format.js';
import { getInvoice, makeRecord, saveInvoice, syncPaidStatus, markItemsPaid, markItemsUnpaid } from './storage.js';
import { DOC_KINDS, PAYMENT_METHODS, kindLabel, kindShort, isOffer, tracksPayment, paymentSummary, PAY_STATE_LABEL } from './pdf/docKinds.js';
import PaymentDialog from './PaymentDialog.jsx';
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
  has(d.clientName) || (d.phases || []).some((p) => has(p.title) || has(p.amount));

export default function Editor({ id, navigate }) {
  const [record, setRecord] = useState(() => (id && getInvoice(id)) || makeRecord(newInvoiceData()));
  const [saved, setSaved] = useState(Boolean(id && getInvoice(id)));
  const [previewUrl, setPreviewUrl] = useState(null);
  const [payDialog, setPayDialog] = useState(null); // null | 'all' | item index
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const missing = id && !getInvoice(id) && !saved;
  const data = record.data;
  const [settings, setSettings] = useState(getSettings);
  useEffect(() => {
    const refresh = () => setSettings(getSettings());
    window.addEventListener('settings-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('settings-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

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
        const blob = await renderBlob(data, record.status);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setError('');
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [data, settings, record.status]);

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

  // Item payment changes also keep the status (Paid / Sent) in step
  const setItems = (fn) =>
    setRecord((r) => syncPaidStatus({ ...r, data: fn(r.data) }, r.data));
  const togglePaid = (i, checked) => {
    if (checked) { setPayDialog(i); return; }
    setItems((d) => ({
      ...d,
      phases: d.phases.map((p, j) => (j === i ? { ...p, paid: false, paidMethod: '', paidDate: '', paidRef: '' } : p)),
    }));
  };
  function confirmPayment(info) {
    const target = payDialog;
    setPayDialog(null);
    if (target === 'all') setItems((d) => markItemsPaid(d, info));
    else setItems((d) => ({ ...d, phases: d.phases.map((p, j) => (j === target ? { ...p, paid: true, ...info } : p)) }));
  }

  const total = useMemo(() => itemsTotal(data.phases), [data.phases]);
  const label = kindLabel(data);
  const short = kindShort(data);
  const offer = isOffer(data);
  const tracks = tracksPayment(data);
  const pay = paymentSummary(data, record.status);
  const fileName = fileNameFor(data.clientName, data.docType, label);
  const withTerms = data.docType !== 'invoice';
  const currency = data.currency || 'INR';

  async function download() {
    setBusy(true);
    try { await downloadPdf(data); } catch (e) { setError(String(e?.message || e)); } finally { setBusy(false); }
  }

  const shared = new Set([...PROVIDER_KEYS, ...BANK_KEYS]);
  // For provider/bank fields, show the Settings value as the placeholder
  const ph = (key, props) => (shared.has(key) && has(settings[key]) ? { ...props, placeholder: settings[key] } : props);
  const input = (key, props = {}) => <input value={data[key] ?? ''} onChange={set(key)} {...ph(key, props)} />;
  const area = (key, rows = 3, props = {}) => <textarea rows={rows} value={data[key] ?? ''} onChange={set(key)} {...ph(key, props)} />;

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
            <strong>{data.invoiceNumber || data.clientName || `New ${label.toLowerCase()}`}</strong>
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
            <button type="button" className="ghost" onClick={() => setData({ ...sampleData(), invoiceDate: data.invoiceDate })}>
              Load sample
            </button>
          </div>
          <div className="doc-options">
            <label className="field kind-field">
              <span className="label">Document is a</span>
              <select value={data.docKind || 'invoice'} onChange={set('docKind')}>
                {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            {data.docKind === 'custom' && (
              <label className="field kind-field">
                <span className="label">Document title</span>
                <input value={data.docKindCustom ?? ''} onChange={set('docKindCustom')} placeholder="e.g. Receipt, Work Order" />
              </label>
            )}
          </div>
          <div className="doc-options">
            <div className="segmented" role="radiogroup" aria-label="Include terms">
              {DOC_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  role="radio"
                  aria-checked={(data.docType || 'tc-invoice') === t.value}
                  className={(data.docType || 'tc-invoice') === t.value ? 'seg active' : 'seg'}
                  onClick={() => setData((d) => ({ ...d, docType: t.value }))}
                >
                  {t.value === 'invoice' ? `${label} only` : `T&C + ${label}`}
                </button>
              ))}
            </div>
            <select value={currency} onChange={set('currency')} aria-label="Currency">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <Group title={`Client & ${label.toLowerCase()}`}>
          <Field label="Client name" wide>{input('clientName', { placeholder: 'e.g. Venee Art Sculptures' })}</Field>
          <Field label="Client contact person">{input('clientContactPerson')}</Field>
          <Field label="Client email">{input('clientEmail', { type: 'email' })}</Field>
          <Field label="Client phone">{input('clientPhone')}</Field>
          <Field label="Client address" wide>{area('clientAddress', 2)}</Field>
          <Field label={`${short} number`}>{input('invoiceNumber', { placeholder: offer ? 'e.g. QT-2026-007' : 'e.g. RL-2026-014' })}</Field>
          <Field label={`${short} date`}>{input('invoiceDate', { type: 'date' })}</Field>
          <Field label={offer ? 'Valid until' : 'Due date'} hint="Optional">{input('dueDate', { type: 'date' })}</Field>
        </Group>

        <Group title="Items">
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
              <Field label="Amount">
                <input inputMode="numeric" value={p.amount} onChange={setItem(i, 'amount')} />
              </Field>
              {tracks && (
                <div className={`item-pay${p.paid ? ' is-paid' : ''}`}>
                  <label className="check">
                    <input type="checkbox" checked={!!p.paid} onChange={(e) => togglePaid(i, e.target.checked)} disabled={!has(p.amount)} />
                    <span>{p.paid ? 'Paid' : 'Not paid'}</span>
                  </label>
                </div>
              )}
              {tracks && p.paid && (
                <div className="pay-fields wide">
                  <Field label="Payment method">
                    <select value={p.paidMethod || ''} onChange={setItem(i, 'paidMethod')}>
                      {!PAYMENT_METHODS.includes(p.paidMethod) && <option value={p.paidMethod || ''}>{p.paidMethod || 'Choose…'}</option>}
                      {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Date received">
                    <input type="date" value={p.paidDate || ''} onChange={setItem(i, 'paidDate')} />
                  </Field>
                  <Field label="Reference" wide>
                    <input value={p.paidRef || ''} onChange={setItem(i, 'paidRef')} placeholder="UTR / transaction ID / cheque no." />
                  </Field>
                </div>
              )}
            </fieldset>
          ))}
          <button type="button" className="ghost wide add" onClick={addItem}>+ Add item</button>
          <div className="total wide">Total <strong>{money(total, currency) || money(0, currency)}</strong></div>
          {tracks && total > 0 && (
            <div className={`pay-summary wide ${pay.state}`}>
              <div>
                <span className={`pay-state ${pay.state}`}>{PAY_STATE_LABEL[pay.state]}</span>
                <span className="pay-figures">
                  Paid <strong>{money(pay.paid, currency)}</strong> · Balance <strong>{money(pay.balance, currency)}</strong>
                </span>
              </div>
              <div className="pay-actions">
                {pay.state !== 'paid' && (
                  <button type="button" className="primary sm" onClick={() => setPayDialog('all')}>Mark all paid</button>
                )}
                {(pay.state !== 'unpaid' || record.status === 'paid') && (
                  <button type="button" className="ghost sm" onClick={() => setRecord((r) => ({ ...r, status: r.status === 'paid' ? 'sent' : r.status, data: markItemsUnpaid(r.data) }))}>
                    Mark unpaid
                  </button>
                )}
              </div>
            </div>
          )}
          {withTerms && (
            <Field label="Additional features / exclusions" hint="One per line — quoted separately" wide>
              {area('exclusions', 3)}
            </Field>
          )}
        </Group>

        {withTerms ? (
        <Group title="Terms & conditions" defaultOpen={false}>
          <Field label="Timeline (days)">{input('timelineDays', { inputMode: 'numeric' })}</Field>
          <Field label="Suspension (days after final payment due)">{input('suspensionDays', { inputMode: 'numeric' })}</Field>
          <Field label="Included minor reviews">{input('includedMinorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Included major reviews">{input('includedMajorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Extra minor revision">{input('minorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Extra major revision">{input('majorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Annual domain & hosting renewal">{input('renewalCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Payment terms" wide>{area('paymentTerms', 3)}</Field>
          <Field label="Additional notes" hint="Printed under Acceptance" wide>{area('additionalNotes', 2)}</Field>
        </Group>
        ) : (
        <Group title="Invoice notes" defaultOpen={false}>
          <Field label="Payment terms" wide>{area('paymentTerms', 3)}</Field>
          <Field label="Annual domain & hosting renewal" hint="Leave blank to hide">{input('renewalCharge', { inputMode: 'numeric' })}</Field>
        </Group>
        )}

        <Group title="Payment instructions (bank details)" defaultOpen={false}>
          <div className="wide group-note">
            <span className="hint">Blank fields use your saved Settings. Type here only to change them for this invoice.</span>
            {BANK_KEYS.some((k) => has(data[k])) && (
              <button type="button" className="ghost sm" onClick={() => setData((d) => ({ ...d, ...Object.fromEntries(BANK_KEYS.map((k) => [k, ''])) }))}>Use Settings</button>
            )}
          </div>
          <Field label="Account name">{input('bankAccountName')}</Field>
          <Field label="Bank name">{input('bankName')}</Field>
          <Field label="Account number">{input('bankAccountNumber')}</Field>
          <Field label="IFSC">{input('bankIfsc')}</Field>
          <Field label="Branch">{input('bankBranch')}</Field>
          <Field label="UPI ID">{input('upiId')}</Field>
        </Group>

        <Group title="Provider (Round Logics)" defaultOpen={false}>
          <div className="wide group-note">
            <span className="hint">Blank fields use your saved Settings. Type here only to change them for this invoice.</span>
            {PROVIDER_KEYS.some((k) => has(data[k])) && (
              <button type="button" className="ghost sm" onClick={() => setData((d) => ({ ...d, ...Object.fromEntries(PROVIDER_KEYS.map((k) => [k, ''])) }))}>Use Settings</button>
            )}
          </div>
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

      <PaymentDialog
        open={payDialog !== null}
        title={payDialog === 'all' ? 'Mark all items as paid' : `Mark item ${typeof payDialog === 'number' ? payDialog + 1 : ''} as paid`}
        amountText={
          payDialog === 'all'
            ? `Balance ${money(pay.balance, currency)}`
            : typeof payDialog === 'number' ? money(data.phases[payDialog]?.amount, currency) : ''
        }
        onConfirm={confirmPayment}
        onClose={() => setPayDialog(null)}
      />

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
