import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { useAuth, can } from '../../context/AuthContext';
import OvertimeRatesCard from '../../components/payroll/OvertimeRatesCard';
import { MoneyInput } from '../../components/payroll/Shared';
import Pagination from '../../components/common/Pagination';
import usePagination from '../../components/payroll/usePagination';
import PageShell from '../../components/payroll/PageShell';
import SearchableSelect from '../../components/payroll/SearchableSelect';

const EMPTY = { payTypeName: '', category: 'EARNING', isTaxable: true, unit: 'HOURS', includeInEntries: false };
const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition';
const CATEGORY_STYLE = {
  EARNING: 'bg-green-100 text-green-800',
  ALLOWANCE: 'bg-orange-100 text-orange-800',
  DEDUCTION: 'bg-red-100 text-red-800',
};

const HIDDEN_NAMES = new Set(['sss', 'philhealth', 'pag-ibig', 'pagibig', 'withholding tax', 'basic pay']);
const HIDDEN_CODES = new Set(['SSS', 'PHILHEALTH', 'PAGIBIG', 'WITHHOLDING_TAX', 'CASH_ADVANCE', 'LOAN', 'HMO', 'REIMBURSEMENT', 'THIRTEENTH_MONTH', 'LEAVE_CONVERSION']);
const pct = (v) => `${Math.round(Number(v) * 10000) / 100}%`;

const RATE_FIELDS = {
  REGULAR_OT: [['regularOt', 'Rate multiplier (1.30 = 130%)']],
  REST_DAY: [['restDay', 'Rate multiplier (1.30 = 130%)']],
  SPECIAL_HOLIDAY: [['specialHoliday', 'Rate multiplier (1.30 = 130%)']],
  REGULAR_HOLIDAY: [
    ['regularHolidayFirst', 'First hours multiplier'],
    ['regularHolidayExcess', 'Excess hours multiplier'],
    ['holidayThresholdHours', 'Holiday threshold (hours)']],
  REST_DAY_REGULAR_HOLIDAY: [
    ['restDayHolidayFirst', 'First hours multiplier'],
    ['restDayHolidayExcess', 'Excess hours multiplier'],
    ['holidayThresholdHours', 'Holiday threshold (hours)']],
  NIGHT_DIFF: [['nightDiff', 'Extra per night hour (0.10 = +10%)']],
};

const PayTypeManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');
  const canFormula = can(user, 'payroll', 'formula');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [rates, setRates] = useState(null);
  const [rateForm, setRateForm] = useState({});
  const [ratesCurrent, setRatesCurrent] = useState(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [ratesDefaults, setRatesDefaults] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pay-types');
      setItems(res.success ? res.data || [] : []);
      if (canFormula) {
        try {
          const r = await api.get('/payroll/settings/overtime-rates');
          if (r.success && r.data) {
            setRatesCurrent(r.data.current || null);
            setRatesDefaults(r.data.defaults || null);
          }
        } catch { /* rate column just shows a dash */ }
      }
    } catch (e) {
      toast.error('Failed to load pay types');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setRates(null); setRateForm({}); setShowModal(true);
  };

  const openEdit = async (p) => {
    setEditing(p);
    setForm({
      payTypeName: p.payTypeName,
      category: p.category,
      isTaxable: !!p.isTaxable,
      unit: p.unit || 'HOURS',
      // system types show unless switched off; your own types show only when ticked
      includeInEntries: p.code ? p.includeInEntries !== false : !!p.includeInEntries,
    });
    setRates(null);
    setRateForm({});
    if (RATE_FIELDS[p.code] && canFormula) {
      try {
        const r = await api.get('/payroll/settings/overtime-rates');
        if (r.success && r.data && r.data.current) {
          setRates(r.data.current);
          setRatesDefaults(r.data.defaults || null);
          setRateForm(Object.fromEntries(RATE_FIELDS[p.code].map(([k]) => [k, String(r.data.current[k])])));
        }
      } catch { /* rates just won't show */ }
    }
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.payTypeName.trim()) { toast.error('Name is required'); return; }
    const payload = { ...form };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/pay-types/${editing.payTypeId}`, payload);
        if (rates && RATE_FIELDS[editing.code] && canFormula) {
          const merged = { ...rates };
          Object.keys(rateForm).forEach(k => { merged[k] = Number(rateForm[k]); });
          await api.put('/payroll/settings/overtime-rates', merged);
        }
      } else {
        await api.post('/pay-types', payload);
      }
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

  const visibleItems = items
    .filter(p => !HIDDEN_NAMES.has((p.payTypeName || '').trim().toLowerCase()) && !HIDDEN_CODES.has(p.code))
    .filter(p => catFilter === 'ALL' || p.category === catFilter)
    .filter(p => !query.trim() || (p.payTypeName || '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '')
      || (a.payTypeName || '').localeCompare(b.payTypeName || ''));

  const { pageItems, paginationProps, totalItems } = usePagination(visibleItems, `${query}|${catFilter}`);

  const rateLabel = (p) => {
    if (p.code === 'ABSENCE_DAY') return ratesCurrent ? `${pct(ratesCurrent.absenceMultiplier)} of daily rate` : 'Daily rate';
    if (p.code === 'LATE_HOUR') return ratesCurrent ? `${pct(ratesCurrent.lateMultiplier)} of hourly rate` : 'Hourly rate';
    if (p.code === 'UNDERTIME_HOUR') return ratesCurrent ? `${pct(ratesCurrent.undertimeMultiplier)} of hourly rate` : 'Hourly rate';
    const fields = RATE_FIELDS[p.code];
    if (!fields || !ratesCurrent) return '—';
    return fields
      .filter(([k]) => k !== 'holidayThresholdHours')
      .map(([k]) => (k === 'nightDiff' ? `+${pct(ratesCurrent[k])}` : pct(ratesCurrent[k])))
      .join(' / ');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><LoadingOverlay show={true} message="Loading pay types..." /></div>;
  }

  return (
    <PageShell maxW="max-w-5xl" title="Pay Types"
      subtitle="Earnings, allowances, and deductions used in payroll"
      action={canCreate && (
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          <Plus size={20} /> Add Pay Type
        </button>
      )}>
      <LoadingOverlay show={saving} message="Saving..." />
      <Toaster position="top-right" />

      <div className="mb-6"><OvertimeRatesCard /></div>

      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-gray-50 pb-4 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchableSelect
            allLabel="All pay types" allowCustom placeholder="All pay types"
            searchPlaceholder="Search pay type..."
            value={query}
            options={[...new Set(items.map(p => p.payTypeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
            onChange={(v) => setQuery(v || '')}
          />
        </div>
        <div className="flex gap-1">
          {[['ALL', 'All'], ['EARNING', 'Earnings'], ['ALLOWANCE', 'Allowances'], ['DEDUCTION', 'Deductions']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setCatFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${catFilter === k
                ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Category', 'Taxable', 'Entered As', 'Rate'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {visibleItems.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No pay types yet</td></tr>
              ) : pageItems.map(p => (
                <tr key={p.payTypeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      {p.payTypeName}
                      {p.systemDefined && <Lock size={13} className="text-gray-400" title="System pay type: cannot be deleted" />}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_STYLE[p.category] || 'bg-gray-100 text-gray-800'}`}>{p.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{p.category === 'DEDUCTION' ? '—' : p.isTaxable ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm">
                    {p.unit === 'AMOUNT' ? 'Amount (₱)' : p.unit ? p.unit.charAt(0) + p.unit.slice(1).toLowerCase() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700" title="First hours / excess hours where applicable">{rateLabel(p)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && <button onClick={() => openEdit(p)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><Edit2 size={18} /></button>}
                      {canDelete && !p.systemDefined && <button onClick={() => remove(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && <Pagination {...paginationProps} />}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                <select className={inputCls} value={form.category} disabled={editing?.systemDefined}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="EARNING">Earning</option>
                  <option value="ALLOWANCE">Allowance</option>
                  <option value="DEDUCTION">Deduction</option>
                </select>
              </div>
              {form.category !== 'ALLOWANCE' && (editing?.systemDefined || form.includeInEntries) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Entry value</label>
                  <select className={inputCls} value={form.unit} disabled={editing?.systemDefined}
                    onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}>
                    <option value="HOURS">Hours</option>
                    <option value="MINUTES">Minutes</option>
                    <option value="DAYS">Days</option>
                    <option value="AMOUNT">Fixed amount (₱)</option>
                  </select>
                </div>
              )}
              {form.category !== 'DEDUCTION' && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isTaxable} onChange={(e) => setForm(p => ({ ...p, isTaxable: e.target.checked }))} />
                  Taxable
                </label>
              )}

              {editing && rates && RATE_FIELDS[editing.code] && (
                <div className="grid grid-cols-1 gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Payroll rate</div>
                    {ratesDefaults && (
                      <button type="button"
                        onClick={() => setRateForm(Object.fromEntries(
                          RATE_FIELDS[editing.code].map(([k]) => [k, String(ratesDefaults[k])])))}
                        className="text-xs font-medium text-orange-600 hover:text-orange-800">
                        Reset to default
                      </button>
                    )}
                  </div>
                  {RATE_FIELDS[editing.code].map(([k, l]) => (
                    <div key={k}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                      <MoneyInput className={inputCls}
                        value={rateForm[k] ?? ''}
                        onChange={(e) => setRateForm(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
              {form.category !== 'ALLOWANCE' && !editing?.systemDefined && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.includeInEntries}
                    onChange={(e) => setForm(p => ({ ...p, includeInEntries: e.target.checked }))} />
                  Show in Overtime &amp; Undertime entries
                </label>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default PayTypeManagement;