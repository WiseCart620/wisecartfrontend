import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Ban, Paperclip, Eye, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field, Modal, STATUS_STYLE, MoneyInput } from './Shared';
import SearchableSelect from './SearchableSelect';
import EmployeeAvatar from './EmployeeAvatar';

const TYPE_LABEL = { ONE_TIME: 'One-time', RECURRING: 'Recurring' };
const SCHEDULE_LABEL = { SPLIT: 'Split (15th & 30th)', FIRST_CUTOFF: '15th only', SECOND_CUTOFF: '30th only' };
const EMPTY = {
  employeeId: '', amount: '', purpose: '', advanceType: 'ONE_TIME',
  dateReleased: today(), startTerm: today(), endTerm: '', monthlyDeduction: '',
  deductionSchedule: 'SPLIT', approvedBy: '',
};

const serveUrl = (path) => `/files/serve?path=${encodeURIComponent(path)}`;
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
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

  // recurring with an end date: monthly deduction = amount / months (auto)
  const update = (patch) => setForm(p => {
    const n = { ...p, ...patch };
    if (n.advanceType === 'RECURRING' && n.endTerm) {
      const months = monthsBetween(n.startTerm, n.endTerm);
      const amt = Number(n.amount);
      if (months > 0 && amt > 0) n.monthlyDeduction = (amt / months).toFixed(2);
    }
    return n;
  });
  const set = (k) => (e) => update({ [k]: e.target.value });
  const recurring = form.advanceType === 'RECURRING';
  const autoMonthly = recurring && !!form.endTerm;

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
      startTerm: i.startTerm || today(),
      endTerm: i.advanceType === 'RECURRING' ? (i.endTerm || '') : '',
      monthlyDeduction: i.amortization != null ? Number(i.amortization).toFixed(2) : '',
      deductionSchedule: i.deductionSchedule || 'SPLIT',
      approvedBy: i.approvedBy || '',
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
    if (recurring) {
      if (!form.startTerm) { toast.error('Start date is required'); return; }
      if (form.endTerm && form.endTerm < form.startTerm) { toast.error('End date cannot be before the start date'); return; }
      if (!(Number(form.monthlyDeduction) > 0)) { toast.error('Monthly deduction is required'); return; }
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
      const months = recurring && form.endTerm ? monthsBetween(form.startTerm, form.endTerm) : null;
      const body = {
        employeeId: Number(form.employeeId),
        advanceType: form.advanceType,
        purpose: form.purpose.trim(),
        advanceAmount: amount,
        // one-time: the whole amount is deducted in one go, starting from the release date
        amortization: recurring ? Number(form.monthlyDeduction) : amount,
        durationMonths: recurring ? months : 1,
        dateReleased: recurring ? null : form.dateReleased,
        startTerm: recurring ? form.startTerm : form.dateReleased,
        endTerm: recurring ? (form.endTerm || null) : form.dateReleased,
        deductionSchedule: form.deductionSchedule || 'SPLIT',
        approvedBy: form.approvedBy.trim() || null,
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
  const active = filtered.filter(r => r.status === 'ACTIVE');
  const sum = (k) => active.reduce((s, r) => s + Number(r[k] || 0), 0);
  const stats = [
    ['Active cash advances', active.length],
    ['Employees with advances', new Set(active.map(r => r.employeeId)).size],
    ['Total advanced', money(sum('amount'))],
    ['Outstanding balance', money(sum('remainingBalance'))],
  ];
  const periodOf = (i) => i.advanceType === 'RECURRING'
    ? `${i.startTerm} → ${i.endTerm || 'Open'}`
    : `Released ${i.dateReleased || i.startTerm || '—'}`;

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add Cash Advance
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-end gap-3">
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
            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'PAID', label: 'Paid' }, { value: 'CANCELLED', label: 'Cancelled' }]}
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm px-5 py-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-semibold text-gray-900 mt-1">{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Type', 'Purpose', 'Amount', 'Deduction', 'Schedule', 'Period', 'Paid', 'Balance', 'Status', 'Approved By', 'Document'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="13" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="13" className="px-4 py-8 text-center text-gray-500">
                {hasFilters ? 'No cash advances match the filters' : 'No records'}
              </td></tr>
            ) : filtered.map(i => (
              <tr key={i.id} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <EmployeeAvatar name={i.employeeName} photoUrl={photoOf[i.employeeId]} />
                    {i.employeeName}
                  </div>
                </td>
                <td className="px-4 py-3">{TYPE_LABEL[i.advanceType] || '—'}</td>
                <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={i.purpose}>{i.purpose || '—'}</td>
                <td className="px-4 py-3">{money(i.amount)}</td>
                <td className="px-4 py-3">{money(i.amortization)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{SCHEDULE_LABEL[i.deductionSchedule] || i.deductionSchedule || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{periodOf(i)}</td>
                <td className="px-4 py-3">{money(i.totalPaid)}</td>
                <td className="px-4 py-3 font-medium">{money(i.remainingBalance)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[i.status] || ''}`}>{i.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-700">{i.approvedBy || '—'}</td>
                <td className="px-4 py-3">
                  {i.docReference && i.docReference.startsWith('contracts/')
                    ? <button onClick={() => viewDoc(i.docReference)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"><Paperclip size={14} /> View</button>
                    : <span className="text-xs text-gray-500">{i.docReference || '—'}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openView(i)} title="View details & payments" className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"><Eye size={17} /></button>
                    {canEdit && i.status === 'ACTIVE' && Number(i.totalPaid || 0) === 0 && (
                      <button onClick={() => openEdit(i)} title="Edit" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={17} /></button>
                    )}
                    {canEdit && i.status === 'ACTIVE' && (
                      <button onClick={() => cancel(i)} title="Cancel" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Ban size={17} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Cash Advance' : 'Add Cash Advance'} onClose={() => setShowForm(false)}>
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
            <Field label="Amount" required>
              <MoneyInput className={inputCls} value={form.amount} onChange={set('amount')} />
            </Field>
            <Field label="Type" required>
              <SearchableSelect
                typeable={false}
                value={form.advanceType}
                options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
                onChange={(v) => update({ advanceType: v || 'ONE_TIME' })}
              />
            </Field>
            <Field label="Purpose" required className="md:col-span-2">
              <input className={inputCls} value={form.purpose} onChange={set('purpose')}
                placeholder="e.g. medical, tuition, emergency" />
            </Field>

            {!recurring ? (
              <Field label="Date Released" required>
                <input type="date" className={inputCls} value={form.dateReleased} onChange={set('dateReleased')} />
              </Field>
            ) : (
              <>
                <Field label="Start Date" required>
                  <input type="date" className={inputCls} value={form.startTerm} onChange={set('startTerm')} />
                </Field>
                <Field label="End Date (optional)">
                  <input type="date" className={inputCls} value={form.endTerm} onChange={set('endTerm')} />
                </Field>
                <Field label={autoMonthly ? 'Monthly Deduction (auto)' : 'Monthly Deduction'} required>
                  <MoneyInput className={`${inputCls} ${autoMonthly ? 'bg-gray-100' : ''}`}
                    readOnly={autoMonthly} value={form.monthlyDeduction} onChange={set('monthlyDeduction')} />
                  <p className="text-xs text-gray-500 mt-1">
                    {autoMonthly ? 'Amount ÷ number of months.' : 'With no end date, it runs until the amount is fully paid.'}
                  </p>
                </Field>
              </>
            )}

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
            <Field label="Approved By">
              <input className={inputCls} value={form.approvedBy} onChange={set('approvedBy')} />
            </Field>
            <Field label="Document (optional)" className="md:col-span-2">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={inputCls}
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-500 mt-1">Also saved under the employee's Documents.</p>
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
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
                <div className="sm:pl-6"><div className="text-sm text-gray-500">Balance</div><div className="text-2xl font-semibold mt-1">{money(v.remainingBalance)}</div></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
                <Detail label="Purpose">{v.purpose}</Detail>
                <Detail label="Status">{v.status}</Detail>
                {v.advanceType === 'RECURRING' ? (
                  <>
                    <Detail label="Start Date">{fmtDate(v.startTerm)}</Detail>
                    <Detail label="End Date">{v.endTerm ? fmtDate(v.endTerm) : 'Open'}</Detail>
                  </>
                ) : (
                  <Detail label="Date Released">{fmtDate(v.dateReleased || v.startTerm)}</Detail>
                )}
                <Detail label="Deduction">{money(v.amortization)}</Detail>
                <Detail label="Deduction Schedule">{SCHEDULE_LABEL[v.deductionSchedule] || v.deductionSchedule}</Detail>
                <Detail label="Approved By">{v.approvedBy}</Detail>
                <Detail label="Document">
                  {v.docReference && v.docReference.startsWith('contracts/')
                    ? <button onClick={() => viewDoc(v.docReference)} className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Paperclip size={14} /> View document</button>
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
                    <tbody className="divide-y divide-gray-100">
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