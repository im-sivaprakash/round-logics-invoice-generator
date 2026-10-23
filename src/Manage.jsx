import { useEffect, useMemo, useRef, useState } from 'react';
import {
  listInvoices, deleteInvoice, duplicateInvoice, setStatus, recordTotal, exportAll, importAll, markInvoicePaid,
} from './storage.js';
import { DOC_KINDS, kindLabel, isOffer, tracksPayment, paymentSummary, PAY_STATE_LABEL } from './pdf/docKinds.js';
import PaymentDialog from './PaymentDialog.jsx';
import { downloadPdf, downloadText } from './download.jsx';
import { money, formatDate } from './pdf/format.js';
import { STATUSES } from './statuses.js';
import { getSettings } from './settings.js';

function useInvoices() {
  const [list, setList] = useState(listInvoices);
  useEffect(() => {
    const refresh = () => setList(listInvoices());
    window.addEventListener('invoices-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('invoices-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return list;
}

export default function Manage({ navigate }) {
  const invoices = useInvoices();
  const [query, setQuery] = useState('');
  const [status, setStatusFilter] = useState('all');
  const [kind, setKind] = useState('all');
  const [payFor, setPayFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (kind !== 'all' && (r.data?.docKind || 'invoice') !== kind) return false;
      if (!q) return true;
      const d = r.data || {};
      return [d.clientName, d.invoiceNumber, kindLabel(d), ...(d.phases || []).map((p) => p.title)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [invoices, query, status, kind]);

  // Totals are kept per currency so ₹ and $ are never added together.
  const baseCurrency = getSettings().currency;
  const sum = (pred, pick = recordTotal) => {
    const by = {};
    invoices.filter(pred).forEach((r) => {
      const c = r.data?.currency || 'INR';
      by[c] = (by[c] || 0) + pick(r);
    });
    const parts = Object.entries(by).map(([c, v]) => money(v, c));
    return parts.length ? parts.join(' · ') : money(0, baseCurrency);
  };
  const live = (r) => r.status !== 'cancelled';
  const billable = (r) => live(r) && tracksPayment(r.data);
  const offers = invoices.filter((r) => live(r) && isOffer(r.data));
  const stats = [
    ['Invoiced', sum(billable)],
    ['Received', sum(billable, (r) => paymentSummary(r.data, r.status).paid)],
    ['Outstanding', sum(billable, (r) => paymentSummary(r.data, r.status).balance)],
    [`Open quotes (${offers.length})`, sum((r) => live(r) && isOffer(r.data))],
  ];

  async function download(r) {
    setBusyId(r.id);
    try { await downloadPdf(r.data, r.status); } finally { setBusyId(null); }
  }

  function remove(r) {
    const name = r.data?.invoiceNumber || r.data?.clientName || 'this invoice';
    if (confirm(`Delete ${name}? This can’t be undone.`)) deleteInvoice(r.id);
  }

  function backup() {
    downloadText(exportAll(), `round-logics-invoices-${new Date().toISOString().slice(0, 10)}.json`);
  }

  async function restore(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = importAll(await file.text());
      setMsg(`Imported ${n} invoice${n === 1 ? '' : 's'}.`);
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
  }

  return (
    <main className="manage">
      <div className="manage-head">
        <div>
          <h2>Manage invoices & quotes</h2>
          <p className="hint">Saved in this browser only. Use Backup to keep a copy or move them to another device.</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={backup} disabled={!invoices.length}>Backup (JSON)</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
          <button className="primary" onClick={() => navigate('#/new')}>+ New invoice</button>
        </div>
      </div>

      {msg && <div className="notice">{msg}</div>}

      <div className="stats">
        {stats.map(([k, v]) => (
          <div className="stat" key={k}><span className="label">{k}</span><strong>{v}</strong></div>
        ))}
      </div>

      <div className="filters">
        <input type="search" placeholder="Search client, invoice no. or item" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.value === 'custom' ? 'Other' : k.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p>{invoices.length ? 'No invoices match your search.' : 'No invoices yet.'}</p>
          {!invoices.length && <button className="primary" onClick={() => navigate('#/new')}>Create your first invoice</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Number</th><th>Client</th><th>Date</th><th className="num">Total</th><th>Payment</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const d = r.data || {};
                const pay = paymentSummary(d, r.status);
                const tracks = tracksPayment(d);
                return (
                  <tr key={r.id}>
                    <td data-label="Number">
                      <button className="link" onClick={() => navigate(`#/edit/${r.id}`)}>{d.invoiceNumber || 'No number'}</button>
                      <span className={`kind-tag ${isOffer(d) ? 'offer' : ''}`}>{kindLabel(d)}</span>
                    </td>
                    <td data-label="Client">
                      {d.clientName || '—'}
                      <span className="type-tag">{d.docType === 'invoice' ? 'Without T&C' : 'With T&C'}</span>
                    </td>
                    <td data-label="Date">{formatDate(d.invoiceDate) || '—'}</td>
                    <td data-label="Total" className="num">{money(recordTotal(r), d.currency || 'INR')}</td>
                    <td data-label="Payment">
                      {tracks ? (
                        <span className={`pay-state ${pay.state}`} title={`Paid ${money(pay.paid, d.currency || 'INR')} · Balance ${money(pay.balance, d.currency || 'INR')}`}>
                          {PAY_STATE_LABEL[pay.state]}
                          {pay.state === 'partial' && <small> · {money(pay.balance, d.currency || 'INR')} due</small>}
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td data-label="Status">
                      <select className={`pill ${r.status}`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="row-actions">
                      {tracks && pay.state !== 'paid' && pay.total > 0 && (
                        <button className="ghost sm pay-btn" onClick={() => setPayFor(r)}>Mark paid</button>
                      )}
                      <button className="ghost sm" onClick={() => navigate(`#/edit/${r.id}`)}>Edit</button>
                      <button className="ghost sm" onClick={() => download(r)} disabled={busyId === r.id}>{busyId === r.id ? '…' : 'PDF'}</button>
                      <button className="ghost sm" onClick={() => { const c = duplicateInvoice(r.id); if (c) navigate(`#/edit/${c.id}`); }}>Duplicate</button>
                      <button className="ghost sm danger" onClick={() => remove(r)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaymentDialog
        open={!!payFor}
        title={`Mark ${payFor?.data?.invoiceNumber || payFor?.data?.clientName || 'invoice'} as paid`}
        amountText={payFor ? `Balance ${money(paymentSummary(payFor.data, payFor.status).balance, payFor.data?.currency || 'INR')} — all unpaid items will be marked paid` : ''}
        onConfirm={(info) => { markInvoicePaid(payFor.id, info); setPayFor(null); }}
        onClose={() => setPayFor(null)}
      />
    </main>
  );
}
