import React, { useState, useEffect } from 'react';
import { Calculator, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { money } from './Shared';

const thisYear = new Date().getFullYear();

const ThirteenthMonthTab = ({ canManage }) => {
  const [year, setYear] = useState(thisYear);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

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

  const totalPayable = items.filter(i => i.isEnabled).reduce((sum, i) => sum + Number(i.computedAmount || 0), 0);

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

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">Total payable (enabled records)</span>
        <span className="text-lg font-bold text-gray-900">{money(totalPayable)}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Total Basic Earned', 'Months of Service', 'Computed Amount', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No 13th month records for {year}. Run "Compute All" once payroll runs are approved.</td></tr>
            ) : items.map(i => (
              <tr key={i.id} className="hover:bg-gray-50 text-sm">
                <td className="px-4 py-3 font-medium text-gray-900">{i.employeeName}</td>
                <td className="px-4 py-3">{money(i.totalBasicEarned)}</td>
                <td className="px-4 py-3">{i.monthsOfService}</td>
                <td className="px-4 py-3 font-medium">{money(i.computedAmount)}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThirteenthMonthTab;