import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field, Modal } from './Shared';

const EMPTY = { employeeId: '', hmoProvider: '', planType: '', employeeShare: '', employerShare: '', effectiveDate: today(), endDate: '' };

const HmoTab = ({ employees, canCreate, canEdit, canDelete }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hmo');
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load HMO records');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const premium = (Number(form.employeeShare) || 0) + (Number(form.employerShare) || 0);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShow(true); };
  const openEdit = (h) => {
    setEditing(h);
    setForm({
      employeeId: h.employeeId, hmoProvider: h.hmoProvider, planType: h.planType || '',
      employeeShare: h.employeeShare ?? '', employerShare: h.employerShare ?? '',
      effectiveDate: h.effectiveDate || today(), endDate: h.endDate || '',
    });
    setShow(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.hmoProvider.trim()) { toast.error('Employee and provider are required'); return; }
    const payload = {
      employeeId: Number(form.employeeId),
      hmoProvider: form.hmoProvider,
      planType: form.planType || null,
      employeeShare: Number(form.employeeShare) || 0,
      employerShare: Number(form.employerShare) || 0,
      monthlyPremium: premium,
      effectiveDate: form.effectiveDate || null,
      endDate: form.endDate || null,
    };
    try {
      if (editing) await api.put(`/hmo/${editing.hmoId}`, payload);
      else await api.post('/hmo', payload);
      toast.success('Saved');
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const remove = async (h) => {
    if (!window.confirm(`Delete HMO record for ${h.employeeName}?`)) return;
    try {
      await api.delete(`/hmo/${h.hmoId}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add HMO
          </button>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Provider / Plan', 'Premium', 'Employee Share', 'Employer Share', 'Coverage', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No HMO records</td></tr>
            ) : items.map(h => (
              <tr key={h.hmoId} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3 font-medium text-gray-900">{h.employeeName}</td>
                <td className="px-4 py-3"><div>{h.hmoProvider}</div><div className="text-xs text-gray-500">{h.planType || ''}</div></td>
                <td className="px-4 py-3">{money(h.monthlyPremium)}</td>
                <td className="px-4 py-3">{money(h.employeeShare)}</td>
                <td className="px-4 py-3">{money(h.employerShare)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{h.effectiveDate} → {h.endDate || 'ongoing'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${h.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{h.active ? 'Active' : 'Ended / Upcoming'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => openEdit(h)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={17} /></button>}
                    {canDelete && <button onClick={() => remove(h)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={17} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title={editing ? 'Edit HMO' : 'Add HMO'} onClose={() => setShow(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee" required className="md:col-span-2">
              <select className={inputCls} value={form.employeeId} onChange={set('employeeId')} disabled={!!editing}>
                <option value="">Select...</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Provider" required><input className={inputCls} value={form.hmoProvider} onChange={set('hmoProvider')} /></Field>
            <Field label="Plan Type"><input className={inputCls} value={form.planType} onChange={set('planType')} /></Field>
            <Field label="Employee Share"><input type="number" min="0" step="0.01" className={inputCls} value={form.employeeShare} onChange={set('employeeShare')} /></Field>
            <Field label="Employer Share"><input type="number" min="0" step="0.01" className={inputCls} value={form.employerShare} onChange={set('employerShare')} /></Field>
            <div className="md:col-span-2 text-sm text-gray-600">Monthly premium: <span className="font-semibold">{money(premium)}</span></div>
            <Field label="Effective Date"><input type="date" className={inputCls} value={form.effectiveDate} onChange={set('effectiveDate')} /></Field>
            <Field label="End Date"><input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} /></Field>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default HmoTab;