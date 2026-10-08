import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, CheckCircle, XCircle, Download, Wallet, RefreshCw, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { money, MoneyInput } from './Shared';
import PayslipDrilldown from '../../pages/payroll/PayslipDrilldown';
import EmployeeAvatar from './EmployeeAvatar';

const LABEL = { DRAFT: 'On-Going', SUBMITTED: 'On-Going (For Approval)', APPROVED: 'Approved', REJECTED: 'Rejected', PAID: 'Paid' };
const STATUTORY = ['SSS', 'PhilHealth', 'Pag-IBIG'];
const BADGE = {
  DRAFT: 'bg-white text-gray-700 ring-1 ring-gray-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  APPROVED: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  PAID: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};
const DOT = { DRAFT: 'bg-gray-400', SUBMITTED: 'bg-amber-500', APPROVED: 'bg-green-500', REJECTED: 'bg-red-500', PAID: 'bg-purple-500' };
const fmtD = (d) => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  : '—';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const csv = (rows) => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const saveFile = (name, text, type = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
};

const EditModal = ({ payslipId, onClose, onSaved }) => {
  const [slip, setSlip] = useState(null);
  const [earn, setEarn] = useState({});
  const [ded, setDed] = useState({});

  useEffect(() => {
    api.get(`/payroll/payslips/${payslipId}`).then(r => {
      if (!r.success) return;
      setSlip(r.data);
      setEarn(Object.fromEntries(r.data.earnings.map(e => [e.id, e.amount])));
      setDed(Object.fromEntries(r.data.deductions.map(d => [d.id, d.amount])));
    });
  }, [payslipId]);

  const save = async () => {
    try {
      await api.put(`/payroll/payslips/${payslipId}/adjust`, {
        earnings: Object.entries(earn).map(([id, amount]) => ({ id: Number(id), amount: Number(amount) })),
        deductions: Object.entries(ded).map(([id, amount]) => ({ id: Number(id), amount: Number(amount) })),
      });
      toast.success('Payslip updated');
      onSaved();
    } catch (e) { toast.error(e.message || 'Failed to save'); }
  };

  const row = (key, label, val, on) => (
    <div key={key} className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <MoneyInput value={val} onChange={on}
        className="w-36 px-2 py-1 border border-gray-300 rounded text-right text-sm" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="font-bold">Edit {slip?.employeeName}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {!slip ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-sm">Earnings</h3>
            {slip.earnings.length === 0 && <p className="text-sm text-gray-400">None</p>}
            {slip.earnings.map(e => row('e' + e.id, e.payTypeName, earn[e.id] ?? '', ev => setEarn(p => ({ ...p, [e.id]: ev.target.value }))))}
            <h3 className="font-semibold text-sm pt-2">Deductions</h3>
            {slip.deductions.map(d => row('d' + d.id, d.deductionType, ded[d.id] ?? '', ev => setDed(p => ({ ...p, [d.id]: ev.target.value }))))}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-orange-600 text-white rounded text-sm">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PayrollRunDetail = ({ runId, onBack }) => {
  const { user } = useAuth();
  const [run, setRun] = useState(null);
  const [slips, setSlips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [checked, setChecked] = useState(() => new Set());
  const [photos, setPhotos] = useState({});
  useEffect(() => {
    api.get('/employees').then(r => {
      if (r.success) setPhotos(Object.fromEntries((r.data || []).map(e => [e.employeeId, e.photoUrl])));
    }).catch(() => { });
  }, []);

  const perm = (a) => can(user, 'payroll', a);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.get(`/payroll/runs/${runId}`), api.get(`/payroll/runs/${runId}/payslips`)]);
      if (r.success) setRun(r.data);
      if (s.success) setSlips(s.data || []);
    } catch (e) { toast.error('Failed to load payroll run'); }
  }, [runId]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); await load(); }
    catch (e) { toast.error(e.message || 'Action failed'); }
    finally { setBusy(false); }
  };
  const regenerate = () => {

    const selectedIds = Array.from(checked);
    const employeeIds = slips
      .filter(s => selectedIds.includes(s.paySlipId))
      .map(s => s.employeeId);

    if (employeeIds.length === 0) {
      if (!window.confirm('No employees selected. Regenerate ALL payslips? Manual edits will be lost.')) return;
      return act(
        () => api.post(`/payroll/runs/${runId}/regenerate`, {}),
        'All payslips regenerated'
      );
    }

    // Some selected -> regenerate only those.
    if (!window.confirm(`Regenerate ${employeeIds.length} selected payslip(s)? Manual edits are lost.`)) return;
    return act(
      () => api.post(`/payroll/runs/${runId}/regenerate`, { employeeIds }),
      employeeIds.length === slips.length
        ? 'All payslips regenerated'
        : `${employeeIds.length} payslip(s) regenerated`
    );
  };
  const submit = () => window.confirm('Submit for approval?') && act(() => api.patch(`/payroll/runs/${runId}/submit`), 'Submitted to General Manager');
  const approve = () => window.confirm('Approve this payroll run? Contributions and loan payments will be posted.') &&
    act(() => api.patch(`/payroll/runs/${runId}/approve`), 'Approved');
  const reject = () => {
    const remarks = window.prompt('Reason for rejection?');
    if (remarks === null) return;
    act(() => api.patch(`/payroll/runs/${runId}/reject?remarks=${encodeURIComponent(remarks)}`), 'Rejected');
  };
  const pay = () => window.confirm('Mark this run as PAID?') && act(() => api.patch(`/payroll/runs/${runId}/mark-paid`), 'Marked as paid');

  const logDoc = (type) => api.post('/payroll/documents', { payrollRunId: runId, documentType: type }).catch(() => { });
  const period = run ? `${run.periodStart}_${run.periodEnd}` : '';

  const dlDetailed = async () => {
    const pages = slips.map(s => `
      <section style="page-break-after:always;font-family:Arial;font-size:13px;padding:24px">
        <h2 style="margin:0">PAYSLIP</h2>
        <div>Period: ${esc(run.periodStart)} - ${esc(run.periodEnd)} &nbsp; Pay Date: ${esc(run.payDate)}</div>
        <h3>${esc(s.employeeName)}</h3>
        <table width="100%" cellpadding="4"><tr><td>Basic Pay</td><td align="right">${money(s.basicPay)}</td></tr>
        <tr><td colspan="2"><b>Earnings</b></td></tr>
        ${s.earnings.map(e => `<tr><td>${esc(e.payTypeName)}</td><td align="right">${money(e.amount)}</td></tr>`).join('')}
        <tr><td colspan="2"><b>Deductions</b></td></tr>
        ${s.deductions.map(d => `<tr><td>${esc(d.deductionType)}</td><td align="right">${money(d.amount)}</td></tr>`).join('')}
        <tr><td colspan="2"><hr></td></tr>
        <tr><td>Gross Pay</td><td align="right">${money(s.grossPay)}</td></tr>
        <tr><td>Taxable Income</td><td align="right">${money(s.taxableIncome)}</td></tr>
        <tr><td>Total Deductions</td><td align="right">${money(s.totalDeductions)}</td></tr>
        <tr><td><b>NET PAY</b></td><td align="right"><b>${money(s.netPay)}</b></td></tr></table>
      </section>`).join('');
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups to print/save as PDF'); return; }
    w.document.write(`<html><head><title>Payslips ${esc(period)}</title></head><body>${pages}</body></html>`);
    w.document.close(); w.focus(); w.print();
    logDoc('PAYSLIP_DETAILED');
  };

  const dlSummary = () => {
    const rows = [['Employee', 'Basic Pay', 'Other Earnings', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Other Deductions', 'Gross Pay', 'Total Deductions', 'Net Pay']];
    slips.forEach(s => {
      const g = (t) => s.deductions.filter(d => d.deductionType === t).reduce((a, d) => a + Number(d.amount), 0);
      const stat = STATUTORY.reduce((a, t) => a + g(t), 0);
      const tax = g('Withholding Tax');
      rows.push([s.employeeName, s.basicPay, Number(s.grossPay) - Number(s.basicPay), g('SSS'), g('PhilHealth'), g('Pag-IBIG'),
        tax, Number(s.totalDeductions) - stat - tax, s.grossPay, s.totalDeductions, s.netPay]);
    });
    saveFile(`payslip-summary_${period}.csv`, csv(rows));
    logDoc('PAYSLIP_SUMMARY');
  };

  // One PDF per employee, zipped. File name: "<Employee Name>_<periodStart>_to_<periodEnd>.pdf"
  const dlAllPdf = async () => {
    if (slips.length === 0) return;
    setBusy(true);
    const tid = toast.loading('Preparing payslips...');
    try {
      const { buildPayslipPdf, loadLogo } = await import('../../utils/payslipPdf');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const used = new Map();
      const safe = (v) => String(v || 'Employee').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
      const logo = await loadLogo();

      for (let i = 0; i < slips.length; i++) {
        const s = slips[i];
        toast.loading(`Generating ${i + 1} of ${slips.length}...`, { id: tid });
        const pdf = buildPayslipPdf(s, logo);

        let base = `${safe(s.employeeName)}_${run.periodStart}_to_${run.periodEnd}`;
        const n = (used.get(base) || 0) + 1;
        used.set(base, n);
        if (n > 1) base += `_${n}`;
        zip.file(`${base}.pdf`, pdf.output('blob'));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Payslips_${period}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${slips.length} payslip PDF(s) downloaded`, { id: tid });
    } catch (e) {
      toast.error(e.message || 'Failed to generate PDFs', { id: tid });
    } finally {
      setBusy(false);
    }
  };

  const dlUbp = async () => {
    try {
      const lines = slips.map(s => ({
        name: s.employeeName,
        account: s.bankAccountNumber || '',
        amount: Number(s.netPay),
      }));

      const missing = lines.filter(l => !l.account);
      if (missing.length > 0) {
        toast.error(`${missing.length} employee(s) have no bank account number. Fix them before generating the UBP file.`);
        return;
      }

      const remarks = `Cut Off Date ${new Date(run.periodEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      const sourceAccount = '003040002919'; // your UnionBank source account

      const res = await fetch('/ubp-template.xlsx');
      if (!res.ok) throw new Error('ubp-template.xlsx not found in the public folder');
      const { buildUbpXlsx } = await import('../../utils/ubpExport');
      const blob = await buildUbpXlsx(await res.arrayBuffer(), { remarks, sourceAccount, lines });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `UBP_${period}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);

      logDoc('UBP_TEMPLATE');
    } catch (e) {
      toast.error(e.message || 'Failed to generate UBP file');
    }
  };

  if (!run) return <div className="p-8 text-gray-500">Loading...</div>;
  const st = run.status;
  const canDownload = perm('download') && (st === 'APPROVED' || st === 'PAID');
  const btn = 'inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const outline = `${btn} bg-white border border-gray-300 text-gray-700 hover:bg-white`;
  const totalGross = Number(run.totalGrossPay || 0);
  const totalNet = Number(run.totalNetPay || 0);

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to payroll runs
      </button>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{run.scheduleName}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${BADGE[st] || BADGE.DRAFT}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${DOT[st] || 'bg-gray-400'}`} />
              {LABEL[st] || st}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {fmtD(run.periodStart)} – {fmtD(run.periodEnd)} <span className="mx-1.5 text-gray-300">|</span> Pay date {fmtD(run.payDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(st === 'DRAFT' || st === 'REJECTED') && perm('create') && (
            <button
              disabled={busy || checked.size === 0}
              onClick={regenerate}
              title={checked.size === 0 ? 'Select at least one employee below to regenerate' : `Regenerate ${checked.size} selected`}
              className={outline}
            >
              <RefreshCw size={16} />
              Regenerate{checked.size > 0 ? ` (${checked.size})` : ''}
            </button>
          )}
          {(st === 'DRAFT' || st === 'REJECTED' || st === 'SUBMITTED') &&
            <button onClick={() => { toast.success('Saved — continue anytime'); onBack(); }} className={outline}><Save size={16} /> Save for Later</button>}
          {(st === 'DRAFT' || st === 'REJECTED') && perm('submit') &&
            <button disabled={busy} onClick={submit} className={`${btn} bg-orange-600 text-white shadow-sm hover:bg-orange-700`}><Send size={16} /> Submit</button>}
          {st === 'SUBMITTED' && perm('approve') && <>
            <button disabled={busy} onClick={reject} className={`${btn} bg-white border border-red-300 text-red-600 hover:bg-red-50`}><XCircle size={16} /> Reject</button>
            <button disabled={busy} onClick={approve} className={`${btn} bg-green-600 text-white shadow-sm hover:bg-green-700`}><CheckCircle size={16} /> Approve</button>
          </>}
          {st === 'APPROVED' && perm('pay') &&
            <button disabled={busy} onClick={pay} className={`${btn} bg-purple-600 text-white shadow-sm hover:bg-purple-700`}><Wallet size={16} /> Mark as Paid</button>}
        </div>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['Employees', run.employeeCount, 'text-gray-900'],
          ['Gross pay', money(totalGross), 'text-gray-900'],
          ['Total deductions', money(totalGross - totalNet), 'text-red-600'],
          ['Net pay', money(totalNet), 'text-green-700'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
            <div className={`text-2xl font-semibold mt-1 ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {canDownload && (
        <div className="flex flex-wrap items-center gap-2 mb-6 px-5 py-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-2">Downloads</span>
          <button onClick={dlDetailed} className={outline}><Download size={16} /> Payslip Detailed</button>
          <button onClick={dlSummary} className={outline}><Download size={16} /> Payslip Summary</button>
          <button onClick={dlUbp} className={outline}><Download size={16} /> UBP Template</button>
          <button disabled={busy} onClick={dlAllPdf} className={outline}><Download size={16} /> All Payslips (PDF)</button>
        </div>
      )}

      {/* payslips table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto max-h-[65vh] tbl-scroll">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e7eb]">
            <tr>
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={slips.length > 0 && checked.size === slips.length}
                  onChange={(e) => {
                    if (e.target.checked) setChecked(new Set(slips.map(s => s.paySlipId)));
                    else setChecked(new Set());
                  }}
                  title="Select all"
                />
              </th>
              {[['Employee', 'text-left'], ['Basic', 'text-right'], ['Other Earnings', 'text-right'], ['Statutory', 'text-right'],
              ['Tax', 'text-right'], ['Other Ded.', 'text-right'], ['Net Pay', 'text-right'], ['', 'text-right']].map(([h, al], i) =>
                <th key={i} className={`px-5 py-3 ${al} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`}>{h}</th>)}
            </tr>
          </thead>
          <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
            {slips.map(s => {
              const stat = s.deductions.filter(d => STATUTORY.includes(d.deductionType)).reduce((a, d) => a + Number(d.amount), 0);
              const tax = Number(s.withholdingTax || 0);
              const net = Number(s.netPay || 0);
              return (
                <tr key={s.paySlipId} className={`transition-colors hover:bg-white ${checked.has(s.paySlipId) ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={checked.has(s.paySlipId)}
                      onChange={(e) => {
                        setChecked(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(s.paySlipId);
                          else next.delete(s.paySlipId);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-5 py-3.5 cursor-pointer" onClick={() => setViewId(s.paySlipId)} title="View payslip">
                    <div className="flex items-center gap-3 font-medium text-gray-900 hover:text-orange-700">
                      <EmployeeAvatar name={s.employeeName} photoUrl={photos[s.employeeId]} />
                      {s.employeeName}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(s.basicPay)}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(Number(s.grossPay) - Number(s.basicPay))}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(stat)}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(tax)}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{money(Number(s.totalDeductions) - stat - tax)}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${net < 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(s.netPay)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {st === 'SUBMITTED' && perm('edit') &&
                      <button onClick={() => setEditId(s.paySlipId)} className="p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Edit payslip"><Edit2 size={16} /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-white border-t border-gray-200 font-semibold text-gray-900">
              <td />
              <td className="px-5 py-3.5" colSpan="6">Total ({run.employeeCount} employees)</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{money(run.totalNetPay)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {viewId && <PayslipDrilldown payslipId={viewId} onClose={() => setViewId(null)} />}
      {editId && <EditModal payslipId={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); load(); }} />}
    </div>
  );
};


export default PayrollRunDetail;