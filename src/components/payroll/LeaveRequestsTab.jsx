import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X as XIcon, Ban, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, today, Field, Modal } from './Shared';
import SearchableSelect from './SearchableSelect';
import EmployeeAvatar from './EmployeeAvatar';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const STATUS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const weekdayList = (from, to) => {
  if (!from || !to || to < from) return [];
  const out = [];
  for (let d = new Date(from + 'T00:00:00'); d <= new Date(to + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) out.push(d.getFullYear() * 100 + d.getMonth());
  }
  return out; // one entry per weekday, value = year*100+month
};

const EMPTY = { employeeId: '', dateFrom: today(), dateTo: today(), reason: '', dateFiled: today() };

const LeaveRequestsTab = ({ employees, leaveTypes, canCreate, canEdit, canDelete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [granted, setGranted] = useState([]);
  const [selIds, setSelIds] = useState([]);
  const [alloc, setAlloc] = useState({});

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leave-transactions${statusFilter ? `?status=${statusFilter}` : ''}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(t => !q || (t.employeeName || '').toLowerCase().includes(q));
  }, [items, search]);

  const { pageItems, paginationProps, totalItems } = usePagination(filtered, `${search}|${statusFilter}`);

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
      .map(b => ({ id: b.leaveTypeId, name: b.leaveTypeName, paid: true,
        balance: Number(b.closingBalance), max: typeOf[b.leaveTypeId]?.maxPerMonth ?? null }));
    const unpaid = (leaveTypes || []).filter(t => t.paid === false)
      .map(t => ({ id: t.leaveTypeId, name: t.leaveTypeName, paid: false, balance: null, max: null }));
    return [...paid, ...unpaid].sort((a, b) =>
      a.name === 'Vacation Leave' ? -1 : b.name === 'Vacation Leave' ? 1 : a.name.localeCompare(b.name));
  }, [granted, leaveTypes, form.employeeId]);

  const dayList = useMemo(() => weekdayList(form.dateFrom, form.dateTo), [form.dateFrom, form.dateTo]);
  const totalDays = dayList.length;
  const monthsSpan = new Set(dayList).size || 1;

  const orderedSel = leaveOptions.filter(o => selIds.includes(o.id)).map(o => o.id);
  const selKey = JSON.stringify(orderedSel);

  const capOf = (o) => {
    if (!o.paid) return Infinity;
    const byMonth = o.max == null ? Infinity : Number(o.max) * monthsSpan;
    return Math.min(byMonth, o.balance);
  };

  // default split: hand the days out one by one, skipping a leave that is full
  useEffect(() => {
    const out = {};
    orderedSel.forEach(id => { out[id] = 0; });
    let left = totalDays;
    let progressed = true;
    while (left > 0 && progressed) {
      progressed = false;
      for (const id of orderedSel) {
        const o = leaveOptions.find(x => x.id === id);
        if (left > 0 && out[id] < capOf(o)) { out[id] += 1; left -= 1; progressed = true; }
      }
    }
    setAlloc(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, totalDays]);

  const toggleLeave = (id) =>
    setSelIds(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  // typing a number: the other ticked leaves shrink so the total never passes the date range
  const setDays = (id, v) => {
    const d = Math.min(totalDays, Math.max(0, Math.floor(Number(v) || 0)));
    setAlloc(prev => {
      const next = { ...prev, [id]: d };
      let left = totalDays - d;
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
  const canSubmit = orderedSel.length > 0 && !anyError && assigned === totalDays && totalDays > 0;

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
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex flex-col md:flex-row gap-4 md:items-end">
          <Field label="Employee" className="flex-1">
            <SearchableSelect
              allLabel="All employees" allowCustom placeholder="All employees"
              searchPlaceholder="Search employee..."
              value={search}
              options={[...new Set(items.map(t => t.employeeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
              onChange={(v) => setSearch(v || '')}
            />
          </Field>
          <Field label="Status">
            <SearchableSelect
              allLabel="All statuses"
              typeable={false}
              value={statusFilter}
              options={Object.keys(STATUS).map(s => ({ value: s, label: s }))}
              onChange={(v) => setStatusFilter(v)}
            />
          </Field>
          {canCreate && (
            <button onClick={openForm}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm whitespace-nowrap">
              <Plus size={18} /> File Leave
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[860px]">
            <thead className="bg-white">
              <tr>
                {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No leave requests</td></tr>
              ) : pageItems.map(t => (
                <tr key={t.id} className="text-sm hover:bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={t.employeeName} photoUrl={photoOf[t.employeeId]} />
                      {t.employeeName}
                    </div>
                  </td>
                  <td className="px-4 py-3" title={t.reason || ''}>{t.leaveTypeName}</td>
                  <td className="px-4 py-3">{t.dateFrom}</td>
                  <td className="px-4 py-3">{t.dateTo}</td>
                  <td className="px-4 py-3">{t.daysUsed}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS[t.status] || ''}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && t.status === 'PENDING' && (
                        <>
                          <button onClick={() => act(t.id, 'approve')} title="Approve" className="p-2 text-green-600 hover:bg-green-50 rounded"><Check size={17} /></button>
                          <button onClick={() => act(t.id, 'reject', 'Reject this request?')} title="Reject" className="p-2 text-orange-600 hover:bg-orange-50 rounded"><XIcon size={17} /></button>
                        </>
                      )}
                      {canEdit && (t.status === 'PENDING' || t.status === 'APPROVED') && (
                        <button onClick={() => act(t.id, 'cancel', 'Cancel this request?')} title="Cancel" className="p-2 text-gray-600 hover:bg-gray-100 rounded"><Ban size={17} /></button>
                      )}
                      {canDelete && t.status !== 'APPROVED' && (
                        <button onClick={() => remove(t)} title="Delete" className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={17} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
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
                          <input type="number" min="0" step="1"
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
            <p className={`col-span-2 -mt-2 text-xs ${selIds.length > 0 && assigned !== totalDays ? 'text-red-600' : 'text-gray-500'}`}>
              Date range: {totalDays} day(s) (Mon to Fri){selIds.length > 0 ? ` · assigned ${assigned} of ${totalDays}` : ''}
            </p>
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