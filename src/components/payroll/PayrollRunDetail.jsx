import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, CheckCircle, XCircle, Download, Wallet, RefreshCw, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { money } from './Shared';
import PayslipDrilldown from '../../pages/payroll/PayslipDrilldown';

const LABEL = { DRAFT: 'On-Going', SUBMITTED: 'On-Going (For Approval)', APPROVED: 'Approved', REJECTED: 'Rejected', PAID: 'Paid' };
const STATUTORY = ['SSS', 'PhilHealth', 'Pag-IBIG'];
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
      <input type="number" min="0" step="0.01" value={val} onChange={on}
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
              <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save Changes</button>
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

  const regenerate = () => window.confirm('Regenerate all payslips? Manual edits are lost.') &&
    act(() => api.post(`/payroll/runs/${runId}/regenerate`), 'Payslips regenerated');
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

  const dlUbp = async () => {
    try {
      const XLSX = await import('xlsx');

      // Build lines straight from the loaded payslips (no external endpoint needed).
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

      const remarks = `Cut Off Date ${new Date(run.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      const sourceAccount = '003040002919'; // ← your UnionBank source account

      // Exact layout of the UBP "Standard Upload File" template
      const aoa = [
        ['Remarks*', remarks, '', '', '', '', '', '', ''],
        ['Channel*', 'UnionBank', '', '', '', '', '', '', ''],
        ['Source Account', sourceAccount, '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['Beneficiary Code', 'Beneficiary Name', 'Beneficiary Account Number', 'Beneficiary Address',
          'Beneficiary Bank Code', 'Amount', 'OUR/SHA', 'Purpose', 'Other Remarks'],
        ...lines.map(l => [
          '',                          // Beneficiary Code (blank)
          l.name,                      // Beneficiary Name
          l.account,                   // Beneficiary Account Number
          '',                          // Beneficiary Address
          '',                          // Beneficiary Bank Code
          Number(l.amount).toFixed(2), // Amount
          '',                          // OUR/SHA
          '2',                         // Purpose: 2 = Salary
          'Salary for Period',         // Other Remarks
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 18 }, { wch: 30 }, { wch: 28 }, { wch: 24 },
        { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 24 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Standard Upload File');
      XLSX.writeFile(wb, `UBP_${period}.xlsx`);

      logDoc('UBP_TEMPLATE');
    } catch (e) {
      toast.error(e.message || 'Failed to generate UBP file');
    }
  };

  if (!run) return <div className="p-8 text-gray-500">Loading...</div>;
  const st = run.status;
  const canDownload = perm('download') && (st === 'APPROVED' || st === 'PAID');
  const btn = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-50';

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 mb-4"><ArrowLeft size={16} /> Back</button>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.scheduleName}</h1>
          <p className="text-gray-600">{run.periodStart} – {run.periodEnd} · Pay date {run.payDate}</p>
          <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100">{LABEL[st] || st}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(st === 'DRAFT' || st === 'REJECTED') && perm('create') &&
            <button disabled={busy} onClick={regenerate} className={`${btn} border border-gray-300`}><RefreshCw size={16} /> Regenerate</button>}
          {(st === 'DRAFT' || st === 'REJECTED' || st === 'SUBMITTED') &&
            <button onClick={() => { toast.success('Saved — continue anytime'); onBack(); }} className={`${btn} border border-gray-300`}><Save size={16} /> Save for Later</button>}
          {(st === 'DRAFT' || st === 'REJECTED') && perm('submit') &&
            <button disabled={busy} onClick={submit} className={`${btn} bg-blue-600 text-white`}><Send size={16} /> Submit</button>}
          {st === 'SUBMITTED' && perm('approve') && <>
            <button disabled={busy} onClick={reject} className={`${btn} border border-red-300 text-red-600`}><XCircle size={16} /> Reject</button>
            <button disabled={busy} onClick={approve} className={`${btn} bg-green-600 text-white`}><CheckCircle size={16} /> Approve</button>
          </>}
          {st === 'APPROVED' && perm('pay') &&
            <button disabled={busy} onClick={pay} className={`${btn} bg-purple-600 text-white`}><Wallet size={16} /> Pay</button>}
        </div>
      </div>

      {canDownload && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-white rounded-xl shadow-sm">
          <span className="text-sm font-medium mr-2">Downloads:</span>
          <button onClick={dlDetailed} className={`${btn} border border-gray-300`}><Download size={16} /> Payslip Detailed</button>
          <button onClick={dlSummary} className={`${btn} border border-gray-300`}><Download size={16} /> Payslip Summary</button>
          <button onClick={dlUbp} className={`${btn} border border-gray-300`}><Download size={16} /> UBP Template</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Employee', 'Basic', 'Other Earnings', 'Statutory', 'Tax', 'Other Ded.', 'Net Pay', ''].map(h =>
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {slips.map(s => {
              const stat = s.deductions.filter(d => STATUTORY.includes(d.deductionType)).reduce((a, d) => a + Number(d.amount), 0);
              const tax = Number(s.withholdingTax || 0);
              return (
                <tr key={s.paySlipId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => setViewId(s.paySlipId)}>{s.employeeName}</td>
                  <td className="px-4 py-3">{money(s.basicPay)}</td>
                  <td className="px-4 py-3">{money(Number(s.grossPay) - Number(s.basicPay))}</td>
                  <td className="px-4 py-3">{money(stat)}</td>
                  <td className="px-4 py-3">{money(tax)}</td>
                  <td className="px-4 py-3">{money(Number(s.totalDeductions) - stat - tax)}</td>
                  <td className="px-4 py-3 font-semibold">{money(s.netPay)}</td>
                  <td className="px-4 py-3 text-right">
                    {st === 'SUBMITTED' && perm('edit') &&
                      <button onClick={() => setEditId(s.paySlipId)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit payslip"><Edit2 size={16} /></button>}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3" colSpan="6">Total ({run.employeeCount})</td>
              <td className="px-4 py-3">{money(run.totalNetPay)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>

      {viewId && <PayslipDrilldown payslipId={viewId} onClose={() => setViewId(null)} />}
      {editId && <EditModal payslipId={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); load(); }} />}
    </div>
  );
};

export default PayrollRunDetail;