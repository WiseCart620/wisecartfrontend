import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Ban, Paperclip, Eye, Edit2, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, money, today, Field, Modal, STATUS_STYLE, MoneyInput } from './Shared';
import SearchableSelect from './SearchableSelect';
import EmployeeAvatar from './EmployeeAvatar';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const TYPE_LABEL = { ONE_TIME: 'One-time', RECURRING: 'Recurring' };
const SCHEDULE_LABEL = { SPLIT: 'Split (15th & 30th)', FIRST_CUTOFF: '15th only', SECOND_CUTOFF: '30th only' };
const EMPTY = {
  employeeId: '', amount: '', purpose: '', advanceType: 'ONE_TIME',
  dateReleased: today(), startTerm: '', endTerm: '', deductionSchedule: 'SPLIT',
};
const OPEN_END = '2099-12-31';
const OPEN_START = '2000-01-01';
const isOpenStart = (d) => !d || d <= '2000-01-01';
const isOpen = (d) => !d || d >= '2099-01-01';

const serveUrl = (path) => `/files/serve?path=${encodeURIComponent(path)}`;
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const fmtShort = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  ACTIVE: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  PAID: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CANCELLED: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};
const STATUS_LABEL = { PENDING: 'Pending', ACTIVE: 'Active', PAID: 'Paid', CANCELLED: 'Cancelled' };
const monthDiff = (a, b) => {
  const x = new Date(a + 'T00:00:00');
  const y = new Date(b + 'T00:00:00');
  return (y.getFullYear() - x.getFullYear()) * 12 + (y.getMonth() - x.getMonth());
};
// inclusive number of monthly deductions between start and end
const monthsBetween = (start, end) => (start && end && end >= start ? monthDiff(start, end) + 1 : 0);

const Detail = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="mt-0.5 text-sm text-gray-900 break-words">{children || '—'}</div>
  </div>
);

const CashAdvanceTab = ({ employees, canCreate, canEdit }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewFor, setViewFor] = useState(null);
  const [payments, setPayments] = useState([]);
  const { user } = useAuth();
  const canApprove = can(user, 'employees', 'ca_approve');
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cash-advances');
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load cash advances');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (id) => {
    try {
      const res = await api.get(`/cash-advances/${id}/payments`);
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

  const update = (patch) => setForm(p => ({ ...p, ...patch }));
  const set = (k) => (e) => update({ [k]: e.target.value });
  const recurring = form.advanceType === 'RECURRING';

  const openAdd = () => { setEditing(null); setForm(EMPTY); setFile(null); setShowForm(true); };

  const openEdit = (i) => {
    setEditing(i);
    setFile(null);
    setForm({
      employeeId: String(i.employeeId),
      amount: String(i.amount ?? ''),
      purpose: i.purpose || '',
      advanceType: i.advanceType || 'ONE_TIME',
      dateReleased: i.dateReleased || today(),
      startTerm: i.advanceType === 'RECURRING' && !isOpenStart(i.startTerm) ? i.startTerm : '',
      endTerm: i.advanceType === 'RECURRING' && !isOpen(i.endTerm) ? i.endTerm : '',
      deductionSchedule: i.deductionSchedule || 'SPLIT',
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.purpose.trim()) {
      toast.error('Employee, amount and purpose are required');
      return;
    }
    if (!recurring && !form.dateReleased) { toast.error('Date released is required'); return; }
    if (recurring && form.endTerm && form.endTerm < today()) {
      toast.error('End date cannot be in the past');
      return;
    }
    if (recurring && form.startTerm && form.endTerm && form.endTerm < form.startTerm) {
      toast.error('End date cannot be before start date');
      return;
    }
    setSaving(true);
    try {
      let docPath = null;
      if (file) {
        const fd = new FormData();
        fd.append('title', `Cash Advance - ${form.purpose.trim()}`);
        fd.append('file', file);
        const up = await api.upload(`/employees/${form.employeeId}/contracts`, fd);
        if (!up.success) { toast.error('Document upload failed'); return; }
        docPath = up.data?.fileUrl || null;
      }
      const amount = Number(form.amount);
      const start = recurring ? (form.startTerm || OPEN_START) : form.dateReleased;
      const months = 1;
      const body = {
        employeeId: Number(form.employeeId),
        advanceType: form.advanceType,
        purpose: form.purpose.trim(),
        advanceAmount: amount,
        amortization: amount,
        durationMonths: months,
        dateReleased: recurring ? null : form.dateReleased,
        startTerm: start,
        endTerm: recurring ? (form.endTerm || OPEN_END) : form.dateReleased,
        deductionSchedule: recurring ? form.deductionSchedule : 'SPLIT',
        docReferrence: docPath ?? (editing ? editing.docReference || null : null),
      };
      const res = editing
        ? await api.put(`/cash-advances/${editing.id}`, body)
        : await api.post('/cash-advances', body);
      if (res && res.success === false) return;
      toast.success(editing ? 'Cash advance updated' : 'Cash advance created');
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

  const approve = async (item) => {
    if (!window.confirm(`Approve this cash advance for ${item.employeeName}? It will be deducted in payroll runs.`)) return;
    try {
      await api.patch(`/cash-advances/${item.id}/approve`);
      toast.success('Cash advance approved');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const cancel = async (item) => {
    if (!window.confirm(`Cancel this cash advance for ${item.employeeName}?`)) return;
    try {
      await api.patch(`/cash-advances/${item.id}/cancel`);
      toast.success('Cancelled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Permanently delete this cancelled cash advance for ${item.employeeName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/cash-advances/${item.id}`);
      toast.success('Cash advance deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
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

  const photoOf = Object.fromEntries((employees || []).map(e => [e.employeeId, e.photoUrl]));
  const filtered = items.filter(i => {
    const q = filters.search.trim().toLowerCase();
    if (q && !(i.employeeName || '').toLowerCase().includes(q)) return false;
    if (filters.status && i.status !== filters.status) return false;
    if (filters.type && i.advanceType !== filters.type) return false;
    return true;
  });
  const hasFilters = Object.values(filters).some(Boolean);
  const { pageItems, paginationProps, totalItems } =
    usePagination(filtered, JSON.stringify(filters));
  const active = filtered.filter(r => r.status === 'ACTIVE');
  const sum = (k) => active.reduce((s, r) => s + Number(r[k] || 0), 0);
  const stats = [
    ['Active cash advances', active.length],
    ['Employees with advances', new Set(active.map(r => r.employeeId)).size],
    ['Total advanced', money(sum('amount'))],
    ['Outstanding balance', money(sum('remainingBalance'))],
  ];

  const periodOf = (i) => i.advanceType === 'RECURRING'
    ? `${i.startTerm} → ${isOpen(i.endTerm) ? 'Open' : i.endTerm}`
    : `Released ${i.dateReleased || i.startTerm || '—'}`;

  return (
    <div>
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-gray-50 pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
            <SearchableSelect
              allLabel="All employees" allowCustom placeholder="All employees"
              searchPlaceholder="Search employee..."
              value={filters.search}
              options={[...new Set(items.map(i => i.employeeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
              onChange={(v) => setFilters(p => ({ ...p, search: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <SearchableSelect
              allLabel="All statuses" typeable={false} value={filters.status}
              options={[{ value: 'PENDING', label: 'Pending approval' }, { value: 'ACTIVE', label: 'Active' }, { value: 'PAID', label: 'Paid' }, { value: 'CANCELLED', label: 'Cancelled' }]}
              onChange={(v) => setFilters(p => ({ ...p, status: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <SearchableSelect
              allLabel="All types" typeable={false} value={filters.type}
              options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
              onChange={(v) => setFilters(p => ({ ...p, type: v }))}
            />
          </div>
          {hasFilters && (
            <button type="button" onClick={() => setFilters({ search: '', status: '', type: '' })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Clear</button>
          )}
          {canCreate && (
            <button onClick={openAdd}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              <Plus size={16} /> Add Cash Advance
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm px-5 py-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-semibold text-gray-900 mt-1">{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card">
        <div className="overflow-auto w-full tbl-scroll">
         <table className="w-full min-w-0 [&_th]:!px-3 [&_td]:!px-3">
            <thead className="bg-gray-50">
              <tr>
                {['Employee', 'Type', 'Purpose', 'Amount', 'Period', 'Paid', 'Balance', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {loading ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                  {hasFilters ? 'No cash advances match the filters' : 'No records'}
                </td></tr>
              ) : pageItems.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 font-medium text-gray-900">
                      <EmployeeAvatar name={i.employeeName} photoUrl={photoOf[i.employeeId]} />
                      {i.employeeName}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${i.advanceType === 'RECURRING' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
                      {TYPE_LABEL[i.advanceType] || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={i.purpose}>{i.purpose || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{money(i.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {i.advanceType === 'RECURRING' ? 'per month' : 'within 1 month'} ·{' '}
                      {i.advanceType !== 'RECURRING' || i.deductionSchedule === 'SPLIT'
                        ? `${money(Number(i.amount || 0) / 2)} per cutoff`
                        : `${money(i.amount)} on ${SCHEDULE_LABEL[i.deductionSchedule]}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                    {i.advanceType === 'RECURRING' ? (
                      <>
                        <div>{isOpenStart(i.startTerm) ? 'Every payroll run' : fmtShort(i.startTerm)}</div>
                        <div className="text-gray-400">to {isOpen(i.endTerm) ? 'Open' : fmtShort(i.endTerm)}</div>
                      </>
                    ) : (
                      <>
                        <div>Released</div>
                        <div className="text-gray-400">{fmtShort(i.dateReleased || i.startTerm)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(i.totalPaid)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {i.advanceType === 'RECURRING' ? <span className="text-gray-400">—</span> : money(i.remainingBalance)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[i.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[i.status] || i.status}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {i.approvedBy ? `Approved by ${i.approvedBy}` : i.status === 'PENDING' ? 'Awaiting approval' : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      {i.docReference && i.docReference.startsWith('contracts/') && (
                        <button onClick={() => viewDoc(i.docReference)} title="View document" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Paperclip size={17} /></button>
                      )}
                      <button onClick={() => openView(i)} title="View details & payments" className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"><Eye size={17} /></button>
                      {canApprove && i.status === 'PENDING' && (
                        <button onClick={() => approve(i)} title="Approve" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={17} /></button>
                      )}
                      {canEdit && i.status === 'PENDING' && (
                        <button onClick={() => openEdit(i)} title="Edit" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><Edit2 size={17} /></button>
                      )}
                      {canEdit && (i.status === 'ACTIVE' || i.status === 'PENDING') && (
                        <button onClick={() => cancel(i)} title="Cancel" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Ban size={17} /></button>
                      )}
                      {canEdit && i.status === 'CANCELLED' && (
                        <button onClick={() => remove(i)} title="Delete" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={17} /></button>
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

      {showForm && (
        <Modal title={editing ? 'Edit Cash Advance' : 'Add Cash Advance'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-6">
            {/* Section 1: Employee, type, amount */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 mb-4 border-b border-gray-200">
                Cash Advance Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Employee" required>
                  <SearchableSelect
                    disabled={!!editing}
                    placeholder="Select employee..."
                    searchPlaceholder="Search employee..."
                    value={form.employeeId}
                    options={employees.map(e => ({ value: String(e.employeeId), label: e.fullName }))}
                    onChange={(v) => update({ employeeId: v })}
                  />
                </Field>
                <Field label="Type" required>
                  <SearchableSelect
                    typeable={false}
                    value={form.advanceType}
                    options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
                    onChange={(v) => update({ advanceType: v || 'ONE_TIME' })}
                  />
                </Field>
                <Field label={recurring ? 'Monthly Deduction Amount' : 'Amount'} required>
                  <MoneyInput className={inputCls} value={form.amount} onChange={set('amount')} />
                  <p className="text-xs text-gray-500 mt-1">
                    {recurring
                      ? 'Deducted every month based on the schedule below.'
                      : 'Deducted within 1 month, split across both cutoffs.'}
                  </p>
                </Field>
                {!recurring && (
                  <Field label="Date Released" required>
                    <input type="date" className={inputCls} value={form.dateReleased} onChange={set('dateReleased')} />
                  </Field>
                )}
              </div>
            </div>

            {/* Section 2: Deduction terms (recurring only) */}
            {recurring && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 mb-4 border-b border-gray-200">
                  Deduction Terms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Deduction Schedule" required className="md:col-span-2">
                    <SearchableSelect
                      typeable={false}
                      value={form.deductionSchedule}
                      options={Object.entries(SCHEDULE_LABEL).map(([value, label]) => ({ value, label }))}
                      onChange={(v) => update({ deductionSchedule: v || 'SPLIT' })}
                    />
                  </Field>
                  <Field label="Start Date (optional)">
                    <input type="date" className={inputCls} value={form.startTerm} onChange={set('startTerm')} />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to start on the next payroll run.</p>
                  </Field>
                  <Field label="End Date (optional)">
                    <input type="date" className={inputCls} value={form.endTerm} onChange={set('endTerm')} />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to keep deducting.</p>
                  </Field>
                </div>
              </div>
            )}

            {/* Last fields: Purpose, then Document at the very bottom */}
            <div className="space-y-4">
              <Field label="Purpose" required>
                <textarea rows={3} className={inputCls} value={form.purpose} onChange={set('purpose')}
                  placeholder="e.g. medical, tuition, emergency" />
              </Field>
              <Field label="Document (optional)">
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={inputCls}
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-gray-500 mt-1">PDF, Word or image. Also saved under the employee's Documents.</p>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update Cash Advance' : 'Create Cash Advance'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewFor && (() => {
        const v = items.find(x => x.id === viewFor.id) || viewFor;
        return (
          <Modal title="Cash Advance Details" subtitle={`${v.employeeName} · ${TYPE_LABEL[v.advanceType] || 'Cash advance'}`} onClose={() => setViewFor(null)}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-gray-200 border-y border-gray-200 py-4">
                <div className="sm:pr-6"><div className="text-sm text-gray-500">Amount</div><div className="text-2xl font-semibold mt-1">{money(v.amount)}</div></div>
                <div className="sm:px-6"><div className="text-sm text-gray-500">Total Paid</div><div className="text-2xl font-semibold mt-1">{money(v.totalPaid)}</div></div>
                <div className="sm:pl-6"><div className="text-sm text-gray-500">Balance</div><div className="text-2xl font-semibold mt-1">{v.advanceType === 'RECURRING' ? '—' : money(v.remainingBalance)}</div></div>              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
                <Detail label="Purpose">{v.purpose}</Detail>
                <Detail label="Status">{v.status}</Detail>
                {v.advanceType === 'RECURRING' ? (
                  <>
                    <Detail label="Start Date">{isOpenStart(v.startTerm) ? 'None (every payroll run)' : fmtDate(v.startTerm)}</Detail>
                    <Detail label="End Date">{isOpen(v.endTerm) ? 'Open' : fmtDate(v.endTerm)}</Detail>
                  </>
                ) : (
                  <Detail label="Date Released">{fmtDate(v.dateReleased || v.startTerm)}</Detail>
                )}
                <Detail label="Deduction">{money(v.amortization)}</Detail>
                {v.advanceType === 'RECURRING' && (
                  <Detail label="Deduction Schedule">{SCHEDULE_LABEL[v.deductionSchedule]}</Detail>
                )}
                <Detail label="Approved By">{v.approvedBy}</Detail>
                <Detail label="Document">
                  {v.docReference && v.docReference.startsWith('contracts/')
                    ? <button onClick={() => viewDoc(v.docReference)} className="inline-flex items-center gap-1 text-orange-600 hover:underline"><Paperclip size={14} /> View document</button>
                    : v.docReference}
                </Detail>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2"><Wallet size={14} /> Payment History</h3>
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
                          <td className="px-4 py-2 text-right text-gray-600">{v.advanceType === 'RECURRING' ? '—' : money(p.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">Payments are recorded automatically when a payroll run is approved.</p>
              </div>
              <div className="flex justify-end pt-2 border-t">
                <button onClick={() => setViewFor(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default CashAdvanceTab;