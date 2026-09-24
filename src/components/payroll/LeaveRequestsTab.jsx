import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X as XIcon, Ban, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, today, Field, Modal } from './Shared';

const STATUS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const weekdays = (from, to) => {
  if (!from || !to || to < from) return 0;
  let n = 0;
  for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
};

const EMPTY = { employeeId: '', leaveTypeId: '', dateFrom: today(), dateTo: today(), daysUsed: '' };

const LeaveRequestsTab = ({ employees, leaveTypes, canCreate, canEdit, canDelete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leave-transactions${statusFilter ? `?status=${statusFilter}` : ''}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(t => !q || (t.employeeName || '').toLowerCase().includes(q));
  }, [items, search]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.leaveTypeId || !form.dateFrom || !form.dateTo) {
      toast.error('Employee, leave type and dates are required');
      return;
    }
    try {
      await api.post('/leave-transactions', {
        employeeId: Number(form.employeeId),
        leaveTypeId: Number(form.leaveTypeId),
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        daysUsed: form.daysUsed === '' ? null : Number(form.daysUsed),
      });
      toast.success('Leave request filed');
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to file request');
    }
  };

  const act = async (id, action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await api.patch(`/leave-transactions/${id}/${action}`);
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete this leave request for ${t.employeeName}?`)) return;
    try {
      await api.delete(`/leave-transactions/${t.id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-end">
        <Field label="Search employee" className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Type a name..." className={`${inputCls} pl-9`}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Field>
        <Field label="Status">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            {Object.keys(STATUS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {canCreate && (
          <button onClick={() => { setForm(EMPTY); setShow(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">
            <Plus size={18} /> File Leave
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No leave requests</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="text-sm hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.employeeName}</td>
                <td className="px-4 py-3">{t.leaveTypeName}</td>
                <td className="px-4 py-3">{t.dateFrom}</td>
                <td className="px-4 py-3">{t.dateTo}</td>
                <td className="px-4 py-3">{t.daysUsed}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS[t.status] || ''}`}>{t.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && t.status === 'PENDING' && (
                      <>
                        <button onClick={() => act(t.id, 'approve')} title="Approve" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Check size={17} /></button>
                        <button onClick={() => act(t.id, 'reject', 'Reject this request?')} title="Reject" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><XIcon size={17} /></button>
                      </>
                    )}
                    {canEdit && (t.status === 'PENDING' || t.status === 'APPROVED') && (
                      <button onClick={() => act(t.id, 'cancel', 'Cancel this request?')} title="Cancel" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Ban size={17} /></button>
                    )}
                    {canDelete && t.status !== 'APPROVED' && (
                      <button onClick={() => remove(t)} title="Delete" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={17} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="File Leave" onClose={() => setShow(false)} maxW="max-w-lg">
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <Field label="Employee" required className="col-span-2">
              <select className={inputCls} value={form.employeeId} onChange={set('employeeId')}>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Leave Type" required className="col-span-2">
              <select className={inputCls} value={form.leaveTypeId} onChange={set('leaveTypeId')}>
                <option value="">Select...</option>
                {leaveTypes.map(t => <option key={t.leaveTypeId} value={t.leaveTypeId}>{t.leaveTypeName}</option>)}
              </select>
            </Field>
            <Field label="From" required><input type="date" className={inputCls} value={form.dateFrom} onChange={set('dateFrom')} /></Field>
            <Field label="To" required><input type="date" className={inputCls} value={form.dateTo} onChange={set('dateTo')} /></Field>
            <Field label="Days (blank = weekdays)" className="col-span-2">
              <input type="number" min="0.5" step="0.5" className={inputCls} value={form.daysUsed} onChange={set('daysUsed')} placeholder={`Auto: ${weekdays(form.dateFrom, form.dateTo)}`} />
            </Field>
            <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">File</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveRequestsTab;