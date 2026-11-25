// BIR 1604-C / 2316 workbook (employee details for the alphalist).
import { NUM, n, r2, lastFirst, styleCell } from '../shared/birWorkbookKit';

const HEAD_1604 = ['No.', 'Employee Name', 'TIN', 'Basic Salary (Total in a year)', '13th Month', 'De Minimis Benefits',
  'SSS,HDMF,PHIC Contribution', 'Taxable Compensation', 'Withholding Tax', 'Region', 'Current Employment Status',
  'Employment Period', 'Date of Birth', 'Address'];
const mmmdd = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};

export const build1604c = (ExcelJS, data) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`1604C-${data.year}`);
  HEAD_1604.forEach((h, i) => {
    const c = ws.getCell(1, i + 1); c.value = h;
    styleCell(c, { font: 'Aptos Narrow', size: 11, bold: true, align: 'center', valign: 'middle', wrap: true, fmt: i === 3 ? NUM : undefined });
  });
  ws.getRow(1).height = 48;
  [6.3, 39.7, 18.6, 16.7, 18.6, 16, 16, 16, 15.4, 18.6, 21.1, 27.3, 18.6, 69.7].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  (data.rows || []).forEach((d, i) => {
    const r = i + 2;
    const v = [i + 1, lastFirst(d), d.tin || null, r2(d.basic), r2(d.thirteenth), r2(d.deMinimis),
      r2(n(d.sss) + n(d.phic) + n(d.hdmf)), null, r2(d.wht), d.region || null, d.employmentStatus || null,
      d.periodStart && d.periodEnd ? `${mmmdd(d.periodStart)} - ${mmmdd(d.periodEnd)}` : null,
      d.dateOfBirth ? new Date(`${d.dateOfBirth}T00:00:00`) : null, d.address || null];
    v.forEach((x, c) => { if (x !== null && x !== undefined) ws.getCell(r, c + 1).value = x; });
    ws.getCell(r, 8).value = d.mwe ? 0 : { formula: `MAX(0,D${r}-G${r})` };
    for (let c = 1; c <= 14; c++) {
      styleCell(ws.getCell(r, c), { font: 'Cambria', size: 11, align: c === 2 || c === 14 ? 'left' : 'center', fmt: c >= 4 && c <= 9 ? NUM : c === 13 ? 'd-mmm-yy' : undefined });
    }
  });
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  return wb;
};
