import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Ban, Paperclip, Eye, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field, Modal, STATUS_STYLE, MoneyInput } from './Shared';
import SearchableSelect from './SearchableSelect';
import { SecureImage } from '../../pages/payroll/EmployeeDocumentsModal';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const LOAN_TYPES = ['Salary Loan', 'Housing Loan', 'Emergency Loan'];
const EMPTY = {
  employeeId: '', agencyId: '', loanType: '', amount: '', durationMonths: '',
  amortization: '', deductionSchedule: 'SPLIT', startTerm: today(), endTerm: '', referenceNo: '',
};
const SCHEDULE_LABEL = { SPLIT: 'Split (15th & 30th)', FIRST_CUTOFF: '15th only', SECOND_CUTOFF: '30th only' };

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isCashAdvance = (t) => (t || '').trim().toLowerCase() === 'cash advance';
const lastDayAfter = (s, n) => {
  const d = new Date(s + 'T00:00:00');
  return toISO(new Date(d.getFullYear(), d.getMonth() + n + 1, 0));
};
const monthDiff = (a, b) => {
  const x = new Date(a + 'T00:00:00');
  const y = new Date(b + 'T00:00:00');
  return (y.getFullYear() - x.getFullYear()) * 12 + (y.getMonth() - x.getMonth());
};
const endDateError = (start, end, duration) => {
  const dur = Number(duration);
  if (!start || !end || !(dur > 0)) return '';
  if (end < start) return 'End date cannot be before the start date';
  if (monthDiff(start, end) !== dur) {
    return `End date must be ${dur} month${dur === 1 ? '' : 's'} after the start date (in ${new Date(lastDayAfter(start, dur) + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })})`;
  }
  return '';
};
const serveUrl = (path) => `/files/serve?path=${encodeURIComponent(path)}`;
const loanName = (i) => (i.agencyName ? `${i.agencyName} - ${i.loanType || 'Loan'}` : i.loanType || '');
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const fmtShort = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const SCHEDULE_SHORT = { SPLIT: 'both cutoffs', FIRST_CUTOFF: '15th only', SECOND_CUTOFF: '30th only' };
const STATUS_BADGE = {
  ACTIVE: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  PAID: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};
const STATUS_LABEL = { ACTIVE: 'Active', PAID: 'Paid', CANCELLED: 'Cancelled' };

const Detail = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="mt-0.5 text-sm text-gray-900 break-words">{children || '—'}</div>
  </div>
);

const LoanAccountsTab = ({ employees, agencies, canCreate, canEdit }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [payments, setPayments] = useState([]);
  const [viewFor, setViewFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const [empText, setEmpText] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [groupBy, setGroupBy] = useState('employee');
  const [filters, setFilters] = useState({ search: '', status: '', loanType: '', schedule: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans');
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  // any change recomputes amortization (amount / duration) and end date (start + duration)
  const update = (patch) => setForm(p => {
    const n = { ...p, ...patch };
    const amt = Number(n.amount);
    const dur = Number(n.durationMonths);
    n.amortization = amt > 0 && dur > 0 ? (amt / dur).toFixed(2) : '';
    if ('startTerm' in patch || 'durationMonths' in patch) {
      n.endTerm = n.startTerm && dur > 0 ? lastDayAfter(n.startTerm, dur) : '';
    }
    return n;
  });
  const set = (k) => (e) => update({ [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.loanType.trim() || !form.amount || !form.durationMonths || !form.startTerm) {
      toast.error('Employee, loan type, amount, duration and start date are required');
      return;
    }
    const endErr = endDateError(form.startTerm, form.endTerm, form.durationMonths);
    if (endErr) { toast.error(endErr); return; }
    setSaving(true);
    try {
      let docPath = null;
      if (file) {
        const fd = new FormData();
        fd.append('title', `Loan - ${form.loanType.trim()}`);
        fd.append('file', file);
        const up = await api.upload(`/employees/${form.employeeId}/contracts`, fd);
        if (!up.success) { toast.error('Document upload failed'); return; }
        docPath = up.data?.fileUrl || null;
      }
      const body = {
        employeeId: Number(form.employeeId),
        agencyId: form.agencyId ? Number(form.agencyId) : null,
        loanType: form.loanType.trim(),
        loanAmount: Number(form.amount),
        durationMonths: Number(form.durationMonths),
        amortization: Number(form.amortization),
        deductionSchedule: form.deductionSchedule || 'SPLIT',
        applicationNo: form.referenceNo.trim() || null,
        startTerm: form.startTerm,
        endTerm: form.endTerm || null,
        docRefference: docPath ?? (editing ? editing.docReference || null : null),
      };
      const res = editing
        ? await api.put(`/loans/${editing.id}`, body)
        : await api.post('/loans', body);
      if (res && res.success === false) return;
      toast.success(editing ? 'Loan updated' : 'Loan created');
      setEditing(null);
      setShowForm(false);
      setForm(EMPTY);
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const viewDoc = async (path) => {
    const w = window.open('', '_blank');
    const res = await api.download(serveUrl(path));
    if (!res.success) { w?.close(); return; }
    const url = URL.createObjectURL(res.data);
    if (w) w.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const openPayments = async (item) => {
    setPayFor(item);
    await loadPayments(item.id);
  };

  const loadPayments = async (id) => {
    try {
      const res = await api.get(`/loans/${id}/payments`);
      setPayments(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load payments');
    }
  };

  const openView = async (item) => {
    setPayments([]);
    setViewFor(item);
    await loadPayments(item.id);
  };

  const openEdit = (item) => {
    setEditing(item);
    setEmpText(item.employeeName || '');
    setFile(null);
    setForm({
      employeeId: String(item.employeeId),
      agencyId: item.agencyId ? String(item.agencyId) : '',
      loanType: item.loanType || '',
      amount: String(item.amount ?? ''),
      durationMonths: String(item.durationMonths ?? ''),
      amortization: item.amortization != null ? Number(item.amortization).toFixed(2) : '',
      deductionSchedule: item.deductionSchedule || 'SPLIT',
      startTerm: item.startTerm || '',
      endTerm: item.endTerm || '',
      referenceNo: item.applicationNo || '',
    });
    setShowForm(true);
  };

  const cancel = async (item) => {
    if (!window.confirm(`Cancel this loan for ${item.employeeName}?`)) return;
    try {
      await api.patch(`/loans/${item.id}/cancel`);
      toast.success('Cancelled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  const loanTypeOptions = [...new Set(items.map(loanName).filter(Boolean))].sort();
  const filtered = items.filter(i => {
    const q = filters.search.trim().toLowerCase();
    if (q && !(i.employeeName || '').toLowerCase().includes(q)) return false;
    if (filters.status && i.status !== filters.status) return false;
    if (filters.loanType && loanName(i).toLowerCase() !== filters.loanType.toLowerCase()) return false;
    if (filters.schedule && i.deductionSchedule !== filters.schedule) return false;
    return true;
  });
  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (k) => (e) => setFilters(p => ({ ...p, [k]: e.target.value }));

  const grouped = (() => {
    const map = new Map();
    filtered.forEach(i => {
      const byAgency = groupBy === 'agency';
      const key = byAgency ? (i.agencyName || 'Company loan') : i.employeeId;
      const label = byAgency ? (i.agencyName || 'Company loan') : i.employeeName;
      if (!map.has(key)) map.set(key, { employeeId: key, employeeName: label, rows: [] });
      map.get(key).rows.push(i);
    });
    return Array.from(map.values()).sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
  })();
  const subGroups = (rows) => {
    const m = new Map();
    rows.forEach(r => {
      const k = r.agencyName || 'Company loan';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    return Array.from(m, ([name, list]) => ({ name, rows: list }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  const photoOf = Object.fromEntries((employees || []).map(e => [e.employeeId, e.photoUrl]));
  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const { pageItems, paginationProps, totalItems } =
    usePagination(grouped, `${JSON.stringify(filters)}|${groupBy}`);

  return (
    <div>
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-gray-50 pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
            <SearchableSelect
              allLabel="All employees"
              allowCustom
              placeholder="All employees"
              searchPlaceholder="Search employee..."
              value={filters.search}
              options={[...new Set(items.map(i => i.employeeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
              onChange={(v) => setFilters(p => ({ ...p, search: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <SearchableSelect
              allLabel="All statuses"
              typeable={false}
              value={filters.status}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'PAID', label: 'Paid' }, { value: 'CANCELLED', label: 'Cancelled' }]}
              onChange={(v) => setFilters(p => ({ ...p, status: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Loan</label>
            <SearchableSelect
              allLabel="All loans"
              searchPlaceholder="Search loan..."
              value={filters.loanType}
              options={loanTypeOptions.map(t => ({ value: t, label: t }))}
              onChange={(v) => setFilters(p => ({ ...p, loanType: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
            <SearchableSelect
              allLabel="All schedules"
              typeable={false}
              value={filters.schedule}
              options={Object.entries(SCHEDULE_LABEL).map(([value, label]) => ({ value, label }))}
              onChange={(v) => setFilters(p => ({ ...p, schedule: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Group by</label>
            <SearchableSelect
              typeable={false}
              value={groupBy}
              options={[{ value: 'employee', label: 'Employee' }, { value: 'agency', label: 'Agency' }]}
              onChange={(v) => { setGroupBy(v || 'employee'); setExpanded(new Set()); }}
            />
          </div>
          {hasFilters && (
            <button type="button" onClick={() => setFilters({ search: '', status: '', loanType: '', schedule: '' })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Clear</button>
          )}
          {canCreate && (
            <button onClick={() => { setEditing(null); setForm(EMPTY); setFile(null); setShowForm(true); }}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              <Plus size={16} /> Add Loan
            </button>
          )}
        </div>
      </div>

      {(() => {
        const act = filtered.filter(r => r.status === 'ACTIVE');
        const sum = (k) => act.reduce((s, r) => s + Number(r[k] || 0), 0);
        const stats = [
          ['Active loans', act.length],
          ['Employees with loans', new Set(act.map(r => r.employeeId)).size],
          ['Total loan amount', money(sum('amount'))],
          ['Outstanding balance', money(sum('remainingBalance'))],
        ];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {stats.map(([label, val]) => (
              <div key={label} className="bg-white rounded-xl shadow-sm px-5 py-4">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-xl font-semibold text-gray-900 mt-1">{val}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="flex justify-end gap-2 mb-2">
        <button onClick={() => setExpanded(new Set(grouped.map(g => g.employeeId)))}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Expand all</button>
        <button onClick={() => setExpanded(new Set())}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Collapse all</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr>
                {[groupBy === 'agency' ? 'Agency' : 'Employee', 'Loan', 'Amount', 'Term', 'Paid', 'Balance', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {loading ? (
                <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                  {hasFilters ? 'No loans match the filters' : 'No records'}
                </td></tr>
              ) : pageItems.map(g => {
                const isOpen = expanded.has(g.employeeId);
                const activeRows = g.rows.filter(r => r.status === 'ACTIVE');
                const cancelledN = g.rows.filter(r => r.status === 'CANCELLED').length;
                const monthly = activeRows.reduce((s, r) => s + Number(r.amortization || 0), 0);
                const initials = (g.employeeName || '?').split(' ').filter(Boolean).slice(0, 2)
                  .map(w => w[0]).join('').toUpperCase();
                const tot = g.rows.filter(r => r.status !== 'CANCELLED').reduce((a, r) => ({
                  amount: a.amount + Number(r.amount || 0),
                  paid: a.paid + Number(r.totalPaid || 0),
                  bal: a.bal + Number(r.remainingBalance || 0),
                }), { amount: 0, paid: 0, bal: 0 });
                return (
                  <React.Fragment key={g.employeeId}>
                    <tr
                      className={`cursor-pointer text-sm transition-colors border-l-4 [&>td]:sticky [&>td]:top-[39px] [&>td]:z-[5] ${isOpen ? '[&>td]:bg-orange-50 border-orange-600' : '[&>td]:bg-white hover:[&>td]:bg-gray-50 border-transparent'}`}
                      onClick={() => toggle(g.employeeId)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                          {groupBy === 'employee' && photoOf[g.employeeId] ? (
                            <SecureImage
                              path={photoOf[g.employeeId]}
                              alt={g.employeeName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              fallback={<div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{initials}</div>}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{initials}</div>
                          )}
                          <span className="font-semibold text-gray-900">{g.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{activeRows.length} active loan{activeRows.length === 1 ? '' : 's'}</div>
                        {cancelledN > 0 && <div className="text-xs text-gray-400">{cancelledN} cancelled</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{money(tot.amount)}</div>
                        {monthly > 0 && <div className="text-xs text-gray-500">{money(monthly)} per month</div>}
                      </td>
                      <td />
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{money(tot.paid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">{money(tot.bal)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${activeRows.length ? STATUS_BADGE.ACTIVE : STATUS_BADGE.CANCELLED}`}>
                          {activeRows.length ? 'Active' : 'No active loans'}
                        </span>
                      </td>
                      <td />
                    </tr>
                    {isOpen && subGroups(g.rows).map(sg => (
                      <React.Fragment key={sg.name}>
                        {groupBy === 'employee' && (
                          <tr className="bg-orange-50 text-xs font-semibold text-gray-700">
                            <td colSpan="11" className="px-4 py-2 pl-10">
                              {sg.name} · {sg.rows.length} loan{sg.rows.length === 1 ? '' : 's'} · Balance {money(sg.rows.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + Number(r.remainingBalance || 0), 0))}
                            </td>
                          </tr>
                        )}
                        {sg.rows.map(i => (
                          <tr key={i.id} className="hover:bg-gray-50 text-sm">
                            <td className="px-4 py-3 pl-12 text-gray-700 whitespace-nowrap">{groupBy === 'agency' ? i.employeeName : ''}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 whitespace-nowrap">{i.loanType || 'Loan'}</div>
                              <div className="text-xs text-gray-500">{i.agencyName || 'Company loan'}{i.applicationNo ? ` · Ref ${i.applicationNo}` : ''}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{money(i.amount)}</div>
                              <div className="text-xs text-gray-500">
                                {money(i.amortization)} per month · {SCHEDULE_SHORT[i.deductionSchedule] || i.deductionSchedule || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                              <div>{fmtShort(i.startTerm)}</div>
                              <div className="text-gray-400">to {fmtShort(i.endTerm)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{money(i.totalPaid)}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{money(i.remainingBalance)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[i.status] || 'bg-gray-100 text-gray-700'}`}>
                                {STATUS_LABEL[i.status] || i.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1">
                                {i.docReference && i.docReference.startsWith('contracts/') && (
                                  <button onClick={() => viewDoc(i.docReference)} title="View document" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Paperclip size={17} /></button>
                                )}
                                <button onClick={() => openView(i)} title="View details" className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"><Eye size={17} /></button>
                                {canEdit && i.status === 'ACTIVE' && Number(i.totalPaid || 0) === 0 && (
                                  <button onClick={() => openEdit(i)} title="Edit loan" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><Edit2 size={17} /></button>
                                )}
                                <button onClick={() => openPayments(i)} title="Payment history" className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Wallet size={17} /></button>
                                {canEdit && i.status === 'ACTIVE' && (
                                  <button onClick={() => cancel(i)} title="Cancel" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Ban size={17} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 && <Pagination {...paginationProps} />}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Loan' : 'Add Loan'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee" required className="md:col-span-2">
              <SearchableSelect
                disabled={!!editing}
                placeholder="Select employee..."
                searchPlaceholder="Search employee..."
                value={form.employeeId}
                options={employees.map(e => ({ value: String(e.employeeId), label: e.fullName }))}
                onChange={(v) => update({ employeeId: v })}
              />
            </Field>
            <Field label="Agency">
              <SearchableSelect
                allLabel="None (company loan)"
                searchPlaceholder="Search agency..."
                value={form.agencyId}
                options={agencies.map(a => ({ value: String(a.agencyId), label: a.name }))}
                onChange={(v) => update({ agencyId: v })}
              />
            </Field>
            <Field label="Loan Type" required>
              <SearchableSelect
                allowCustom
                placeholder="Select or type..."
                searchPlaceholder="Search or type a new type..."
                value={form.loanType}
                options={LOAN_TYPES.map(t => ({ value: t, label: t }))}
                onChange={(v) => update({ loanType: v })}
              />
            </Field>
            <Field label="Loan Amount" required>
              <MoneyInput className={inputCls} value={form.amount} onChange={set('amount')} />
            </Field>
            <Field label="Duration (months)" required>
              <input type="number" min="1" step="1" className={inputCls} value={form.durationMonths} onChange={set('durationMonths')} />
            </Field>
            <Field label="Amortization (monthly, auto)">
              <MoneyInput className={`${inputCls} bg-gray-100`} readOnly value={form.amortization} placeholder="Amount ÷ duration" />
            </Field>
            <Field label="Deduction Schedule">
              <SearchableSelect
                typeable={false}
                value={form.deductionSchedule}
                options={[
                  { value: 'SPLIT', label: 'Split across cutoffs (15th and 30th)' },
                  { value: 'FIRST_CUTOFF', label: '15th cutoff only' },
                  { value: 'SECOND_CUTOFF', label: '30th cutoff only' },
                ]}
                onChange={(v) => update({ deductionSchedule: v })}
              />
            </Field>
            <Field label="Start Date (first deduction)" required>
              <input type="date" className={inputCls} value={form.startTerm} onChange={set('startTerm')} />
            </Field>
            <Field label="End Date (auto, editable)">
              <input type="date"
                className={`${inputCls} ${endDateError(form.startTerm, form.endTerm, form.durationMonths) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                value={form.endTerm} onChange={set('endTerm')} />
              {endDateError(form.startTerm, form.endTerm, form.durationMonths) && (
                <p className="text-xs text-red-600 mt-1">{endDateError(form.startTerm, form.endTerm, form.durationMonths)}</p>
              )}
            </Field>
            <Field label="Reference No." className="md:col-span-2">
              <input className={inputCls} value={form.referenceNo} onChange={set('referenceNo')}
                placeholder="e.g. loan application / reference number" />
            </Field>
            <Field label="Document (optional)" className="md:col-span-2">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={inputCls}
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-500 mt-1">Also saved under the employee's Documents.</p>
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewFor && (() => {
        const v = items.find(x => x.id === viewFor.id) || viewFor;
        const paid = Number(v.totalPaid || 0);
        const pct = Number(v.amount) > 0 ? Math.min(100, Math.round((paid / Number(v.amount)) * 100)) : 0;
        return (
          <Modal title="Loan Details" subtitle={`${v.employeeName} · ${v.loanType || 'Loan'}`} onClose={() => setViewFor(null)}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[v.status] || ''}`}>{v.status}</span>
                <span className="text-xs text-gray-500">{v.agencyName || 'Company loan'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-gray-200 border-y border-gray-200 py-4">
                <div className="sm:pr-6 py-2 sm:py-0">
                  <div className="text-sm text-gray-500">Loan Amount</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">{money(v.amount)}</div>
                </div>
                <div className="sm:px-6 py-2 sm:py-0">
                  <div className="text-sm text-gray-500">Total Paid</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">{money(v.totalPaid)}</div>
                </div>
                <div className="sm:pl-6 py-2 sm:py-0">
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">{money(v.remainingBalance)}</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Repayment progress</span><span>{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-800 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-orange-600 rounded-full" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Loan Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <Detail label="Employee">{v.employeeName}</Detail>
                  <Detail label="Loan Type">{v.loanType}</Detail>
                  <Detail label="Agency">{v.agencyName || 'Company loan'}</Detail>
                  <Detail label="Reference No.">{v.applicationNo}</Detail>
                  <Detail label="Monthly Amortization">{money(v.amortization)}</Detail>
                  <Detail label="Deduction Schedule">{SCHEDULE_LABEL[v.deductionSchedule] || v.deductionSchedule}</Detail>
                  <Detail label="Duration">{v.durationMonths ? `${v.durationMonths} month${v.durationMonths === 1 ? '' : 's'}` : null}</Detail>
                  <Detail label="Payments Made">{payments.length}</Detail>
                  <Detail label="Start Date">{fmtDate(v.startTerm)}</Detail>
                  <Detail label="End Date">{fmtDate(v.endTerm)}</Detail>
                  <Detail label="Document">
                    {v.docReference && v.docReference.startsWith('contracts/')
                      ? <button onClick={() => viewDoc(v.docReference)} className="inline-flex items-center gap-1 text-orange-600 hover:underline"><Paperclip size={14} /> View document</button>
                      : v.docReference}
                  </Detail>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-orange-600 rounded-full" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Payment History</h3>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pay Period</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
                      {payments.length === 0 ? (
                        <tr><td colSpan="3" className="px-4 py-6 text-center text-gray-500">No payments yet.</td></tr>
                      ) : payments.map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-2">{fmtDate(p.payPeriod)}</td>
                          <td className="px-4 py-2 text-right">{money(p.amountPaid)}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{money(p.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                {canEdit && v.status === 'ACTIVE' && Number(v.totalPaid || 0) === 0 && (
                  <button onClick={() => { setViewFor(null); openEdit(v); }} className="mr-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">Edit</button>
                )}
                <button onClick={() => setViewFor(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {payFor && (
        <Modal
          title="Payment History"
          subtitle={`${payFor.employeeName} · Balance ${money(payFor.remainingBalance)} · ${payFor.status}`}
          onClose={() => setPayFor(null)}
        >
          <div className="border border-gray-200 rounded-lg divide-y mb-4">
            {payments.length === 0 && <p className="p-4 text-sm text-gray-500">No payments yet.</p>}
            {payments.map(p => (
              <div key={p.id} className="p-3 flex justify-between text-sm">
                <span>{p.payPeriod}</span>
                <span>{money(p.amountPaid)} <span className="text-gray-400 text-xs">→ bal {money(p.remainingBalance)}</span></span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Deductions are taken from the payslip and recorded automatically when the payroll run is approved.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default LoanAccountsTab;