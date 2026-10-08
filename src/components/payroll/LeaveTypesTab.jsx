import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, MoneyInput } from './Shared';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';
import SearchableSelect from './SearchableSelect';

const EMPTY = {
  leaveTypeName: '',
  probationaryMonthly: '0.5',
  regularMonthly: '1',
  annualResetProbationary: '0.5',
  annualResetRegular: '1',
  autoGrant: false,
};

const LeaveTypesTab = ({ leaveTypes, canCreate, canEdit, canDelete, onChanged }) => {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [typeQ, setTypeQ] = useState('');

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
      autoGrant: !!form.autoGrant,
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
      autoGrant: !!t.autoGrant,
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

  const filteredTypes = leaveTypes.filter(t =>
    !typeQ.trim() || (t.leaveTypeName || '').toLowerCase().includes(typeQ.trim().toLowerCase()));
  const { pageItems, paginationProps, totalItems } = usePagination(filteredTypes, typeQ);

  return (
    <div className="max-w-5xl">
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 max-w-sm">
          <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
          <SearchableSelect
            allLabel="All leave types" allowCustom placeholder="All leave types"
            searchPlaceholder="Search leave type..."
            value={typeQ}
            options={leaveTypes.map(t => ({ value: t.leaveTypeName, label: t.leaveTypeName }))}
            onChange={(v) => setTypeQ(v || '')}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card mb-4">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-white">
              <tr>
                {['Leave Type', 'Monthly (under 1 yr)', 'Regular Monthly (unused)', 'Probi Reset (unused)', 'Yearly (after 1 yr)', 'Auto-grant', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {filteredTypes.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No leave types yet</td></tr>
              ) : pageItems.map(t => (
                <tr key={t.leaveTypeId} className="hover:bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.leaveTypeName}</td>
                  <td className="px-4 py-3">{fmt(t.probationaryMonthly, '0.5')}</td>
                  <td className="px-4 py-3">{fmt(t.regularMonthly, '1')}</td>
                  <td className="px-4 py-3">{fmt(t.annualResetProbationary, '0.5')}</td>
                  <td className="px-4 py-3">{fmt(t.annualResetRegular, '1')}</td>
                  <td className="px-4 py-3">{t.autoGrant ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => startEdit(t)} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><Edit2 size={16} /></button>}
                      {canDelete && <button onClick={() => remove(t)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && <Pagination {...paginationProps} />}
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Monthly (under 1 yr)</label>
            <MoneyInput className={inputCls} value={form.probationaryMonthly} onChange={set('probationaryMonthly')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Regular Monthly (unused)</label>
            <MoneyInput className={inputCls} value={form.regularMonthly} onChange={set('regularMonthly')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Probi Reset (unused)</label>
            <MoneyInput className={inputCls} value={form.annualResetProbationary} onChange={set('annualResetProbationary')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Yearly (after 1 yr)</label>
            <MoneyInput className={inputCls} value={form.annualResetRegular} onChange={set('annualResetRegular')} />
          </div>
          <label className="md:col-span-5 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!form.autoGrant}
              onChange={(e) => setForm(p => ({ ...p, autoGrant: e.target.checked }))} />
            Give this leave to every employee automatically (leave off to grant it manually)
          </label>
          <div className="md:col-span-5 flex justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="px-4 py-2 border border-gray-300 rounded text-sm">
                Cancel edit
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">
              {editing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LeaveTypesTab;