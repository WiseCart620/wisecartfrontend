import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

export const inputCls = 'w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none';

export const MoneyInput = ({
  value, onChange, name, className = inputCls, decimals = 2,
  disabled, readOnly, placeholder, ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef(null);

  const withCommas = (s) => {
    const [i, d] = s.split('.');
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return d !== undefined ? `${int}.${d}` : int;
  };

  const clean = (s) => {
    let c = s.replace(/[^\d.]/g, '');
    if (decimals === 0) return c.replace(/\./g, '');
    const dot = c.indexOf('.');
    if (dot !== -1) {
      c = c.slice(0, dot + 1) + c.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
    }
    return c;
  };

  const fixed = (raw) => {
    if (raw === '' || raw == null) return '';
    const n = Number(String(raw).replace(/,/g, ''));
    return Number.isNaN(n) ? '' : withCommas(n.toFixed(decimals));
  };

  const emit = (v) => onChange && onChange({ target: { name, value: v } });

  const commit = () => {
    if (value === '' || value == null) return '';
    const n = Number(String(value).replace(/,/g, ''));
    if (Number.isNaN(n)) { emit(''); return ''; }
    emit(n.toFixed(decimals));
    return withCommas(n.toFixed(decimals));
  };

  const handleFocus = () => {
    if (readOnly) return;
    setText(value === '' || value == null || Number.isNaN(Number(value))
      ? '' : withCommas(String(Number(value))));
    setFocused(true);
  };

  const handleChange = (e) => {
    const el = e.target;
    const digitsBefore = el.value.slice(0, el.selectionStart).replace(/[^\d.]/g, '').length;
    const c = clean(el.value);
    const t = withCommas(c);
    setText(t);
    emit(c);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      let count = 0, pos = 0;
      while (pos < t.length && count < digitsBefore) {
        if (/[\d.]/.test(t[pos])) count++;
        pos++;
      }
      node.setSelectionRange(pos, pos);
    });
  };

  const handleBlur = () => { commit(); setFocused(false); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') setText(commit());
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      name={name}
      className={className}
      value={focused && !readOnly ? text : fixed(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      {...rest}
    />
  );
};

export const money = (v) => v == null ? '—' :
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export const today = () => new Date().toISOString().slice(0, 10);

export const Field = ({ label, required, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

export const Modal = ({ title, subtitle, onClose, children, maxW = 'max-w-2xl' }) => (
  <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-xl shadow-xl ${maxW} w-full max-h-[90vh] overflow-y-auto`}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X size={20} /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export const STATUS_STYLE = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAID: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};