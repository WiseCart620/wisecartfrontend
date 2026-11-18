import React, { useState, useRef, useEffect } from 'react';

const OPTIONS = [{ value: 'STOCK_IN', label: 'Stock In' }, { value: 'TRANSFER_IN', label: 'Transfer In' }, { value: 'TRANSFER_OUT', label: 'Transfer Out' }, { value: 'RETURN', label: 'Return' }, { value: 'DAMAGE', label: 'Damage' }, { value: 'DELIVERY', label: 'Delivery' }, { value: 'SALE', label: 'Sale' }];

const TxTypeMultiSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  const labels = selected.map((v) => (OPTIONS.find((o) => o.value === v) || { label: v }).label);
  const text = labels.length === 0 ? 'All Types' : labels.length <= 2 ? labels.join(', ') : `${labels.length} types`;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-8 flex items-center gap-1 border border-gray-300 rounded px-2 bg-white text-sm"
        title="Show only branch products with the checked transaction types in the date range"
      >
        <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Type</span>
        <span className="max-w-[150px] truncate">{text}</span>
        <span className="text-[10px] text-gray-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg py-1">
          {OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-orange-50">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-orange-600 border-t border-gray-100 hover:bg-orange-50"
            >
              Clear types
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TxTypeMultiSelect;