import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X as XIcon, Ban, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, today, Field, Modal } from './Shared';
import SearchableSelect from './SearchableSelect';
import EmployeeAvatar from './EmployeeAvatar';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const STATUS = {
  PENDING: { label: 'Pending', pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved', pill: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
  REJECTED: { label: 'Rejected', pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', pill: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' },
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  ...Object.entries(STATUS).map(([key, v]) => ({ key, label: v.label })),
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-03-16" -> { y: 2026, m: 'Mar', d: 16 } (no timezone shifts)
const parts = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return y ? { y, m: MONTHS[m - 1], d } : null;
};

const fmtDate = (s) => {
  const p = parts(s);
  return p ? `${p.m} ${p.d}, ${p.y}` : '—';
};

const fmtRange = (from, to) => {
  const a = parts(from);
  const b = parts(to);
  if (!a) return '—';
  if (!b || from === to) return `${a.m} ${a.d}, ${a.y}`;
  if (a.y === b.y && a.m === b.m) return `${a.m} ${a.d} – ${b.d}, ${a.y}`;
  if (a.y === b.y) return `${a.m} ${a.d} – ${b.m} ${b.d}, ${a.y}`;
  return `${a.m} ${a.d}, ${a.y} – ${b.m} ${b.d}, ${b.y}`;
};

const weekdayList = (from, to) => {
  if (!from || !to || to < from) return [];
  const out = [];
  for (let d = new Date(from + 'T00:00:00'); d <= new Date(to + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) out.push(d.getFullYear() * 100 + d.getMonth());
  }
  return out;
};

const countsDays = (t) => t.status !== 'REJECTED' && t.status !== 'CANCELLED';

const EMPTY = { employeeId: '', dateFrom: today(), dateTo: today(), reason: '', dateFiled: today(), halfDay: false };

const StatusPill = ({ status }) => {
  const s = STATUS[status];
  if (!s) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const LeaveRequestsTab = ({ employees, leaveTypes, canCreate, canEdit, canDelete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [granted, setGranted] = useState([]);
  const [selIds, setSelIds] = useState([]);
  const [alloc, setAlloc] = useState({});
  const [expanded, setExpanded] = useState(() => new Set());
  const [tabByEmp, setTabByEmp] = useState({}); // employeeId -> selected leave type ('' = all)

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leave-transactions');
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // everything except the status tab, so the tab counts stay meaningful
  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(t => {
      if (q && !(t.employeeName || '').toLowerCase().includes(q)) return false;
      if (fFrom && String(t.dateTo) < fFrom) return false;
      if (fTo && String(t.dateFrom) > fTo) return false;
      return true;
    });
  }, [items, search, fFrom, fTo]);

  const counts = useMemo(() => {
    const c = { '': base.length, PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    base.forEach(t => { if (c[t.status] !== undefined) c[t.status] += 1; });
    return c;
  }, [base]);

  // one group per employee; each group knows which leave types it has
  const groups = useMemo(() => {
    const list = statusFilter ? base.filter(t => t.status === statusFilter) : base;
    const map = new Map();
    list.forEach(t => {
      if (!map.has(t.employeeId)) map.set(t.employeeId, { id: t.employeeId, name: t.employeeName, rows: [] });
      map.get(t.employeeId).rows.push(t);
    });
    return Array.from(map.values())
      .map(g => {
        g.rows.sort((x, y) => String(y.dateFrom).localeCompare(String(x.dateFrom)));
        const types = new Map();
        g.rows.forEach(t => {
          const k = t.leaveTypeName || 'Other';
          if (!types.has(k)) types.set(k, { name: k, count: 0 });
          types.get(k).count += 1;
        });
        return {
          ...g,
          types: Array.from(types.values()).sort((x, y) => x.name.localeCompare(y.name)),
          days: g.rows.reduce((n, t) => (countsDays(t) ? n + (Number(t.daysUsed) || 0) : n), 0),
          pending: g.rows.filter(t => t.status === 'PENDING').length,
        };
      })
      .sort((x, y) => (x.name || '').localeCompare(y.name || ''));
  }, [base, statusFilter]);

  const { pageItems, paginationProps, totalItems } =
    usePagination(groups, `${search}|${statusFilter}|${fFrom}|${fTo}`);

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const photoOf = Object.fromEntries((employees || []).map(e => [e.employeeId, e.photoUrl]));

  // ---- file-leave form helpers
  const formYear = (form.dateFrom || '').slice(0, 4);
  useEffect(() => {
    if (!show || !form.employeeId) { setGranted([]); return; }
    (async () => {
      try {
        const res = await api.get(`/leave-balances?year=${formYear || new Date().getFullYear()}&employeeId=${form.employeeId}`);
        setGranted(res.success ? res.data || [] : []);
      } catch (e) { setGranted([]); }
    })();
  }, [show, form.employeeId, formYear]);

  const leaveOptions = useMemo(() => {
    if (!form.employeeId) return [];
    const typeOf = Object.fromEntries((leaveTypes || []).map(t => [t.leaveTypeId, t]));
    const paid = granted
      .filter(b => typeOf[b.leaveTypeId]?.paid !== false)
      .map(b => ({
        id: b.leaveTypeId, name: b.leaveTypeName, paid: true,
        balance: Number(b.closingBalance), max: typeOf[b.leaveTypeId]?.maxPerMonth ?? null
      }));
    const unpaid = (leaveTypes || []).filter(t => t.paid === false)
      .map(t => ({ id: t.leaveTypeId, name: t.leaveTypeName, paid: false, balance: null, max: null }));
    return [...paid, ...unpaid].sort((a, b) =>
      a.name === 'Vacation Leave' ? -1 : b.name === 'Vacation Leave' ? 1 : a.name.localeCompare(b.name));
  }, [granted, leaveTypes, form.employeeId]);

  const dayList = useMemo(() => weekdayList(form.dateFrom, form.dateTo), [form.dateFrom, form.dateTo]);
  // half day is only possible when From = To and it is a weekday
  const singleDay = !!form.dateFrom && form.dateFrom === form.dateTo && dayList.length === 1;
  const halfDay = form.halfDay && singleDay;
  const formTotalDays = halfDay ? 0.5 : dayList.length;
  const step = halfDay ? 0.5 : 1;
  const monthsSpan = new Set(dayList).size || 1;

  const orderedSel = leaveOptions.filter(o => selIds.includes(o.id)).map(o => o.id);
  const selKey = JSON.stringify(orderedSel);

  const capOf = (o) => {
    if (!o.paid) return Infinity;
    const byMonth = o.max == null ? Infinity : Number(o.max) * monthsSpan;
    return Math.min(byMonth, o.balance);
  };

  // default split: hand the days out one step at a time, skipping a leave that is full
  useEffect(() => {
    const out = {};
    orderedSel.forEach(id => { out[id] = 0; });
    let left = formTotalDays;
    let progressed = true;
    while (left > 0 && progressed) {
      progressed = false;
      for (const id of orderedSel) {
        const o = leaveOptions.find(x => x.id === id);
        if (left > 0 && out[id] + step <= capOf(o)) { out[id] += step; left -= step; progressed = true; }
      }
    }
    setAlloc(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, formTotalDays, halfDay]);

  const toggleLeave = (id) =>
    setSelIds(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  // typing a number: the other ticked leaves shrink so the total never passes the date range
  const setDays = (id, v) => {
    const d = Math.min(formTotalDays, Math.max(0, Math.round((Number(v) || 0) / step) * step));
    setAlloc(prev => {
      const next = { ...prev, [id]: d };
      let left = formTotalDays - d;
      orderedSel.filter(x => x !== id).forEach(x => {
        const keep = Math.min(prev[x] || 0, left);
        next[x] = keep;
        left -= keep;
      });
      return next;
    });
  };

  const errOf = (o) => {
    const d = alloc[o.id] || 0;
    if (!o.paid) return '';
    if (o.max != null && d > Number(o.max) * monthsSpan) {
      return `Only ${o.max} day(s) of ${o.name} allowed per month`;
    }
    if (d > o.balance) return `Only ${o.balance} day(s) left`;
    return '';
  };

  const assigned = orderedSel.reduce((s, id) => s + (alloc[id] || 0), 0);
  const anyError = leaveOptions.filter(o => selIds.includes(o.id)).some(o => errOf(o));
  const canSubmit = orderedSel.length > 0 && !anyError && assigned === formTotalDays && formTotalDays > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.dateFrom || !form.dateTo) {
      toast.error('Employee and dates are required');
      return;
    }
    if (!canSubmit) { toast.error('Fix the leave days first'); return; }
    try {
      await api.post('/leave-transactions', {
        employeeId: Number(form.employeeId),
        allocations: orderedSel.map(id => ({ leaveTypeId: id, days: alloc[id] || 0 })).filter(a => a.days > 0),
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        reason: form.reason,
        dateFiled: form.dateFiled,
        halfDay,
      });
      toast.success('Leave request filed');
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to file request');
    }
  };

  const act = async (id, action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await api.patch(`/leave-transactions/${id}/${action}`);
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete this leave request for ${t.employeeName}?`)) return;
    try {
      await api.delete(`/leave-transactions/${t.id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const openForm = () => { setForm(EMPTY); setSelIds([]); setAlloc({}); setShow(true); };

  return (
    <div>
      {/* Filters */}
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex flex-col md:flex-row md:flex-wrap gap-4 md:items-end">
          <Field label="Employee" className="flex-1">
            <SearchableSelect
              allLabel="All employees" allowCustom placeholder="All employees"
              searchPlaceholder="Search employee..."
              value={search}
              options={[...new Set(items.map(t => t.employeeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
              onChange={(v) => setSearch(v || '')}
            />
          </Field>
          <Field label="From">
            <input type="date" className={inputCls} value={fFrom} max={fTo || undefined}
              onChange={(e) => setFFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={fTo} min={fFrom || undefined}
              onChange={(e) => setFTo(e.target.value)} />
          </Field>
          {(fFrom || fTo) && (
            <button type="button" onClick={() => { setFFrom(''); setFTo(''); }}
              className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100 whitespace-nowrap">
              Clear dates
            </button>
          )}
          {canCreate && (
            <button onClick={openForm}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm whitespace-nowrap">
              <Plus size={18} /> File Leave
            </button>
          )}
        </div>
      </div>

      {/* Employee list with status tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full tbl-card">
        <div className="flex items-center justify-between gap-4 px-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-6" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map(t => {
              const active = statusFilter === t.key;
              return (
                <button key={t.key || 'all'} role="tab" aria-selected={active}
                  onClick={() => setStatusFilter(t.key)}
                  className={`flex items-center gap-2 py-3 -mb-px text-sm border-b-2 whitespace-nowrap transition-colors
                    ${active
                      ? 'border-orange-600 text-gray-900 font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {t.label}
                  <span className={`px-1.5 min-w-[20px] text-center text-xs rounded-full
                    ${active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {counts[t.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 py-2">
            <button onClick={() => setExpanded(new Set(pageItems.map(g => g.id)))}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">Expand all</button>
            <button onClick={() => setExpanded(new Set())}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap">Collapse all</button>
          </div>
        </div>

        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-20 [&>tr>th]:h-10 [&>tr>th]:bg-gray-50 [&>tr>th]:shadow-[inset_0_-1px_0_0_#e5e7eb]">
              <tr className="text-xs font-medium text-gray-500">
                <th className="w-10 px-3" />
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-center">Requests</th>
                <th className="px-4 py-3 text-center">Total days</th>
                <th className="px-4 py-3 text-center">Pending</th>
              </tr>
            </thead>
            {loading ? (
              <tbody><tr><td colSpan="5" className="px-4 py-10 text-center text-gray-500">Loading...</td></tr></tbody>
            ) : groups.length === 0 ? (
              <tbody><tr><td colSpan="5" className="px-4 py-12 text-center text-gray-500">No leave requests match these filters.</td></tr></tbody>
            ) : pageItems.map(g => {
                const isOpen = expanded.has(g.id);
                const sel = g.types.some(x => x.name === tabByEmp[g.id]) ? tabByEmp[g.id] : '';
                const shown = sel ? g.rows.filter(t => (t.leaveTypeName || 'Other') === sel) : g.rows;
                const shownDays = shown.reduce((n, t) => (countsDays(t) ? n + (Number(t.daysUsed) || 0) : n), 0);
                const tabs = [{ name: '', label: 'All', count: g.rows.length },
                  ...g.types.map(x => ({ name: x.name, label: x.name, count: x.count }))];
                return (
                  <tbody key={g.id}>
                    <tr onClick={() => toggle(g.id)} aria-expanded={isOpen}
                      className={`cursor-pointer [&>td]:sticky [&>td]:top-10 [&>td]:z-10 [&>td]:shadow-[inset_0_-1px_0_0_#e5e7eb] ${isOpen ? '[&>td]:bg-orange-50' : '[&>td]:bg-white hover:[&>td]:bg-gray-50'}`}>
                      <td className="px-3 py-3.5 text-center">
                        <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={g.name} photoUrl={photoOf[g.id]} />
                          <span className="font-medium text-gray-900">{g.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-700">{g.rows.length}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-gray-900">{g.days}</td>
                      <td className="px-4 py-3.5 text-center">
                        {g.pending > 0
                          ? <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">{g.pending}</span>
                          : <span className="text-gray-400">0</span>}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan="5" className="p-0 bg-gray-50 border-b border-gray-200">
                          <div className="px-4 sm:px-6 py-4 border-l-2 border-orange-500">
                            <div className="flex gap-5 border-b border-gray-200 overflow-x-auto" role="tablist"
                              aria-label={`Leave types for ${g.name}`}>
                              {tabs.map(t => {
                                const active = sel === t.name;
                                return (
                                  <button key={t.name || 'all'} role="tab" aria-selected={active}
                                    onClick={() => setTabByEmp(p => ({ ...p, [g.id]: t.name }))}
                                    className={`flex items-center gap-2 py-2 -mb-px text-sm border-b-2 whitespace-nowrap transition-colors
                                      ${active
                                        ? 'border-orange-600 text-gray-900 font-medium'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                                    {t.label}
                                    <span className={`px-1.5 min-w-[20px] text-center text-xs rounded-full
                                      ${active ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                                      {t.count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr className="text-left text-xs font-medium text-gray-500">
                                      {!sel && <th className="px-4 py-2.5">Leave type</th>}
                                      <th className="px-4 py-2.5">Dates</th>
                                      <th className="px-4 py-2.5 text-right">Days</th>
                                      <th className="px-4 py-2.5">Reason</th>
                                      <th className="px-4 py-2.5">Filed</th>
                                      <th className="px-4 py-2.5">Status</th>
                                      <th className="px-4 py-2.5 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {shown.map(t => (
                                      <tr key={t.id} className="hover:bg-gray-50">
                                        {!sel && <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{t.leaveTypeName}</td>}
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{fmtRange(t.dateFrom, t.dateTo)}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums">{t.daysUsed}</td>
                                        <td className="px-4 py-2.5 text-gray-600 max-w-[220px] truncate" title={t.reason || ''}>{t.reason || '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(t.dateFiled)}</td>
                                        <td className="px-4 py-2.5"><StatusPill status={t.status} /></td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex justify-end gap-1">
                                            {canEdit && t.status === 'PENDING' && (
                                              <>
                                                <button onClick={() => act(t.id, 'approve')} title="Approve" aria-label="Approve"
                                                  className="p-2 text-green-600 hover:bg-green-50 rounded"><Check size={17} /></button>
                                                <button onClick={() => act(t.id, 'reject', 'Reject this request?')} title="Reject" aria-label="Reject"
                                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded"><XIcon size={17} /></button>
                                              </>
                                            )}
                                            {canEdit && (t.status === 'PENDING' || t.status === 'APPROVED') && (
                                              <button onClick={() => act(t.id, 'cancel', 'Cancel this request?')} title="Cancel" aria-label="Cancel"
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded"><Ban size={17} /></button>
                                            )}
                                            {canDelete && t.status !== 'APPROVED' && (
                                              <button onClick={() => remove(t)} title="Delete" aria-label="Delete"
                                                className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={17} /></button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                                {shown.length} request{shown.length === 1 ? '' : 's'} · {shownDays} day{shownDays === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
          </table>
        </div>
        {!loading && totalItems > 0 && <Pagination {...paginationProps} />}
      </div>

      {show && (
        <Modal title="File Leave" onClose={() => setShow(false)} maxW="max-w-xl">
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <Field label="Employee" required className="col-span-2">
              <SearchableSelect
                placeholder="Select employee..."
                searchPlaceholder="Search employee..."
                value={form.employeeId}
                options={employees.map(e => ({ value: String(e.employeeId), label: e.fullName }))}
                onChange={(v) => { setForm(p => ({ ...p, employeeId: v })); setSelIds([]); }}
              />
            </Field>

            {form.employeeId && (
              <div className="col-span-2 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Leave <span className="text-red-500">*</span>
                </label>
                {leaveOptions.length === 0 ? (
                  <p className="text-xs text-gray-500">This employee has no leave granted for {formYear}.</p>
                ) : leaveOptions.map(o => {
                  const on = selIds.includes(o.id);
                  const err = on ? errOf(o) : '';
                  return (
                    <div key={o.id}>
                      <div className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="checkbox" checked={on} onChange={() => toggleLeave(o.id)} />
                        <span className="font-medium">{o.name}</span>
                        <span className="text-xs text-gray-500">
                          {o.paid
                            ? `Balance: ${o.balance} day(s) · Max ${o.max ?? 'no limit'}${o.max != null ? ' per month' : ''}`
                            : 'Unpaid'}
                        </span>
                        {on && (
                          <input type="number" min="0" step={step}
                            className={`ml-auto w-20 px-2 py-1 border rounded text-sm ${err ? 'border-red-500' : 'border-gray-300'}`}
                            value={alloc[o.id] ?? 0}
                            onChange={(e) => setDays(o.id, e.target.value)} />
                        )}
                      </div>
                      {err && <p className="text-xs text-red-600 mt-1 ml-6">{err}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            <Field label="From" required><input type="date" className={inputCls} value={form.dateFrom} onChange={set('dateFrom')} /></Field>
            <Field label="To" required><input type="date" className={inputCls} value={form.dateTo} onChange={set('dateTo')} /></Field>
            <p className={`col-span-2 -mt-2 text-xs ${selIds.length > 0 && assigned !== formTotalDays ? 'text-red-600' : 'text-gray-500'}`}>
              Date range: {formTotalDays} day(s) (Mon to Fri){selIds.length > 0 ? ` · assigned ${assigned} of ${formTotalDays}` : ''}
            </p>
            {singleDay && (
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.halfDay}
                  onChange={(e) => setForm(p => ({ ...p, halfDay: e.target.checked }))} />
                Half day (0.5)
              </label>
            )}
            <Field label="Reason" className="col-span-2">
              <textarea className={inputCls} rows={2} value={form.reason} onChange={set('reason')} />
            </Field>
            <Field label="Date Filed" required className="col-span-2">
              <input type="date" className={inputCls} value={form.dateFiled} onChange={set('dateFiled')} />
            </Field>

            <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button type="submit" disabled={!canSubmit}
                className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">File</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveRequestsTab;