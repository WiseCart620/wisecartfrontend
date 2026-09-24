import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field, Modal, STATUS_STYLE } from './Shared';

const CONFIG = {
  loans: { base: '/loans', label: 'Loan', amountKey: 'loanAmount', docKey: 'docRefference', agency: true },
  cash: { base: '/cash-advances', label: 'Cash Advance', amountKey: 'advanceAmount', docKey: 'docReferrence', agency: false },
};

const EMPTY = { employeeId: '', agencyId: '', loanType: '', amount: '', amortization: '', durationMonths: '', startTerm: today(), endTerm: '', applicationNo: '', doc: '', deductionSchedule: 'SPLIT' };

const LoanAccountsTab = ({ kind, employees, agencies, canCreate, canEdit }) => {
  const cfg = CONFIG[kind];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [payFor, setPayFor] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ payPeriod: today(), amountPaid: '' });

  useEffect(() => { load(); }, [kind]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(cfg.base);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error(`Failed to load ${cfg.label.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.amortization || !form.startTerm) {
      toast.error('Employee, amount, amortization and start date are required');
      return;
    }
    const payload = {
      employeeId: Number(form.employeeId),
      [cfg.amountKey]: Number(form.amount),
      amortization: Number(form.amortization),
      durationMonths: form.durationMonths ? Number(form.durationMonths) : null,
      startTerm: form.startTerm,
      endTerm: form.endTerm || null,
      applicationNo: form.applicationNo || null,
      [cfg.docKey]: form.doc || null,
    };
    payload.deductionSchedule = form.deductionSchedule || 'SPLIT';
    if (cfg.agency) {
      payload.agencyId = form.agencyId ? Number(form.agencyId) : null;
      payload.loanType = form.loanType || null;
    }
    try {
      await api.post(cfg.base, payload);
      toast.success(`${cfg.label} created`);
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const openPayments = async (item) => {
    setPayFor(item);
    setPayForm({ payPeriod: today(), amountPaid: item.amortization ? Math.min(item.amortization, item.remainingBalance) : '' });
    await loadPayments(item.id);
  };

  const loadPayments = async (id) => {
    try {
      const res = await api.get(`${cfg.base}/${id}/payments`);
      setPayments(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load payments');
    }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amountPaid) { toast.error('Enter an amount'); return; }
    try {
      const res = await api.post(`${cfg.base}/${payFor.id}/payments`, {
        payPeriod: payForm.payPeriod || null,
        amountPaid: Number(payForm.amountPaid),
      });
      toast.success('Payment recorded');
      const updated = res.data;
      if (updated) setPayFor(updated);
      setPayForm(p => ({ ...p, amountPaid: '' }));
      await loadPayments(payFor.id);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    }
  };

  const cancel = async (item) => {
    if (!window.confirm(`Cancel this ${cfg.label.toLowerCase()} for ${item.employeeName}?`)) return;
    try {
      await api.patch(`${cfg.base}/${item.id}/cancel`);
      toast.success('Cancelled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add {cfg.label}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', cfg.agency ? 'Agency / Type' : 'Reference', 'Amount', 'Amortization', 'Term', 'Paid', 'Balance', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">No records</td></tr>
            ) : items.map(i => (
              <tr key={i.id} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3 font-medium text-gray-900">{i.employeeName}</td>
                <td className="px-4 py-3 text-gray-700">
                  {cfg.agency ? (<><div>{i.agencyName || '—'}</div><div className="text-xs text-gray-500">{i.loanType || ''}</div></>) : (i.applicationNo || '—')}
                </td>
                <td className="px-4 py-3">{money(i.amount)}</td>
                <td className="px-4 py-3">{money(i.amortization)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{i.startTerm} → {i.endTerm}</td>
                <td className="px-4 py-3">{money(i.totalPaid)}</td>
                <td className="px-4 py-3 font-medium">{money(i.remainingBalance)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[i.status] || ''}`}>{i.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openPayments(i)} title="Payments" className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"><Wallet size={17} /></button>
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
        <Modal title={`Add ${cfg.label}`} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee" required className="md:col-span-2">
              <select className={inputCls} value={form.employeeId} onChange={set('employeeId')}>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </Field>
            {cfg.agency && (
              <>
                <Field label="Agency">
                  <select className={inputCls} value={form.agencyId} onChange={set('agencyId')}>
                    <option value="">None (company loan)</option>
                    {agencies.map(a => <option key={a.agencyId} value={a.agencyId}>{a.name}</option>)}
                  </select>
                </Field>
                <Field label="Loan Type"><input className={inputCls} value={form.loanType} onChange={set('loanType')} placeholder="e.g. Salary Loan, Housing" /></Field>
              </>
            )}
            <Field label={`${cfg.label} Amount`} required><input type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={set('amount')} /></Field>
            <Field label="Amortization (monthly)" required><input type="number" min="0" step="0.01" className={inputCls} value={form.amortization} onChange={set('amortization')} /></Field>
            <Field label="Duration (months)"><input type="number" min="1" className={inputCls} value={form.durationMonths} onChange={set('durationMonths')} placeholder="auto if blank" /></Field>
            <Field label="Start Date (first deduction)" required><input type="date" className={inputCls} value={form.startTerm} onChange={set('startTerm')} /></Field>
            <Field label="Deduction Schedule">
              <select className={inputCls} value={form.deductionSchedule || 'SPLIT'} onChange={set('deductionSchedule')}>
                <option value="SPLIT">Split across cutoffs (15th and 30th)</option>
                <option value="FIRST_CUTOFF">15th cutoff only</option>
                <option value="SECOND_CUTOFF">30th cutoff only</option>
              </select>
            </Field>
            <Field label="End Date"><input type="date" className={inputCls} value={form.endTerm} onChange={set('endTerm')} /></Field>
            <Field label="Application No."><input className={inputCls} value={form.applicationNo} onChange={set('applicationNo')} /></Field>
            <Field label="Document Reference" className="md:col-span-2"><input className={inputCls} value={form.doc} onChange={set('doc')} /></Field>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {payFor && (
        <Modal
          title="Payments"
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
          {canEdit && payFor.status === 'ACTIVE' && (
            <form onSubmit={addPayment} className="grid grid-cols-3 gap-3 items-end">
              <Field label="Pay Period"><input type="date" className={inputCls} value={payForm.payPeriod} onChange={(e) => setPayForm(p => ({ ...p, payPeriod: e.target.value }))} /></Field>
              <Field label="Amount"><input type="number" min="0" step="0.01" className={inputCls} value={payForm.amountPaid} onChange={(e) => setPayForm(p => ({ ...p, amountPaid: e.target.value }))} /></Field>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Record</button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default LoanAccountsTab;