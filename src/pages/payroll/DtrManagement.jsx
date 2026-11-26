import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Upload, Trash2, MapPin, Send, Plus, X, ExternalLink, ChevronRight, Download } from 'lucide-react';
import toast, { useToasterStore } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth, uiAllowed } from '../../context/AuthContext';
import { ui } from '../../utils/uiAccess';
import { inputCls, Field, Modal } from '../../components/payroll/Shared';
import PageShell from '../../components/payroll/PageShell';
import SearchableSelect from '../../components/payroll/SearchableSelect';
import EmployeeAvatar from '../../components/payroll/EmployeeAvatar';
import BiometricImport from '../../components/payroll/BiometricImport';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'].map((m, i) => ({ value: String(i + 1), label: m }));
const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(v => ({ value: String(v), label: String(v) }));
const CUTOFFS = [{ value: 'ALL', label: 'Whole month' }, { value: 'FIRST', label: '1st - 15th' }, { value: 'SECOND', label: '16th - end of month' }];

const rangeFor = (month, year, cutoff) => {
  const m = Number(month), y = Number(year), last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${pad(m)}-${cutoff === 'SECOND' ? '16' : '01'}`,
    to: `${y}-${pad(m)}-${cutoff === 'FIRST' ? '15' : pad(last)}`,
  };
};
const hm = (mins) => `${Math.floor((mins || 0) / 60)}:${pad((mins || 0) % 60)}`;
const t12 = (ldt) => {
  if (!ldt) return '';
  const [h, m] = ldt.slice(11, 16).split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
// office (biometric) punches after 6:00 PM are counted only until 6:00 PM
const capOut = (v) => (v.source === 'BIO' && v.timeOut && v.timeOut.slice(11, 16) > '18:00' ? v.timeOut.slice(0, 11) + '18:00:00' : v.timeOut);
// time inside the shift window: office 9:00-18:00, field 10:00-19:00
const inShift = (v) => {
  if (!v.timeIn || !v.timeOut) return null;
  const [s, e] = v.source === 'BIO' ? ['09:00', '18:00'] : ['10:00', '19:00'];
  const day = v.timeIn.slice(0, 11);
  const a = v.timeIn.slice(11, 16) < s ? day + s + ':00' : v.timeIn;
  const b = v.timeOut.slice(11, 16) > e ? day + e + ':00' : v.timeOut;
  return dur(a, b);
};
const OT_TYPES = [['REGULAR_OT', 'Regular overtime'], ['REST_DAY', 'Rest day'], ['SPECIAL_HOLIDAY', 'Special holiday'], ['REGULAR_HOLIDAY', 'Regular holiday'], ['REST_DAY_REGULAR_HOLIDAY', 'Rest day + regular holiday'], ['NIGHT_DIFF', 'Night differential']];
const hhmm = (ldt) => (ldt ? ldt.slice(11, 16) : '');
const dur = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null);
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const DtrImage = ({ path, className = '', onClick, alt = '' }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let url; let dead = false;
    api.download(`/dtr/file?path=${encodeURIComponent(path)}`).then(r => {
      if (dead || !r || !r.success) return;
      url = URL.createObjectURL(r.data);
      setSrc(url);
    }).catch(() => { });
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!path) return <span className="text-gray-300">—</span>;
  if (!src) return <div className={`${className} bg-gray-100 animate-pulse`} />;
  return <img src={src} alt={alt} className={className} onClick={() => onClick && onClick(src)} />;
};

const NoticeModal = ({ title, message, tone = 'error', items, onClose }) => {
  const [open, setOpen] = useState(() => new Set());
  useEffect(() => { toast.dismiss(); }, []);   // the same message may also have been raised as a toast
  const groups = [];
  const byWho = {};
  (items || []).forEach((it) => {
    if (!byWho[it.who]) { byWho[it.who] = { who: it.who, rows: [] }; groups.push(byWho[it.who]); }
    byWho[it.who].rows.push(it);
  });
  const flip = (w) => setOpen((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n; });
  const okCount = (items || []).filter((i) => i.ok).length;
  const skipCount = (items || []).length - okCount;
  const allOpen = groups.length > 0 && open.size === groups.length;
  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className={`font-semibold ${tone === 'error' ? 'text-red-700' : tone === 'success' ? 'text-green-700' : 'text-gray-900'}`}>{title}</div>
        {groups.length > 0 ? (
          <>
            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-700">{okCount} posted, {skipCount} skipped</div>
              <button type="button" className="text-xs text-orange-600 hover:underline"
                onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.who)))}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
            </div>
            <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[55vh] overflow-y-auto">
              {groups.map((g) => {
                const isOpen = open.has(g.who);
                const ok = g.rows.filter((r) => r.ok).length;
                const skip = g.rows.length - ok;
                return (
                  <div key={g.who}>
                    <button type="button" onClick={() => flip(g.who)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50">
                      <Caret open={isOpen} />
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{g.who}</span>
                      {ok > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">{ok} posted</span>}
                      {skip > 0 && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">{skip} skipped</span>}
                    </button>
                    {isOpen && (
                      <ul className="px-4 pb-3 space-y-1.5">
                        {g.rows.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${r.ok ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <span className="text-gray-700">{r.date && <b className="text-gray-900">{r.date}: </b>}{r.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-700 mt-2 whitespace-pre-line max-h-[50vh] overflow-y-auto">{message}</div>
        )}
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">OK</button>
        </div>
      </div>
    </div>, document.body);
};
// every toast raised while this page is open (ours, api.js, biometric import) is shown as a modal
const ToastModalHost = () => {
  const { toasts } = useToasterStore();
  const list = toasts.filter((t) => t.visible && t.type !== 'loading');
  useEffect(() => () => { toast.dismiss(); }, []);
  if (!list.length) return null;
  const hasError = list.some((t) => t.type === 'error');
  return createPortal(
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-md">
        <div className={`font-semibold ${hasError ? 'text-red-700' : 'text-green-700'}`}>{hasError ? 'Something went wrong' : 'Done'}</div>
        <div className="mt-2 space-y-2 max-h-[50vh] overflow-y-auto">
          {list.map((t) => (
            <div key={t.id} className="text-sm text-gray-700 whitespace-pre-line">
              {typeof t.message === 'function' ? t.message(t) : t.message}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={() => list.forEach((t) => toast.dismiss(t.id))} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">OK</button>
        </div>
      </div>
    </div>, document.body);
};

const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) => {
  const [busy, setBusy] = useState(false);
  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && onCancel()}>
      <div className="bg-white rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-2 whitespace-pre-line">{message}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} disabled={busy} className="px-4 py-2 border border-gray-300 rounded text-sm disabled:opacity-50">{cancelLabel}</button>
          <button disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            className={`px-4 py-2 text-white rounded text-sm disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>, document.body);
};

const Chip = ({ label, value, tone = 'gray' }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${tone === 'red' ? 'bg-red-50 text-red-700' : tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
    {label} {value}
  </span>
);

// ------------------------------------------------------------------ View (visits + signatures)
const monthLabel = (mk) => new Date(mk + '-01T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
const cutoffKeyOf = (d) => `${d.slice(0, 7)}-${Number(d.slice(8, 10)) <= 15 ? 'A' : 'B'}`;
const cutoffLabel = (key) => {
  const [y, m, h] = key.split('-');
  const mon = new Date(`${y}-${m}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short' });
  return h === 'A' ? `${mon} 1 - 15` : `${mon} 16 - ${new Date(Number(y), Number(m), 0).getDate()}`;
};
const sumOf = (list, k) => list.reduce((s, d) => s + (d[k] || 0), 0);
const dayWord = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

// travel = gap between a time out and the next time in (skipped when the lunch break falls in between)
const travelOf = (d) => {
  const vs = (d.visits || []).slice().sort((a, b) => String(a.timeIn).localeCompare(String(b.timeIn)));
  const segments = [];
  let total = 0;
  for (let i = 0; i < vs.length - 1; i++) {
    const a = vs[i], b = vs[i + 1];
    if (!a.timeOut) continue;
    if (d.lunchStart && d.lunchStart >= a.timeOut && d.lunchStart <= b.timeIn) continue;
    const mins = dur(a.timeOut, b.timeIn);
    if (!mins) continue;
    segments.push({ from: a.timeOut, to: b.timeIn, mins, toPlace: b.place });
    total += mins;
  }
  return { segments, total };
};
const halfDayText = (d) => {
  const name = d.halfDayLeave ? ` (${d.halfDayLeave})` : '';
  if (d.halfDay === 'PAID') return `Half day - Paid leave${name}`;
  return d.halfDayAuto ? 'Half day - Unpaid (automatic)' : `Half day - Unpaid leave${name}`;
};
const absentText = (d) => { 
  if (d.absent === 'HOLIDAY') return `Regular holiday - Paid${d.absentLeave ? ` (${d.absentLeave})` : ''}`;
  if (d.absent === 'SPECIAL_PAID') return `Special day - Paid${d.absentLeave ? ` (${d.absentLeave})` : ''}`;
  if (d.absent === 'SPECIAL') return `Special day - No work, no pay${d.absentLeave ? ` (${d.absentLeave})` : ''}`;
  const name = d.absentLeave ? ` (${d.absentLeave})` : '';
  if (d.absent === 'PAID') return `On leave - Paid${name}`;
  if (d.absent === 'UNPAID') return `On leave - Unpaid${name}`;
  if (d.absent === 'PENDING') return `Absent - leave${name} pending approval`;
  return 'Absent - no leave filed (automatic unpaid)';
};
const isHolAbs = (a) => a === 'HOLIDAY' || a === 'SPECIAL' || a === 'SPECIAL_PAID';
const holidayUrl = (date, h, emp) => `/dtr/holiday?date=${date}&name=${encodeURIComponent(h.name.trim())}&type=${h.type}${h.type === 'SPECIAL' && h.paid ? '&paid=true' : ''}${h.scope === 'EMP' ? `&employeeId=${emp.employeeId}` : ''}`;
const HolidayFields = ({ emp, value, onChange, stacked = false }) => {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const lbl = 'block text-xs font-medium text-gray-700 mb-1';
  const group = (label, items) => (
    <div>
      <div className={lbl}>{label}</div>
      <div role="radiogroup" aria-label={label} className="border border-gray-300 rounded-md divide-y divide-gray-200 overflow-hidden bg-white">
        {items.map((it) => (
          <button type="button" key={it.title} role="radio" aria-checked={it.active} title={it.title} onClick={it.onClick}
            className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${it.active ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${it.active ? 'border-orange-600' : 'border-gray-400'}`}>
              {it.active && <span className="h-2 w-2 rounded-full bg-orange-600" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900 truncate">{it.title}</span>
              <span className="block text-xs text-gray-500">{it.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="w-full space-y-4">
      <Field label="Holiday name" required>
        <input className={inputCls} placeholder="e.g. Bonifacio Day" value={value.name}
          onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className={`grid gap-4 ${stacked ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {group('Holiday type', [
          { title: 'Regular holiday', hint: 'Paid even if not worked', active: value.type === 'REGULAR', onClick: () => set('type', 'REGULAR') },
          { title: 'Special non-working day', hint: 'No work, no pay by default', active: value.type === 'SPECIAL', onClick: () => set('type', 'SPECIAL') },
        ])}
        {group('Applies to', [
          { title: 'All employees', hint: 'National or company-wide', active: value.scope === 'ALL', onClick: () => set('scope', 'ALL') },
          { title: `Only ${emp.employeeName}`, hint: 'Local holiday, e.g. provincial', active: value.scope === 'EMP', onClick: () => set('scope', 'EMP') },
        ])}
      </div>
      {value.type === 'SPECIAL' && (
        <label className="flex items-start gap-3 rounded-md border border-gray-300 bg-white px-3 py-2.5 cursor-pointer hover:bg-gray-50">
          <input type="checkbox" className="mt-0.5 accent-orange-600" checked={!!value.paid}
            onChange={(e) => set('paid', e.target.checked)} />
          <span>
            <span className="block text-sm font-medium text-gray-900">Pay employees even if they do not work</span>
            <span className="block text-xs text-gray-500">For special days the company decides to pay. Leave unchecked for no work, no pay.</span>
          </span>
        </label>
      )}
    </div>
  );
};
const Caret = ({ open, size = 16 }) => (
  <ChevronRight size={size} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
);

const Totals = ({ list }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Chip label="Worked" value={hm(sumOf(list, 'workedMinutes'))} />
    <Chip label="Late" value={hm(sumOf(list, 'lateMinutes'))} tone={sumOf(list, 'lateMinutes') ? 'red' : 'gray'} />
    <Chip label="Undertime" value={hm(sumOf(list, 'undertimeMinutes'))} tone={sumOf(list, 'undertimeMinutes') ? 'red' : 'gray'} />
    <Chip label="Overtime" value={hm(list.reduce((a, x) => a + (x.overtimeMinutes || x.overtimeAvailable || 0), 0))} tone={sumOf(list, 'overtimeMinutes') ? 'green' : 'gray'} />
    <Chip label="Travel" value={hm(list.reduce((s, d) => s + travelOf(d).total, 0))} />
  </div>
);

// paid leave counts as a full 8-hour day of work
const workedOf = (d) => ((d.absent === 'PAID' || d.absent === 'HOLIDAY' || d.absent === 'SPECIAL_PAID') ? 480 : d.halfDay === 'PAID' ? d.workedMinutes + 240 : d.workedMinutes);

const DtrView = ({ emp, from, to, canEdit, canPost, canDelete, onEdit, onChanged, onClose }) => {
  const [days, setDays] = useState(null);
  const [big, setBig] = useState(null);
  const [otDay, setOtDay] = useState(null);
  const [hwDay, setHwDay] = useState(null);
  const [holDay, setHolDay] = useState(null);
  const [holForm, setHolForm] = useState({ name: '', type: 'REGULAR', scope: 'ALL' });
  const [menuDay, setMenuDay] = useState(null);
  const [menuPos, setMenuPos] = useState({});
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const inPortal = (few, el) => (few ? el : createPortal(el, document.body));
  const isFew = (d) => d.locked || [
    d.sheetPath,
    canPost && d.visits.length > 0 && !d.posted,
    canPost && !d.holidayWork && d.holiday && d.visits.length > 0 && !d.incomplete && d.workedMinutes > 0,
    canPost && d.overtimeAvailable > 0 && !d.overtimeMinutes && !d.incomplete,
    canEdit && (d.absent === 'AUTO' || (!d.absent && !d.holiday)),
    canEdit && d.holidayWork !== 'APPROVED' && (isHolAbs(d.absent) || d.holiday),
    canDelete && !d.absent,
    canEdit,
  ].filter(Boolean).length <= 2;
  const [hwType, setHwType] = useState('REGULAR_HOLIDAY');
  const [otType, setOtType] = useState('REGULAR_OT');
  const [openKeys, setOpenKeys] = useState(() => new Set());
  // office = biometric worker: no personnel, signature, photo or location
  const office = !!emp.office || (days || []).some(d => (d.absent && !isHolAbs(d.absent)) || d.visits.some(v => v.source === 'BIO'));

  useEffect(() => {
    api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${from}&to=${to}`)
      .then(r => {
        const list = (r.success ? r.data || [] : []).slice().sort((a, b) => b.date.localeCompare(a.date));
        setDays(list);
        // newest month, newest cutoff and newest date start open
        if (list.length) setOpenKeys(new Set([`m:${list[0].date.slice(0, 7)}`, `c:${cutoffKeyOf(list[0].date)}`, `d:${list[0].date}`]));
      })
      .catch(() => { toast.error('Failed to load'); setDays([]); });
  }, [emp.employeeId, from, to]);

  const flip = (k) => setOpenKeys(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const phToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const postDay = async (d) => {
    if (!window.confirm(`Send late and undertime of ${fmtDay(d.date)} (${emp.employeeName}) to Pay Entries (pending approval)?`)) return;
    try {
      const r = await api.post(`/dtr/post?employeeId=${emp.employeeId}&from=${d.date}&to=${d.date}`);
      setNotice({ title: r.data?.count > 0 ? 'Posted to Pay Entries' : 'Nothing was posted', message: r.data?.message || '', tone: r.data?.count > 0 ? 'success' : 'info', items: r.data?.items });
      const r2 = await api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${from}&to=${to}`);
      if (r2.success) setDays((r2.data || []).slice().sort((p, q) => q.date.localeCompare(p.date)));
      if (onChanged) onChanged();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const reload = async () => {
    const r = await api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${from}&to=${to}`);
    if (r.success) setDays((r.data || []).slice().sort((p, q) => q.date.localeCompare(p.date)));
    if (onChanged) onChanged();
  };
  const markHoliday = async (d, form) => {
    const name = form.name;
    if (name == null) return;
    if (!name.trim()) { toast.error('Enter the holiday name'); return; }
    try {
      await api.post(holidayUrl(d.date, form, emp));
      setHolDay(null);
      toast.success('Holiday saved');
      await reload();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };
  const unmarkHoliday = async (d) => {
    if (!window.confirm(d.holidayOwn ? `Remove the holiday on ${fmtDay(d.date)} for ${emp.employeeName} only?` : `Remove the holiday on ${fmtDay(d.date)} for ALL employees?`)) return;
    try {
      await api.delete(`/dtr/holiday?date=${d.date}${d.holidayOwn ? `&employeeId=${emp.employeeId}` : ''}`);
      toast.success('Holiday removed');
      await reload();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const deleteDay = (d) => setConfirm({
    title: 'Delete day',
    message: `Delete all DTR records of ${fmtDay(d.date)}? This cannot be undone.`,
    confirmLabel: 'Delete', danger: true,
    run: async () => {
      try {
        await api.delete(`/dtr/days?employeeId=${emp.employeeId}&from=${d.date}&to=${d.date}`);
        setConfirm(null);
        await reload();
      } catch (e) {
        setConfirm(null);
        setNotice({ title: 'Cannot delete this day', message: e.message || 'Failed' });
      }
    },
  });

  const postHw = async () => {
    try {
      const r = await api.post(`/dtr/post-holiday-work?employeeId=${emp.employeeId}&date=${hwDay.date}&type=${hwType}`);
      toast.success(r.data?.message || 'Holiday work posted');
      setHwDay(null);
      await reload();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const postOt = async () => {
    try {
      const r = await api.post(`/dtr/post-overtime?employeeId=${emp.employeeId}&date=${otDay.date}&type=${otType}`);
      toast.success(r.data?.message || 'Overtime posted');
      setOtDay(null);
      await reload();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const gridCls = 'grid grid-cols-[20px_calc(27%_-_20px)_9%_9%_10%_10%_11%_minmax(0,1fr)] items-center gap-0 [&>div>span]:block [&>div>span]:text-center [&>div>span]:whitespace-nowrap';

  const renderDay = (d) => {
    const k = `d:${d.date}`;
    const canOpen = !d.absent && d.visits.length > 0;
    const isOpen = canOpen && openKeys.has(k);
    const trav = travelOf(d).total;
    const rows = d.visits.map(v => ({ kind: 'visit', at: v.timeIn, v }));
    if (d.lunchStart) rows.push({ kind: 'lunch', at: d.lunchStart });
    travelOf(d).segments.forEach(s => rows.push({ kind: 'travel', at: s.from, s }));
    rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return (
      <div key={d.date} className="border-b border-gray-200 last:border-b-0 bg-white">
        <div role={canOpen ? 'button' : undefined} tabIndex={canOpen ? 0 : undefined}
          onClick={canOpen ? () => flip(k) : undefined}
          onKeyDown={canOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(k); } } : undefined}
          className={`${gridCls} px-4 py-3 select-none ${canOpen ? 'cursor-pointer hover:bg-gray-50' : ''} ${isOpen ? 'bg-gray-50' : ''}`}>
          <div>{canOpen && <Caret open={isOpen} />}</div>
          <div>
            <div className="font-semibold text-gray-900">{fmtDay(d.date)}</div>
            <div className="flex flex-wrap gap-1 mt-1 empty:hidden">
              {d.halfDay && <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.halfDay === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{halfDayText(d)}</span>}
              {d.absent && <span className={`px-2 py-0.5 rounded text-xs font-medium ${(d.absent === 'PAID' || d.absent === 'HOLIDAY') ? 'bg-green-50 text-green-700' : d.absent === 'PENDING' ? 'bg-amber-50 text-amber-700' : (d.absent === 'SPECIAL' || d.absent === 'SPECIAL_PAID') ? 'bg-sky-50 text-sky-700' : 'bg-red-50 text-red-700'}`}>{absentText(d)}</span>}
              {d.incomplete && <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">Missing time-out</span>}
              {d.posted && <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700">Posted</span>}
              {d.holiday && !d.absent && <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.holidayType === 'SPECIAL' ? 'bg-sky-50 text-sky-700' : 'bg-green-50 text-green-700'}`}>{d.holidayType === 'SPECIAL' ? 'Special day' : 'Regular holiday'}: {d.holiday}</span>}
              {d.holidayOwn && (isHolAbs(d.absent) || d.holiday) && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">This employee only</span>}
              {d.holidayWork && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">Holiday work: {d.holidayWork === 'APPROVED' ? 'Approved' : d.holidayWork === 'PENDING' ? 'Pending approval' : d.holidayWork}</span>}
              {d.locked && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Payroll approved</span>}
            </div>
          </div>
          <div><Chip label="Worked" value={hm(workedOf(d))} /></div>
          <div><Chip label="Late" value={hm(d.lateMinutes)} tone={d.lateMinutes ? 'red' : 'gray'} /></div>
          <div><Chip label="Undertime" value={hm(d.undertimeMinutes)} tone={d.undertimeMinutes ? 'red' : 'gray'} /></div>
          <div><Chip label="Overtime" value={hm(d.overtimeMinutes || d.overtimeAvailable || 0)} tone={d.overtimeMinutes ? 'green' : 'gray'} /></div>
          <div><Chip label="Travel" value={hm(trav)} /></div>
          <div className="relative flex items-center justify-end">
            <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); const up = window.innerHeight - r.bottom < 260; setMenuPos({ right: Math.max(8, window.innerWidth - r.right), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) }); setMenuDay(menuDay === d.date ? null : d.date); }}
              className={`px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white${isFew(d) ? ' hidden' : ''}`}>Actions {menuDay === d.date ? '▴' : '▾'}</button>
            {!isFew(d) && menuDay === d.date && createPortal(<div className="fixed inset-0 z-[200]" onWheel={() => setMenuDay(null)} onClick={(e) => { e.stopPropagation(); setMenuDay(null); }} />, document.body)}
            {(isFew(d) || menuDay === d.date) && inPortal(isFew(d), <div style={isFew(d) ? undefined : menuPos} className={isFew(d) ? 'flex items-center justify-end gap-2 whitespace-nowrap' : 'fixed z-[201] max-h-[70vh] overflow-y-auto flex flex-col items-stretch gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap [&>button]:w-full'} onClick={(e) => e.stopPropagation()}>
            {d.sheetPath && (
              <button className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
                onClick={async (e) => {
                  e.stopPropagation();
                  const r = await api.download(`/dtr/file?path=${encodeURIComponent(d.sheetPath)}`);
                  if (!r.success) return;
                  const url = URL.createObjectURL(r.data);
                  if (/\.xlsx?$/i.test(d.sheetPath)) {
                    const a = document.createElement('a');
                    a.href = url; a.download = d.sheetPath.split('/').pop(); a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  } else window.open(url, '_blank');
                }}><ExternalLink size={12} /> {office ? 'Biometrics proof' : 'Written DTR'}</button>
            )}
            {canPost && !d.locked && d.visits.length > 0 && !d.posted && (
              <button disabled={d.date > phToday || d.incomplete || d.overtimeMinutes > 0}
                title={d.overtimeMinutes > 0 ? 'Already added to Pay Entries' : d.incomplete ? 'Fix the missing time-out first' : d.date > phToday ? 'This date has not started yet' : 'Send this date to Pay Entries'}
                onClick={(e) => { e.stopPropagation(); postDay(d); }}
                className="px-3 py-1 text-xs border border-orange-300 text-orange-700 rounded hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed">Post to Pay Entries</button>
            )}
            {canPost && !d.locked && !d.holidayWork && d.holiday && d.visits.length > 0 && !d.incomplete && d.workedMinutes > 0 && (
              <button title={`Holiday: ${d.holiday}`} onClick={(e) => { e.stopPropagation(); setHwType(d.holidayType === 'SPECIAL' ? 'SPECIAL_HOLIDAY' : 'REGULAR_HOLIDAY'); setHwDay(d); }}
                className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50">Post holiday work</button>
            )}
            {canPost && !d.locked && d.overtimeAvailable > 0 && !d.overtimeMinutes && !d.incomplete && (
              <button onClick={(e) => { e.stopPropagation(); setOtType('REGULAR_OT'); setOtDay(d); }}
                className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50">Post overtime ({hm(d.overtimeAvailable)})</button>
            )}
            {canEdit && !d.locked && (d.absent === 'AUTO' || (!d.absent && !d.holiday)) && <button onClick={(e) => { e.stopPropagation(); setMenuDay(null); setHolForm({ name: '', type: 'REGULAR', scope: 'ALL' }); setHolDay(d); }} className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50">Mark as holiday</button>}
            {canEdit && !d.locked && d.holidayWork !== 'APPROVED' && (isHolAbs(d.absent) || d.holiday) && <button onClick={(e) => { e.stopPropagation(); unmarkHoliday(d); }} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white">Unmark holiday</button>}
            {canDelete && !d.locked && !d.absent && <button onClick={(e) => { e.stopPropagation(); deleteDay(d); }} className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50">Delete day</button>}
            {canEdit && !d.locked && <button onClick={(e) => { e.stopPropagation(); onEdit(d.date); }} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white">Edit day</button>}
          </div>)}
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-gray-200 bg-white px-4 pb-3">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                {office ? (<>
                  <col style={{ width: '28%' }} /><col style={{ width: '24%' }} />
                  <col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
                </>) : (<>
                <col style={{ width: '18%' }} /><col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} /><col style={{ width: '8%' }} /><col style={{ width: '7%' }} />
                <col style={{ width: '9%' }} /><col style={{ width: '11%' }} />
                <col style={{ width: '10%' }} /><col style={{ width: '7%' }} /><col style={{ width: '8%' }} />
              </>)}
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Store / Place</th><th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">In</th><th className="px-3 py-2">Out</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Shift Time</th>
                  {!office && (<><th className="px-3 py-2">Personnel</th><th className="px-3 py-2">Signature</th>
                  <th className="px-3 py-2">Photo</th><th className="px-3 py-2">Location</th></>)}
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-t [&>tr>td]:border-gray-100">
                {rows.map((r, i) => r.kind === 'travel' ? (
                  <tr key={'t' + i} className="bg-sky-50/60">
                    <td className="px-3 py-2 font-medium text-sky-800" colSpan={2}>Travel to {r.s.toPlace || 'next store'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.s.from)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.s.to)}</td>
                    <td className="px-3 py-2 font-medium text-sky-800" colSpan={office ? 2 : 6}>{hm(r.s.mins)}</td>
                  </tr>
                ) : r.kind === 'lunch' ? (
                  <tr key={'l' + i} className="bg-amber-50/50">
                    <td className="px-3 py-2 font-medium text-amber-800" colSpan={2}>Lunch Break</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(d.lunchStart)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(d.lunchEnd)}</td>
                    <td className="px-3 py-2" colSpan={office ? 2 : 6}>{d.lunchEnd ? hm(dur(d.lunchStart, d.lunchEnd)) : ''}</td>
                  </tr>
                ) : (
                  <tr key={r.v.id}>
                    <td className="px-3 py-2 font-medium text-gray-900 truncate" title={r.v.place}>{r.v.place || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 truncate" title={r.v.purpose}>{r.v.purpose || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.v.timeIn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.v.timeOut ? t12(r.v.timeOut) : <span className="text-amber-600">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.v.timeOut ? hm(dur(r.v.timeIn, capOut(r.v))) : ''}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{r.v.timeOut ? hm(inShift(r.v)) : ''}</td>
                    {!office && (<><td className="px-3 py-2 truncate">{r.v.validatedBy || '—'}</td>
                    <td className="px-3 py-2"><DtrImage path={r.v.signaturePath} className="h-10 w-24 object-contain bg-white border border-gray-200 rounded cursor-zoom-in" onClick={setBig} /></td>
                    <td className="px-3 py-2"><DtrImage path={r.v.photoPath} className="h-10 w-10 object-cover rounded cursor-zoom-in" onClick={setBig} /></td>
                    <td className="px-3 py-2">
                      {r.v.latitude != null ? (
                        <a className="inline-flex items-center gap-1 text-orange-600 hover:underline" target="_blank" rel="noreferrer"
                          href={`https://www.google.com/maps?q=${r.v.latitude},${r.v.longitude}`}>
                          <MapPin size={13} /> Map
                        </a>
                      ) : <span className="text-gray-300">{r.v.source === 'MANUAL' ? 'Manual' : '—'}</span>}
                    </td>
                  </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal title={`DTR · ${emp.employeeName}`} subtitle={`${from} to ${to}`} onClose={onClose} maxW="max-w-7xl">
      {!days ? <p className="text-gray-500">Loading...</p> : days.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No records in this period</p>
      ) : (
        <div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className={`${gridCls} px-4 py-3 bg-gray-50 border-b-2 border-gray-200`}>
              <div />
              <div>
                <div className="font-bold text-gray-900">Total</div>
                <div className="text-xs text-gray-500">{dayWord(days.length)} recorded</div>
              </div>
              <div><Chip label="Worked" value={hm(days.reduce((s, d) => s + workedOf(d), 0))} /></div>
              <div><Chip label="Late" value={hm(sumOf(days, 'lateMinutes'))} tone={sumOf(days, 'lateMinutes') ? 'red' : 'gray'} /></div>
              <div><Chip label="Undertime" value={hm(sumOf(days, 'undertimeMinutes'))} tone={sumOf(days, 'undertimeMinutes') ? 'red' : 'gray'} /></div>
              <div><Chip label="Overtime" value={hm(days.reduce((a, x) => a + (x.overtimeMinutes || x.overtimeAvailable || 0), 0))} tone={sumOf(days, 'overtimeMinutes') ? 'green' : 'gray'} /></div>
              <div><Chip label="Travel" value={hm(days.reduce((s, d) => s + travelOf(d).total, 0))} /></div>
              <div />
            </div>
            {days.map(renderDay)}
          </div>
        </div>
      )}
      {holDay && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setHolDay(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold text-gray-900">Mark as holiday</div>
            <p className="text-sm text-gray-600 mt-1 mb-3">{fmtDay(holDay.date)}</p>
            <div className="flex"><HolidayFields emp={emp} value={holForm} onChange={setHolForm} stacked /></div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setHolDay(null)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button onClick={() => markHoliday(holDay, holForm)} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">Save holiday</button>
            </div>
          </div>
        </div>
      )}
      {hwDay && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setHwDay(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold text-gray-900">Post holiday work</div>
            <p className="text-sm text-gray-600 mt-1">{fmtDay(hwDay.date)} · {hwDay.holiday} · {hm(hwDay.workedMinutes)} worked. It goes to Pay Entries as pending. The holiday rate is applied there, so check that the day's pay is not counted twice.</p>
            <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">Holiday type</label>
            <select className={inputCls} value={hwType} onChange={(e) => setHwType(e.target.value)}>
              {hwDay.holidayType !== 'SPECIAL' && <option value="REGULAR_HOLIDAY">Regular holiday</option>}
              {hwDay.holidayType === 'SPECIAL' && <option value="SPECIAL_HOLIDAY">Special non-working day</option>}
              {hwDay.holidayType !== 'SPECIAL' && <option value="REST_DAY_REGULAR_HOLIDAY">Rest day + regular holiday</option>}
            </select>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setHwDay(null)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button onClick={postHw} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">Post holiday work</button>
            </div>
          </div>
        </div>
      )}
      {otDay && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setOtDay(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold text-gray-900">Post overtime</div>
            <p className="text-sm text-gray-600 mt-1">{fmtDay(otDay.date)} · {hm(otDay.overtimeAvailable)} after the shift. It goes to Pay Entries as pending.</p>
            <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">Overtime type</label>
            <select className={inputCls} value={otType} onChange={(e) => setOtType(e.target.value)}>
              {OT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOtDay(null)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button onClick={postOt} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">Post overtime</button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} cancelLabel={confirm.cancelLabel} danger={confirm.danger}
        onConfirm={confirm.run} onCancel={() => setConfirm(null)} />}
      {notice && <NoticeModal title={notice.title} message={notice.message} tone={notice.tone} items={notice.items} onClose={() => setNotice(null)} />}
      {big && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" onClick={() => setBig(null)}>
          <img src={big} alt="" className="max-h-[90vh] max-w-full bg-white rounded" />
        </div>
      )}
    </Modal>
  );
};
// ------------------------------------------------------------------ Upload / edit one day
const EMPTY_ROW = { id: null, timeIn: '', timeOut: '', place: '', purpose: '', validatedBy: '' };

const DayEditor = ({ emp, date: initialDate, onClose, onSaved }) => {
  const [date, setDate] = useState(initialDate || '');
  const [lunch, setLunch] = useState('');
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [holiday, setHoliday] = useState(null);   // name of the holiday on the chosen date, if any
  const [hol, setHol] = useState({ name: '', type: 'REGULAR', scope: 'ALL' });
  const office = !emp.fieldWorker;   // field worker = pin on; everyone else is an office worker

  useEffect(() => {
    if (!date) return;
    api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${date}&to=${date}`).then(r => {
      const d = r.success ? (r.data || [])[0] : null;
      setHoliday(!d ? null : isHolAbs(d.absent)
        ? { name: d.absentLeave || 'Holiday', type: (d.absent === 'SPECIAL' || d.absent === 'SPECIAL_PAID') ? 'SPECIAL' : 'REGULAR', paid: d.absent === 'SPECIAL_PAID', own: !!d.holidayOwn }
        : d.holiday ? { name: d.holiday, type: d.holidayType || 'REGULAR', own: !!d.holidayOwn } : null);
      setLunch(d && d.lunchStart ? hhmm(d.lunchStart) : '');
      setRows(d && d.visits.length ? d.visits.map(v => ({
        id: v.id, timeIn: hhmm(v.timeIn), timeOut: hhmm(v.timeOut),
        place: v.place || '', purpose: v.purpose || '', validatedBy: v.validatedBy || '',
      })) : [{ ...EMPTY_ROW }]);
    }).catch(() => { });
  }, [date, emp.employeeId]);

  const setRow = (i, k, v) => setRows(p => p.map((r, x) => (x === i ? { ...r, [k]: v } : r)));

  const saveHoliday = async () => {
    if (!date) { toast.error('Pick a date'); return; }
    if (!hol.name.trim()) { toast.error('Enter the holiday name'); return; }
    try {
      await api.post(holidayUrl(date, hol, emp));
      toast.success('Holiday saved');
      onSaved();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };
  const removeHoliday = async () => {
    if (!window.confirm(holiday && holiday.own ? `Remove the holiday on ${date} for ${emp.employeeName} only?` : `Remove the holiday on ${date} for ALL employees?`)) return;
    try {
      await api.delete(`/dtr/holiday?date=${date}${holiday && holiday.own ? `&employeeId=${emp.employeeId}` : ''}`);
      toast.success('Holiday removed');
      onSaved();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const save = async () => {
    if (!date) { toast.error('Pick a date'); return; }
    const visits = rows.filter(r => r.timeIn);
    setSaving(true);
    try {
      await api.post('/dtr/day/save', {
        employeeId: emp.employeeId, date, lunchStart: lunch || null, office,
        visits: visits.map(r => ({ ...r, timeOut: r.timeOut || null })),
      });
      if (file) {
        const fd = new FormData();
        fd.append('employeeId', emp.employeeId);
        fd.append('date', date);
        fd.append('file', file);
        await api.upload('/dtr/attachment', fd);
      }
      toast.success('Saved');
      onSaved();
    } catch (e) { setNotice({ title: 'Cannot save this day', message: e.message || 'Failed to save' }); } finally { setSaving(false); }
  };

  return (
    <Modal title={`${office ? 'Edit DTR' : 'Upload / Edit DTR'} · ${emp.employeeName}`} subtitle={office ? 'Office worker: edit the time in and time out, and attach the biometrics as proof' : 'Use this for the handwritten DTR of stores with no signal'} onClose={onClose} maxW="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Field label="Date" required>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {!office && (<><Field label="Lunch break started (optional)">
          <input type="time" className={inputCls} value={lunch} onChange={(e) => setLunch(e.target.value)} />
        </Field>
        </>)}
        <Field label={office ? 'Proof of biometrics (photo / PDF)' : 'Scan / photo of written DTR'}>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Field>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className={`grid grid-cols-2 gap-2 items-center ${office ? 'md:grid-cols-[150px_150px_max-content]' : 'md:grid-cols-[150px_150px_1fr_1fr_1fr_auto]'}`}>
            <input type="time" className={inputCls} value={r.timeIn} onChange={(e) => setRow(i, 'timeIn', e.target.value)} title="Time in" />
            <input type="time" className={inputCls} value={r.timeOut} onChange={(e) => setRow(i, 'timeOut', e.target.value)} title="Time out" />
            {!office && (<><input className={inputCls} placeholder="Store / place" value={r.place} onChange={(e) => setRow(i, 'place', e.target.value)} />
            <input className={inputCls} placeholder="Purpose" value={r.purpose} onChange={(e) => setRow(i, 'purpose', e.target.value)} />
            <input className={inputCls} placeholder="Validated by" value={r.validatedBy} onChange={(e) => setRow(i, 'validatedBy', e.target.value)} /></>)}
            <button type="button" onClick={() => setRows(p => p.filter((_, x) => x !== i))} className="p-2 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows(p => [...p, { ...EMPTY_ROW }])}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-600"><Plus size={14} /> Add visit</button>

      <div className="mt-6 border border-gray-200 rounded-lg bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="text-sm font-semibold text-gray-900">Holiday</div>
          <p className="text-xs text-gray-500 mt-0.5">Apply to all employees, or to one employee only (e.g. a provincial holiday).</p>
        </div>
        {holiday ? (
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${holiday.type === 'SPECIAL' ? 'bg-sky-50 text-sky-700' : 'bg-green-50 text-green-700'}`}>{holiday.type === 'SPECIAL' ? (holiday.paid ? 'Special day - paid' : 'Special non-working day') : 'Regular holiday'}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{holiday.name}</div>
                <div className="text-xs text-gray-500 truncate">{holiday.own ? `Only ${emp.employeeName}` : 'All employees'}</div>
              </div>
            </div>
            <button type="button" onClick={removeHoliday}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 whitespace-nowrap">Remove holiday</button>
          </div>
        ) : (
          <>
            <div className="p-4">
              <HolidayFields emp={emp} value={hol} onChange={setHol} />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500 truncate">
                {hol.type === 'SPECIAL' ? (hol.paid ? 'Special day (paid)' : 'Special non-working day') : 'Regular holiday'} - {hol.scope === 'EMP' ? emp.employeeName : 'All employees'}
              </span>
              <button type="button" onClick={saveHoliday} disabled={!hol.name.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">Mark as holiday</button>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {notice && <NoticeModal title={notice.title} message={notice.message} tone={notice.tone} items={notice.items} onClose={() => setNotice(null)} />}
    </Modal>
  );
};

// ------------------------------------------------------------------ Page
const DtrInner = () => {
  const { user } = useAuth();
  const canEdit = ui(user, 'dtr_ui', 'dtr_edit');
  const canDelete = ui(user, 'dtr_ui', 'dtr_delete');
  const canPost = ui(user, 'dtr_ui', 'dtr_post');
  const canField = ui(user, 'dtr_ui', 'dtr_field');

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [cutoff, setCutoff] = useState(now.getDate() <= 15 ? 'FIRST' : 'SECOND');
  const [name, setName] = useState('');
  const [onlyField, setOnlyField] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewEmp, setViewEmp] = useState(null);
  const [editor, setEditor] = useState(null);
  const [showBio, setShowBio] = useState(false);
  const [fieldConfirm, setFieldConfirm] = useState(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { from, to } = rangeFor(month, year, cutoff);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/dtr/summary?from=${from}&to=${to}`);
      setRows(r.success ? r.data || [] : []);
    } catch { toast.error('Failed to load DTR'); } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const shown = rows.filter(r => (!onlyField || r.fieldWorker)
    && (!name || r.employeeName.toLowerCase().includes(name.toLowerCase())))
    .sort((p, q) => Number(!!q.fieldWorker) - Number(!!p.fieldWorker));

  const toggleField = async () => {
    const r = fieldConfirm;
    if (!r) return;
    setFieldSaving(true);
    try {
      await api.patch(`/dtr/field-worker/${r.employeeId}?value=${!r.fieldWorker}`);
      toast.success(r.fieldWorker ? 'Removed from field workers' : 'Marked as field worker');
      setFieldConfirm(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setFieldSaving(false);
    }
  };
  const purge = async (r) => {
    try {
      await api.delete(`/dtr/days?employeeId=${r.employeeId}&from=${from}&to=${to}`);
      setConfirm(null);
      setViewEmp(null);
      load();
    } catch (e) {
      setConfirm(null);
      setNotice({ title: 'Cannot delete', message: e.message || 'Failed' });
    }
  };
  const remove = (r) => setConfirm({
    title: 'Delete records',
    message: `Delete ALL DTR records of ${r.employeeName} from ${from} to ${to}? This cannot be undone.`,
    confirmLabel: 'Delete', danger: true,
    run: () => purge(r),
  });

  const purgeAll = async (people) => {
    const failed = [];
    for (const p of people) {
      try { await api.delete(`/dtr/days?employeeId=${p.employeeId}&from=${from}&to=${to}`); }
      catch (e) { failed.push(`${p.employeeName}: ${e.message || 'Failed'}`); }
    }
    setConfirm(null);
    setViewEmp(null);
    load();
    if (failed.length) {
      setNotice({
        title: 'Some records could not be deleted',
        message: `${people.length - failed.length} of ${people.length} employee(s) deleted. Not deleted:\n\n${failed.join('\n\n')}`,
      });
    }
  };

  const ascii = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ');
  const exportAll = async () => {
    try {
      const people = shown.slice().sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      const loaded = await Promise.all(people.map(async (p) => {
        const res = await api.get(`/dtr/days?employeeId=${p.employeeId}&from=${from}&to=${to}`);
        const list = (res.success ? res.data || [] : []).slice().sort((a, b) => a.date.localeCompare(b.date));
        return { p, list };
      }));
      const items = loaded.filter(({ list }) => list.some((d) => d.visits.length > 0 || (d.absent && !isHolAbs(d.absent))));
      if (!items.length) { setNotice({ title: 'Nothing to export', message: 'There are no DTR records for this cutoff.' }); return; }

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const generated = ascii(`Generated ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text('Daily Time Record - All Employees', 40, 40);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.text(ascii(`Cutoff: ${fmtDay(from)} to ${fmtDay(to)}`), 40, 60);
      doc.setFontSize(9);
      doc.text(generated, W - 40, 40, { align: 'right' });

      autoTable(doc, {
        startY: 80,
        head: [['Employee', 'Basic', 'Late', 'Undertime', 'Overtime', 'Unpaid leave', 'DTR hours', 'Total manhour']],
        body: items.map(({ p }) => [p.employeeName, p.basicHours, hm(p.lateMinutes), hm(p.undertimeMinutes), hm(p.overtimeMinutes),
          p.unpaidLeaveHours, (p.dtrHours ?? 0).toFixed(2), p.totalManhour.toFixed(2)].map((x) => ascii(String(x)))),
        styles: { fontSize: 9 }, headStyles: { fillColor: [234, 88, 12] },
        columnStyles: { 0: { cellWidth: 220 } },
      });

      items.forEach(({ p, list }) => {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(ascii(p.employeeName), 40, 40);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(ascii(`Cutoff: ${fmtDay(from)} to ${fmtDay(to)}`), 40, 58);
        doc.setFontSize(9);
        doc.text(generated, W - 40, 40, { align: 'right' });

        const body = list.map((d) => {
          const places = [...new Set((d.visits || []).map((v) => v.place).filter(Boolean))].join(', ');
          const tags = [];
          if (d.absent) tags.push(absentText(d));
          if (d.halfDay) tags.push(halfDayText(d));
          if (d.holiday && !d.absent) tags.push(`${d.holidayType === 'SPECIAL' ? 'Special day' : 'Regular holiday'}: ${d.holiday}`);
          if (d.incomplete) tags.push('Missing time-out');
          if (d.posted) tags.push('Posted to Pay Entries');
          return [
            fmtDay(d.date), places || '-', d.firstIn ? t12(d.firstIn) : '-', d.lastOut ? t12(d.lastOut) : '-',
            hm(workedOf(d)), hm(d.lateMinutes), hm(d.undertimeMinutes), hm(d.overtimeMinutes || d.overtimeAvailable || 0), tags.join('; '),
          ].map(ascii);
        });
        const foot = [[
          'Total', '', '', '',
          hm(list.reduce((s, d) => s + workedOf(d), 0)), hm(sumOf(list, 'lateMinutes')), hm(sumOf(list, 'undertimeMinutes')),
          hm(list.reduce((a, x) => a + (x.overtimeMinutes || x.overtimeAvailable || 0), 0)), `${list.length} day(s)`,
        ]];
        autoTable(doc, {
          startY: 72,
          head: [['Date', 'Store / Place', 'In', 'Out', 'Worked', 'Late', 'Undertime', 'Overtime', 'Status']],
          body, foot,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [55, 65, 81] }, footStyles: { fillColor: [243, 244, 246], textColor: 20 },
          columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 150 }, 8: { cellWidth: 'auto' } },
        });
      });

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(8);
        doc.text(`Page ${i} of ${pages}`, W - 40, H - 20, { align: 'right' });
      }
      doc.save(`DTR_All_Employees_${from}_to_${to}.pdf`);

      setConfirm({
        title: 'PDF downloaded',
        message: `The DTR of ${items.length} employee(s) for ${from} to ${to} was saved as one PDF.\n\nDo you want to delete these DTR records now? Employees with days already posted to Pay Entries cannot be deleted, and they will be listed.`,
        confirmLabel: 'Delete records', cancelLabel: 'Keep records', danger: true,
        run: () => purgeAll(items.map((x) => x.p)),
      });
    } catch (e) {
      setNotice({ title: 'Export failed', message: e.message || 'Could not create the PDF' });
    }
  };
  const postAll = async () => {
    if (!window.confirm(`Send late and undertime of ${from} to ${to} to Pay Entries (pending approval)? Days already posted are skipped.`)) return;
    try {
      const r = await api.post(`/dtr/post?from=${from}&to=${to}`);
      setNotice({ title: r.data?.count > 0 ? 'Posted to Pay Entries' : 'Nothing was posted', message: r.data?.message || '', tone: r.data?.count > 0 ? 'success' : 'info', items: r.data?.items });
      load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <PageShell title="DTR" subtitle="Daily time record of field workers and staff">
      <ToastModalHost />
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[150px]"><label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
            <SearchableSelect typeable={false} value={month} options={MONTHS} onChange={(v) => setMonth(v || month)} /></div>
          <div className="min-w-[110px]"><label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <SearchableSelect typeable={false} value={year} options={YEARS} onChange={(v) => setYear(v || year)} /></div>
          <div className="min-w-[170px]"><label className="block text-xs font-medium text-gray-700 mb-1">Cutoff</label>
            <SearchableSelect typeable={false} value={cutoff} options={CUTOFFS} onChange={(v) => setCutoff(v || 'ALL')} /></div>
          <div className="flex-1 min-w-[200px]"><label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
            <SearchableSelect allLabel="All employees" allowCustom placeholder="All employees" searchPlaceholder="Search employee..."
              value={name} options={rows.map(r => ({ value: r.employeeName, label: r.employeeName }))} onChange={(v) => setName(v || '')} /></div>
          {canEdit && (<button onClick={() => setShowBio(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-100"><Upload size={16} /> Import Biometrics</button>)}
          <button onClick={exportAll} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-100"><Download size={16} /> Export PDF</button>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer">
            <input type="checkbox" className="accent-orange-600" checked={onlyField} onChange={(e) => setOnlyField(e.target.checked)} /> Field workers only
          </label>
          {canPost && (
            <button onClick={postAll} className="ml-auto flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700">
              <Send size={16} /> Post to Pay Entries
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-center">Basic</th>
                <th className="px-4 py-3 text-center">Late</th>
                <th className="px-4 py-3 text-center">Undertime</th>
                <th className="px-4 py-3 text-center">Overtime</th>
                <th className="px-4 py-3 text-center">Unpaid Leave</th>
                <th className="px-4 py-3 text-center">DTR Hours</th>
                <th className="px-4 py-3 text-center">Total Manhour</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-t [&>tr>td]:border-gray-200">
              {loading ? <tr><td colSpan="9" className="px-5 py-10 text-center text-gray-500">Loading...</td></tr>
                : shown.length === 0 ? <tr><td colSpan="9" className="px-5 py-10 text-center text-gray-500">No employees</td></tr>
                  : shown.map(r => {
                    const c = r.fieldWorker ? 'text-blue-600' : 'text-gray-900';
                    return (
                      <tr key={r.employeeId} className={c}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 font-medium">
                            <EmployeeAvatar name={r.employeeName} photoUrl={r.photoUrl} />
                            <div>
                              {r.employeeName}
                              <div className="text-xs font-normal text-gray-500">
                                {r.daysRecorded} day(s) recorded
                                {r.incompleteDays > 0 && <span className="text-amber-600"> · {r.incompleteDays} missing time-out</span>}
                                {r.noLeaveDays > 0 && <span className="text-red-600"> · {r.noLeaveDays} absent, no leave filed</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{r.basicHours}</td>
                        <td className="px-4 py-3 text-center">{hm(r.lateMinutes)}</td>
                        <td className="px-4 py-3 text-center">{hm(r.undertimeMinutes)}</td>
                        <td className="px-4 py-3 text-center">{hm(r.overtimeMinutes)}</td>
                        <td className="px-4 py-3 text-center">{r.unpaidLeaveHours}</td>
                        <td className="px-4 py-3 text-center">{(r.dtrHours ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-semibold">{r.totalManhour.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {canEdit && <button title="Upload / manual entry" onClick={() => setEditor({ emp: r, date: '' })} className="p-2 text-teal-600 hover:bg-teal-50 rounded"><Upload size={17} /></button>}
                            <button title="View visits & signatures" onClick={() => setViewEmp(r)} className="p-2 text-gray-700 hover:bg-gray-100 rounded"><Eye size={17} /></button>
                            {canField && <button title={r.fieldWorker ? 'Field worker (click to unmark)' : 'Mark as field worker'} onClick={() => setFieldConfirm(r)}
                              className={`p-2 rounded ${r.fieldWorker ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}><MapPin size={17} /></button>}
                            {canDelete && <button title="Delete records in this period" onClick={() => remove(r)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={17} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Basic = scheduled hours (weekdays up to today). Total Manhour = Basic − Late − Undertime + Overtime − Unpaid Leave. DTR Hours = hours really worked in the app records (first Time in to last Time out, minus lunch). Blue rows are field workers.
      </p>

      {fieldConfirm && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !fieldSaving && setFieldConfirm(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold text-gray-900">
              {fieldConfirm.fieldWorker ? 'Remove field worker status' : 'Mark as field worker'}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {fieldConfirm.fieldWorker
                ? <>Remove <b>{fieldConfirm.employeeName}</b> from field workers? They will be treated as office staff.</>
                : <>Mark <b>{fieldConfirm.employeeName}</b> as a field worker?</>}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFieldConfirm(null)} disabled={fieldSaving}
                className="px-4 py-2 border border-gray-300 rounded text-sm disabled:opacity-50">Cancel</button>
              <button onClick={toggleField} disabled={fieldSaving}
                className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
                {fieldSaving ? 'Saving...' : fieldConfirm.fieldWorker ? 'Yes, remove' : 'Yes, mark'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} cancelLabel={confirm.cancelLabel} danger={confirm.danger}
        onConfirm={confirm.run} onCancel={() => setConfirm(null)} />}
      {notice && <NoticeModal title={notice.title} message={notice.message} tone={notice.tone} items={notice.items} onClose={() => setNotice(null)} />}
      {showBio && <BiometricImport onClose={() => setShowBio(false)} onDone={() => { setShowBio(false); load(); }} />}
      {viewEmp && <DtrView emp={viewEmp} from={from} to={to} canEdit={canEdit} canPost={canPost} canDelete={canDelete} onChanged={load}
        onEdit={(d) => setEditor({ emp: viewEmp, date: d })} onClose={() => setViewEmp(null)} />}
      {editor && <DayEditor emp={editor.emp} date={editor.date} onClose={() => setEditor(null)}
        onSaved={() => { setEditor(null); setViewEmp(null); load(); }} />}
    </PageShell>
  );
};

const DtrManagement = () => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'pages_ui', 'page_dtr')) return <Navigate to="/welcome" replace />;
  return <DtrInner />;
};

export default DtrManagement;