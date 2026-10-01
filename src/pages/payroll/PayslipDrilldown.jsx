import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, PenLine, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import '../../styles/payslip-print.css';

// ---------- company config ----------
const COMPANY_NAME = 'WISECART MERCHANTS CORP.';
const FINANCE_OFFICER = 'PEARL HANNA SALAN';

// ---------- helpers ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// "August 16 to 31, 2026" (or full dates when the range crosses months/years)
const fmtRange = (start, end) => {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return '';
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) return `${MONTHS[s.getMonth()]} ${s.getDate()} to ${e.getDate()}, ${e.getFullYear()}`;
  return `${MONTHS[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} to ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
};

// Accounting style: 0 -> "-", negatives -> (1,039.16)
const amt = (n) => {
  const v = Number(n || 0);
  if (!v) return '-';
  const s = Math.abs(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

// Peso amount that always shows a value (used for totals / net pay)
const peso = (n) =>
  Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const classify = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('cash advance')) return 'cashAdvance';
  if (t.includes('hmo')) return 'hmo';
  if (t.includes(' - ')) {
    const hdmf = t.includes('hdmf') || t.includes('pag-ibig') || t.includes('pagibig');
    if (t.includes('sss')) return 'sssLoan';
    if (hdmf && t.includes('mp2')) return 'mp2';
    if (hdmf) return 'pagibigLoan';
    return null; // other agencies get their own line
  }
  const isHdmf = t.includes('hdmf') || t.includes('pag-ibig') || t.includes('pagibig');
  if (isHdmf) return 'pagibig';
  if (t.includes('sss')) return 'sss';
  if (t.includes('philhealth') || t.includes('phic')) return 'phic';
  if (t.includes('withholding')) return 'tax';
  return null;
};

const DEDUCTION_LINES = [
  { key: 'sss', label: 'SSS Premium' },
  { key: 'phic', label: 'PHIC Premium' },
  { key: 'pagibig', label: 'HDMF Premium' },
  { key: 'hmo', label: 'HMO Premium' },
  { key: 'cashAdvance', label: 'Cash Advance' },
];

const MIN_ROWS = 8;

const PayslipDrilldown = ({ payslipId, onClose }) => {
  const { user } = useAuth();
  const canEditSignature = can(user, 'payroll', 'edit');
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState(null);
  const [sigBusy, setSigBusy] = useState(false);
  const sigInput = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/payroll/settings/payslip-signature');
        if (r.success) setSignature(r.data?.signature || null);
      } catch { /* payslip still works without a signature */ }
    })();
  }, []);

  const uploadSignature = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { toast.error('Use a PNG or JPG image'); return; }
    if (file.size > 1024 * 1024) { toast.error('Image must be 1 MB or smaller'); return; }
    setSigBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.upload('/payroll/settings/payslip-signature', fd);
      if (r.success) { setSignature(r.data?.signature || null); toast.success('Signature saved'); }
      else toast.error(r.error || 'Failed to upload signature');
    } catch (err) {
      toast.error(err.message || 'Failed to upload signature');
    } finally {
      setSigBusy(false);
    }
  };

  const removeSignature = async () => {
    if (!window.confirm('Remove the signature from all payslips?')) return;
    setSigBusy(true);
    try {
      await api.delete('/payroll/settings/payslip-signature');
      setSignature(null);
      toast.success('Signature removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove signature');
    } finally {
      setSigBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payroll/payslips/${payslipId}`);
        if (res.success) setSlip(res.data);
        else toast.error(res.error || 'Failed to load payslip');
      } catch (e) {
        toast.error('Failed to load payslip');
      } finally {
        setLoading(false);
      }
    })();
  }, [payslipId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 text-gray-500">Loading...</div>
    </div>
  );
  if (!slip) return null;

  // ---------- build rows ----------
  const name = (slip.employeeName || '').toUpperCase();
  const designation = (slip.designation || slip.department || '').toUpperCase();
  const period = fmtRange(slip.periodStart || slip.payPeriod, slip.periodEnd || slip.payPeriod);
  const today = new Date().toLocaleDateString('en-US');

  // Pull out the earnings that have dedicated rows so they don't duplicate below
  const earningByName = (needle) =>
    (slip.earnings || []).find(e => (e.payTypeName || '').toLowerCase().includes(needle));

  const thirteen = earningByName('13th');
  const overtimeEarning = {
    amount: (slip.earnings || [])
      .filter(e => (e.payTypeName || '').toLowerCase().includes('overtime'))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
  };

  const sumNegativeByName = (needle) => {
    const total = (slip.deductions || [])
      .filter(d => (d.deductionType || '').toLowerCase().includes(needle))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    return total > 0 ? -total : total;
  };

  const undertime = sumNegativeByName('undertime');
  const lates = sumNegativeByName('lates');
  const absences = sumNegativeByName('absence');

  const reimbursementTotal = (slip.earnings || [])
    .filter(e => (e.payTypeName || '').toLowerCase().includes('reimburse'))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const earnings = [
    { label: 'BASIC SALARY', amount: slip.basicPay },
    { label: '13TH MONTH PAY', amount: thirteen ? thirteen.amount : 0 },
    { label: 'OVERTIME', amount: overtimeEarning ? overtimeEarning.amount : 0 },
    { label: 'UNDERTIME', amount: undertime },
    { label: 'LATES', amount: lates },
    { label: 'ABSENCES', amount: absences },
    { label: 'REIMBURSEMENT', amount: reimbursementTotal },
    ...(slip.earnings || [])
      .filter(e => {
        const t = (e.payTypeName || '').toLowerCase();
        return !(t.includes('13th') || t.includes('overtime') || t.includes('reimburse'));
      })
      .map(e => ({ label: (e.payTypeName || '').toUpperCase(), amount: e.amount })),
  ];

  const buckets = {};
  const loanLines = { sssLoan: [], pagibigLoan: [], mp2: [] };
  const extras = [];
  (slip.deductions || []).forEach(d => {
    const t = (d.deductionType || '').toLowerCase();
    if (t.includes('undertime') || t.includes('lates') || t.includes('absence')) return;
    const k = classify(d.deductionType);
    if (k && loanLines[k]) loanLines[k].push({ label: d.deductionType, amount: Number(d.amount || 0) });
    else if (k) buckets[k] = (buckets[k] || 0) + Number(d.amount || 0);
    else extras.push({
      label: (d.deductionType || '').replace(/^Loan - /i, ''),
      amount: Number(d.amount || 0),
    });
  });
  const slot = (key, fallback) =>
    loanLines[key].length ? loanLines[key] : [{ label: fallback, amount: 0 }];
  const deductions = [
    ...DEDUCTION_LINES.filter(l => l.key !== 'cashAdvance')
      .map(l => ({ label: l.label, amount: buckets[l.key] || 0 })),
    ...slot('sssLoan', 'SSS Loan'),
    ...slot('pagibigLoan', 'HDMF Loan'),
    ...slot('mp2', 'HDMF MP2'),
    { label: 'Cash Advance', amount: buckets.cashAdvance || 0 },
    ...(extras.length ? extras : [{ label: 'Other Deductions', amount: 0 }]),
    { label: 'Withholding Tax', amount: buckets.tax || 0 },
  ];

  const advances = [
    { label: 'Cash Advance', amount: amt(slip.cashAdvanceAmount) },
    { label: 'Payments Made', amount: amt(slip.cashAdvancePaid) },
    { label: 'Balance', amount: amt(slip.cashAdvanceBalance) },
    { header: 'LEAVE BALANCE' },
    { label: 'Vacation Leave', amount: slip.vacationLeaveBalance != null ? slip.vacationLeaveBalance : '0' },
    { label: 'Sick Leave', amount: slip.sickLeaveBalance != null ? slip.sickLeaveBalance : '0' },
  ];

  const rowCount = Math.max(earnings.length, deductions.length, advances.length, MIN_ROWS);
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div className="payslip-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="payslip-print-area bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* toolbar (screen only) */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Payslip &middot; {slip.employeeName}</h2>
          <div className="flex gap-2">
            {canEditSignature && (
              <>
                <input ref={sigInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={uploadSignature} />
                <button
                  onClick={() => sigInput.current?.click()}
                  disabled={sigBusy}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                >
                  <PenLine size={16} /> {signature ? 'Change Signature' : 'Upload Signature'}
                </button>
                {signature && (
                  <button
                    onClick={removeSignature}
                    disabled={sigBusy}
                    title="Remove signature"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="ps-scroll">
          <div className="ps-sheet">
            {/* ================= LEFT: PAYSLIP ================= */}
            <div className="ps-main">
              <div className="ps-head">
                <div className="ps-company">{COMPANY_NAME}</div>
                <div className="ps-period">CUT-OFF PERIOD {period}</div>
                <div className="ps-title">P A Y S L I P</div>
              </div>

              <div className="ps-employee">
                <span className="ps-emp-label">NAME OF EMPLOYEE:</span>
                <span className="ps-emp-name">{name}</span>
                <span className="ps-emp-role">{designation}</span>
              </div>

              <table className="ps-table">
                <colgroup>
                  <col className="ps-c-desc" /><col className="ps-c-amt" />
                  <col className="ps-c-desc" /><col className="ps-c-amt" />
                  <col className="ps-c-desc" /><col className="ps-c-amt" />
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={2}>EARNINGS</th>
                    <th colSpan={2}>DEDUCTION</th>
                    <th colSpan={2}>OUTSTANDING ADVANCES</th>
                  </tr>
                  <tr className="ps-sub">
                    <th>Description</th><th>Amount</th>
                    <th>Description</th><th>Amount</th>
                    <th>Description</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(i => {
                    const e = earnings[i];
                    const d = deductions[i];
                    const a = advances[i];
                    return (
                      <tr key={i}>
                        <td className={e && (e.label || '').length > 18 ? 'long-label' : ''}>
                          {e ? e.label : ''}
                        </td>
                        <td className="ps-num">{e ? amt(e.amount) : ''}</td>

                        <td className={d && (d.label || '').length > 18 ? 'long-label' : ''}>
                          {d ? d.label : ''}
                        </td>
                        <td className="ps-num">{d ? amt(d.amount) : ''}</td>

                        {a && a.header ? (
                          <td colSpan={2} className="ps-band">{a.header}</td>
                        ) : (
                          <>
                            <td className={a && (a.label || '').length > 18 ? 'long-label' : ''}>
                              {a ? a.label : ''}
                            </td>
                            <td className="ps-num">{a ? a.amount : ''}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="ps-total">
                    <td>Total Compensation</td>
                    <td className="ps-num ps-red">{peso(slip.grossPay)}</td>
                    <td>Deduction</td>
                    <td className="ps-num">{peso(slip.totalDeductions)}</td>
                    <td>Net Pay</td>
                    <td className="ps-num ps-red">{peso(slip.netPay)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="ps-foot">
                <div className="ps-disclaimer">
                  <p>
                    This statement constitutes a record of your earnings and deductions. Please report any
                    discrepancies. Actual pay out of salaries is still based on the schedule of release and
                    does not coincide with the issuance of this pay slip.
                  </p>
                  <p>For any further question ask accounting department.</p>
                </div>
                <div className="ps-certify">
                  <div className="ps-certify-label">Certified Correct:</div>
                  {signature && (
                    <img src={signature} alt="Signature" className="ps-sign-img" />
                  )}
                  <div className="ps-sign-line">{FINANCE_OFFICER}</div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT: ACKNOWLEDGEMENT ================= */}
            <div className="ps-side">
              <div className="ps-head ps-side-head">
                <div className="ps-company">{COMPANY_NAME}</div>
                <div className="ps-period ps-red">CUT-OFF PERIOD</div>
                <div className="ps-title">P A Y S L I P</div>
              </div>

              <div className="ps-ack-title">ACKNOWLEDGEMENT<br />RECEIPT</div>

              <div className="ps-ack-body">
                <div className="ps-ack-name">{name}</div>
                <div className="ps-ack-role">{designation}</div>

                <div className="ps-ack-net">
                  <span>Net Amount:</span>
                  <span className="ps-red">&#8369; {peso(slip.netPay)}</span>
                </div>

                <div className="ps-ack-received">
                  <span className="ps-ack-received-label">Received By:</span>
                  <div className="ps-ack-received-name">
                    <div className="ps-ack-line">{name}</div>
                    <div className="ps-ack-caption">Signature over Printed Name</div>
                  </div>
                </div>

                <div className="ps-ack-date">Date: {today}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipDrilldown;