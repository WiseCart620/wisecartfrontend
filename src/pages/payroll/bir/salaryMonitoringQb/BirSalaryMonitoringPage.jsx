import React, { useState } from 'react';
import { inputCls } from '../../../../components/payroll/Shared';
import { buildSalaryMonitoring } from './birSalaryMonitoringExport';
import BirReportPage from '../shared/BirReportPage';
import TipCell from '../shared/TipCell';
import { MONTHS, acc, n, qbName, r2 } from '../shared/birReportFormat';
import { th, thL, td, tdN, tdT, trHover, trSel } from '../shared/birReportStyles';

// Salary Monitoring for QuickBooks: per payroll run salary breakdown and journal figures.

// one payroll run -> earning/deduction columns, employee rows, totals and journal lines
const buildRunTable = (run) => {
  const rows = run.rows || [];
  const s = (k) => rows.reduce((t, x) => t + n(x[k]), 0);
  const has13 = s('thirteenth') > 0;
  const hasOther = s('otherDed') + s('mp2') + s('leaveOverdraw') > 0;
  const earn = [
    { h: 'Gross Salary', f: (x) => x.basic, k: 'basic', dk: [] },
    { h: 'De Minimis', f: (x) => x.deMinimis, k: 'deMinimis', dk: ['deMinimis'] },
    { h: 'Refunds / Reimb./Other Admin Expense', f: (x) => n(x.reimb) + n(x.otherEarn) + n(x.incentives), k: 'reimb', dk: ['reimb', 'otherEarn', 'incentives'] },
    { h: 'Overtime/Holiday', f: (x) => n(x.overtime) + n(x.holiday) + n(x.night) + n(x.hazard), k: 'ot', dk: ['overtime', 'holiday', 'night', 'hazard'] },
    ...(has13 ? [{ h: '13th month Pay', f: (x) => x.thirteenth, k: 'thirteenth', dk: ['thirteenth'] }] : []),
  ];
  const ded = [
    { h: 'Undeertime/Lates/Absent', f: (x) => x.absUnder, k: 'absUnder', dk: ['absUnder'] },
    { h: 'SSS EE', f: (x) => x.sss, k: 'sss', dk: ['sss'] },
    { h: 'PhilHealth EE', f: (x) => x.phic, k: 'phic', dk: ['phic'] },
    { h: 'Pag-IBIG EE', f: (x) => x.hdmf, k: 'hdmf', dk: ['hdmf'] },
    { h: 'SSS Sal Loan', f: (x) => x.sssSal, k: 'sssSal', dk: ['sssSal'] },
    { h: 'SSS Cal Loan', f: (x) => x.sssCal, k: 'sssCal', dk: ['sssCal'] },
    { h: 'HDMF Cal Loan', f: (x) => x.hdmfCal, k: 'hdmfCal', dk: ['hdmfCal'] },
    { h: 'HDMF MPL', f: (x) => x.hdmfMpl, k: 'hdmfMpl', dk: ['hdmfMpl'] },
    { h: 'Cash Advance', f: (x) => x.cashAdvance, k: 'cashAdvance', dk: ['cashAdvance'] },
    { h: 'HMO EE', f: (x) => x.hmo, k: 'hmo', dk: ['hmo'] },
    ...(hasOther ? [{ h: 'Other Deductions (incl. HDMF MP2)', f: (x) => n(x.otherDed) + n(x.mp2) + n(x.leaveOverdraw), k: 'otherDed', dk: ['otherDed', 'mp2', 'leaveOverdraw'] }] : []),
    { h: 'Withholding Tax Payable', f: (x) => x.wht, k: 'wht', dk: ['wht'] },
  ];
  const det = (x, keys) => keys.flatMap((k) => (x.details && x.details[k]) || []);
  const body = rows.map((x) => {
    const e = earn.map((c) => r2(c.f(x)));
    const d = ded.map((c) => r2(c.f(x)));
    const net = e.reduce((a, b) => a + b, 0) - d.reduce((a, b) => a + b, 0);
    return {
      name: qbName(x), e, d, net, cashAdvance: r2(x.cashAdvance),
      ed: earn.map((c) => det(x, c.dk)), dd: ded.map((c) => det(x, c.dk)), adv: det(x, ['cashAdvance']),
    };
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
    ['Net Pay To Release to Employee', 'C', g('net')],
  ];
  return { earn, ded, body, T, lines };
};

const PayrollRunsView = ({ data }) => {
  const runs = data.runs || [];
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  if (runs.length === 0) return <p className="px-4 py-10 text-center text-gray-500">No approved or paid payroll runs for this year</p>;
  const run = runs[Math.min(idx, runs.length - 1)];
  const { earn, ded, body, T, lines } = buildRunTable(run);
  const totD = lines.filter((l) => l[1] === 'D').reduce((a, l) => a + l[2], 0);
  const totC = lines.filter((l) => l[1] === 'C').reduce((a, l) => a + l[2], 0);
  const advances = body.filter((r) => r.cashAdvance > 0);
  const qbCell = `${td} text-right tabular-nums bg-yellow-200`;
  const rowCls = (id) => `${trHover} ${sel === id ? trSel : ''}`;
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
              <th className={`${thL} sticky left-0 z-20 min-w-[200px]`}>Employee Name</th>
              {earn.map((c) => <th key={c.k} className={`${th} min-w-[110px]`}>{c.h}</th>)}
              {ded.map((c) => <th key={c.k} className={`${th} min-w-[110px]`}>{c.h}</th>)}
              <th className={`${th} min-w-[110px]`}>NET PAY</th>
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i} onClick={() => setSel(`m${i}`)} className={rowCls(`m${i}`)}>
                <td className={`${td} bg-yellow-200 sticky left-0 z-10 min-w-[200px]`}>{r.name}</td>
                {r.e.map((v, j) => <td key={`e${j}`} className={qbCell}><TipCell lines={r.ed[j]}>{acc(v)}</TipCell></td>)}
                {r.d.map((v, j) => <td key={`d${j}`} className={qbCell}><TipCell lines={r.dd[j]}>{acc(v)}</TipCell></td>)}
                <td className={qbCell}>{acc(r.net)}</td>
              </tr>
            ))}
            <tr>
              <td className={`${td} font-bold bg-white sticky left-0 z-10`}>TOTALS</td>
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
              <tr key={label} onClick={() => setSel(`j${i}`)} className={rowCls(`j${i}`)}>
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
          <thead>
            <tr><th className={`${th} !bg-green-500 !text-white`} colSpan={4}>Breakdown of Advances to Employees for QB Recording</th></tr>
            <tr><th className={th}>Type</th><th className={th}>Amount</th><th className={th}>Employee</th><th className={th}>Remarks</th></tr>
          </thead>
          <tbody>
            {advances.length === 0
              ? <tr><td className={`${td} text-gray-400`} colSpan={4}>No cash advances in this cutoff</td></tr>
              : advances.map((r, i) => (
                <tr key={i} onClick={() => setSel(`a${i}`)} className={`bg-green-200 ${rowCls(`a${i}`)}`}>
                  <td className={td}>Cash Advance</td>
                  <td className={tdN}>{acc(r.cashAdvance)}</td>
                  <td className={td}>{r.name}</td>
                  <td className={`${td} !whitespace-pre-line min-w-[220px]`}>{r.adv.map((l) => l.remarks).filter(Boolean).join('\n') || '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- SSS / PHIC / HDMF / Non-employee monthly grids
const SUB_TABS = [['runs', 'Payroll Runs'], ['sss', 'SSS Payment'], ['phic', 'PHIC Payment'], ['hdmf', 'HDMF Payment'], ['non', 'Non-Employee Contributions']];

const ContributionGrid = ({ heads, rows }) => {
  const [sel, setSel] = useState(null);
  const totals = heads.slice(1).map((_, c) => rows.reduce((s, r) => s + n(r[c + 1]), 0));
  return (
    <div className="overflow-auto p-4">
      <table className="text-sm border-collapse min-w-[600px]">
        <thead><tr>{heads.map((h, i) => <th key={h} className={i === 0 ? `${thL} sticky left-0 z-20 min-w-[200px]` : `${th} min-w-[130px]`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={() => setSel(i)} className={`${trHover} ${sel === i ? trSel : ''}`}>
              <td className={`${td} sticky left-0 z-10 bg-white min-w-[200px]`}>{r[0]}</td>
              {r.slice(1).map((v, c) => <td key={c} className={tdN}>{acc(v)}</td>)}
            </tr>
          ))}
          <tr>
            <td className={`${td} font-bold bg-green-100 sticky left-0 z-10`}>TOTAL</td>
            {totals.map((v, c) => <td key={c} className={tdT}>{acc(v)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const BirSalaryMonitoringPreview = ({ data }) => {
  const [tab, setTab] = useState('runs');
  const months = data.monthly || [];
  const people = data.settings?.nonEmployees || [];
  const tabs = SUB_TABS.filter(([k]) => k !== 'non' || people.length > 0);
  const mName = (m) => MONTHS[(m.month || 1) - 1];

  let body;
  if (tab === 'sss') {
    body = <ContributionGrid heads={['Month', 'Contribution', 'Employee Compensation (EC)', 'Salary Loan/Calamity Loan', 'Monthly Total']}
      rows={months.map((m) => {
        const c = n(m.sssEe) + n(m.sssEr), ec = n(m.ec), loan = n(m.sssSal) + n(m.sssCal);
        return [mName(m), c, ec, loan, c + ec + loan];
      })} />;
  } else if (tab === 'phic') {
    body = <ContributionGrid heads={['Month', 'Employee Share', 'Employer Share', 'Contribution', 'Monthly Total']}
      rows={months.map((m) => {
        const ee = n(m.phicEe), er = n(m.phicEr);
        return [mName(m), ee, er, ee + er, ee + er];
      })} />;
  } else if (tab === 'hdmf') {
    body = <ContributionGrid heads={['Month', 'Regular Savings (P1)', 'MP2 Savings', 'Multi-Purpose Loan (MPL)', 'Calamity Loan', 'Monthly Total']}
      rows={months.map((m) => {
        const p1 = n(m.hdmfEe) + n(m.hdmfEr), mp2 = n(m.mp2), mpl = n(m.hdmfMpl), cal = n(m.hdmfCal);
        return [mName(m), p1, mp2, mpl, cal, p1 + mp2 + mpl + cal];
      })} />;
  } else if (tab === 'non') {
    body = <ContributionGrid heads={['Name', 'SSS', 'PhilHealth', 'Pag-IBIG', 'HMO', 'Total']}
      rows={people.map((p) => [p.name, n(p.sss), n(p.phic), n(p.hdmf), n(p.hmo), n(p.sss) + n(p.phic) + n(p.hdmf) + n(p.hmo)])} />;
  } else {
    body = <PayrollRunsView data={data} />;
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

const BIR_SALARY_MONITORING_CONFIG = {
  title: 'Salary Monitoring for QB',
  subtitle: 'Per payroll run salary breakdown and journal figures for QuickBooks',
  url: '/payroll/bir/salary-monitoring',
  fileName: (y) => `Salary Monitoring for QB ${y}.xlsx`,
  build: buildSalaryMonitoring,
  isEmpty: (d) => !(d.runs || []).length,
  missingSetup: () => [],
  note: ' Employee Compensation (EC) is computed automatically from the SSS brackets in Tax & Statutory.',
};

const BirSalaryMonitoringPage = () => <BirReportPage config={BIR_SALARY_MONITORING_CONFIG} Preview={BirSalaryMonitoringPreview} />;

export default BirSalaryMonitoringPage;