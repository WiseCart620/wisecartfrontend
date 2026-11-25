import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import PayslipDrilldown from './payroll/PayslipDrilldown';

const peso = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

const MyPayslips = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/payroll/payslips/mine')
      .then((r) => setRows(Array.isArray(r) ? r : (r.data || [])))
      .catch((e) => toast.error(e.message || 'Failed to load payslips'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">My Payslips</h1>
      <p className="text-gray-600 mt-1 mb-6">Paid payslips for your account. Click a row to view it.</p>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No paid payslips yet.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                {['Pay Slip ID', 'Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.paySlipId} onClick={() => setOpen(r)} className="hover:bg-orange-50/40 cursor-pointer">
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(r); }}
                      className="font-medium text-orange-600 hover:text-orange-800 hover:underline">
                      #{r.paySlipId}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{day(r.periodStart)} – {day(r.periodEnd)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{peso(r.grossPay)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{peso(r.totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{peso(r.netPay)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <PayslipDrilldown payslipId={open.paySlipId} slip={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default MyPayslips;