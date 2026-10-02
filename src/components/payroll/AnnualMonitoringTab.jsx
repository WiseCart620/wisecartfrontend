import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money } from './Shared';
import EmployeeCell, { useEmployeeDirectory } from './EmployeeCell';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';
import EmployeeSearchBox from './EmployeeSearchBox';

const agencyLabel = (n) => {
  const k = (n || '').toLowerCase();
  if (k === 'philhealth') return 'PHIC';
  if (k === 'pag-ibig' || k === 'pagibig') return 'HDMF';
  return n;
};

const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
const diffText = (v) => (Number(v) < 0 ? `(${money(Math.abs(v))})` : money(v));
const diffColor = (v) => (Number(v) > 0 ? 'text-red-600' : 'text-green-600');

const Card = ({ label, value, color = 'text-gray-900', sub }) => (
  <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

const Detail = ({ label, children, color = 'text-gray-900' }) => (
  <div>
    <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
    <div className={`mt-0.5 text-sm font-medium tabular-nums ${color}`}>{children}</div>
  </div>
);

const AnnualMonitoringTab = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState('wht');
  const [wht, setWht] = useState([]);
  const [stat, setStat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const dir = useEmployeeDirectory();

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
        setOpen(new Set());
      } catch {
        toast.error('Failed to load annual monitoring');
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const q = search.trim().toLowerCase();
  const matches = (name) => selectedName
    ? name === selectedName
    : !q || (name || '').toLowerCase().includes(q);

  const allNames = useMemo(
    () => [...new Set([...wht, ...stat].map(r => r.employeeName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [wht, stat]);

  const whtRows = useMemo(
    () => wht.filter(r => matches(r.employeeName)), [wht, q, selectedName]);

  const people = useMemo(() => {
    const m = new Map();
    stat.filter(r => matches(r.employeeName)).forEach(r => {
      const p = m.get(r.employeeId) || { id: r.employeeId, name: r.employeeName, agencies: [], ee: 0, er: 0, total: 0 };
      p.agencies.push(r);
      p.ee += Number(r.employeeShare || 0);
      p.er += Number(r.employerShare || 0);
      p.total += Number(r.total || 0);
      m.set(r.employeeId, p);
    });
    return Array.from(m.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [stat, q, selectedName]);

  const byAgency = useMemo(() => {
    const m = {};
    people.forEach(p => p.agencies.forEach(r => {
      const k = agencyLabel(r.agencyName);
      m[k] = m[k] || { ee: 0, er: 0 };
      m[k].ee += Number(r.employeeShare || 0);
      m[k].er += Number(r.employerShare || 0);
    }));
    return Object.entries(m);
  }, [people]);

  const whtPg = usePagination(whtRows, `${q}|${selectedName}|${year}`);
  const statPg = usePagination(people, `${q}|${selectedName}|${year}`);

  const keys = view === 'wht' ? whtRows.map(r => r.employeeId) : people.map(p => p.id);
  const allOpen = keys.length > 0 && keys.every(k => open.has(k));
  const toggle = (k) => setOpen(prev => {
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(keys));

  const th = 'px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';
  const thR = th.replace('text-left', 'text-right');
  const switchView = (k) => { setView(k); setOpen(new Set()); };

  const Chevron = ({ isOpen }) => (
    <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
  );

  return (
    <div>
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-gray-50 pb-4 flex flex-wrap items-center gap-3">
        <select className={inputCls + ' !w-28'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => thisYear - i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <EmployeeSearchBox className="w-64" names={allNames} search={search} selected={selectedName}
          onSearch={setSearch} onSelect={setSelectedName} />
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {[['wht', 'WHT / Final'], ['stat', 'Statutory Summary']].map(([k, l]) => (
            <button key={k} onClick={() => switchView(k)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k
                ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{l}</button>
          ))}
        </div>
        <button onClick={toggleAll} disabled={keys.length === 0}
          className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {allOpen ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {view === 'wht' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <Card label="Employees" value={whtRows.length} />
            <Card label="Gross pay" value={money(sum(whtRows, 'grossPay'))} />
            <Card label="WHT withheld" value={money(sum(whtRows, 'whtWithheld'))} />
            <Card label="Payable / (Refund)" value={diffText(sum(whtRows, 'difference'))}
              color={diffColor(sum(whtRows, 'difference'))} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full tbl-card">
            <div className="overflow-auto w-full tbl-scroll">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3" />
                    <th className={th}>Employee</th>
                    <th className={thR}>Gross Pay</th>
                    <th className={thR}>WHT Withheld</th>
                    <th className={thR}>Payable / (Refund)</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
                  {loading ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500">Loading...</td></tr>
                  ) : whtRows.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500">No approved payroll for {year}</td></tr>
                  ) : whtPg.pageItems.map(r => {
                    const isOpen = open.has(r.employeeId);
                    return (
                      <React.Fragment key={r.employeeId}>
                        <tr onClick={() => toggle(r.employeeId)}
                          className={`cursor-pointer [&>td]:sticky [&>td]:top-[39px] [&>td]:z-[5] ${isOpen ? '[&>td]:bg-orange-50' : '[&>td]:bg-white hover:[&>td]:bg-gray-50'}`}>
                          <td className="px-3 py-3.5 text-center"><Chevron isOpen={isOpen} /></td>
                          <td className="px-5 py-3.5 font-medium text-gray-900">
                            <EmployeeCell id={r.employeeId} name={r.employeeName} dir={dir} />
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(r.grossPay)}</td>
                          <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(r.whtWithheld)}</td>
                          <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${diffColor(r.difference)}`}>
                            {diffText(r.difference)}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/70">
                            <td />
                            <td colSpan="4" className="px-5 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Detail label="Payslips">{r.payslips}</Detail>
                                <Detail label="Taxable income">{money(r.taxableIncome)}</Detail>
                                <Detail label="Annual tax due">{money(r.annualTaxDue)}</Detail>
                                <Detail label="Tax already withheld">{money(r.whtWithheld)}</Detail>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {whtRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
                      <td />
                      <td className="px-5 py-3.5">Total ({whtRows.length} employees)</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{money(sum(whtRows, 'grossPay'))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{money(sum(whtRows, 'whtWithheld'))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{diffText(sum(whtRows, 'difference'))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {!loading && whtPg.totalItems > 0 && <Pagination {...whtPg.paginationProps} />}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {byAgency.map(([name, v]) => (
              <Card key={name} label={name} value={money(v.ee + v.er)}
                sub={`EE ${money(v.ee)} · ER ${money(v.er)}`} />
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full tbl-card">
            <div className="overflow-auto w-full tbl-scroll">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3" />
                    <th className={th}>Employee</th>
                    <th className={thR}>Employee Share</th>
                    <th className={thR}>Employer Share</th>
                    <th className={thR}>Total</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
                  {loading ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500">Loading...</td></tr>
                  ) : people.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500">No contributions posted for {year}</td></tr>
                  ) : statPg.pageItems.map(p => {
                    const isOpen = open.has(p.id);
                    return (
                      <React.Fragment key={p.id}>
                        <tr onClick={() => toggle(p.id)}
                          className={`cursor-pointer [&>td]:sticky [&>td]:top-[39px] [&>td]:z-[5] ${isOpen ? '[&>td]:bg-orange-50' : '[&>td]:bg-white hover:[&>td]:bg-gray-50'}`}>
                          <td className="px-3 py-3.5 text-center"><Chevron isOpen={isOpen} /></td>
                          <td className="px-5 py-3.5 font-medium text-gray-900">
                            <EmployeeCell id={p.id} name={p.name} dir={dir} />
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(p.ee)}</td>
                          <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(p.er)}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">{money(p.total)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/70">
                            <td />
                            <td colSpan="4" className="px-5 py-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                                    <th className="py-1.5 text-left font-medium">Agency</th>
                                    <th className="py-1.5 text-right font-medium">Periods</th>
                                    <th className="py-1.5 text-right font-medium">Employee</th>
                                    <th className="py-1.5 text-right font-medium">Employer</th>
                                    <th className="py-1.5 text-right font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
                                  {p.agencies.map((r, i) => (
                                    <tr key={`${r.agencyName}-${i}`}>
                                      <td className="py-2 font-medium text-gray-800">{agencyLabel(r.agencyName)}</td>
                                      <td className="py-2 text-right text-gray-700 tabular-nums">{r.periods}</td>
                                      <td className="py-2 text-right text-gray-700 tabular-nums">{money(r.employeeShare)}</td>
                                      <td className="py-2 text-right text-gray-700 tabular-nums">{money(r.employerShare)}</td>
                                      <td className="py-2 text-right font-semibold text-gray-900 tabular-nums">{money(r.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {people.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
                      <td />
                      <td className="px-5 py-3.5">Total ({people.length} employees)</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{money(people.reduce((s, p) => s + p.ee, 0))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{money(people.reduce((s, p) => s + p.er, 0))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{money(people.reduce((s, p) => s + p.total, 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {!loading && statPg.totalItems > 0 && <Pagination {...statPg.paginationProps} />}
          </div>
        </>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Built from approved and paid runs only. Payable / (Refund) = annual tax due minus tax already withheld.
      </p>
    </div>
  );
};

export default AnnualMonitoringTab;