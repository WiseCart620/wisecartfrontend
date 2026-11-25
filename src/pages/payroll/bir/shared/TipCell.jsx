import React, { useEffect, useRef, useState } from 'react';
import { acc, n } from './birReportFormat';

// Number with a tooltip (hover to peek, click to pin). lines = [{ label, amount, remarks }]
const TipCell = ({ lines, children }) => {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, below: false });
  const ref = useRef(null);
  useEffect(() => {
    if (!pinned) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setPinned(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pinned]);
  if (!lines || lines.length === 0) return <span>{children}</span>;
  const place = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const below = r.top < 200;
    setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const total = lines.reduce((s, l) => s + n(l.amount), 0);
  const show = hover || pinned;
  return (
    <span ref={ref} className="cursor-help border-b border-dotted border-gray-500"
      onMouseEnter={(e) => { place(e); setHover(true); }} onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); place(e); setPinned((p) => !p); }}>
      {children}
      {show && (
        <span className="fixed z-[100] w-72 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal normal-case text-white shadow-xl whitespace-normal pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: pos.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}>
          {lines.map((l, i) => (
            <span key={i} className={`block ${i ? 'mt-2 pt-2 border-t border-gray-700' : ''}`}>
              <span className="flex justify-between gap-3">
                <span className="font-semibold">{l.label}</span>
                <span className="tabular-nums">{acc(l.amount)}</span>
              </span>
              {l.remarks && <span className="mt-0.5 block whitespace-pre-line text-gray-300">{l.remarks}</span>}
            </span>
          ))}
          {lines.length > 1 && (
            <span className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-semibold">
              <span>Total</span><span className="tabular-nums">{acc(total)}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export default TipCell;