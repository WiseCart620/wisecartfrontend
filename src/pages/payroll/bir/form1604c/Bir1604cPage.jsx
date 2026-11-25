import React, { useState } from 'react';
import { build1604c } from './bir1604cExport';
import BirReportPage from '../shared/BirReportPage';
import { acc, lastFirst, n, r2 } from '../shared/birReportFormat';
import { th, td, tdN, trHover, trSel } from '../shared/birReportStyles';

// BIR Form 1604-C / 2316: annual employee details for the alphalist and certificate of compensation.

const mmmdd = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};
const dmy = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}-${d.toLocaleDateString('en-US', { month: 'short' })}-${String(d.getFullYear()).slice(2)}`;
};

const HEADS_1604C = ['No.', 'Employee Name', 'TIN', 'Basic Salary (Total in a year)', '13th Month', 'De Minimis Benefits',
  'SSS,HDMF,PHIC Contribution', 'Taxable Compensation', 'Withholding Tax', 'Region', 'Current Employment Status',
  'Employment Period', 'Date of Birth', 'Address'];

const Bir1604cPreview = ({ data }) => {
  const [sel, setSel] = useState(null);
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
  return (
    <div className="overflow-auto">
      <table className="min-w-[1700px] text-sm border-collapse">
        <thead><tr>{HEADS_1604C.map((h, hi) => <th key={h} className={`${th} ${hi === 0 ? 'sticky left-0 z-20 min-w-[48px]' : hi === 1 ? 'sticky left-[48px] z-20 min-w-[220px]' : ''}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={HEADS_1604C.length} className="px-4 py-10 text-center text-gray-500">No employees for this year</td></tr>
            : rows.map((r, i) => (
              <tr key={i} onClick={() => setSel(i)} className={`${trHover} ${sel === i ? trSel : ''}`}>
                <td className={`${td} text-center sticky left-0 z-10 bg-white min-w-[48px]`}>{i + 1}</td>
                <td className={`${td} sticky left-[48px] z-10 bg-white min-w-[220px]`}>{r.name}</td>
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

const BIR_1604C_CONFIG = {
  title: 'BIR Form 1604-C / 2316',
  subtitle: 'Annual employee details for the alphalist and certificate of compensation',
  url: '/payroll/bir/1604c',
  fileName: (y) => `Employee Details for BIR Form 1604C_2316 ${y}.xlsx`,
  build: build1604c,
  isEmpty: (d) => !(d.rows || []).length,
  missingSetup: (d) => {
    const s = d.settings || {};
    return s.threshold === null || s.threshold === undefined ? ['the MWE threshold'] : [];
  },
  note: '',
};

const Bir1604cPage = () => <BirReportPage config={BIR_1604C_CONFIG} Preview={Bir1604cPreview} />;

export default Bir1604cPage;