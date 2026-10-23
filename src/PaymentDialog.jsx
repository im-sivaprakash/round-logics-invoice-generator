import { useEffect, useRef, useState } from 'react';
import { PAYMENT_METHODS } from './pdf/docKinds.js';

const today = () => new Date().toLocaleDateString('en-CA');

// Asks how a payment was made, then calls onConfirm({ paidMethod, paidDate, paidRef }).
export default function PaymentDialog({ open, title, amountText, onConfirm, onClose }) {
  const ref = useRef();
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(today);
  const [refNo, setRefNo] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setDate(today());
      setRefNo('');
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className="pay-dialog" onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm({ paidMethod: method, paidDate: date, paidRef: refNo.trim() });
        }}
      >
        <h3>{title}</h3>
        {amountText && <p className="hint">{amountText}</p>}
        <label className="field">
          <span className="label">Payment method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Date received</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Reference</span>
          <input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="UTR / transaction ID / cheque no. (optional)" />
        </label>
        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Mark as paid</button>
        </div>
      </form>
    </dialog>
  );
}
