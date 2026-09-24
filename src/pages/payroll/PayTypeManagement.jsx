import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { useAuth, can } from '../../context/AuthContext';

const EMPTY = { payTypeName: '', category: 'EARNING', isTaxable: true, defaultAmount: '' };
const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition';
const CATEGORY_STYLE = {
  EARNING: 'bg-green-100 text-green-800',
  ALLOWANCE: 'bg-blue-100 text-blue-800',
  DEDUCTION: 'bg-red-100 text-red-800',
};

const PayTypeManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pay-types');
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load pay types');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      payTypeName: p.payTypeName,
      category: p.category,
      isTaxable: !!p.isTaxable,
      defaultAmount: p.defaultAmount ?? '',
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.payTypeName.trim()) { toast.error('Name is required'); return; }
    const payload = {
      ...form,
      defaultAmount: form.defaultAmount === '' ? null : Number(form.defaultAmount),
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/pay-types/${editing.payTypeId}`, payload);
      else await api.post('/pay-types', payload);
      toast.success(editing ? 'Pay type updated' : 'Pay type created');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save pay type');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.payTypeName}"?`)) return;
    try {
      await api.delete(`/pay-types/${p.payTypeId}`);
      toast.success('Pay type deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const money = (v) => v == null ? '—' :
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><LoadingOverlay show={true} message="Loading pay types..." /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LoadingOverlay show={saving} message="Saving..." />
      <Toaster position="top-right" />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pay Types</h1>
          <p className="text-gray-600 mt-1">Earnings, allowances, and deductions used in payroll</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Add Pay Type
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Category', 'Taxable', 'Default Amount'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No pay types yet</td></tr>
            ) : items.map(p => (
              <tr key={p.payTypeId} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{p.payTypeName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_STYLE[p.category] || 'bg-gray-100 text-gray-800'}`}>{p.category}</span>
                </td>
                <td className="px-6 py-4 text-sm">{p.isTaxable ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 text-sm">{money(p.defaultAmount)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {canEdit && <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>}
                    {canDelete && <button onClick={() => remove(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editing ? 'Edit Pay Type' : 'Add Pay Type'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input className={inputCls} value={form.payTypeName} onChange={(e) => setForm(p => ({ ...p, payTypeName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select className={inputCls} value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="EARNING">Earning</option>
                  <option value="ALLOWANCE">Allowance</option>
                  <option value="DEDUCTION">Deduction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Amount</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.defaultAmount} onChange={(e) => setForm(p => ({ ...p, defaultAmount: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isTaxable} onChange={(e) => setForm(p => ({ ...p, isTaxable: e.target.checked }))} />
                Taxable
              </label>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayTypeManagement;