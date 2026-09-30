import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Ban, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field, Modal, STATUS_STYLE, MoneyInput } from './Shared';

const LOAN_TYPES = ['Cash Advance', 'Salary Loan', 'Housing Loan', 'Emergency Loan'];
const EMPTY = {
  employeeId: '', agencyId: '', loanType: '', amount: '', durationMonths: '',
  amortization: '', deductionSchedule: 'SPLIT', startTerm: today(), endTerm: '',
};
const SCHEDULE_LABEL = { SPLIT: 'Split (15th & 30th)', FIRST_CUTOFF: '15th only', SECOND_CUTOFF: '30th only' };

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addMonths = (s, n) => {
  const d = new Date(s + 'T00:00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
};
const isCashAdvance = (t) => (t || '').trim().toLowerCase() === 'cash advance';
const serveUrl = (path) => `/files/serve?path=${encodeURIComponent(path)}`;

const LoanAccountsTab = ({ employees, agencies, canCreate, canEdit }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [payments, setPayments] = useState([]);
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
    if (isCashAdvance(n.loanType)) n.agencyId = '';
    const amt = Number(n.amount);
    const dur = Number(n.durationMonths);
    n.amortization = amt > 0 && dur > 0 ? (amt / dur).toFixed(2) : '';
    n.endTerm = n.startTerm && dur > 0 ? addMonths(n.startTerm, dur) : '';
    return n;
  });
  const set = (k) => (e) => update({ [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.loanType.trim() || !form.amount || !form.durationMonths || !form.startTerm) {
      toast.error('Employee, loan type, amount, duration and start date are required');
      return;
    }
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
      await api.post('/loans', {
        employeeId: Number(form.employeeId),
        agencyId: form.agencyId ? Number(form.agencyId) : null,
        loanType: form.loanType.trim(),
        loanAmount: Number(form.amount),
        durationMonths: Number(form.durationMonths),
        amortization: Number(form.amortization),
        deductionSchedule: form.deductionSchedule || 'SPLIT',
        startTerm: form.startTerm,
        endTerm: form.endTerm || null,
        docRefference: docPath,
      });
      toast.success('Loan created');
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

  const loanTypeOptions = [...new Set(items.map(i => i.loanType).filter(Boolean))].sort();
  const filtered = items.filter(i => {
    const q = filters.search.trim().toLowerCase();
    if (q && !(i.employeeName || '').toLowerCase().includes(q)) return false;
    if (filters.status && i.status !== filters.status) return false;
    if (filters.loanType && (i.loanType || '').toLowerCase() !== filters.loanType.toLowerCase()) return false;
    if (filters.schedule && i.deductionSchedule !== filters.schedule) return false;
    return true;
  });
  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (k) => (e) => setFilters(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <button onClick={() => { setForm(EMPTY); setFile(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add Loan
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
          <input className={inputCls} placeholder="Search name..." value={filters.search} onChange={setFilter('search')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select className={inputCls} value={filters.status} onChange={setFilter('status')}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loan Type</label>
          <select className={inputCls} value={filters.loanType} onChange={setFilter('loanType')}>
            <option value="">All</option>
            {loanTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
          <select className={inputCls} value={filters.schedule} onChange={setFilter('schedule')}>
            <option value="">All</option>
            <option value="SPLIT">Split (15th & 30th)</option>
            <option value="FIRST_CUTOFF">15th only</option>
            <option value="SECOND_CUTOFF">30th only</option>
          </select>
        </div>
        {hasFilters && (
          <button type="button" onClick={() => setFilters({ search: '', status: '', loanType: '', schedule: '' })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Clear</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Agency / Type', 'Amount', 'Amortization', 'Schedule', 'Term', 'Paid', 'Balance', 'Status', 'Document'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                {hasFilters ? 'No loans match the filters' : 'No records'}
              </td></tr>
            ) : filtered.map(i => (
              <tr key={i.id} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3 font-medium text-gray-900">{i.employeeName}</td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{i.agencyName || 'Company loan'}</div>
                  <div className="text-xs text-gray-500">{i.loanType || ''}</div>
                </td>
                <td className="px-4 py-3">{money(i.amount)}</td>
                <td className="px-4 py-3">{money(i.amortization)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {SCHEDULE_LABEL[i.deductionSchedule] || i.deductionSchedule || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{i.startTerm} → {i.endTerm}</td>
                <td className="px-4 py-3">{money(i.totalPaid)}</td>
                <td className="px-4 py-3 font-medium">{money(i.remainingBalance)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[i.status] || ''}`}>{i.status}</span>
                </td>
                <td className="px-4 py-3">
                  {i.docReference && i.docReference.startsWith('contracts/')
                    ? <button onClick={() => viewDoc(i.docReference)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"><Paperclip size={14} /> View</button>
                    : <span className="text-xs text-gray-500">{i.docReference || '—'}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openPayments(i)} title="Payment history" className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Wallet size={17} /></button>
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
        <Modal title="Add Loan" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee" required className="md:col-span-2">
              <select className={inputCls} value={form.employeeId} onChange={set('employeeId')}>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Agency">
              <select className={inputCls} value={form.agencyId} onChange={set('agencyId')}
                disabled={isCashAdvance(form.loanType)}>
                <option value="">None (company loan)</option>
                {agencies.map(a => <option key={a.agencyId} value={a.agencyId}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Loan Type" required>
              <input className={inputCls} list="loan-types" value={form.loanType} onChange={set('loanType')}
                placeholder="Select or type..." />
              <datalist id="loan-types">
                {LOAN_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
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
              <select className={inputCls} value={form.deductionSchedule} onChange={set('deductionSchedule')}>
                <option value="SPLIT">Split across cutoffs (15th and 30th)</option>
                <option value="FIRST_CUTOFF">15th cutoff only</option>
                <option value="SECOND_CUTOFF">30th cutoff only</option>
              </select>
            </Field>
            <Field label="Start Date (first deduction)" required>
              <input type="date" className={inputCls} value={form.startTerm} onChange={set('startTerm')} />
            </Field>
            <Field label="End Date (auto)">
              <input type="date" className={`${inputCls} bg-gray-100`} readOnly value={form.endTerm} />
            </Field>
            <Field label="Document (optional)" className="md:col-span-2">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={inputCls}
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-500 mt-1">Also saved under the employee's Documents.</p>
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

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