import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { inputCls } from './Shared';

const SearchableSelect = ({
  options = [], value = '', onChange, placeholder = 'Select...',
  allLabel, disabled = false, allowCustom = false, searchPlaceholder, typeable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(null); // null = not typing, show the selected label
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const all = useMemo(
    () => (allLabel ? [{ value: '', label: allLabel }, ...options] : options),
    [options, allLabel]
  );
  const selected = all.find(o => String(o.value) === String(value));
  const display = selected ? (selected.value === '' ? '' : selected.label) : (allowCustom && value ? value : '');

  const term = (q || '').trim().toLowerCase();
  const shown = term ? all.filter(o => String(o.label).toLowerCase().includes(term)) : all;
  const canUseCustom = allowCustom && term && !all.some(o => String(o.label).toLowerCase() === term);

  useEffect(() => { setHi(0); }, [q, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[hi];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  // keep the floating panel anchored to the field
  useEffect(() => {
    if (!open) return;
    const update = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const panelStyle = (() => {
    if (!rect) return { display: 'none' };
    const below = window.innerHeight - rect.bottom;
    const flip = below < 250 && rect.top > below; // open upward when there's no room below
    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      minWidth: 200,
      ...(flip ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    };
  })();
  const panelCls = 'z-[100] max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1';

  const close = (commit) => {
    if (commit && allowCustom && q !== null && q.trim() && q.trim() !== display) {
      const match = all.find(o => String(o.label).toLowerCase() === q.trim().toLowerCase());
      onChange(match ? match.value : q.trim());
    }
    setOpen(false);
    setQ(null);
  };

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    setQ(null);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { close(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHi(h => Math.min(h + 1, Math.max(shown.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && shown[hi]) pick(shown[hi].value);
      else if (open && canUseCustom) pick(q.trim());
    }
  };

  if (!typeable) {
    return (
      <div
        className="relative"
        ref={ref}
        onBlur={(e) => { if (!ref.current.contains(e.relatedTarget)) setOpen(false); }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className={`${inputCls} flex items-center justify-between gap-2 text-left ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}
        >
          <span className={`truncate ${selected && selected.value !== '' ? 'text-gray-900' : 'text-gray-500'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && !disabled && createPortal(
          <ul style={panelStyle} className={panelCls}>
            {all.map(o => {
              const active = String(o.value) === String(value);
              return (
                <li key={`${o.value}-${o.label}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <Check size={15} className="flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
            {!all.length && <li className="px-3 py-4 text-sm text-center text-gray-500">No results</li>}
          </ul>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      ref={ref}
      onBlur={(e) => { if (!ref.current.contains(e.relatedTarget)) close(true); }}
    >
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={q !== null ? q : display}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={(e) => { setOpen(true); e.target.select(); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        className={`${inputCls} pr-9 ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (open) close(false);
          else { setOpen(true); inputRef.current?.focus(); }
        }}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        aria-label="Show all options"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && createPortal(
        <ul ref={listRef} style={panelStyle} className={panelCls}>
          {shown.map((o, idx) => {
            const active = String(o.value) === String(value);
            return (
              <li key={`${o.value}-${o.label}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setHi(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left
                    ${idx === hi ? 'bg-blue-50' : ''}
                    ${active ? 'text-blue-700 font-medium' : 'text-gray-800'}`}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <Check size={15} className="flex-shrink-0" />}
                </button>
              </li>
            );
          })}
          {canUseCustom && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(q.trim())}
                className="w-full px-3 py-2 text-sm text-left text-blue-700 hover:bg-blue-50"
              >
                Use "{q.trim()}"
              </button>
            </li>
          )}
          {!shown.length && !canUseCustom && (
            <li className="px-3 py-4 text-sm text-center text-gray-500">No results</li>
          )}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;