import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
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

// Map a raw deduction type onto a fixed slip line
const classify = (type = '') => {
  const t = type.toLowerCase();
  const isHdmf = t.includes('hdmf') || t.includes('pag-ibig') || t.includes('pagibig');
  if (t.includes('sss') && t.includes('loan')) return 'sssLoan';
  if (isHdmf && t.includes('mp2')) return 'mp2';
  if (isHdmf && t.includes('loan')) return 'pagibigLoan';
  if (isHdmf) return 'pagibig';
  if (t.includes('sss')) return 'sss';
  if (t.includes('philhealth') || t.includes('phic')) return 'phic';
  if (t.includes('hmo')) return 'hmo';
  if (t.includes('withholding')) return 'tax';
  if (t.includes('cash advance')) return 'cashAdvance';
  return null;
};

const DEDUCTION_LINES = [
  { key: 'sss', label: 'SSS Payable' },
  { key: 'phic', label: 'PHIC Payable' },
  { key: 'pagibig', label: 'Pag-ibig Payable' },
  { key: 'hmo', label: 'HMO Payable' },
  { key: 'tax', label: 'Withholding Tax' },
  { key: 'sssLoan', label: 'SSS Loan' },
  { key: 'pagibigLoan', label: 'Pag-ibig Loan' },
  { key: 'mp2', label: 'HDMF MP2' },
  { key: 'cashAdvance', label: 'Cash Advance' },
];

const MIN_ROWS = 8;

const PayslipDrilldown = ({ payslipId, onClose }) => {
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const overtimeEarning = earningByName('overtime');

  // Deductions with dedicated rows
  const deductionByName = (needle) =>
    (slip.deductions || []).find(d => (d.deductionType || '').toLowerCase().includes(needle));

  const negateIfPositive = (d) => {
    if (!d) return 0;
    const v = Number(d.amount || 0);
    return v > 0 ? -v : v;
  };

  const undertime = negateIfPositive(deductionByName('undertime'));
  const lates = negateIfPositive(deductionByName('lates'));
  const absences = negateIfPositive(deductionByName('absence'));

  const reimbursement = earningByName('reimburse');

  const earnings = [
    { label: 'BASIC SALARY', amount: slip.basicPay },
    { label: '13TH MONTH PAY', amount: thirteen ? thirteen.amount : 0 },
    { label: 'OVERTIME', amount: overtimeEarning ? overtimeEarning.amount : 0 },
    { label: 'UNDERTIME', amount: undertime },
    { label: 'LATES', amount: lates },
    { label: 'ABSENCES', amount: absences },
    { label: 'REIMBURSEMENT', amount: reimbursement ? reimbursement.amount : 0 },
    ...(slip.earnings || [])
      .filter(e => {
        const t = (e.payTypeName || '').toLowerCase();
        return !(t.includes('13th') || t.includes('overtime') || t.includes('reimburse'));
      })
      .map(e => ({ label: (e.payTypeName || '').toUpperCase(), amount: e.amount })),
  ];

  const buckets = {};
  const extras = [];
  (slip.deductions || []).forEach(d => {
    const t = (d.deductionType || '').toLowerCase();
    // skip the ones we've given dedicated rows to
    if (t.includes('undertime') || t.includes('lates') || t.includes('absence')) return;
    const k = classify(d.deductionType);
    if (k) buckets[k] = (buckets[k] || 0) + Number(d.amount || 0);
    else extras.push({ label: d.deductionType, amount: Number(d.amount || 0) });
  });
  const deductions = [
    ...DEDUCTION_LINES.map(l => ({ label: l.label, amount: buckets[l.key] || 0 })),
    ...extras,
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
                    <th colSpan={2}>ADVANCES</th>
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