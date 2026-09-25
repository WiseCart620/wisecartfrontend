import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field, Modal } from './Shared';

const thisYear = new Date().getFullYear();

const LeaveBalancesTab = ({ employees, leaveTypes, canEdit, canDelete }) => {
  const [year, setYear] = useState(thisYear);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', days: '', openingBalance: '' });

  useEffect(() => { load(); }, [year]);

  const currentYear = new Date().getFullYear();

  const hasRows = items.length > 0;


  const resetEnabled =
    year >= currentYear && (!hasRows || year === currentYear + 1);

  const resetLabel = (() => {
    if (year > currentYear) return `Prepare ${year}`;
    if (year < currentYear) return 'Closed year';
    if (!hasRows) return `Initialize ${year}`;
    return 'Reset year';
  })();

  const resetTooltip = (() => {
    if (year < currentYear)
      return `${year} is closed. Reset Year only applies to the current or next year.`;
    if (year === currentYear && hasRows)
      return `${year} is already in progress. Use Prepare ${currentYear + 1} to open the next year.`;
    if (!hasRows) return `Create leave balances for ${year} with the configured opening.`;
    return `Prepare ${year} with the configured opening for every active employee.`;
  })();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leave-balances?year=${year}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  const resetYear = async () => {
    const msg = year > currentYear
      ? `Prepare leave balances for ${year}? Every active employee gets the configured opening for each leave type.`
      : `Initialize leave balances for ${year}? Every active employee gets the configured opening for each leave type.`;
    if (!window.confirm(msg)) return;
    try {
      const res = await api.post(`/leave-balances/reset?year=${year}`);
      toast.success(res.data?.message || `${year} balances prepared`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to reset');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(b => {
      if (leaveTypeFilter !== 'ALL' && b.leaveTypeName !== leaveTypeFilter) return false;
      if (q && !(b.employeeName || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, leaveTypeFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(b => {
      if (!map.has(b.employeeId)) {
        map.set(b.employeeId, { employeeId: b.employeeId, employeeName: b.employeeName, rows: [] });
      }
      map.get(b.employeeId).rows.push(b);
    });
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [filtered]);

  const leaveTypeOptions = useMemo(
    () => Array.from(new Set(items.map(b => b.leaveTypeName))).sort(),
    [items]
  );

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(grouped.map(g => g.employeeId)));
  const collapseAll = () => setExpanded(new Set());

  const remove = async (b) => {
    if (!window.confirm(`Delete ${b.leaveTypeName} balance for ${b.employeeName}?`)) return;
    try {
      await api.delete(`/leave-balances/${b.id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.leaveTypeId || form.days === '') { toast.error('Leave type and days are required'); return; }
    try {
      const res = await api.post('/leave-balances/grant', {
        employeeId: form.employeeId ? Number(form.employeeId) : null,
        leaveTypeId: Number(form.leaveTypeId),
        year,
        days: Number(form.days),
        openingBalance: form.openingBalance === '' ? null : Number(form.openingBalance),
      });
      toast.success(res.data?.message || 'Leave granted');
      setShow(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to grant leave');
    }
  };

  return (
    <div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <Field label="Search employee">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Type a name..." className={`${inputCls} pl-9`}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Field>
        <Field label="Leave Type">
          <select className={inputCls} value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)}>
            <option value="ALL">All leave types</option>
            {leaveTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Year">
          <input type="number" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </Field>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Expand all</button>
          <button onClick={collapseAll} className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Collapse all</button>
        </div>
      </div>

      <div className="flex justify-end gap-2 mb-3">
        {canEdit && (
          <>
            <button
              onClick={resetYear}
              disabled={!resetEnabled}
              title={resetTooltip}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm
                ${resetEnabled
                  ? 'border-gray-300 hover:bg-gray-100'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'}`}
            >
              <RefreshCw size={16} /> {resetLabel}
            </button>
            <button onClick={() => { setForm({ employeeId: '', leaveTypeId: '', days: '', openingBalance: '' }); setShow(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus size={18} /> Grant Leave
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Leave Type', 'Opening', 'Granted', 'Used', 'Remaining'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : grouped.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No balances for {year}</td></tr>
            ) : grouped.map(g => {
              const isOpen = expanded.has(g.employeeId);
              const totals = g.rows.reduce(
                (acc, r) => ({
                  opening: acc.opening + Number(r.openingBalance || 0),
                  granted: acc.granted + Number(r.accrued || 0),
                  used: acc.used + Number(r.used || 0),
                  remaining: acc.remaining + Number(r.closingBalance || 0),
                }),
                { opening: 0, granted: 0, used: 0, remaining: 0 }
              );
              return (
                <React.Fragment key={g.employeeId}>
                  <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => toggle(g.employeeId)}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {g.employeeName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{g.rows.length} leave type{g.rows.length === 1 ? '' : 's'}</td>
                    <td className="px-4 py-3 font-medium">{totals.opening}</td>
                    <td className="px-4 py-3 font-medium">{totals.granted}</td>
                    <td className="px-4 py-3 font-medium">{totals.used}</td>
                    <td className="px-4 py-3 font-bold">{totals.remaining}</td>
                    <td />
                  </tr>
                  {isOpen && g.rows.map(b => (
                    <tr key={b.id} className="text-sm hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 pl-12">—</td>
                      <td className="px-4 py-3">
                        {b.leaveTypeName}
                        <span className="ml-2 text-xs text-gray-400">
                          ({b.probationaryMonthly ?? 0.5}p / {b.regularMonthly ?? 1}r per month)
                        </span>
                      </td>
                      <td className="px-4 py-3">{b.openingBalance}</td>
                      <td className="px-4 py-3">{b.accrued}</td>
                      <td className="px-4 py-3">{b.used}</td>
                      <td className={`px-4 py-3 font-medium ${Number(b.closingBalance) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>{b.closingBalance}</td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && (
                          <button onClick={(e) => { e.stopPropagation(); remove(b); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={17} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title={`Grant Leave (${year})`} onClose={() => setShow(false)} maxW="max-w-lg">
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <Field label="Employee" className="col-span-2">
              <select className={inputCls} value={form.employeeId} onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                <option value="">All active employees</option>
                {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Leave Type" required className="col-span-2">
              <select className={inputCls} value={form.leaveTypeId} onChange={(e) => setForm(p => ({ ...p, leaveTypeId: e.target.value }))}>
                <option value="">Select...</option>
                {leaveTypes.map(t => (
                  <option key={t.leaveTypeId} value={t.leaveTypeId}>
                    {t.leaveTypeName} (probi {t.probationaryMonthly ?? 0.5}/mo, regular {t.regularMonthly ?? 1}/mo)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Days granted (0 = do not change accrual)" required>
              <input type="number" min="0" step="0.5" className={inputCls}
                value={form.days} onChange={(e) => setForm(p => ({ ...p, days: e.target.value }))} />
            </Field>
            <Field label="Opening balance (blank = keep current)">
              <input type="number" min="0" step="0.5" className={inputCls}
                value={form.openingBalance}
                onChange={(e) => setForm(p => ({ ...p, openingBalance: e.target.value }))}
                placeholder="e.g. 1 for regular, 0.5 for probi" />
            </Field>
            <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Grant</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveBalancesTab;