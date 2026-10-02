import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, UserCheck, UserX, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { money } from './Shared';
import EmployeeAvatar from './EmployeeAvatar';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';
import SearchableSelect from './SearchableSelect';

const thisYear = new Date().getFullYear();

const StatCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow-sm p-4">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
  </div>
);

const ThirteenthMonthTab = ({ canManage }) => {
  const [year, setYear] = useState(thisYear);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(() => new Set());
  const [photos, setPhotos] = useState({});
  const [showInfo, setShowInfo] = useState(false);
  useEffect(() => {
    api.get('/employees').then(r => {
      if (r.success) setPhotos(Object.fromEntries((r.data || []).map(e => [e.employeeId, e.photoUrl])));
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (year < 2000 || year > 2100) return;
    load();
  }, [year]);

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

  const rowKey = (i) => i.id ?? `e${i.employeeId}`;
  const toggleExpand = (k) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const setLocal = (id, isEnabled) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, isEnabled } : i)));

  const toggleOne = async (i) => {
    if (!canManage || !i.eligible || !i.id) return;
    const target = !i.isEnabled;
    setLocal(i.id, target); // optimistic
    try {
      await api.patch(`/payroll/thirteenth-month/${i.id}/toggle`);
    } catch (err) {
      setLocal(i.id, !target);
      toast.error(err.message || 'Failed to update');
    }
  };

  const eligibleItems = items.filter(i => i.eligible && i.id);
  const allIncluded = eligibleItems.length > 0 && eligibleItems.every(i => i.isEnabled);

  const setAll = async (target) => {
    const pending = eligibleItems.filter(i => !!i.isEnabled !== target);
    if (pending.length === 0) return;
    setBusy(true);
    try {
      for (const i of pending) {
        await api.patch(`/payroll/thirteenth-month/${i.id}/toggle`);
        setLocal(i.id, target);
      }
      toast.success(target ? 'All eligible employees included' : 'All employees excluded');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
      load();
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i =>
      (statusFilter === 'ALL' || i.employeeStatus === statusFilter) &&
      (!q || (i.employeeName || '').toLowerCase().includes(q)));
  }, [items, query, statusFilter]);

  const { pageItems, paginationProps, totalItems } =
    usePagination(visible, `${query}|${statusFilter}|${year}`);

  const included = eligibleItems.filter(i => i.isEnabled);
  const totalRemaining = included.reduce((s, i) => s + Number(i.remainingAmount || 0), 0);
  const totalComputed = included.reduce((s, i) => s + Number(i.computedAmount || 0), 0);

  return (
    <div>
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-gray-50 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Year</span>
          <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
            value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <SearchableSelect
              allLabel="All employees" allowCustom placeholder="All employees"
              searchPlaceholder="Search employee..."
              value={query}
              options={[...new Set(items.map(i => i.employeeName).filter(Boolean))].sort().map(n => ({ value: n, label: n }))}
              onChange={(v) => setQuery(v || '')}
            />
          </div>
          <div className="flex gap-1">
            {[['ALL', 'All'], ['ACTIVE', 'Active'], ['INACTIVE', 'Inactive']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setStatusFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusFilter === k
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Employees" value={items.length} />
        <StatCard label="Included in payroll" value={`${included.length} of ${eligibleItems.length}`} />
        <StatCard label="Total 13th month (included)" value={money(totalComputed)} />
        <StatCard label="Remaining to pay" value={money(totalRemaining)} />
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-xl mb-6 text-sm text-gray-700">
        <button type="button" onClick={() => setShowInfo(s => !s)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left font-medium text-gray-800">
          <Info size={16} className="text-orange-600 shrink-0" />
          <span className="flex-1">How 13th month inclusion works</span>
          {showInfo ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showInfo && (
          <div className="px-4 pb-4 pl-10">
            <p>Every employee is listed automatically. Tick <strong>Include in payroll</strong> to add the remaining 13th month
              amount to each payroll run of {year}. Once fully paid, the payslip line disappears.</p>
            <p className="mt-1 text-gray-600">Employees who were hired after {year} or left before it are shown for reference
              and cannot be included.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card">
        <div className="px-4 py-3 border-b border-gray-200">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={allIncluded}
              disabled={!canManage || busy || eligibleItems.length === 0}
              onChange={(e) => setAll(e.target.checked)} />
            Include in payroll
          </label>
        </div>
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                {['Employee', 'Status', 'Months', 'Computed', 'Paid', 'Remaining'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No employees found</td></tr>
              ) : pageItems.map(i => {
                const k = rowKey(i);
                const active = i.employeeStatus === 'ACTIVE';
                return (
                  <React.Fragment key={k}>
                    <tr className={`text-sm [&>td]:sticky [&>td]:top-[39px] [&>td]:z-[5] ${i.eligible ? '[&>td]:bg-white hover:[&>td]:bg-gray-50' : '[&>td]:bg-gray-50 text-gray-400'}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={!!i.isEnabled && !!i.eligible}
                          disabled={!canManage || !i.eligible || busy}
                          title={i.eligible ? 'Include in payroll runs' : i.ineligibleReason}
                          onChange={() => toggleOne(i)} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <button onClick={() => toggleExpand(k)} className="flex items-center gap-2 hover:text-orange-600">
                          {expanded.has(k) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <EmployeeAvatar name={i.employeeName} photoUrl={photos[i.employeeId]} />
                          {i.employeeName}
                        </button>
                        {!i.eligible && <div className="text-xs text-gray-400 ml-6">{i.ineligibleReason}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {active ? <UserCheck size={12} /> : <UserX size={12} />}
                          {active ? 'Active' : 'Inactive'}
                        </span>
                        {!active && i.inactiveDate && (
                          <div className="text-xs text-gray-500 mt-1">Since {new Date(i.inactiveDate + 'T00:00:00').toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{i.eligible ? i.monthsOfService : '—'}</td>
                      <td className="px-4 py-3 font-medium">{i.eligible ? money(i.computedAmount) : '—'}</td>
                      <td className="px-4 py-3">{i.eligible ? money(i.paidAmount || 0) : '—'}</td>
                      <td className={`px-4 py-3 font-medium ${!i.eligible ? '' : Number(i.remainingAmount) > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                        {i.eligible ? money(i.remainingAmount || 0) : '—'}
                      </td>
                    </tr>
                    {expanded.has(k) && i.eligible && (
                      <tr className="bg-orange-50 text-xs">
                        <td colSpan="7" className="px-4 py-3 pl-12">
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-700">How this was computed</div>
                            <div className="font-mono text-gray-600">{i.formula || 'No formula available yet'}</div>
                            <div className="grid grid-cols-3 gap-4 mt-2 pt-2 border-t border-orange-100">
                              <div><span className="text-gray-500">Total basic earned:</span> <span className="font-semibold">{money(i.totalBasicEarned)}</span></div>
                              <div><span className="text-gray-500">Paid so far:</span> <span className="font-semibold">{money(i.paidAmount || 0)}</span></div>
                              <div><span className="text-gray-500">Last paid:</span> <span className="font-semibold">{i.lastPaidAt ? new Date(i.lastPaidAt).toLocaleString() : '—'}</span></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 && <Pagination {...paginationProps} />}
      </div>
    </div>
  );
};

export default ThirteenthMonthTab;