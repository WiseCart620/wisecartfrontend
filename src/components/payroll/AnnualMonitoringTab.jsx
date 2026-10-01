import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money } from './Shared';

const agencyLabel = (n) => {
  const k = (n || '').toLowerCase();
  if (k === 'philhealth') return 'PHIC';
  if (k === 'pag-ibig' || k === 'pagibig') return 'HDMF';
  return n;
};

const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

const AnnualMonitoringTab = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState('wht');
  const [wht, setWht] = useState([]);
  const [stat, setStat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [w, s] = await Promise.all([
          api.get(`/payroll/annual/wht?year=${year}`),
          api.get(`/payroll/annual/statutory?year=${year}`),
        ]);
        setWht(w.success ? w.data || [] : []);
        setStat(s.success ? s.data || [] : []);
      } catch {
        toast.error('Failed to load annual monitoring');
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const q = search.trim().toLowerCase();
  const whtRows = useMemo(() => wht.filter(r => !q || r.employeeName.toLowerCase().includes(q)), [wht, q]);
  const statRows = useMemo(() => stat.filter(r => !q || r.employeeName.toLowerCase().includes(q)), [stat, q]);
  const byAgency = useMemo(() => {
    const m = {};
    statRows.forEach(r => {
      const k = agencyLabel(r.agencyName);
      m[k] = m[k] || { ee: 0, er: 0 };
      m[k].ee += Number(r.employeeShare || 0);
      m[k].er += Number(r.employerShare || 0);
    });
    return Object.entries(m);
  }, [statRows]);

  const th = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase';
  const thR = 'px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className={inputCls + ' !w-32'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => thisYear - i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <input className={inputCls + ' !w-64'} placeholder="Search employee..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {[['wht', 'WHT / Final'], ['stat', 'Statutory Summary']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${view === k
                ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{l}</button>
          ))}
        </div>
      </div>

      {view === 'wht' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={th}>Employee</th>
                <th className={thR}>Payslips</th>
                <th className={thR}>Gross Pay</th>
                <th className={thR}>Taxable Income</th>
                <th className={thR}>WHT Withheld</th>
                <th className={thR}>Annual Tax Due</th>
                <th className={thR}>Payable / (Refund)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : whtRows.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No approved payroll for {year}</td></tr>
              ) : whtRows.map(r => (
                <tr key={r.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.employeeName}</td>
                  <td className="px-4 py-3 text-right">{r.payslips}</td>
                  <td className="px-4 py-3 text-right">{money(r.grossPay)}</td>
                  <td className="px-4 py-3 text-right">{money(r.taxableIncome)}</td>
                  <td className="px-4 py-3 text-right">{money(r.whtWithheld)}</td>
                  <td className="px-4 py-3 text-right">{money(r.annualTaxDue)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(r.difference) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(r.difference) < 0 ? `(${money(Math.abs(r.difference))})` : money(r.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
            {whtRows.length > 0 && (
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td />
                  <td className="px-4 py-3 text-right">{money(sum(whtRows, 'grossPay'))}</td>
                  <td className="px-4 py-3 text-right">{money(sum(whtRows, 'taxableIncome'))}</td>
                  <td className="px-4 py-3 text-right">{money(sum(whtRows, 'whtWithheld'))}</td>
                  <td className="px-4 py-3 text-right">{money(sum(whtRows, 'annualTaxDue'))}</td>
                  <td className="px-4 py-3 text-right">{money(sum(whtRows, 'difference'))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {byAgency.map(([name, v]) => (
              <div key={name} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">{name}</div>
                <div className="mt-1 text-sm text-gray-700">EE {money(v.ee)} · ER {money(v.er)}</div>
                <div className="text-base font-bold text-gray-900">{money(v.ee + v.er)}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Agency</th>
                  <th className={thR}>Periods</th>
                  <th className={thR}>Employee Share</th>
                  <th className={thR}>Employer Share</th>
                  <th className={thR}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : statRows.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No contributions posted for {year}</td></tr>
                ) : statRows.map((r, i) => (
                  <tr key={`${r.employeeId}-${r.agencyName}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.employeeName}</td>
                    <td className="px-4 py-3">{agencyLabel(r.agencyName)}</td>
                    <td className="px-4 py-3 text-right">{r.periods}</td>
                    <td className="px-4 py-3 text-right">{money(r.employeeShare)}</td>
                    <td className="px-4 py-3 text-right">{money(r.employerShare)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-xs text-gray-500 mt-3">
        Built from approved and paid runs only. Payable / (Refund) = annual tax due minus tax already withheld.
      </p>
    </div>
  );
};

export default AnnualMonitoringTab;