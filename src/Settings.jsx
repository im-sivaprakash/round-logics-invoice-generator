import { useState } from 'react';
import { CURRENCIES, DOC_TYPES, defaultSettings, getSettings, saveSettings } from './settings.js';
import { money } from './pdf/format.js';

function Field({ label, hint, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Card({ title, note, children }) {
  return (
    <section className="group settings-card">
      <h3>{title}</h3>
      {note && <p className="hint card-note">{note}</p>}
      <div className="grid">{children}</div>
    </section>
  );
}

export default function Settings({ navigate }) {
  const [form, setForm] = useState(getSettings);
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setDirty(true);
    setStatus('');
  };
  const input = (key, props = {}) => <input value={form[key] ?? ''} onChange={set(key)} {...props} />;
  const area = (key, rows = 2) => <textarea rows={rows} value={form[key] ?? ''} onChange={set(key)} />;

  function save(e) {
    e.preventDefault();
    if (saveSettings(form)) {
      setDirty(false);
      setStatus('Settings saved. New invoices will use them.');
    } else {
      setStatus('Could not save — this browser’s storage is unavailable.');
    }
  }

  function reset() {
    if (!confirm('Reset all settings to the original defaults?')) return;
    setForm({ ...defaultSettings });
    setDirty(true);
    setStatus('Defaults restored — press Save to keep them.');
  }

  return (
    <main className="manage settings">
      <div className="manage-head">
        <div>
          <h2>Settings</h2>
          <p className="hint">Saved in this browser. New invoices start with these details; existing invoices keep their own.</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={reset}>Reset to defaults</button>
          <button className="ghost" onClick={() => navigate('#/new')}>New invoice</button>
        </div>
      </div>

      <form onSubmit={save} className="settings-form">
        <Card title="General">
          <Field label="Currency" hint={`Example: ${money(28000, form.currency)}`}>
            <select value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Default document">
            <select value={form.docType} onChange={set('docType')}>
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Invoice number prefix" hint="Optional, e.g. RL-2026-">{input('invoicePrefix')}</Field>
        </Card>

        <Card title="Provider details" note="Printed in the “From” block of every new invoice.">
          <Field label="Business name">{input('providerName')}</Field>
          <Field label="Email">{input('providerEmail', { type: 'email' })}</Field>
          <Field label="Phone">{input('providerPhone')}</Field>
          <Field label="Address" wide>{area('providerAddress', 3)}</Field>
        </Card>

        <Card title="Payment details" note="Shown under Payment instructions. Leave blank to hide.">
          <Field label="Account name">{input('bankAccountName')}</Field>
          <Field label="Bank name">{input('bankName')}</Field>
          <Field label="Account number">{input('bankAccountNumber')}</Field>
          <Field label="IFSC">{input('bankIfsc')}</Field>
          <Field label="Branch">{input('bankBranch')}</Field>
          <Field label="UPI ID">{input('upiId')}</Field>
        </Card>

        <Card title="Default terms" note="Pre-filled on new invoices; you can still change them per invoice.">
          <Field label="Timeline (days)">{input('timelineDays', { inputMode: 'numeric' })}</Field>
          <Field label="Suspension (days after final payment due)">{input('suspensionDays', { inputMode: 'numeric' })}</Field>
          <Field label="Included minor reviews">{input('includedMinorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Included major reviews">{input('includedMajorReviews', { inputMode: 'numeric' })}</Field>
          <Field label="Extra minor revision">{input('minorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Extra major revision">{input('majorRevisionCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Annual domain & hosting renewal">{input('renewalCharge', { inputMode: 'numeric' })}</Field>
          <Field label="Payment terms" wide>{area('paymentTerms', 3)}</Field>
        </Card>

        <div className="save-bar">
          <span className="hint" role="status">{status || (dirty ? 'Unsaved changes' : '')}</span>
          <button className="primary" type="submit" disabled={!dirty}>Save settings</button>
        </div>
      </form>
    </main>
  );
}
