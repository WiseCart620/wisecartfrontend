import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, Field, Modal } from './Shared';

const thisYear = new Date().getFullYear();
const EMPTY = { effectiveYear: thisYear, minAnnualIncome: '', maxAnnualIncome: '', baseTax: '', ratePercent: '' };

const TaxBracketsTab = ({ canCreate, canEdit, canDelete }) => {
  const [year, setYear] = useState(thisYear);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const [calcIncome, setCalcIncome] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => { load(); }, [year]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/tax-brackets/year/${year}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load tax brackets');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, effectiveYear: year }); setShow(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      effectiveYear: b.effectiveYear,
      minAnnualIncome: b.minAnnualIncome ?? '',
      maxAnnualIncome: b.maxAnnualIncome ?? '',
      baseTax: b.baseTax ?? '',
      ratePercent: b.ratePercent ?? '',
    });
    setShow(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.effectiveYear === '' || form.minAnnualIncome === '' || form.baseTax === '' || form.ratePercent === '') {
      toast.error('Year, minimum income, base tax and rate are required');
      return;
    }
    const payload = {
      effectiveYear: Number(form.effectiveYear),
      minAnnualIncome: Number(form.minAnnualIncome),
      maxAnnualIncome: form.maxAnnualIncome === '' ? null : Number(form.maxAnnualIncome),
      baseTax: Number(form.baseTax),
      ratePercent: Number(form.ratePercent),
    };
    try {
      if (editing) await api.put(`/payroll/tax-brackets/${editing.taxBrancketId}`, payload);
      else await api.post('/payroll/tax-brackets', payload);
      toast.success('Saved');
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete the bracket starting at ${money(b.minAnnualIncome)}?`)) return;
    try {
      await api.delete(`/payroll/tax-brackets/${b.taxBrancketId}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const runCalc = async (e) => {
    e.preventDefault();
    if (calcIncome === '') { toast.error('Enter an annual income'); return; }
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await api.get(`/payroll/tax-brackets/compute?annualIncome=${Number(calcIncome)}&year=${year}`);
      if (res.success) setCalcResult(res.data);
      else toast.error(res.error || 'Failed to compute');
    } catch (err) {
      toast.error(err.message || 'Failed to compute');
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Effective Year</span>
          <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-lg" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        {canCreate && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add Bracket
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Min Annual Income', 'Max Annual Income', 'Base Tax', 'Rate %'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No brackets for {year}</td></tr>
            ) : items.map(b => (
              <tr key={b.taxBrancketId} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3">{money(b.minAnnualIncome)}</td>
                <td className="px-4 py-3">{b.maxAnnualIncome != null ? money(b.maxAnnualIncome) : 'and above'}</td>
                <td className="px-4 py-3">{money(b.baseTax)}</td>
                <td className="px-4 py-3">{b.ratePercent}%</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && <button onClick={() => openEdit(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={17} /></button>}
                    {canDelete && <button onClick={() => remove(b)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={17} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Quick Tax Calculator</h3>
        </div>
        <form onSubmit={runCalc} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Annual taxable income</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={calcIncome} onChange={(e) => setCalcIncome(e.target.value)} />
          </div>
          <button type="submit" disabled={calcLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {calcLoading ? '...' : 'Compute'}
          </button>
        </form>
        {calcResult != null && (
          <p className="mt-3 text-sm text-gray-700">Annual withholding tax: <span className="font-semibold">{money(calcResult)}</span></p>
        )}
      </div>

      {show && (
        <Modal title={editing ? 'Edit Tax Bracket' : 'Add Tax Bracket'} onClose={() => setShow(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Effective Year" required><input type="number" className={inputCls} value={form.effectiveYear} onChange={set('effectiveYear')} /></Field>
            <div />
            <Field label="Minimum Annual Income" required><input type="number" min="0" step="0.01" className={inputCls} value={form.minAnnualIncome} onChange={set('minAnnualIncome')} /></Field>
            <Field label="Maximum Annual Income"><input type="number" min="0" step="0.01" className={inputCls} value={form.maxAnnualIncome} onChange={set('maxAnnualIncome')} placeholder="blank = no ceiling" /></Field>
            <Field label="Base Tax" required><input type="number" min="0" step="0.01" className={inputCls} value={form.baseTax} onChange={set('baseTax')} /></Field>
            <Field label="Rate %" required><input type="number" min="0" step="0.01" className={inputCls} value={form.ratePercent} onChange={set('ratePercent')} /></Field>
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

export default TaxBracketsTab;