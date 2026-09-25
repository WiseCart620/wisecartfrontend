import React, { useState, useEffect } from 'react';
import { Calculator, Power, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { money } from './Shared';

const thisYear = new Date().getFullYear();

const ThirteenthMonthTab = ({ canManage }) => {
  const [year, setYear] = useState(thisYear);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => { load(); }, [year]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/thirteenth-month/year/${year}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load 13th month records');
    } finally {
      setLoading(false);
    }
  };

  const computeAll = async () => {
    if (!window.confirm(`Compute 13th month for every employee with posted payslips in ${year}? This recalculates existing records.`)) return;
    setComputing(true);
    try {
      await api.post(`/payroll/thirteenth-month/compute-all?year=${year}`);
      toast.success('13th month computed');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to compute');
    } finally {
      setComputing(false);
    }
  };

  const toggle = async (id) => {
    try {
      await api.patch(`/payroll/thirteenth-month/${id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const totalPayable = items.reduce((sum, i) => sum + Number(i.computedAmount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Year</span>
          <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-lg" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        {canManage && (
          <button onClick={computeAll} disabled={computing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Calculator size={18} /> {computing ? 'Computing...' : `Compute All for ${year}`}
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-gray-700">
        <p className="font-semibold mb-1">How 13th month pay works</p>
        <p>When <strong>Enabled</strong>, the remaining 13th month amount is added to <strong>every payroll run in the year</strong>. Once the full amount has been paid, the payslip line disappears automatically.</p>
        <p className="mt-2">Disable to hide it entirely. Recompute preserves paid history — only the unpaid remainder updates.</p>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">Total 13th month amount (all records)</span>
        <span className="text-lg font-bold text-gray-900">{money(totalPayable)}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Total Basic Earned', 'Months of Service', 'Computed Amount', 'Paid', 'Remaining', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No 13th month records for {year}. Run "Compute All" once payroll runs are approved.</td></tr>
            ) : items.map(i => (
              <React.Fragment key={i.id}>
                <tr className="hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button
                      onClick={() => toggleExpand(i.id)}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      {expanded.has(i.id)
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />}
                      {i.employeeName}
                    </button>
                  </td>
                  <td className="px-4 py-3">{money(i.totalBasicEarned)}</td>
                  <td className="px-4 py-3">{i.monthsOfService}</td>
                  <td className="px-4 py-3 font-medium">{money(i.computedAmount)}</td>
                  <td className="px-4 py-3">{money(i.paidAmount || 0)}</td>
                  <td className={`px-4 py-3 font-medium ${Number(i.remainingAmount) > 0 ? 'text-blue-700' : 'text-green-700'}`}>
                    {money(i.remainingAmount || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${i.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {i.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button onClick={() => toggle(i.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title={i.isEnabled ? 'Disable' : 'Enable'}>
                        <Power size={16} />
                      </button>
                    )}
                  </td>
                </tr>
                {expanded.has(i.id) && (
                  <tr className="bg-blue-50 text-xs">
                    <td colSpan="8" className="px-4 py-3 pl-12">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">How this was computed</div>
                        <div className="text-gray-600">
                          <span className="font-mono">{i.formula || 'No formula available yet'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-2 pt-2 border-t border-blue-100">
                          <div>
                            <span className="text-gray-500">Total basic earned:</span>{' '}
                            <span className="font-semibold">{money(i.totalBasicEarned)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Months of service:</span>{' '}
                            <span className="font-semibold">{i.monthsOfService}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Computed 13th month:</span>{' '}
                            <span className="font-semibold text-blue-700">{money(i.computedAmount)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <span className="text-gray-500">Paid so far:</span>{' '}
                            <span className="font-semibold">{money(i.paidAmount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Remaining to pay:</span>{' '}
                            <span className="font-semibold text-blue-700">{money(i.remainingAmount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Last paid:</span>{' '}
                            <span className="font-semibold">
                              {i.lastPaidAt ? new Date(i.lastPaidAt).toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-500 mt-1 italic">
                          13th month is added to the payslip on the payroll run whose period contains December 13, only when this record is Enabled.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThirteenthMonthTab;