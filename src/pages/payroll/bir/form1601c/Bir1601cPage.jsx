import React, { useState } from 'react';
import { build1601c } from './bir1601cExport';
import BirReportPage from '../shared/BirReportPage';
import TipCell from '../shared/TipCell';
import { MONTHS, acc, n, r2, shortName } from '../shared/birReportFormat';
import { th, td, tdN, tdT, trHover, trSel } from '../shared/birReportStyles';

// BIR Form 1601-C: monthly remittance of income taxes withheld on compensation.

const HEAD_1601C = ['Basic Pay (Regular Rate, either Monthly or MWE)', 'Overtime Pay', 'Holiday Pay',
  'Night Shift Differential', 'Hazard Pay', 'Absences and Undertime', 'Miscalculation Adjustments', 'Incentives',
  '13th Month Pay (Item 17)', 'De Minimis (Item 18)', 'Total Compensation (Item 14)', 'SSS -EE', 'PHIC -EE', 'HDMF -EE',
  'Statutory Minimum Wage (Item 15)', 'Holiday, Overtime, Night Shift, Hazard (MWE) (Item 16)',
  'Total Mandatory Contributions (Item 19)', 'Non-Taxable Compensation (Item 21)', 'Taxable Compensation (Item 22)',
  'Taxable Compensation but not Subject to Wtax (Item 23)', 'Net Taxable Compensation (Item 24)', 'Withholding Tax', 'NET PAY'];

// first bracket that has a rate: pay below it is not subject to withholding
const exemptOf = (rows) => { const t = rows.find((x) => n(x.rate) > 0); return t ? n(t.lower) : 0; };

// Same formulas as the month sheets of the Excel file
const calc1601c = (d, taxRows) => {
  const mwe = !!d.mwe;
  const F = r2(d.basic), G = r2(d.overtime), H = r2(d.holiday), I = r2(d.night), J = r2(d.hazard);
  const K = -r2(d.absUnder), L = r2(n(d.otherEarn) - n(d.otherDed) - n(d.leaveOverdraw)), M = r2(d.incentives), N = r2(d.thirteenth), O = r2(d.deMinimis);
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
    name: shortName(d), tin: d.tin || '', mwe, details: d.details || {},
    vals: [F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, AA, AB],
  };
};

// which pay-entry lines feed each 1601-C column (index in HEAD_1601C); neg = shown as negative
const TIP_1601C = {
  1: { keys: ['overtime'] }, 2: { keys: ['holiday'] }, 3: { keys: ['night'] }, 4: { keys: ['hazard'] },
  5: { keys: ['absUnder'], neg: ['absUnder'] },
  6: { keys: ['otherEarn', 'otherDed', 'leaveOverdraw'], neg: ['otherDed', 'leaveOverdraw'] },
  7: { keys: ['incentives'] }, 8: { keys: ['thirteenth'] }, 9: { keys: ['deMinimis'] },
};
const tipLines = (details, c) => {
  const spec = TIP_1601C[c];
  if (!spec || !details) return null;
  return spec.keys.flatMap((k) => (details[k] || []).map((l) => (spec.neg && spec.neg.includes(k) ? { ...l, amount: -n(l.amount) } : l)));
};

const Bir1601cPreview = ({ data }) => {
  const months = data.months || [];
  const [m, setM] = useState(() => {
    const i = months.map((x) => (x.rows || []).length > 0).lastIndexOf(true);
    return i < 0 ? 0 : i;
  });
  const [sel, setSel] = useState(null);
  const taxRows = data.settings?.taxTable || [];
  const rows = (months[m]?.rows || []).map((x) => calc1601c(x, taxRows));
  const totals = HEAD_1601C.map((_, c) => rows.reduce((s, r) => s + r.vals[c], 0));
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
              <th className={`${th} sticky left-0 z-20 min-w-[48px]`} rowSpan={2}>No.</th>
              <th className={`${th} sticky left-[48px] z-20 min-w-[220px]`} rowSpan={2}>Employee's Name</th>
              <th className={th} rowSpan={2}>Taxpayer's Identification Number</th>
              <th className={th} rowSpan={2}>MWE or NOT</th>
              <th className={`${th} !bg-orange-300`} colSpan={HEAD_1601C.length}>{MONTHS[m].toUpperCase()}</th>
            </tr>
            <tr>{HEAD_1601C.map((h) => <th key={h} className={`${th} min-w-[110px]`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={4 + HEAD_1601C.length} className="px-4 py-10 text-center text-gray-500">No payroll for {MONTHS[m]}</td></tr>
              : rows.map((r, i) => (
                <tr key={i} onClick={() => setSel(i)} className={`${trHover} ${sel === i ? trSel : ''}`}>
                  <td className={`${td} text-center sticky left-0 z-10 bg-white min-w-[48px]`}>{i + 1}</td>
                  <td className={`${td} sticky left-[48px] z-10 bg-white min-w-[220px]`}>{r.name}</td>
                  <td className={`${td} text-center`}>{r.tin || <span className="text-amber-600">missing</span>}</td>
                  <td className={`${td} text-center`}>{r.mwe ? 'MWE' : 'NOT'}</td>
                  {r.vals.map((v, c) => <td key={c} className={tdN}><TipCell lines={tipLines(r.details, c)}>{acc(v)}</TipCell></td>)}
                </tr>
              ))}
            <tr>
              <td className={`${td} font-bold bg-green-100 sticky left-0 z-10`} colSpan={4}>TOTAL</td>
              {totals.map((v, c) => <td key={c} className={tdT}>{acc(v)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BIR_1601C_CONFIG = {
  title: 'BIR Form 1601-C',
  subtitle: 'Monthly remittance return of income taxes withheld on compensation',
  url: '/payroll/bir/1601c',
  fileName: (y) => `1601C Payroll Template ${y}.xlsx`,
  build: build1601c,
  isEmpty: (d) => !(d.months || []).some((m) => (m.rows || []).length),
  missingSetup: (d) => {
    const s = d.settings || {};
    const miss = [];
    if (s.threshold === null || s.threshold === undefined) miss.push('the MWE threshold');
    if (!(s.taxTable || []).length) miss.push('the tax brackets for this year (Tax & Statutory)');
    return miss;
  },
  note: ' Withholding Tax is the amount withheld in your approved payroll runs.',
};

const Bir1601cPage = () => <BirReportPage config={BIR_1601C_CONFIG} Preview={Bir1601cPreview} />;

export default Bir1601cPage;