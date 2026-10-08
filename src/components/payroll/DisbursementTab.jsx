import React, { useState, useEffect, useMemo } from 'react';
import { Send, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, Field, Modal } from './Shared';
import EmployeeCell, { useEmployeeDirectory } from './EmployeeCell';
import SearchableSelect from './SearchableSelect';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const CHANNELS = ['BANK_TRANSFER', 'PAYROLL_CARD', 'CASH', 'CHECK'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'].map((m, i) => ({ value: String(i + 1), label: m }));
const RUN_STATUS = [{ value: 'APPROVED', label: 'Approved' }, { value: 'PAID', label: 'Paid' }];
const BADGE = {
  APPROVED: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  PAID: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

const BatchLines = ({ lines, dir }) => {
  const { pageItems, paginationProps, totalItems } = usePagination(lines, 'lines');
  return (
    <div className="border-t border-gray-100">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-white border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(l => (
              <tr key={l.lineId}>
                <td className="px-4 py-2"><EmployeeCell id={l.employeeId} name={l.beneficiaryName} dir={dir} /></td>
                <td className="px-4 py-2 text-gray-500">{l.beneficiaryAccountNumber || '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{money(l.netPayAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalItems > 0 && <Pagination {...paginationProps} />}
    </div>
  );
};

const RunCard = ({ run, dir, canManage, autoOpen, refreshKey, onGenerate }) => {
  const [open, setOpen] = useState(autoOpen);
  const [batches, setBatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payroll/disbursements?runId=${run.payRollRunId}`);
        setBatches(res.success ? res.data || [] : []);
      } catch (e) {
        toast.error('Failed to load disbursement batches');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, refreshKey, run.payRollRunId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div onClick={() => setOpen(o => !o)}
        className={`p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer ${open ? 'bg-orange-50/40' : 'hover:bg-white'}`}>
        <div className="flex items-center gap-3">
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          <div>
            <p className="font-medium text-gray-900">{run.scheduleName}</p>
            <p className="text-xs text-gray-500">{run.periodStart} to {run.periodEnd}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${BADGE[run.status] || ''}`}>{run.status}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-gray-900">{money(run.totalNetPay)}</p>
            <p className="text-xs text-gray-500">{run.employeeCount} employees</p>
          </div>
          {canManage && (
            <button onClick={(e) => { e.stopPropagation(); onGenerate(run); }}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 whitespace-nowrap">
              <Send size={16} /> Generate Batch
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white/60 p-4 space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-4 text-sm">Loading...</p>
          ) : !batches || batches.length === 0 ? (
            <p className="text-center text-gray-500 py-4 text-sm">No disbursement batches for this run yet</p>
          ) : batches.map(b => (
            <div key={b.disbursementId} className="bg-white rounded border border-gray-100">
              <div className="p-3 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === b.disbursementId ? null : b.disbursementId)}>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{b.channel.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.generatedAt).toLocaleString()} {b.sourceAccount ? `· ${b.sourceAccount}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">{money(b.totalAmount)}</p>
                  <p className="text-xs text-gray-500">{b.lines.length} beneficiaries</p>
                </div>
              </div>
              {expandedId === b.disbursementId && <BatchLines lines={b.lines} dir={dir} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DisbursementTab = ({ approvedRuns, canManage }) => {
  const [fStatus, setFStatus] = useState('');
  const [fMonth, setFMonth] = useState('');
  const [fYear, setFYear] = useState('');
  const [targetRun, setTargetRun] = useState(null);
  const [form, setForm] = useState({ channel: 'BANK_TRANSFER', sourceAccount: '', remarks: '' });
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dir = useEmployeeDirectory();

  const yearOptions = useMemo(
    () => [...new Set(approvedRuns.map(r => (r.periodStart || '').slice(0, 4)).filter(Boolean))]
      .sort().reverse().map(y => ({ value: y, label: y })),
    [approvedRuns]);

  const filteredRuns = approvedRuns.filter(r => {
    const [y, m] = (r.periodStart || '').split('-');
    if (fStatus && r.status !== fStatus) return false;
    if (fYear && y !== fYear) return false;
    if (fMonth && Number(m) !== Number(fMonth)) return false;
    return true;
  });
  const hasFilters = !!(fStatus || fMonth || fYear);

  const { pageItems, paginationProps, totalItems } =
    usePagination(filteredRuns, `${fStatus}|${fMonth}|${fYear}`);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!targetRun) return;
    setCreating(true);
    try {
      await api.post('/payroll/disbursements', { payrollRunId: Number(targetRun.payRollRunId), ...form });
      toast.success('Disbursement batch generated');
      setTargetRun(null);
      setForm({ channel: 'BANK_TRANSFER', sourceAccount: '', remarks: '' });
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to generate batch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <SearchableSelect allLabel="All statuses" typeable={false}
              value={fStatus} options={RUN_STATUS} onChange={(v) => setFStatus(v || '')} />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
            <SearchableSelect allLabel="All months" typeable={false} searchPlaceholder="Search month..."
              value={fMonth} options={MONTHS} onChange={(v) => setFMonth(v || '')} />
          </div>
          <div className="min-w-[110px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <SearchableSelect allLabel="All years" typeable={false}
              value={fYear} options={yearOptions} onChange={(v) => setFYear(v || '')} />
          </div>
          {hasFilters && (
            <button type="button" onClick={() => { setFStatus(''); setFMonth(''); setFYear(''); }}
              className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-white">Clear</button>
          )}
          <div className="ml-auto text-xs text-gray-500 pb-2">
            Showing {filteredRuns.length} of {approvedRuns.length} run{approvedRuns.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-2">
        {filteredRuns.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {hasFilters ? 'No approved or paid runs match the filters' : 'No approved or paid payroll runs yet'}
          </p>
        ) : pageItems.map(r => (
          <RunCard key={r.payRollRunId} run={r} dir={dir} canManage={canManage}
            autoOpen={filteredRuns.length === 1} refreshKey={refreshKey}
            onGenerate={setTargetRun} />
        ))}
        {totalItems > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Pagination {...paginationProps} />
          </div>
        )}
      </div>

      {targetRun && (
        <Modal title="Generate Disbursement Batch"
          subtitle={`${targetRun.scheduleName} · ${targetRun.periodStart} to ${targetRun.periodEnd}`}
          onClose={() => setTargetRun(null)}>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            <Field label="Channel" required>
              <select className={inputCls} value={form.channel} onChange={set('channel')}>
                {CHANNELS.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Source Account"><input className={inputCls} value={form.sourceAccount} onChange={set('sourceAccount')} placeholder="Optional" /></Field>
            <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={set('remarks')} placeholder="Optional" /></Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setTargetRun(null)} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
                {creating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DisbursementTab;