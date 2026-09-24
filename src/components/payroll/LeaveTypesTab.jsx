import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls } from './Shared';

const EMPTY = {
  leaveTypeName: '',
  probationaryMonthly: '0.5',
  regularMonthly: '1',
  annualResetProbationary: '0.5',
  annualResetRegular: '1',
};

const LeaveTypesTab = ({ leaveTypes, canCreate, canEdit, canDelete, onChanged }) => {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.leaveTypeName.trim()) return;
    const payload = {
      leaveTypeName: form.leaveTypeName.trim(),
      probationaryMonthly: Number(form.probationaryMonthly),
      regularMonthly: Number(form.regularMonthly),
      annualResetProbationary: Number(form.annualResetProbationary),
      annualResetRegular: Number(form.annualResetRegular),
    };
    try {
      if (editing) await api.put(`/leave-types/${editing.leaveTypeId}`, payload);
      else await api.post('/leave-types', payload);
      toast.success('Saved');
      setForm(EMPTY);
      setEditing(null);
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      leaveTypeName: t.leaveTypeName,
      probationaryMonthly: t.probationaryMonthly ?? '0.5',
      regularMonthly: t.regularMonthly ?? '1',
      annualResetProbationary: t.annualResetProbationary ?? '0.5',
      annualResetRegular: t.annualResetRegular ?? '1',
    });
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.leaveTypeName}"?`)) return;
    try {
      await api.delete(`/leave-types/${t.leaveTypeId}`);
      toast.success('Deleted');
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const fmt = (v, fallback) => v == null ? fallback : v;

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Leave Type', 'Probi Monthly', 'Regular Monthly', 'Probi Reset', 'Regular Reset', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {leaveTypes.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No leave types yet</td></tr>
            ) : leaveTypes.map(t => (
              <tr key={t.leaveTypeId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.leaveTypeName}</td>
                <td className="px-4 py-3">{fmt(t.probationaryMonthly, '0.5')}</td>
                <td className="px-4 py-3">{fmt(t.regularMonthly, '1')}</td>
                <td className="px-4 py-3">{fmt(t.annualResetProbationary, '0.5')}</td>
                <td className="px-4 py-3">{fmt(t.annualResetRegular, '1')}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => startEdit(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>}
                    {canDelete && <button onClick={() => remove(t)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(canCreate || canEdit) && (
        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-5 text-sm font-semibold text-gray-900">
            {editing ? `Edit "${editing.leaveTypeName}"` : 'New leave type'}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type Name *</label>
            <input className={inputCls} value={form.leaveTypeName} onChange={set('leaveTypeName')} placeholder="e.g. Vacation Leave" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Probi Monthly</label>
            <input type="number" min="0" step="0.25" className={inputCls} value={form.probationaryMonthly} onChange={set('probationaryMonthly')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Regular Monthly</label>
            <input type="number" min="0" step="0.25" className={inputCls} value={form.regularMonthly} onChange={set('regularMonthly')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Probi Reset</label>
            <input type="number" min="0" step="0.25" className={inputCls} value={form.annualResetProbationary} onChange={set('annualResetProbationary')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Regular Reset</label>
            <input type="number" min="0" step="0.25" className={inputCls} value={form.annualResetRegular} onChange={set('annualResetRegular')} />
          </div>
          <div className="md:col-span-5 flex justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                Cancel edit
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {editing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LeaveTypesTab;