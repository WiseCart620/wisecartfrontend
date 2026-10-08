import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, money, Field, Modal, MoneyInput } from '../../components/payroll/Shared';
import PayrollRunDetail from '../../components/payroll/PayrollRunDetail';
import OvertimeEntries from '../../components/payroll/OvertimeEntries';
import ReimbursementTab from '../../components/payroll/ReimbursementTab';
import DisbursementTab from '../../components/payroll/DisbursementTab';
import AnnualMonitoringTab from '../../components/payroll/AnnualMonitoringTab';
import { runOptionsFor, computePeriod, computePeriodFor } from '../../utils/payrollPeriods';
import SearchableSelect from '../../components/payroll/SearchableSelect';
import Pagination from '../../components/common/Pagination';
import usePagination from '../../components/payroll/usePagination';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'].map((m, i) => ({ value: String(i + 1), label: m }));
const YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => y - 2 + i).map(v => ({ value: String(v), label: String(v) }));
})();


const cutoffOf = (opt) => opt?.key === 'SEMI_15' ? 'first' : opt?.key === 'SEMI_30' ? 'second' : null;
const periodFor = (opt, month, year) =>
  cutoffOf(opt) && month && /^\d{4}$/.test(String(year)) ? computePeriodFor(opt.key, Number(month), Number(year)) : null;



const STATUS_STYLE = {
  DRAFT: 'bg-white text-gray-700 ring-1 ring-gray-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  APPROVED: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  PAID: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};
const STATUS_DOT = {
  DRAFT: 'bg-gray-400', SUBMITTED: 'bg-amber-500', APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500', PAID: 'bg-purple-500',
};
const fmtD = (d) => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

const EMPTY = { option: '', month: '', year: '', periodStart: '', periodEnd: '', payDate: '', daysOfWork: '' };
const STATUS_LABEL = { DRAFT: 'On-Going', SUBMITTED: 'On-Going (For Approval)', APPROVED: 'Approved', REJECTED: 'Rejected', PAID: 'Paid' };

const PayrollRunManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'payroll', 'create');
  const canDeleteRun = can(user, 'payroll', 'delete');
  const canManage = can(user, 'employees', 'manage');

  const [runs, setRuns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [tab, setTab] = useState('runs');
  const [filters, setFilters] = useState({ status: '', month: '', year: '' });
  const headRef = useRef(null);

  const [headH, setHeadH] = useState(120);
  useLayoutEffect(() => {
    if (headRef.current && headRef.current.offsetHeight !== headH) setHeadH(headRef.current.offsetHeight);
  });

  const pageStyle = { '--nav-h': 'var(--layout-nav-h)', '--head-h': `${headH}px` };

  const approvedRuns = runs.filter(r => r.status === 'APPROVED' || r.status === 'PAID');

  const yearOptions = [...new Set(runs.map(r => (r.periodStart || '').slice(0, 4)).filter(Boolean))]
    .sort().reverse().map(y => ({ value: y, label: y }));

  const filteredRuns = runs.filter(r => {
    const [y, m] = (r.periodStart || '').split('-');
    if (filters.status && r.status !== filters.status) return false;
    if (filters.year && y !== filters.year) return false;
    if (filters.month && Number(m) !== Number(filters.month)) return false;
    return true;
  });

  const hasFilters = Object.values(filters).some(Boolean);
  const { pageItems, paginationProps, totalItems } =
    usePagination(filteredRuns, `${filters.status}|${filters.month}|${filters.year}`);

  const tabBar = (
    <div className="flex gap-6 border-b border-gray-200 mt-3 overflow-x-auto overflow-y-hidden">
      {[['runs', 'Payroll Runs'], ['ot', 'Overtime & Undertime'], ['rb', 'Reimbursements'], ['db', 'Disbursement'], ['an', 'Annual Monitoring']].map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l}</button>
      ))}
    </div>
  );

  const stickyHead = (
    <div ref={headRef} className="sticky top-[var(--nav-h)] z-20 bg-white pt-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{tab === 'runs' ? 'Payroll Runs' : 'Payroll'}</h1>
          {tab === 'runs' && <p className="text-gray-500 mt-1 text-sm">Generate payslips and walk them through submit, approve and pay.</p>}
        </div>
      </div>
      {tabBar}
    </div>
  );

  useEffect(() => {
    load();
    (async () => {
      try {
        const r = await api.get('/employees');
        if (r.success) setEmployees((r.data || []).filter(e => e.status === 'ACTIVE'));
      } catch { /* ignore */ }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [runsRes, schedulesRes, empRes] = await Promise.all([
        api.get('/payroll/runs'),
        api.get('/pay-schedules'),
        api.get('/employees'),
      ]);
      if (runsRes.success) setRuns(runsRes.data || []);
      if (schedulesRes.success) setSchedules(schedulesRes.data || []);
      if (empRes.success) setEmployees((empRes.data || []).filter(e => e.status === 'ACTIVE'));
    } catch (e) {
      toast.error('Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const runOptions = runOptionsFor(employees);
  const selectedOpt = runOptions.find(o => o.value === form.option);
  const auto = !!cutoffOf(selectedOpt);
  const onOptionChange = (value) => {
    const opt = runOptions.find(o => o.value === value);
    setForm(p => {
      if (!opt) return { ...p, option: '' };
      if (cutoffOf(opt)) {
        const next = {
          ...p, option: value,
          month: p.month || String(new Date().getMonth() + 1),
          year: p.year || String(new Date().getFullYear()),
        };
        return { ...next, ...periodFor(opt, next.month, next.year) };
      }
      return { ...p, option: value, ...computePeriod(opt.key) };
    });
  };
  const onMonthYear = (patch) => setForm(p => {
    const next = { ...p, ...patch };
    const per = periodFor(selectedOpt, next.month, next.year);
    return per ? { ...next, ...per } : next;
  });

  const deleteRun = async (run) => {
    if (!window.confirm(`Delete payroll run ${run.periodStart} – ${run.periodEnd}?\nThis removes all its payslips and cannot be undone.`)) return;
    const res = await api.delete(`/payroll/runs/${run.payRollRunId}`);
    if (res.success) {
      toast.success('Payroll run deleted');
      load();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const opt = runOptions.find(o => o.value === form.option);
    if (!opt || !form.periodStart || !form.periodEnd || !form.payDate) {
      toast.error('All fields are required');
      return;
    }
    if (!form.daysOfWork || Number(form.daysOfWork) <= 0) {
      toast.error('Enter the days of work');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/payroll/runs', {
        scheduleId: opt.scheduleId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
        daysOfWork: Number(form.daysOfWork),
      });
      if (res.success) {
        toast.success('Payroll run created');
        setShow(false);
        setForm(EMPTY);
        load();
        setSelectedRunId(res.data.payRollRunId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create payroll run');
    } finally {
      setCreating(false);
    }
  };
  if ((tab === 'ot' || tab === 'rb' || tab === 'db' || tab === 'an') && !selectedRunId) {
    return (
      <div className="p-6 pt-0 max-w-7xl mx-auto" style={pageStyle}>
        <Toaster position="top-right" />
        {stickyHead}
        <div>
          {tab === 'ot' && <OvertimeEntries canEdit={canCreate} />}
          {tab === 'rb' && <ReimbursementTab employees={employees} canEdit={canCreate} />}
          {tab === 'db' && <DisbursementTab approvedRuns={approvedRuns} canManage={canManage} />}
          {tab === 'an' && <AnnualMonitoringTab />}
        </div>
      </div>
    );
  }

  if (selectedRunId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Toaster position="top-right" />
        <PayrollRunDetail runId={selectedRunId} onBack={() => { setSelectedRunId(null); load(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 max-w-7xl mx-auto" style={pageStyle}>
      <Toaster position="top-right" />
      {stickyHead}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['Total runs', runs.length, 'text-gray-900'],
          ['On-going', runs.filter(r => r.status === 'DRAFT' || r.status === 'SUBMITTED').length, 'text-amber-600'],
          ['Approved / Paid', approvedRuns.length, 'text-green-600'],
          ['Net pay released', money(approvedRuns.reduce((s, r) => s + Number(r.totalNetPay || 0), 0)), 'text-gray-900'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
            <div className={`text-2xl font-semibold mt-1 ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-10 bg-white pb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <SearchableSelect
              allLabel="All statuses" typeable={false} value={filters.status}
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              onChange={(v) => setFilters(p => ({ ...p, status: v }))}
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
            <SearchableSelect
              allLabel="All months" typeable={false} searchPlaceholder="Search month..."
              value={filters.month} options={MONTHS}
              onChange={(v) => setFilters(p => ({ ...p, month: v }))}
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <SearchableSelect
              allLabel="All years" typeable={false}
              value={filters.year} options={yearOptions}
              onChange={(v) => setFilters(p => ({ ...p, year: v }))}
            />
          </div>
          {hasFilters && (
            <button type="button" onClick={() => setFilters({ status: '', month: '', year: '' })}
              className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-white">Clear</button>
          )}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Showing {filteredRuns.length} of {runs.length} run{runs.length === 1 ? '' : 's'}
            </span>
            {canCreate && (
              <button onClick={() => setShow(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium shadow-sm hover:bg-orange-700 transition-colors">
                <Plus size={18} /> New Run
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full tbl-card">
        <div className="overflow-auto w-full tbl-scroll">
          <table className="w-full min-w-[860px]">
            <thead className="bg-white">
              <tr>
                {['Schedule', 'Period', 'Pay Date', 'Employees', 'Net Pay', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filteredRuns.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-gray-500">
                  {hasFilters ? 'No payroll runs match the filters' : 'No payroll runs yet'}
                </td></tr>
              ) : pageItems.map(r => (
                <tr key={r.payRollRunId} className="hover:bg-white text-sm cursor-pointer transition-colors" onClick={() => setSelectedRunId(r.payRollRunId)}>
                  <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">{r.scheduleName}</td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{fmtD(r.periodStart)} – {fmtD(r.periodEnd)}</td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{fmtD(r.payDate)}</td>
                  <td className="px-5 py-4 text-gray-700">{r.employeeCount}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">{money(r.totalNetPay)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status] || 'bg-gray-400'}`} />
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="text-orange-600 text-xs font-medium mr-2">View</span>
                    {canDeleteRun && (r.status === 'DRAFT' || r.status === 'REJECTED') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRun(r); }}
                        title="Delete run"
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={17} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 && <Pagination {...paginationProps} />}
      </div>

      {show && (
        <Modal title="New Payroll Run" onClose={() => setShow(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            <Field label="Pay Schedule" required>
              <SearchableSelect
                typeable={false}
                placeholder="Select schedule..."
                searchPlaceholder="Search schedule..."
                value={form.option}
                options={runOptions.map(o => ({ value: o.value, label: o.label }))}
                onChange={onOptionChange}
              />
            </Field>
            {auto ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Month" required>
                    <SearchableSelect placeholder="Select month..." searchPlaceholder="Search month..."
                      value={form.month} options={MONTHS} onChange={(v) => onMonthYear({ month: v })} />
                  </Field>
                  <Field label="Year" required>
                    <SearchableSelect allowCustom placeholder="Select or type year..." searchPlaceholder="Search or type a year..."
                      value={form.year} options={YEARS} onChange={(v) => onMonthYear({ year: v })} />
                  </Field>
                </div>
                {form.periodStart && form.periodEnd && (
                  <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-3 py-2">
                    Period: <b>{form.periodStart}</b> to <b>{form.periodEnd}</b> · Pay date: <b>{form.payDate || '—'}</b>
                  </div>
                )}
              </>
            ) : form.option ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Period Start" required>
                    <input type="date" className={inputCls} value={form.periodStart} onChange={set('periodStart')} />
                  </Field>
                  <Field label="Period End" required>
                    <input type="date" className={inputCls} value={form.periodEnd} onChange={set('periodEnd')} />
                  </Field>
                </div>
                <Field label="Pay Date" required>
                  <input type="date" className={inputCls} value={form.payDate} onChange={set('payDate')} />
                </Field>
              </>
            ) : null}
            <Field label="Days of Work" required>
              <MoneyInput className={inputCls} value={form.daysOfWork}
                onChange={set('daysOfWork')} placeholder="e.g. 26" />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create & Generate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PayrollRunManagement;