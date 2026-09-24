import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls } from './Shared';

const AgenciesTab = ({ agencies, canCreate, canEdit, canDelete, onChanged }) => {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);

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
    <div className="max-w-xl">
      <div className="bg-white rounded-xl shadow-sm divide-y mb-4">
        {agencies.length === 0 && <p className="p-4 text-sm text-gray-500">No agencies yet.</p>}
        {agencies.map(a => (
          <div key={a.agencyId} className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{a.name}</span>
            <div className="flex gap-1">
              {canEdit && <button onClick={() => { setEditing(a); setName(a.name); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>}
              {canDelete && <button onClick={() => remove(a)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
            </div>
          </div>
        ))}
      </div>
      {(canCreate || canEdit) && (
        <form onSubmit={submit} className="flex gap-2">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name (e.g. SSS)" />
          {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Update' : 'Add'}</button>
        </form>
      )}
    </div>
  );
};

export default AgenciesTab;