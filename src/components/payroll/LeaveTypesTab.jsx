import React, { useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field, Modal, MoneyInput } from './Shared';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';
import SearchableSelect from './SearchableSelect';

const EMPTY = { leaveTypeName: '', paid: true, maxPerMonth: '' };
const SYSTEM = ['Vacation Leave', 'Service Incentive Leave'];

const LeaveTypesTab = ({ leaveTypes, canCreate, canEdit, canDelete, onChanged }) => {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [typeQ, setTypeQ] = useState('');

  const openNew = () => { setEditing(null); setForm(EMPTY); setShow(true); };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      leaveTypeName: t.leaveTypeName,
      paid: t.paid !== false,
      maxPerMonth: t.maxPerMonth ?? '',
    });
    setShow(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.leaveTypeName.trim()) { toast.error('Leave type name is required'); return; }
    const payload = {
      leaveTypeName: form.leaveTypeName.trim(),
      paid: !!form.paid,
      maxPerMonth: form.paid && form.maxPerMonth !== '' ? Number(form.maxPerMonth) : null,
    };
    try {
      if (editing) await api.put(`/leave-types/${editing.leaveTypeId}`, payload);
      else await api.post('/leave-types', payload);
      toast.success('Saved');
      setShow(false);
      setEditing(null);
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
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

  const filteredTypes = leaveTypes.filter(t =>
    !typeQ.trim() || (t.leaveTypeName || '').toLowerCase().includes(typeQ.trim().toLowerCase()));
  const { pageItems, paginationProps, totalItems } = usePagination(filteredTypes, typeQ);

  return (
    <div className="max-w-5xl">
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex gap-4 items-end">
          <div className="max-w-sm flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
            <SearchableSelect
              allLabel="All leave types" allowCustom placeholder="All leave types"
              searchPlaceholder="Search leave type..."
              value={typeQ}
              options={leaveTypes.map(t => ({ value: t.leaveTypeName, label: t.leaveTypeName }))}
              onChange={(v) => setTypeQ(v || '')}
            />
          </div>
          {canCreate && (
            <button onClick={openNew}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm">
              <Plus size={18} /> Add Leave Type
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card mb-4">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-white">
              <tr>
                {['Leave Type', 'Pay', 'Max use per month', 'Granting', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {filteredTypes.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No leave types yet</td></tr>
              ) : pageItems.map(t => (
                <tr key={t.leaveTypeId} className="hover:bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.leaveTypeName}</td>
                  <td className="px-4 py-3">{t.paid === false ? 'Unpaid (unlimited)' : 'Paid'}</td>
                  <td className="px-4 py-3">{t.paid === false ? '—' : (t.maxPerMonth ?? 'No limit')}</td>
                  <td className="px-4 py-3 text-gray-500">{t.autoGrant ? 'Automatic (by tenure)' : 'Manual'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => startEdit(t)} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><Edit2 size={16} /></button>}
                      {canDelete && !SYSTEM.includes(t.leaveTypeName) && (
                        <button onClick={() => remove(t)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && <Pagination {...paginationProps} />}
      </div>

      {show && (
        <Modal title={editing ? `Edit "${editing.leaveTypeName}"` : 'New Leave Type'} onClose={() => setShow(false)} maxW="max-w-md">
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            <Field label="Leave Type Name" required>
              <input className={inputCls} value={form.leaveTypeName}
                readOnly={!!editing && SYSTEM.includes(editing.leaveTypeName)}
                onChange={(e) => setForm(p => ({ ...p, leaveTypeName: e.target.value }))}
                placeholder="e.g. Emergency Leave" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.paid}
                onChange={(e) => setForm(p => ({ ...p, paid: e.target.checked }))} />
              Paid leave (uncheck for unpaid leave = unlimited days)
            </label>
            {form.paid && (
              <Field label="Max use per month (blank = no limit)">
                <MoneyInput className={inputCls} value={form.maxPerMonth}
                  onChange={(e) => setForm(p => ({ ...p, maxPerMonth: e.target.value }))}
                  placeholder="e.g. 1" />
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">
                {editing ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveTypesTab;