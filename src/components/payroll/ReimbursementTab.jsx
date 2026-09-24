import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field, money, today } from './Shared';

const ReimbursementTab = ({ employees, canEdit }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employeeId: '', amount: '', reimbursementDate: today(), reason: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/payroll/reimbursements');
      setRows(r.success ? r.data || [] : []);
    } catch (e) {
      toast.error('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.reimbursementDate) {
      toast.error('Employee, amount and date are required'); return;
    }
    try {
      await api.post('/payroll/reimbursements', {
        employeeId: Number(form.employeeId),
        amount: Number(form.amount),
        reimbursementDate: form.reimbursementDate,
        reason: form.reason || null,
      });
      toast.success('Reimbursement added');
      setForm(p => ({ ...p, amount: '', reason: '' }));
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this reimbursement?')) return;
    try {
      await api.delete(`/payroll/reimbursements/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const STATUS_STYLE = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={add} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <Field label="Employee" required>
            <select className={inputCls} value={form.employeeId}
              onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Select...</option>
              {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </Field>
          <Field label="Date" required>
            <input type="date" className={inputCls} value={form.reimbursementDate}
              onChange={(e) => setForm(p => ({ ...p, reimbursementDate: e.target.value }))} />
          </Field>
          <Field label="Amount" required>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.amount}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
          </Field>
          <Field label="Reason">
            <input className={inputCls} value={form.reason} placeholder="e.g. Taxi fare, client lunch"
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} />
          </Field>
          <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Add Reimbursement
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Employee', 'Amount', 'Reason', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No reimbursements yet</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{r.reimbursementDate}</td>
                <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                <td className="px-4 py-3">{money(r.amount)}</td>
                <td className="px-4 py-3 text-gray-600">{r.reason || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[r.status] || ''}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canEdit && r.status !== 'APPROVED' && (
                    <button onClick={() => del(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Reimbursements dated inside a payroll run's period are picked up automatically when the run is created or regenerated, then marked APPROVED.
      </p>
    </div>
  );
};

export default ReimbursementTab;