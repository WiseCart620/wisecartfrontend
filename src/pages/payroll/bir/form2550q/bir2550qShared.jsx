import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Helpers, styles, form controls, modal and filters shared by every 2550Q tab.
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const money = (v) => (v === null || v === undefined ? '' : peso.format(Number(v)));
const today = () => new Date().toISOString().slice(0, 10);
const n = (v) => Number(v || 0);
const qInfo = (date, fye) => {
  if (!date) return { key: '0000-0', label: 'No date' };
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const ty = m <= fye ? y : y + 1;
  const q = Math.floor((y * 12 + m - (ty * 12 + fye - 11)) / 3) + 1;
  return { key: `${ty}-${q}`, label: `Q${q} ${ty}` };
};

const SALE_CLASSES = {
  VATABLE_PRIVATE: 'Vatable (private)',
  VATABLE_GOVERNMENT: 'Vatable (government)',
  ZERO_RATED: 'Zero-rated',
  EXEMPT: 'Exempt',
};
const PURCHASE_CATEGORIES = {
  DOMESTIC_GOODS: 'Domestic goods',
  DOMESTIC_SERVICES: 'Domestic services',
  CAPITAL_GOODS: 'Capital goods',
  IMPORTATION: 'Importation',
  SERVICES_NONRESIDENT: 'Services by non-resident',
  OTHER: 'Other',
  NO_INPUT_TAX: 'No input tax',
  EXEMPT_IMPORTATION: 'VAT-exempt importation',
};
const s = {
  card: { background: 'var(--card-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  th: { textAlign: 'left', padding: '6px 4px', borderBottom: '1px solid #e5e7eb', fontSize: 'clamp(9px, 1.1vw, 12px)', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  td: { padding: '6px 4px', borderBottom: '1px solid #f3f4f6', fontSize: 'clamp(10px, 1.2vw, 13px)', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fixed: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  plainSelect: { width: '100%', border: 'none', background: 'transparent', padding: 0, margin: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textOverflow: 'ellipsis', appearance: 'none', WebkitAppearance: 'none', outline: 'none', textDecoration: 'underline dotted', textUnderlineOffset: 3 },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  input: { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  primary: { background: '#ea580c', color: '#fff', borderColor: '#ea580c' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  label: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { background: '#fff', borderRadius: 10, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  dialogHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' },
  dialogBody: { padding: 16, overflowY: 'auto' },
  dialogFoot: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #e5e7eb' },
  toolbar: { display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' },
};

const Field = ({ label, children }) => (
  <label>
    <span style={s.label}>{label}</span>
    {children}
  </label>
);

const Btn = ({ primary, style, ...p }) => (
  <button
    type="button"
    {...p}
    className={`bir-btn${primary ? ' bir-primary' : ''}`}
    style={{ ...s.btn, ...(primary ? s.primary : {}), ...style, opacity: p.disabled ? 0.5 : 1 }}
  />
);

const Text = ({ value, onChange, ...p }) => (
  <input style={s.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />
);
const Num = ({ value, onChange, ...p }) => (
  <input
    style={{ ...s.input, textAlign: 'right' }}
    type="number"
    step="0.01"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    {...p}
  />
);
const Pick = ({ value, onChange, options, ...p }) => (
  <select style={s.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p}>
    {Object.entries(options).map(([k, v]) => (
      <option key={k} value={k}>{v}</option>
    ))}
  </select>
);

const Modal = ({ title, onClose, footer, children }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={s.overlay} onMouseDown={onClose}>
      <div style={s.dialog} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div style={s.dialogHead}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <Btn onClick={onClose} aria-label="Close" style={{ padding: '4px 6px' }}><X size={14} /></Btn>
        </div>
        <div style={s.dialogBody}>{children}</div>
        <div style={s.dialogFoot}>{footer}</div>
      </div>
    </div>
  );
};

const useFilters = (initial) => {
  const [f, setF] = useState(initial);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const reset = () => setF(initial);
  const active = JSON.stringify(f) !== JSON.stringify(initial);
  return { f, set, reset, active };
};

const inRange = (date, from, to) => {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};
const includesText = (q, ...fields) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((x) => String(x ?? '').toLowerCase().includes(needle));
};

export { peso, money, today, n, qInfo, SALE_CLASSES, PURCHASE_CATEGORIES, s, Field, Btn, Text, Num, Pick, Modal, useFilters, inRange, includesText };
