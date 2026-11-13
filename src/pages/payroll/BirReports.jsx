import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Settings2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth, can, uiAllowed } from '../../context/AuthContext';
import PageShell from '../../components/payroll/PageShell';
import { inputCls, Modal, money } from '../../components/payroll/Shared';
import { build1601c, build1604c, buildSalaryMonitoring, saveWorkbook } from '../../utils/birExport';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

const CONFIG = {
  '1601c': {
    title: 'BIR Form 1601-C',
    subtitle: 'Monthly remittance return of income taxes withheld on compensation',
    url: '/payroll/bir/1601c',
    file: (y) => `1601C Payroll Template ${y}.xlsx`,
    build: build1601c,
    mwe: true,
  },
  '1604c': {
    title: 'BIR Form 1604-C / 2316',
    subtitle: 'Annual employee details for the alphalist and certificate of compensation',
    url: '/payroll/bir/1604c',
    file: (y) => `Employee Details for BIR Form 1604C_2316 ${y}.xlsx`,
    build: build1604c,
    mwe: true,
  },
  qb: {
    title: 'Salary Monitoring for QB',
    subtitle: 'Per payroll run salary breakdown and journal figures for QuickBooks',
    url: '/payroll/bir/salary-monitoring',
    file: (y) => `Salary Monitoring for QB ${y}.xlsx`,
    build: buildSalaryMonitoring,
    mwe: false,
  },
};

// ------------------------------------------------------------------ helpers (same rules as the Excel file)
const n = (v) => Number(v || 0);
const r2 = (v) => Math.round(n(v) * 100) / 100;
const up = (s) => String(s || '').trim().toUpperCase();
const cap = (s) => String(s || '').trim().toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const shortName = (r) => {
  const mid = String(r.middleName || '').trim();
  const initial = mid ? ` ${mid[0].toUpperCase()}.` : '';
  return `${up(r.firstName)}${initial} ${up(r.lastName)}`.replace(/\s+/g, ' ').trim();
};
const lastFirst = (r) => `${up(r.lastName)}, ${up(r.firstName)}${r.middleName ? ' ' + up(r.middleName) : ''}`.trim();
const qbName = (r) => `${cap(r.lastName)}, ${cap(r.firstName)}`;
const fullName = (r) => `${r.lastName || ''}, ${r.firstName || ''}${r.middleName ? ' ' + r.middleName : ''}`;
const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

// accounting style like the workbook: zero shows as "-"
const acc = (v) => (Math.abs(n(v)) < 0.005 ? '-' : n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

const th = 'px-3 py-2 text-center text-xs font-semibold text-gray-700 border border-gray-300 bg-gray-100 whitespace-normal';
const thL = th.replace('text-center', 'text-left');
const td = 'px-3 py-1.5 border border-gray-200 text-xs whitespace-nowrap';
const tdN = `${td} text-right tabular-nums`;
const tdT = `${td} font-bold bg-green-100 text-right tabular-nums`;

// ------------------------------------------------------------------ 1601-C
const HEAD_1601 = ['Basic Pay (Regular Rate, either Monthly or MWE)', 'Overtime Pay', 'Holiday Pay',
  'Night Shift Differential', 'Hazard Pay', 'Absences and Undertime', 'Miscalculation Adjustments', 'Incentives',
  '13th Month Pay (Item 17)', 'De Minimis (Item 18)', 'Total Compensation (Item 14)', 'SSS -EE', 'PHIC -EE', 'HDMF -EE',
  'Statutory Minimum Wage (Item 15)', 'Holiday, Overtime, Night Shift, Hazard (MWE) (Item 16)',
  'Total Mandatory Contributions (Item 19)', 'Non-Taxable Compensation (Item 21)', 'Taxable Compensation (Item 22)',
  'Taxable Compensation but not Subject to Wtax (Item 23)', 'Net Taxable Compensation (Item 24)', 'Withholding Tax', 'NET PAY'];

// Withholding tax uses the table saved in BIR settings (the same table goes to the TAX sheet of the file)
const taxOf = (z, rows) => {
  if (z === 0 || !rows.length) return 0;
  let row = rows[0];
  for (const t of rows) if (z >= n(t.lower)) row = t;
  return (z - n(row.lower)) * n(row.rate) + n(row.fixed);
};
const exemptOf = (rows) => { const t = rows.find((x) => n(x.rate) > 0); return t ? n(t.lower) : 0; };
// Same formulas as the month sheets of the Excel file
const calc1601 = (d, taxRows) => {
  const mwe = !!d.mwe;
  const F = r2(d.basic), G = r2(d.overtime), H = r2(d.holiday), I = r2(d.night), J = r2(d.hazard);
  const K = -r2(d.absUnder), L = 0, M = r2(d.incentives), N = r2(d.thirteenth), O = r2(d.deMinimis);
  const P = F + G + H + I + J + K + L + M + N + O;
  const Q = r2(d.sss), R = r2(d.phic), S = r2(d.hdmf);
  const T = mwe ? F : 0;
  const U = mwe ? G + H + I + J + K + L + M : 0;
  const V = mwe ? 0 : Q + R + S;
  const W = T + U + V + N + O;
  const X = P - W;
  const Y = !mwe && X < exemptOf(taxRows) ? X : 0;
  const Z = Y === 0 ? X : 0;
  const AA = r2(d.wht);
  const AB = P - Q - R - S - AA;
  return {
    name: shortName(d), tin: d.tin || '', mwe,
    vals: [F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, AA, AB],
  };
};

const Preview1601 = ({ data }) => {
  const months = data.months || [];
  const [m, setM] = useState(() => {
    const i = months.map((x) => (x.rows || []).length > 0).lastIndexOf(true);
    return i < 0 ? 0 : i;
  });
  const taxRows = data.settings?.taxTable || [];
  const rows = (months[m]?.rows || []).map((x) => calc1601(x, taxRows));
  const totals = HEAD_1601.map((_, c) => rows.reduce((s, r) => s + r.vals[c], 0));
  return (
    <div>
      <div className="flex flex-wrap gap-1 p-3 border-b border-gray-200">
        {MONTHS.map((name, i) => (
          <button key={name} onClick={() => setM(i)}
            className={`px-3 py-1 rounded text-xs font-medium border ${i === m ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'} ${!(months[i]?.rows || []).length && i !== m ? 'opacity-50' : ''}`}>
            {name.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>
      <div className="overflow-auto">
        <table className="min-w-[2400px] text-sm border-collapse">
          <thead>
            <tr>
              <th className={th} rowSpan={2}>No.</th>
              <th className={th} rowSpan={2}>Employee's Name</th>
              <th className={th} rowSpan={2}>Taxpayer's Identification Number</th>
              <th className={th} rowSpan={2}>MWE or NOT</th>
              <th className={`${th} !bg-orange-300`} colSpan={HEAD_1601.length}>{MONTHS[m].toUpperCase()}</th>
            </tr>
            <tr>{HEAD_1601.map((h) => <th key={h} className={`${th} min-w-[110px]`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={4 + HEAD_1601.length} className="px-4 py-10 text-center text-gray-500">No payroll for {MONTHS[m]}</td></tr>
              : rows.map((r, i) => (
                <tr key={i}>
                  <td className={`${td} text-center`}>{i + 1}</td>
                  <td className={td}>{r.name}</td>
                  <td className={`${td} text-center`}>{r.tin || <span className="text-amber-600">missing</span>}</td>
                  <td className={`${td} text-center`}>{r.mwe ? 'MWE' : 'NOT'}</td>
                  {r.vals.map((v, c) => <td key={c} className={tdN}>{acc(v)}</td>)}
                </tr>
              ))}
            <tr>
              <td className={`${td} font-bold bg-green-100`} colSpan={4}>TOTAL</td>
              {totals.map((v, c) => <td key={c} className={tdT}>{acc(v)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 1604-C
const mmmdd = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};
const dmy = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}-${d.toLocaleDateString('en-US', { month: 'short' })}-${String(d.getFullYear()).slice(2)}`;
};

const Preview1604 = ({ data }) => {
  const rows = (data.rows || []).map((d) => {
    const contrib = r2(n(d.sss) + n(d.phic) + n(d.hdmf));
    const basic = r2(d.basic);
    return {
      name: lastFirst(d), tin: d.tin || '', basic, thirteenth: r2(d.thirteenth), deMinimis: r2(d.deMinimis), contrib,
      taxable: d.mwe ? 0 : Math.max(0, basic - contrib), wht: r2(d.wht),
      region: d.region || '', status: d.employmentStatus || '',
      period: d.periodStart && d.periodEnd ? `${mmmdd(d.periodStart)} - ${mmmdd(d.periodEnd)}` : '',
      dob: dmy(d.dateOfBirth), address: d.address || '',
    };
  });
  const heads = ['No.', 'Employee Name', 'TIN', 'Basic Salary (Total in a year)', '13th Month', 'De Minimis Benefits',
    'SSS,HDMF,PHIC Contribution', 'Taxable Compensation', 'Withholding Tax', 'Region', 'Current Employment Status',
    'Employment Period', 'Date of Birth', 'Address'];
  return (
    <div className="overflow-auto">
      <table className="min-w-[1700px] text-sm border-collapse">
        <thead><tr>{heads.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={heads.length} className="px-4 py-10 text-center text-gray-500">No employees for this year</td></tr>
            : rows.map((r, i) => (
              <tr key={i}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={td}>{r.name}</td>
                <td className={`${td} text-center`}>{r.tin || <span className="text-amber-600">missing</span>}</td>
                <td className={tdN}>{acc(r.basic)}</td>
                <td className={tdN}>{acc(r.thirteenth)}</td>
                <td className={tdN}>{acc(r.deMinimis)}</td>
                <td className={tdN}>{acc(r.contrib)}</td>
                <td className={tdN}>{acc(r.taxable)}</td>
                <td className={tdN}>{acc(r.wht)}</td>
                <td className={`${td} text-center`}>{r.region}</td>
                <td className={`${td} text-center`}>{r.status}</td>
                <td className={`${td} text-center`}>{r.period}</td>
                <td className={`${td} text-center`}>{r.dob}</td>
                <td className={td}>{r.address}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

// ------------------------------------------------------------------ Salary monitoring for QB (one table per cutoff, like the Excel sheets)
const qbRun = (run) => {
  const rows = run.rows || [];
  const s = (k) => rows.reduce((t, x) => t + n(x[k]), 0);
  const has13 = s('thirteenth') > 0;
  const hasOver = s('leaveOverdraw') > 0;
  const hasOther = s('otherDed') + s('mp2') > 0;
  const earn = [
    { h: 'Gross Salary', f: (x) => x.basic, k: 'basic' },
    { h: 'De Minimis', f: (x) => x.deMinimis, k: 'deMinimis' },
    { h: 'Refunds / Reimb./Other Admin Expense', f: (x) => x.reimb, k: 'reimb' },
    { h: 'Overtime/Holiday', f: (x) => n(x.overtime) + n(x.holiday) + n(x.night) + n(x.hazard) + n(x.incentives), k: 'ot' },
    ...(has13 ? [{ h: '13th month Pay', f: (x) => x.thirteenth, k: 'thirteenth' }] : []),
  ];
  const ded = [
    { h: 'Undeertime/Lates/Absent', f: (x) => x.absUnder, k: 'absUnder' },
    { h: 'SSS EE', f: (x) => x.sss, k: 'sss' },
    { h: 'PhilHealth EE', f: (x) => x.phic, k: 'phic' },
    { h: 'Pag-IBIG EE', f: (x) => x.hdmf, k: 'hdmf' },
    { h: 'SSS Sal Loan', f: (x) => x.sssSal, k: 'sssSal' },
    { h: 'SSS Cal Loan', f: (x) => x.sssCal, k: 'sssCal' },
    { h: 'HDMF Cal Loan', f: (x) => x.hdmfCal, k: 'hdmfCal' },
    { h: 'HDMF MPL', f: (x) => x.hdmfMpl, k: 'hdmfMpl' },
    { h: 'Cash Advance', f: (x) => x.cashAdvance, k: 'cashAdvance' },
    ...(hasOver ? [{ h: 'Leave Overdraw Recovery', f: (x) => x.leaveOverdraw, k: 'leaveOverdraw' }] : []),
    { h: 'HMO EE', f: (x) => x.hmo, k: 'hmo' },
    ...(hasOther ? [{ h: 'Other Deductions (incl. HDMF MP2)', f: (x) => n(x.otherDed) + n(x.mp2), k: 'otherDed' }] : []),
    { h: 'Withholding Tax Payable', f: (x) => x.wht, k: 'wht' },
  ];
  const body = rows.map((x) => {
    const e = earn.map((c) => r2(c.f(x)));
    const d = ded.map((c) => r2(c.f(x)));
    const net = e.reduce((a, b) => a + b, 0) - d.reduce((a, b) => a + b, 0);
    return { name: qbName(x), e, d, net, cashAdvance: r2(x.cashAdvance) };
  });
  const T = {};
  earn.forEach((c, j) => { T[c.k] = body.reduce((a, r) => a + r.e[j], 0); });
  ded.forEach((c, j) => { T[c.k] = body.reduce((a, r) => a + r.d[j], 0); });
  T.net = body.reduce((a, r) => a + r.net, 0);
  const g = (k) => T[k] || 0;
  const lines = [
    ['Basic', 'D', g('basic') + g('ot') - g('absUnder')],
    ['De Minimis', 'D', g('deMinimis')],
    ['Refunds', 'D', g('reimb')],
    ...(has13 ? [['13th Month', 'D', g('thirteenth')]] : []),
    ['SSS', 'C', g('sss')],
    ['PHIC', 'C', g('phic')],
    ['HDMF', 'C', g('hdmf')],
    ['HMO', 'C', g('hmo')],
    ['SSS Loan', 'C', g('sssSal') + g('sssCal')],
    ['HDMF Loan', 'C', g('hdmfCal') + g('hdmfMpl')],
    ...(hasOther ? [['Other Deductions', 'C', g('otherDed')]] : []),
    ['Withholding Tax', 'C', g('wht')],
    ['Advances to Employee', 'C', g('cashAdvance')],
    ...(hasOver ? [['Leave Overdraw Recovery', 'C', g('leaveOverdraw')]] : []),
    ['Net Pay To Release to Employee', 'C', g('net')],
  ];
  return { earn, ded, body, T, lines };
};

const PreviewQbRuns = ({ data }) => {
  const runs = data.runs || [];
  const [idx, setIdx] = useState(0);
  if (runs.length === 0) return <p className="px-4 py-10 text-center text-gray-500">No approved or paid payroll runs for this year</p>;
  const run = runs[Math.min(idx, runs.length - 1)];
  const { earn, ded, body, T, lines } = qbRun(run);
  const totD = lines.filter((l) => l[1] === 'D').reduce((a, l) => a + l[2], 0);
  const totC = lines.filter((l) => l[1] === 'C').reduce((a, l) => a + l[2], 0);
  const advances = body.filter((r) => r.cashAdvance > 0);
  const qbCell = `${td} text-right tabular-nums bg-yellow-200`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-200">
        <label className="text-xs font-medium text-gray-700">Cutoff</label>
        <select className={`${inputCls} !w-auto`} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
          {runs.map((r, i) => <option key={r.runId} value={i}>{r.periodStart} to {r.periodEnd} ({r.scheduleName}, {r.status})</option>)}
        </select>
      </div>
      <div className="overflow-auto">
        <table className="text-sm border-collapse min-w-[1100px]">
          <thead>
            <tr>
              <th className={thL}>Employee Name</th>
              {earn.map((c) => <th key={c.k} className={`${th} min-w-[110px]`}>{c.h}</th>)}
              {ded.map((c) => <th key={c.k} className={`${th} min-w-[110px]`}>{c.h}</th>)}
              <th className={`${th} min-w-[110px]`}>NET PAY</th>
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i}>
                <td className={`${td} bg-yellow-200`}>{r.name}</td>
                {r.e.map((v, j) => <td key={`e${j}`} className={qbCell}>{acc(v)}</td>)}
                {r.d.map((v, j) => <td key={`d${j}`} className={qbCell}>{acc(v)}</td>)}
                <td className={qbCell}>{acc(r.net)}</td>
              </tr>
            ))}
            <tr>
              <td className={`${td} font-bold`}>TOTALS</td>
              {earn.map((c) => <td key={c.k} className={`${tdN} font-bold`}>{acc(T[c.k])}</td>)}
              {ded.map((c) => <td key={c.k} className={`${tdN} font-bold`}>{acc(T[c.k])}</td>)}
              <td className={`${tdN} font-bold`}>{acc(T.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-8 p-4">
        <table className="text-sm border-collapse">
          <thead>
            <tr><th className={th} /><th className={th}>Journal line</th><th className={th}>Debit</th><th className={th}>Credit</th></tr>
          </thead>
          <tbody>
            {lines.map(([label, side, v], i) => (
              <tr key={label}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={td}>{label}</td>
                <td className={tdN}>{side === 'D' ? acc(v) : ''}</td>
                <td className={tdN}>{side === 'C' ? acc(v) : ''}</td>
              </tr>
            ))}
            <tr>
              <td className={td} />
              <td className={`${td} font-bold`}>Total (Debit must equal Credit)</td>
              <td className={`${tdN} font-bold`}>{acc(totD)}</td>
              <td className={`${tdN} font-bold`}>{acc(totC)}</td>
            </tr>
          </tbody>
        </table>

        <table className="text-sm border-collapse self-start">
          <thead><tr><th className={`${th} !bg-green-500 !text-white`} colSpan={3}>Breakdown of Advances to Employees for QB Recording</th></tr></thead>
          <tbody>
            {advances.length === 0
              ? <tr><td className={`${td} text-gray-400`} colSpan={3}>No cash advances in this cutoff</td></tr>
              : advances.map((r, i) => (
                <tr key={i} className="bg-green-200">
                  <td className={td}>Cash Advance</td><td className={tdN}>{acc(r.cashAdvance)}</td><td className={td}>{r.name}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ QB: SSS / PHIC / HDMF / Non-employee tabs
const QB_TABS = [['runs', 'Payroll Runs'], ['sss', 'SSS Payment'], ['phic', 'PHIC Payment'], ['hdmf', 'HDMF Payment'], ['non', 'Non-Employee Contributions']];

const QbGrid = ({ heads, rows }) => {
  const totals = heads.slice(1).map((_, c) => rows.reduce((s, r) => s + n(r[c + 1]), 0));
  return (
    <div className="overflow-auto p-4">
      <table className="text-sm border-collapse min-w-[600px]">
        <thead><tr>{heads.map((h, i) => <th key={h} className={i === 0 ? thL : `${th} min-w-[130px]`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={td}>{r[0]}</td>
              {r.slice(1).map((v, c) => <td key={c} className={tdN}>{acc(v)}</td>)}
            </tr>
          ))}
          <tr>
            <td className={`${td} font-bold bg-green-100`}>TOTAL</td>
            {totals.map((v, c) => <td key={c} className={tdT}>{acc(v)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const PreviewQb = ({ data }) => {
  const [tab, setTab] = useState('runs');
  const months = data.monthly || [];
  const people = data.settings?.nonEmployees || [];
  const tabs = QB_TABS.filter(([k]) => k !== 'non' || people.length > 0);
  const mName = (m) => MONTHS[(m.month || 1) - 1];

  let body;
  if (tab === 'sss') {
    body = <QbGrid heads={['Month', 'Contribution', 'Employee Compensation (EC)', 'Salary Loan/Calamity Loan', 'Monthly Total']}
      rows={months.map((m) => {
        const c = n(m.sssEe) + n(m.sssEr), ec = n(m.ec), loan = n(m.sssSal) + n(m.sssCal);
        return [mName(m), c, ec, loan, c + ec + loan];
      })} />;
  } else if (tab === 'phic') {
    body = <QbGrid heads={['Month', 'Employee Share', 'Employer Share', 'Contribution', 'Monthly Total']}
      rows={months.map((m) => {
        const ee = n(m.phicEe), er = n(m.phicEr);
        return [mName(m), ee, er, ee + er, ee + er];
      })} />;
  } else if (tab === 'hdmf') {
    body = <QbGrid heads={['Month', 'Regular Savings (P1)', 'MP2 Savings', 'Multi-Purpose Loan (MPL)', 'Calamity Loan', 'Monthly Total']}
      rows={months.map((m) => {
        const p1 = n(m.hdmfEe) + n(m.hdmfEr), mp2 = n(m.mp2), mpl = n(m.hdmfMpl), cal = n(m.hdmfCal);
        return [mName(m), p1, mp2, mpl, cal, p1 + mp2 + mpl + cal];
      })} />;
  } else if (tab === 'non') {
    body = <QbGrid heads={['Name', 'SSS', 'PhilHealth', 'Pag-IBIG', 'HMO', 'Total']}
      rows={people.map((p) => [p.name, n(p.sss), n(p.phic), n(p.hdmf), n(p.hmo), n(p.sss) + n(p.phic) + n(p.hdmf) + n(p.hmo)])} />;
  } else {
    body = <PreviewQbRuns data={data} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 p-3 border-b border-gray-200">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded text-xs font-medium border ${tab === k ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>
      {body}
    </div>
  );
};
// ------------------------------------------------------------------ MWE settings
// "Load current TRAIN table" fills the form only when the user clicks it. Nothing is saved until Save.
const TRAIN_TABLE = [
  { lower: 0, rate: 0, fixed: 0 },
  { lower: 20833.01, rate: 0.15, fixed: 0 },
  { lower: 33333, rate: 0.2, fixed: 1875 },
  { lower: 66667, rate: 0.25, fixed: 8541.8 },
  { lower: 166667, rate: 0.3, fixed: 33541.8 },
  { lower: 666667, rate: 0.35, fixed: 183541.8 },
];
const sv = (v) => (v === null || v === undefined ? '' : String(v));
const pct = (r) => String(Number((n(r) * 100).toFixed(4)));
const toTaxRow = (t) => ({ lower: sv(t.lower), rate: pct(t.rate), fixed: sv(t.fixed) });
const TABS = [['mwe', 'MWE or NOT'], ['non', 'Non-employees']];

const MweModal = ({ canEdit, onClose, onSaved }) => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('mwe');
  const [threshold, setThreshold] = useState('');
  const [ov, setOv] = useState({});
  const [tax, setTax] = useState([]);
  const [people, setPeople] = useState([]);
  const [ec, setEc] = useState({ cutoff: '', below: '', atOrAbove: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/payroll/bir/mwe').then((r) => {
      if (!r.success) return;
      const d = r.data;
      setData(d);
      setThreshold(sv(d.threshold));
      setOv(Object.fromEntries((d.employees || []).map((e) => [e.employeeId, e.override || ''])));
      setTax((d.taxTable || []).map(toTaxRow));
      setPeople((d.nonEmployees || []).map((p) => ({ name: p.name || '', sss: sv(p.sss), phic: sv(p.phic), hdmf: sv(p.hdmf), hmo: sv(p.hmo) })));
      if (d.sssEc) setEc({ cutoff: sv(d.sssEc.cutoff), below: sv(d.sssEc.below), atOrAbove: sv(d.sssEc.atOrAbove) });
    }).catch(() => toast.error('Failed to load settings'));
  }, []);

  const setRow = (setter) => (i, k, v) => setter((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setTaxRow = setRow(setTax);
  const setPerson = setRow(setPeople);
  const cellCls = `${inputCls} !w-full`;

  const save = async () => {
    if (threshold === '') { toast.error('Enter the MWE threshold first'); return; }
    setSaving(true);
    try {
      await api.put('/payroll/bir/mwe', {
        threshold: Number(threshold),
        overrides: Object.fromEntries(Object.entries(ov).map(([k, v]) => [String(k), v])),
        taxTable: tax.filter((t) => t.lower !== '').map((t) => ({
          lower: Number(t.lower || 0), rate: Number((Number(t.rate || 0) / 100).toFixed(6)), fixed: Number(t.fixed || 0),
        })),
        nonEmployees: people.filter((p) => String(p.name || '').trim()).map((p) => ({
          name: p.name.trim(), sss: Number(p.sss || 0), phic: Number(p.phic || 0), hdmf: Number(p.hdmf || 0), hmo: Number(p.hmo || 0),
        })),
        sssEc: {},
      });
      toast.success('Saved');
      onSaved();
    } catch (e) { toast.error(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <Modal title="BIR settings" subtitle="Values the BIR files use that are not payroll data" onClose={onClose} maxW="max-w-4xl">
      {!data ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === k ? 'border-orange-600 text-orange-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'mwe' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monthly basic salary at or below this amount is MWE</label>
                  <input type="number" className={`${inputCls} !w-48`} value={threshold} disabled={!canEdit}
                    onChange={(e) => setThreshold(e.target.value)} />
                </div>
                <p className="text-xs text-gray-500 pb-2">Required. Use your region's minimum wage. Choose MWE or NOT on an employee to override.</p>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr><th className={thL}>Employee</th><th className={th}>Monthly basic</th><th className={th}>Current</th><th className={th}>Override</th></tr>
                  </thead>
                  <tbody className="[&>tr>td]:border-t [&>tr>td]:border-gray-100">
                    {(data.employees || []).map((e) => (
                      <tr key={e.employeeId}>
                        <td className="px-4 py-2">{fullName(e)}{e.status === 'INACTIVE' && <span className="ml-2 text-xs text-gray-400">inactive</span>}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{money(e.monthlyBasic)}</td>
                        <td className="px-4 py-2 text-center">{e.mwe ? 'MWE' : 'NOT'}</td>
                        <td className="px-4 py-2">
                          <select className={`${inputCls} !w-28`} value={ov[e.employeeId] || ''} disabled={!canEdit}
                            onChange={(x) => setOv((p) => ({ ...p, [e.employeeId]: x.target.value }))}>
                            <option value="">Auto</option><option value="MWE">MWE</option><option value="NOT">NOT</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'tax' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Monthly withholding tax = (taxable pay - lower bracket) x rate + fixed tax, using the highest bracket whose lower bracket is reached.
                Pay below the first bracket that has a rate is not subject to withholding. The same table is written to the TAX sheet of the 1601-C file.
              </p>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => setTax(TRAIN_TABLE.map(toTaxRow))} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100">Load current TRAIN table</button>
                  <button onClick={() => setTax((p) => [...p, { lower: '', rate: '', fixed: '' }])} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100">Add bracket</button>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className={thL}>Lower bracket (monthly)</th><th className={thL}>Rate %</th><th className={thL}>Fixed tax</th><th className={th} /></tr></thead>
                  <tbody>
                    {tax.length === 0
                      ? <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No brackets yet. Click "Load current TRAIN table" or add them.</td></tr>
                      : tax.map((t, i) => (
                        <tr key={i}>
                          {['lower', 'rate', 'fixed'].map((k) => (
                            <td key={k} className="px-2 py-1"><input type="number" min="0" step="0.01" className={cellCls} value={t[k]} disabled={!canEdit} onChange={(e) => setTaxRow(i, k, e.target.value)} /></td>
                          ))}
                          <td className="px-2 py-1">{canEdit && <button onClick={() => setTax((x) => x.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Remove</button>}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'non' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                People who pay government contributions through the company but are not employees (for example investors). Enter their monthly amounts.
                They appear in the "Non-Employee Contributions" sheet of the Salary Monitoring file. Leave the list empty to leave that sheet out.
              </p>
              {canEdit && <button onClick={() => setPeople((p) => [...p, { name: '', sss: '', phic: '', hdmf: '', hmo: '' }])} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100">Add person</button>}
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className={thL}>Name</th><th className={th}>SSS</th><th className={th}>PhilHealth</th><th className={th}>Pag-IBIG</th><th className={th}>HMO</th><th className={th} /></tr></thead>
                  <tbody>
                    {people.length === 0
                      ? <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No one added</td></tr>
                      : people.map((p, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1"><input className={cellCls} value={p.name} disabled={!canEdit} onChange={(e) => setPerson(i, 'name', e.target.value)} /></td>
                          {['sss', 'phic', 'hdmf', 'hmo'].map((k) => (
                            <td key={k} className="px-2 py-1"><input type="number" min="0" step="0.01" className={cellCls} value={p[k]} disabled={!canEdit} onChange={(e) => setPerson(i, k, e.target.value)} /></td>
                          ))}
                          <td className="px-2 py-1">{canEdit && <button onClick={() => setPeople((x) => x.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Remove</button>}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Close</button>
            {canEdit && <button onClick={save} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ------------------------------------------------------------------ page
const BirInner = ({ kind }) => {
  const { user } = useAuth();
  const cfg = CONFIG[kind];
  const canEditMwe = can(user, 'payroll', 'create');
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showMwe, setShowMwe] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`${cfg.url}?year=${year}`);
      setData(r.success ? r.data : null);
    } catch { toast.error('Failed to load report'); setData(null); } finally { setLoading(false); }
  }, [cfg.url, year]);
  useEffect(() => { load(); }, [load]);

  const empty = useMemo(() => {
    if (!data) return true;
    if (kind === '1601c') return !(data.months || []).some((m) => (m.rows || []).length);
    if (kind === '1604c') return !(data.rows || []).length;
    return !(data.runs || []).length;
  }, [data, kind]);

  const setupMissing = useMemo(() => {
    if (!data || !cfg.mwe) return [];
    const s = data.settings || {};
    const miss = [];
    if (s.threshold === null || s.threshold === undefined) miss.push('the MWE threshold');
    if (kind === '1601c' && !(s.taxTable || []).length) miss.push('the tax brackets for this year (Tax & Statutory)');
    return miss;
  }, [data, cfg.mwe, kind]);

  const download = async () => {
    if (!data || setupMissing.length) return;
    setBusy(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      await saveWorkbook(cfg.build(ExcelJS, data), cfg.file(year));
      toast.success('Excel file downloaded');
    } catch (e) { toast.error(e.message || 'Failed to build the Excel file'); } finally { setBusy(false); }
  };

  const action = (
    <div className="flex flex-wrap items-center gap-2">
      <select className={`${inputCls} !w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {Array.from({ length: 5 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {(
        <button onClick={() => setShowMwe(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
          <Settings2 size={16} /> BIR settings
        </button>
      )}
      <button onClick={download} disabled={busy || loading || empty || setupMissing.length > 0}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
        <Download size={16} /> {busy ? 'Building...' : 'Download Excel'}
      </button>
    </div>
  );

  return (
    <PageShell title={cfg.title} subtitle={cfg.subtitle} action={action}>
      <Toaster position="top-right" />
      {setupMissing.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800">
          Set <b>{setupMissing.join(' and ')}</b> in BIR settings before downloading this report.
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <p className="px-5 py-12 text-center text-gray-500">Loading...</p>
          : !data ? <p className="px-5 py-12 text-center text-gray-500">No data</p>
            : kind === '1601c' ? <Preview1601 data={data} />
              : kind === '1604c' ? <Preview1604 data={data} />
                : <PreviewQb data={data} />}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Built from approved and paid payroll runs of {year}. The table above is the same as the downloaded workbook (same columns, formulas and totals).
        {kind === '1601c' && ' Withholding Tax is the amount withheld in your approved payroll runs.'}
        {kind === 'qb' && ' Employee Compensation (EC) is computed automatically from the SSS brackets in Tax & Statutory.'}
      </p>
      {showMwe && <MweModal canEdit={canEditMwe} onClose={() => setShowMwe(false)} onSaved={() => { setShowMwe(false); load(); }} />}
    </PageShell>
  );
};

const BirReports = ({ kind = '1601c' }) => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'payroll_tabs', 'tab_an')) return <Navigate to="/welcome" replace />;
  return <BirInner key={kind} kind={kind} />;
};

export default BirReports;