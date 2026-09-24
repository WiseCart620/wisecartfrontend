import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, money, Field, Modal } from '../../components/payroll/Shared';
import PayrollRunDetail from '../../components/payroll/PayrollRunDetail';
import OvertimeEntries from '../../components/payroll/OvertimeEntries';
import ReimbursementTab from '../../components/payroll/ReimbursementTab';


const STATUS_STYLE = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-purple-100 text-purple-700',
};

const EMPTY = { scheduleId: '', periodStart: '', periodEnd: '', payDate: '' };
const STATUS_LABEL = { DRAFT: 'On-Going', SUBMITTED: 'On-Going (For Approval)', APPROVED: 'Approved', REJECTED: 'Rejected', PAID: 'Paid' };

const PayrollRunManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'payroll', 'create');

  const [runs, setRuns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [tab, setTab] = useState('runs');
  const tabBar = (
    <div className="flex gap-1 border-b border-gray-200 mt-4">
      {[['runs', 'Payroll Runs'], ['ot', 'Overtime & Undertime'], ['rb', 'Reimbursements']].map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>{l}</button>
      ))}
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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.scheduleId || !form.periodStart || !form.periodEnd || !form.payDate) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/payroll/runs', {
        scheduleId: Number(form.scheduleId),
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
      });
      toast.success('Payroll run created');
      setShow(false);
      setForm(EMPTY);
      load();
      if (res.success) setSelectedRunId(res.data.payRollRunId);
    } catch (err) {
      toast.error(err.message || 'Failed to create payroll run');
    } finally {
      setCreating(false);
    }
  };
  if ((tab === 'ot' || tab === 'rb') && !selectedRunId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Toaster position="top-right" />
        <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
        {tabBar}
        <div className="mt-6">
          {tab === 'ot' && <OvertimeEntries canEdit={canCreate} />}
          {tab === 'rb' && <ReimbursementTab employees={employees} canEdit={canCreate} />}
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
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Runs</h1>
          <p className="text-gray-600 mt-1">Generate payslips and walk them through submit, approve and pay</p>
          {tabBar}
        </div>
        {canCreate && (
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> New Run
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Schedule', 'Period', 'Pay Date', 'Employees', 'Net Pay', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No payroll runs yet</td></tr>
            ) : runs.map(r => (
              <tr key={r.payRollRunId} className="hover:bg-gray-50 text-sm cursor-pointer" onClick={() => setSelectedRunId(r.payRollRunId)}>
                <td className="px-4 py-3 font-medium text-gray-900">{r.scheduleName}</td>
                <td className="px-4 py-3">{r.periodStart} – {r.periodEnd}</td>
                <td className="px-4 py-3">{r.payDate}</td>
                <td className="px-4 py-3">{r.employeeCount}</td>
                <td className="px-4 py-3">{money(r.totalNetPay)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status] || r.status}</span>
                  <span className="ml-3 text-blue-600 text-xs underline">View</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="New Payroll Run" onClose={() => setShow(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            <Field label="Pay Schedule" required>
              <select className={inputCls} value={form.scheduleId} onChange={set('scheduleId')}>
                <option value="">Select schedule...</option>
                {schedules.map(s => <option key={s.scheduleId} value={s.scheduleId}>{s.scheduleName} ({s.payFrequency})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Period Start" required><input type="date" className={inputCls} value={form.periodStart} onChange={set('periodStart')} /></Field>
              <Field label="Period End" required><input type="date" className={inputCls} value={form.periodEnd} onChange={set('periodEnd')} /></Field>
            </div>
            <Field label="Pay Date" required><input type="date" className={inputCls} value={form.payDate} onChange={set('payDate')} /></Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
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