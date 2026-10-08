import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls } from './Shared';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const AgenciesTab = ({ agencies, canCreate, canEdit, canDelete, onChanged }) => {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const { pageItems, paginationProps, totalItems } = usePagination(agencies, 'agencies');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editing) await api.put(`/agencies/${editing.agencyId}`, { name });
      else await api.post('/agencies', { name });
      toast.success('Saved');
      setName('');
      setEditing(null);
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try {
      await api.delete(`/agencies/${a.agencyId}`);
      toast.success('Deleted');
      onChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="divide-y overflow-auto max-h-[65vh]">
          {agencies.length === 0 && <p className="p-4 text-sm text-gray-500">No agencies yet.</p>}
          {pageItems.map(a => (
            <div key={a.agencyId} className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{a.name}</span>
              <div className="flex gap-1">
                {canEdit && <button onClick={() => { setEditing(a); setName(a.name); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><Edit2 size={16} /></button>}
                {canDelete && <button onClick={() => remove(a)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
        {totalItems > 0 && <Pagination {...paginationProps} />}
      </div>
      {(canCreate || canEdit) && (
        <form onSubmit={submit} className="flex gap-2">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name (e.g. SSS)" />
          {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className="px-3 py-2 border border-gray-300 rounded text-sm">Cancel</button>}
          <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">{editing ? 'Update' : 'Add'}</button>
        </form>
      )}
    </div>
  );
};

export default AgenciesTab;