import { useEffect, useMemo, useRef, useState } from 'react';
import {
  listInvoices, deleteInvoice, duplicateInvoice, setStatus, recordTotal, exportAll, importAll,
} from './storage.js';
import { downloadPdf, downloadText } from './download.jsx';
import { money, formatDate } from './pdf/format.js';
import { STATUSES } from './statuses.js';

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
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      const d = r.data || {};
      return [d.clientName, d.invoiceNumber, ...(d.phases || []).map((p) => p.title)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [invoices, query, status]);

  const sum = (pred) => invoices.filter(pred).reduce((s, r) => s + recordTotal(r), 0);
  const stats = [
    ['Invoices', String(invoices.length)],
    ['Total value', money(sum((r) => r.status !== 'cancelled')) || '₹0'],
    ['Paid', money(sum((r) => r.status === 'paid')) || '₹0'],
    ['Outstanding', money(sum((r) => r.status === 'sent' || r.status === 'draft')) || '₹0'],
  ];

  async function download(r) {
    setBusyId(r.id);
    try { await downloadPdf(r.data); } finally { setBusyId(null); }
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
          <h2>Manage invoices</h2>
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
                <th>Invoice</th><th>Client</th><th>Date</th><th className="num">Total</th><th>Status</th><th>Updated</th><th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const d = r.data || {};
                return (
                  <tr key={r.id}>
                    <td data-label="Invoice">
                      <button className="link" onClick={() => navigate(`#/edit/${r.id}`)}>{d.invoiceNumber || 'No number'}</button>
                    </td>
                    <td data-label="Client">{d.clientName || '—'}</td>
                    <td data-label="Date">{formatDate(d.invoiceDate) || '—'}</td>
                    <td data-label="Total" className="num">{money(recordTotal(r)) || '₹0'}</td>
                    <td data-label="Status">
                      <select className={`pill ${r.status}`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td data-label="Updated" className="muted">{new Date(r.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="row-actions">
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
    </main>
  );
}
