import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Ban, ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field, money, today } from './Shared';

const STATUS_STYLE = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESERVED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const ReimbursementTab = ({ employees, canEdit }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employeeId: '', amount: '', reimbursementDate: today(), reason: '' });

  // filter + expand state
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/payroll/reimbursements');
      setRows(r.success ? r.data || [] : []);
    } catch (e) {
      toast.error('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.reimbursementDate) {
      toast.error('Employee, amount and date are required'); return;
    }
    try {
      await api.post('/payroll/reimbursements', {
        employeeId: Number(form.employeeId),
        amount: Number(form.amount),
        reimbursementDate: form.reimbursementDate,
        reason: form.reason || null,
      });
      toast.success('Reimbursement added');
      setForm(p => ({ ...p, amount: '', reason: '' }));
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this reimbursement?')) return;
    try {
      await api.delete(`/payroll/reimbursements/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const cancelReimbursement = async (id) => {
    if (!window.confirm('Cancel this reimbursement?')) return;
    try {
      await api.patch(`/payroll/reimbursements/${id}/cancel`);
      toast.success('Cancelled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  // One group per employee, with status counts
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const key = String(r.employeeId ?? r.employeeName);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: r.employeeName,
          records: [],
          counts: { PENDING: 0, RESERVED: 0, APPROVED: 0, CANCELLED: 0 },
          approvedAmount: 0,
        });
      }
      const g = map.get(key);
      g.records.push(r);
      if (g.counts[r.status] !== undefined) g.counts[r.status] += 1;
      if (r.status === 'APPROVED') g.approvedAmount += Number(r.amount) || 0;
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rows]);

  const dropdownOptions = groups.filter(g =>
    (g.name || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const visibleGroups = groups.filter(g => {
    if (selectedName) return g.name === selectedName;
    if (search.trim()) return (g.name || '').toLowerCase().includes(search.trim().toLowerCase());
    return true;
  });

  const pickEmployee = (name) => {
    setSelectedName(name);
    setSearch(name);
    setOpen(false);
  };

  const clearFilter = () => {
    setSelectedName('');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={add} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <Field label="Employee" required>
            <select className={inputCls} value={form.employeeId}
              onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Select...</option>
              {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </Field>
          <Field label="Date" required>
            <input type="date" className={inputCls} value={form.reimbursementDate}
              onChange={(e) => setForm(p => ({ ...p, reimbursementDate: e.target.value }))} />
          </Field>
          <Field label="Amount" required>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.amount}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
          </Field>
          <Field label="Reason">
            <input className={inputCls} value={form.reason} placeholder="e.g. Taxi fare, client lunch"
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} />
          </Field>
          <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Add Reimbursement
          </button>
        </form>
      )}

      {/* Employee search dropdown */}
      <div className="relative w-full max-w-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={inputCls + ' !pl-9 !pr-9'}
            placeholder="Search employee..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedName(''); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
          />
          {(search || selectedName) && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearFilter}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
              <X size={16} />
            </button>
          )}
        </div>
        {open && (
          <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
            <li onMouseDown={(e) => { e.preventDefault(); clearFilter(); setOpen(false); }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-gray-500">
              All employees
            </li>
            {dropdownOptions.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">No match</li>
            ) : dropdownOptions.map(g => (
              <li key={g.key}
                onMouseDown={(e) => { e.preventDefault(); pickEmployee(g.name); }}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${selectedName === g.name ? 'bg-blue-50 font-medium' : ''}`}>
                {g.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pending</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reserved</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Approved</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cancelled</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : visibleGroups.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No reimbursements yet</td></tr>
            ) : visibleGroups.map(g => {
              const isOpen = expandedKey === g.key;
              return (
                <React.Fragment key={g.key}>
                  <tr className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedKey(isOpen ? null : g.key)}>
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        {g.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{g.records.length}</td>
                    <td className="px-4 py-3 text-center">{g.counts.PENDING}</td>
                    <td className="px-4 py-3 text-center">{g.counts.RESERVED}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {g.counts.APPROVED}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{g.counts.CANCELLED}</td>
                    <td className="px-4 py-3 text-right">{money(g.approvedAmount)}</td>
                  </tr>

                  {isOpen && (
                    <tr>
                      <td colSpan="7" className="bg-gray-50 px-4 py-3">
                        <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
                          <thead className="border-b">
                            <tr>
                              {['Date', 'Amount', 'Reason', 'Status', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {g.records.map(r => (
                              <tr key={r.id}>
                                <td className="px-4 py-2">{r.reimbursementDate}</td>
                                <td className="px-4 py-2">{money(r.amount)}</td>
                                <td className="px-4 py-2 text-gray-600">{r.reason || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[r.status] || ''}`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {canEdit && r.status === 'PENDING' && (
                                    <div className="flex justify-end gap-1">
                                      <button onClick={() => cancelReimbursement(r.id)} title="Cancel"
                                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg">
                                        <Ban size={16} />
                                      </button>
                                      <button onClick={() => del(r.id)} title="Delete"
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  )}
                                </td>
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
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Reimbursements dated inside a payroll run's period are picked up automatically when the run is created or regenerated (status: RESERVED).
        They become APPROVED only when the payroll run is approved. If the run is rejected, they return to PENDING.
      </p>
    </div>
  );
};

export default ReimbursementTab;