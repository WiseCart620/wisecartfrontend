import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Upload, Trash2, MapPin, Send, Plus, X, ExternalLink, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
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
  const name = d.absentLeave ? ` (${d.absentLeave})` : '';
  if (d.absent === 'PAID') return `On leave - Paid${name}`;
  if (d.absent === 'UNPAID') return `On leave - Unpaid${name}`;
  if (d.absent === 'PENDING') return `Absent - leave${name} pending approval`;
  return 'Absent - no leave filed (automatic unpaid)';
};
const Caret = ({ open, size = 16 }) => (
  <ChevronRight size={size} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
);

const Totals = ({ list }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Chip label="Worked" value={hm(sumOf(list, 'workedMinutes'))} />
    <Chip label="Late" value={hm(sumOf(list, 'lateMinutes'))} tone={sumOf(list, 'lateMinutes') ? 'red' : 'gray'} />
    <Chip label="Undertime" value={hm(sumOf(list, 'undertimeMinutes'))} tone={sumOf(list, 'undertimeMinutes') ? 'red' : 'gray'} />
    <Chip label="Overtime" value={hm(sumOf(list, 'overtimeMinutes'))} tone={sumOf(list, 'overtimeMinutes') ? 'green' : 'gray'} />
    <Chip label="Travel" value={hm(list.reduce((s, d) => s + travelOf(d).total, 0))} />
  </div>
);

// paid leave counts as a full 8-hour day of work
const workedOf = (d) => (d.absent === 'PAID' ? 480 : d.halfDay === 'PAID' ? d.workedMinutes + 240 : d.workedMinutes);

const DtrView = ({ emp, from, to, canEdit, canPost, onEdit, onChanged, onClose }) => {
  const [days, setDays] = useState(null);
  const [big, setBig] = useState(null);
  const [openKeys, setOpenKeys] = useState(() => new Set());

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
      toast.success(r.data?.message || 'Posted');
      const r2 = await api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${from}&to=${to}`);
      if (r2.success) setDays((r2.data || []).slice().sort((p, q) => q.date.localeCompare(p.date)));
      if (onChanged) onChanged();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const gridCls = 'grid grid-cols-[24px_minmax(240px,1fr)_repeat(5,92px)_280px] items-center gap-2 [&>div>span]:block [&>div>span]:text-center [&>div>span]:whitespace-nowrap';

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
              {d.absent && <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.absent === 'PAID' ? 'bg-green-50 text-green-700' : d.absent === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{absentText(d)}</span>}
              {d.incomplete && <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">Missing time-out</span>}
              {d.posted && <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700">Posted</span>}
            </div>
          </div>
          <div><Chip label="Worked" value={hm(workedOf(d))} /></div>
          <div><Chip label="Late" value={hm(d.lateMinutes)} tone={d.lateMinutes ? 'red' : 'gray'} /></div>
          <div><Chip label="Undertime" value={hm(d.undertimeMinutes)} tone={d.undertimeMinutes ? 'red' : 'gray'} /></div>
          <div><Chip label="Overtime" value={hm(d.overtimeMinutes)} tone={d.overtimeMinutes ? 'green' : 'gray'} /></div>
          <div><Chip label="Travel" value={hm(trav)} /></div>
          <div className="flex items-center justify-end gap-2 flex-nowrap whitespace-nowrap">
            {d.sheetPath && (
              <button className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
                onClick={async (e) => {
                  e.stopPropagation();
                  const r = await api.download(`/dtr/file?path=${encodeURIComponent(d.sheetPath)}`);
                  if (r.success) window.open(URL.createObjectURL(r.data), '_blank');
                }}><ExternalLink size={12} /> Written DTR</button>
            )}
            {canPost && d.visits.length > 0 && !d.posted && (
              <button disabled={d.date > phToday || d.incomplete}
                title={d.incomplete ? 'Fix the missing time-out first' : d.date > phToday ? 'This date has not started yet' : 'Send this date to Pay Entries'}
                onClick={(e) => { e.stopPropagation(); postDay(d); }}
                className="px-3 py-1 text-xs border border-orange-300 text-orange-700 rounded hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed">Post to Pay Entries</button>
            )}
            {canEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(d.date); }} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white">Edit day</button>}
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-gray-200 bg-white px-4 pb-3 overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: '20%' }} /><col style={{ width: '17%' }} />
                <col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} /><col style={{ width: '11%' }} />
                <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Store / Place</th><th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">In</th><th className="px-3 py-2">Out</th><th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Personnel</th><th className="px-3 py-2">Signature</th>
                  <th className="px-3 py-2">Photo</th><th className="px-3 py-2">Location</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-t [&>tr>td]:border-gray-100">
                {rows.map((r, i) => r.kind === 'travel' ? (
                  <tr key={'t' + i} className="bg-sky-50/60">
                    <td className="px-3 py-2 font-medium text-sky-800" colSpan={2}>Travel to {r.s.toPlace || 'next store'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.s.from)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.s.to)}</td>
                    <td className="px-3 py-2 font-medium text-sky-800" colSpan={5}>{hm(r.s.mins)}</td>
                  </tr>
                ) : r.kind === 'lunch' ? (
                  <tr key={'l' + i} className="bg-amber-50/50">
                    <td className="px-3 py-2 font-medium text-amber-800" colSpan={2}>Lunch Break</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(d.lunchStart)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(d.lunchEnd)}</td>
                    <td className="px-3 py-2" colSpan={5}>{d.lunchEnd ? hm(dur(d.lunchStart, d.lunchEnd)) : ''}</td>
                  </tr>
                ) : (
                  <tr key={r.v.id}>
                    <td className="px-3 py-2 font-medium text-gray-900 truncate" title={r.v.place}>{r.v.place || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 truncate" title={r.v.purpose}>{r.v.purpose || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{t12(r.v.timeIn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.v.timeOut ? t12(r.v.timeOut) : <span className="text-amber-600">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.v.timeOut ? hm(dur(r.v.timeIn, r.v.timeOut)) : ''}</td>
                    <td className="px-3 py-2 truncate">{r.v.validatedBy || '—'}</td>
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
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] border border-gray-200 rounded-xl overflow-hidden">
            <div className={`${gridCls} px-4 py-3 bg-gray-50 border-b-2 border-gray-200`}>
              <div />
              <div>
                <div className="font-bold text-gray-900">Total</div>
                <div className="text-xs text-gray-500">{dayWord(days.length)} recorded</div>
              </div>
              <div><Chip label="Worked" value={hm(days.reduce((s, d) => s + workedOf(d), 0))} /></div>
              <div><Chip label="Late" value={hm(sumOf(days, 'lateMinutes'))} tone={sumOf(days, 'lateMinutes') ? 'red' : 'gray'} /></div>
              <div><Chip label="Undertime" value={hm(sumOf(days, 'undertimeMinutes'))} tone={sumOf(days, 'undertimeMinutes') ? 'red' : 'gray'} /></div>
              <div><Chip label="Overtime" value={hm(sumOf(days, 'overtimeMinutes'))} tone={sumOf(days, 'overtimeMinutes') ? 'green' : 'gray'} /></div>
              <div><Chip label="Travel" value={hm(days.reduce((s, d) => s + travelOf(d).total, 0))} /></div>
              <div />
            </div>
            {days.map(renderDay)}
          </div>
        </div>
      )}
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

  useEffect(() => {
    if (!date) return;
    api.get(`/dtr/days?employeeId=${emp.employeeId}&from=${date}&to=${date}`).then(r => {
      const d = r.success ? (r.data || [])[0] : null;
      setLunch(d && d.lunchStart ? hhmm(d.lunchStart) : '');
      setRows(d && d.visits.length ? d.visits.map(v => ({
        id: v.id, timeIn: hhmm(v.timeIn), timeOut: hhmm(v.timeOut),
        place: v.place || '', purpose: v.purpose || '', validatedBy: v.validatedBy || '',
      })) : [{ ...EMPTY_ROW }]);
    }).catch(() => { });
  }, [date, emp.employeeId]);

  const setRow = (i, k, v) => setRows(p => p.map((r, x) => (x === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    if (!date) { toast.error('Pick a date'); return; }
    const visits = rows.filter(r => r.timeIn);
    setSaving(true);
    try {
      await api.post('/dtr/day/save', {
        employeeId: emp.employeeId, date, lunchStart: lunch || null,
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
    } catch (e) { toast.error(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Upload / Edit DTR · ${emp.employeeName}`} subtitle="Use this for the handwritten DTR of stores with no signal" onClose={onClose} maxW="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Field label="Date" required>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Lunch break started (optional)">
          <input type="time" className={inputCls} value={lunch} onChange={(e) => setLunch(e.target.value)} />
        </Field>
        <Field label="Scan / photo of written DTR">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Field>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-[110px_110px_1fr_1fr_1fr_auto] gap-2 items-center">
            <input type="time" className={inputCls} value={r.timeIn} onChange={(e) => setRow(i, 'timeIn', e.target.value)} title="Time in" />
            <input type="time" className={inputCls} value={r.timeOut} onChange={(e) => setRow(i, 'timeOut', e.target.value)} title="Time out" />
            <input className={inputCls} placeholder="Store / place" value={r.place} onChange={(e) => setRow(i, 'place', e.target.value)} />
            <input className={inputCls} placeholder="Purpose" value={r.purpose} onChange={(e) => setRow(i, 'purpose', e.target.value)} />
            <input className={inputCls} placeholder="Validated by" value={r.validatedBy} onChange={(e) => setRow(i, 'validatedBy', e.target.value)} />
            <button type="button" onClick={() => setRows(p => p.filter((_, x) => x !== i))} className="p-2 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows(p => [...p, { ...EMPTY_ROW }])}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-600"><Plus size={14} /> Add visit</button>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
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

  const toggleField = async (r) => {
    try { await api.patch(`/dtr/field-worker/${r.employeeId}?value=${!r.fieldWorker}`); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete ALL DTR records of ${r.employeeName} from ${from} to ${to}?`)) return;
    try { await api.delete(`/dtr/days?employeeId=${r.employeeId}&from=${from}&to=${to}`); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };
  const postAll = async () => {
    if (!window.confirm(`Send late and undertime of ${from} to ${to} to Pay Entries (pending approval)? Days already posted are skipped.`)) return;
    try {
      const r = await api.post(`/dtr/post?from=${from}&to=${to}`);
      toast.success(r.data?.message || 'Posted');
      load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <PageShell title="DTR" subtitle="Daily time record of field workers and staff">
      <Toaster position="top-right" />
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
                            {canField && <button title={r.fieldWorker ? 'Field worker (click to unmark)' : 'Mark as field worker'} onClick={() => toggleField(r)}
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

      {showBio && <BiometricImport onClose={() => setShowBio(false)} onDone={() => { setShowBio(false); load(); }} />}
      {viewEmp && <DtrView emp={viewEmp} from={from} to={to} canEdit={canEdit} canPost={canPost} onChanged={load}
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