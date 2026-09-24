import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const today = () => new Date().toISOString().slice(0, 10);

const EmployeeCompensationModal = ({ employee, canEdit, onClose }) => {
  const [payTypes, setPayTypes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ payTypeId: '', amount: '', effectiveDate: today(), endDate: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [pt, as] = await Promise.all([
        api.get('/pay-types'),
        api.get(`/employee-pay-types?employeeId=${employee.employeeId}`),
      ]);
      setPayTypes(pt.success ? pt.data || [] : []);
      setAssignments(as.success ? as.data || [] : []);
    } catch (e) {
      toast.error('Failed to load compensation');
    }
  };

  const onPayTypeChange = (id) => {
    const pt = payTypes.find(p => String(p.payTypeId) === id);
    setForm(prev => ({ ...prev, payTypeId: id, amount: pt?.defaultAmount ?? prev.amount }));
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.payTypeId || form.amount === '' || !form.effectiveDate) {
      toast.error('Pay type, amount, and effective date are required');
      return;
    }
    try {
      await api.post('/employee-pay-types', {
        employeeId: employee.employeeId,
        payTypeId: Number(form.payTypeId),
        amount: Number(form.amount),
        effectiveDate: form.effectiveDate,
        endDate: form.endDate || null,
      });
      toast.success('Added');
      setForm({ payTypeId: '', amount: '', effectiveDate: today(), endDate: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const endToday = async (a) => {
    try {
      await api.put(`/employee-pay-types/${a.employeePayTypeId}`, {
        employeeId: a.employeeId, payTypeId: a.payTypeId, amount: a.amount,
        effectiveDate: a.effectiveDate, endDate: today(),
      });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.payTypeName}?`)) return;
    try {
      await api.delete(`/employee-pay-types/${a.employeePayTypeId}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to remove');
    }
  };

  const money = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v ?? 0);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compensation</h2>
            <p className="text-sm text-gray-500">{employee.fullName} · Basic: {money(employee.basicSalary)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border border-gray-200 rounded-lg divide-y">
            {assignments.length === 0 && <p className="p-4 text-sm text-gray-500">No recurring pay types assigned.</p>}
            {assignments.map(a => (
              <div key={a.employeePayTypeId} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {a.payTypeName}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${a.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {a.active ? 'Active' : 'Ended / Upcoming'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {a.category} · {money(a.amount)} · {a.effectiveDate} → {a.endDate || 'ongoing'}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    {a.active && !a.endDate && (
                      <button onClick={() => endToday(a)} className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">End today</button>
                    )}
                    <button onClick={() => remove(a)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Pay Type</label>
                <select className={inputCls} value={form.payTypeId} onChange={(e) => onPayTypeChange(e.target.value)}>
                  <option value="">Select...</option>
                  {payTypes.map(p => <option key={p.payTypeId} value={p.payTypeId}>{p.payTypeName} ({p.category})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Effective</label>
                <input type="date" className={inputCls} value={form.effectiveDate} onChange={(e) => setForm(p => ({ ...p, effectiveDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End (optional)</label>
                <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Assign</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeCompensationModal;