import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, today, Field } from './Shared';

const StatutoryContributionsTab = ({ canDelete }) => {
  const [payPeriod, setPayPeriod] = useState(today());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ employeeId: '', agencyName: '', employeeShare: '', employerShare: '' });
  const [saving, setSaving] = useState(false);
  const [agencies, setAgencies] = useState([]);

  // filters
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [agencyFilter, setAgencyFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/statutory-contributions/preview?payPeriod=${payPeriod}`);
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [payPeriod]);

  useEffect(() => {
    api.get('/agencies').then(r => {
      if (r.success) setAgencies(r.data || []);
    }).catch(() => { });
  }, []);

  // Apply employee + agency + search filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(c => {
      if (employeeFilter !== 'ALL' && String(c.employeeId) !== String(employeeFilter)) return false;
      if (agencyFilter !== 'ALL' && c.agencyName !== agencyFilter) return false;
      if (q && !(c.employeeName || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, employeeFilter, agencyFilter, search]);

  // Group by employee
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(c => {
      if (!map.has(c.employeeId)) {
        map.set(c.employeeId, { employeeId: c.employeeId, employeeName: c.employeeName, rows: [] });
      }
      map.get(c.employeeId).rows.push(c);
    });
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [filtered]);

  // Dropdown options — derived from the full (unfiltered) list
  const employeeOptions = useMemo(() => {
    const seen = new Map();
    items.forEach(c => { if (!seen.has(c.employeeId)) seen.set(c.employeeId, c.employeeName); });
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const agencyOptions = useMemo(() => {
    return agencies.map(a => a.name).sort();
  }, [agencies]);

  const usedAgencyNames = useMemo(() => {
    if (!addForm.employeeId) return new Set();
    return new Set(
      items
        .filter(c => String(c.employeeId) === String(addForm.employeeId))
        .map(c => c.agencyName)
    );
  }, [items, addForm.employeeId]);

  const availableAgencies = useMemo(() => {
    if (!addForm.employeeId) return agencies;
    const used = new Set([...usedAgencyNames].map(n => n.toLowerCase()));
    return agencies.filter(a => !used.has(a.name.toLowerCase()));
  }, [agencies, usedAgencyNames, addForm.employeeId]);

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(grouped.map(g => g.employeeId)));
  const collapseAll = () => setExpanded(new Set());

  const clearFilters = () => {
    setEmployeeFilter('ALL');
    setAgencyFilter('ALL');
    setSearch('');
  };

  const activeFilterCount =
    (employeeFilter !== 'ALL' ? 1 : 0) +
    (agencyFilter !== 'ALL' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const remove = async (c) => {
    if (!c.id) { toast.error('This row is a preview only — nothing to delete'); return; }
    if (!window.confirm(`Delete the ${c.agencyName} contribution for ${c.payPeriod}?`)) return;
    try {
      await api.delete(`/payroll/statutory-contributions/${c.id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };


  const addCustom = async (e) => {
    e.preventDefault();
    if (!addForm.employeeId) { toast.error('Select an employee'); return; }
    if (!addForm.agencyName.trim()) { toast.error('Agency is required'); return; }
    if (!agencies.some(a => a.name === addForm.agencyName)) {
      toast.error('Select a valid agency'); return;
    }
    const ee = Number(addForm.employeeShare);
    const er = Number(addForm.employerShare);
    if (!Number.isFinite(ee) || !Number.isFinite(er) || ee < 0 || er < 0) {
      toast.error('Shares must be non-negative numbers'); return;
    }
    setSaving(true);
    try {
      await api.post('/payroll/statutory-contributions', {
        employeeId: Number(addForm.employeeId),
        agencyName: addForm.agencyName.trim(),
        payPeriod,
        employeeShare: ee,
        employerShare: er,
      });
      toast.success('Contribution added');
      setAddForm({ employeeId: '', agencyName: '', employeeShare: '', employerShare: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add contribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <Field label="Search employee">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Type a name..."
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>

        <Field label="Employee">
          <select className={inputCls} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="ALL">All employees</option>
            {employeeOptions.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Agency">
          <select className={inputCls} value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}>
            <option value="ALL">All agencies</option>
            {agencyOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>

        <Field label="Pay Period" required>
          <input type="date" className={inputCls} value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} />
        </Field>

        <div className="md:col-span-4 flex flex-wrap gap-2 items-center">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} /> {loading ? 'Loading...' : 'Refresh'}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Clear filters ({activeFilterCount})
            </button>
          )}

          <div className="ml-auto flex gap-2">
            <button onClick={expandAll} className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Expand all</button>
            <button onClick={collapseAll} className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Collapse all</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {showAdd ? 'Close' : '+ Add custom contribution'}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={addCustom} className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <Field label="Employee" required>
              <select className={inputCls} value={addForm.employeeId}
                onChange={(e) => setAddForm(p => ({ ...p, employeeId: e.target.value, agencyName: '' }))}>
                <option value="">Select...</option>
                {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Agency / Contribution Name" required>
              <select className={inputCls}
                value={addForm.agencyName}
                disabled={!addForm.employeeId}
                onChange={(e) => setAddForm(p => ({ ...p, agencyName: e.target.value }))}>
                <option value="">
                  {!addForm.employeeId
                    ? 'Select an employee first'
                    : availableAgencies.length === 0
                      ? 'All agencies already added'
                      : 'Select agency...'}
                </option>
                {availableAgencies.map(a => (
                  <option key={a.agencyId} value={a.name}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Employee Share" required>
              <input type="number" min="0" step="0.01" className={inputCls}
                value={addForm.employeeShare}
                onChange={(e) => setAddForm(p => ({ ...p, employeeShare: e.target.value }))} />
            </Field>
            <Field label="Employer Share" required>
              <input type="number" min="0" step="0.01" className={inputCls}
                value={addForm.employerShare}
                onChange={(e) => setAddForm(p => ({ ...p, employerShare: e.target.value }))} />
            </Field>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
          </form>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Employee', 'Agency', 'Pay Period', 'Employee Share', 'Employer Share', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : grouped.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                {activeFilterCount > 0
                  ? 'No contributions match your filters'
                  : 'No employees with salary configured for this period'}
              </td></tr>
            ) : grouped.map(g => {
              const isOpen = expanded.has(g.employeeId);
              const totals = g.rows.reduce(
                (acc, r) => ({
                  ee: acc.ee + Number(r.employeeShare || 0),
                  er: acc.er + Number(r.employerShare || 0),
                  total: acc.total + Number(r.totalContribution || 0),
                }),
                { ee: 0, er: 0, total: 0 }
              );
              return (
                <React.Fragment key={g.employeeId}>
                  {/* Group header row */}
                  <tr
                    className="bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => toggle(g.employeeId)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {g.employeeName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">
                      {g.rows.length} contribution{g.rows.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">{g.rows[0]?.payPeriod}</td>
                    <td className="px-4 py-3 font-medium">{money(totals.ee)}</td>
                    <td className="px-4 py-3 font-medium">{money(totals.er)}</td>
                    <td className="px-4 py-3 font-bold">{money(totals.total)}</td>
                    <td />
                  </tr>

                  {/* Detail rows */}
                  {isOpen && g.rows.map((c, idx) => (
                    <tr key={`${g.employeeId}-${c.agencyName}-${idx}`} className="text-sm hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 pl-12">—</td>
                      <td className="px-4 py-3">{c.agencyName}</td>
                      <td className="px-4 py-3">{c.payPeriod}</td>
                      <td className="px-4 py-3">{money(c.employeeShare)}</td>
                      <td className="px-4 py-3">{money(c.employerShare)}</td>
                      <td className="px-4 py-3">{money(c.totalContribution)}</td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && c.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); remove(c); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
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
      <p className="text-xs text-gray-500 mt-3">
        Click a row to expand or collapse. Preview figures computed from each employee's monthly basic salary and pay schedule — nothing is saved until a payroll run is approved.
      </p>
    </div>
  );
};

export default StatutoryContributionsTab;