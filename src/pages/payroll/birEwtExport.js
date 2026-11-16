import { saveWorkbook } from '../../utils/birExport';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FMT = '#,##0.00;-#,##0.00;"-"';
const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const n = (v) => Number(v || 0);
const r2 = (v) => Math.round(n(v) * 100) / 100;
const toDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const head = (ws, rowNo, labels) => {
  const row = ws.getRow(rowNo);
  labels.forEach((l, i) => {
    const c = row.getCell(i + 1);
    c.value = l;
    c.font = { bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    c.border = box;
  });
  row.height = 32;
};

const title = (ws, r, text, bold = true) => { const c = ws.getCell(`A${r}`); c.value = text; c.font = { bold }; };

const boxRow = (ws, r, cols) => cols.forEach((col) => { ws.getCell(`${col}${r}`).border = box; });

// payee lines: Description | Base | ATC | Rate | Tax (formula)
const lineRows = (ws, start, lines) => {
  (lines || []).forEach((l, i) => {
    const r = start + i;
    ws.getCell(`A${r}`).value = l.description;
    ws.getCell(`B${r}`).value = r2(l.base);
    ws.getCell(`B${r}`).numFmt = FMT;
    ws.getCell(`C${r}`).value = l.atc;
    ws.getCell(`C${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`D${r}`).value = n(l.rate);
    ws.getCell(`D${r}`).numFmt = '0%';
    ws.getCell(`D${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`E${r}`).value = { formula: `ROUND(B${r}*D${r},2)`, result: r2(l.tax) };
    ws.getCell(`E${r}`).numFmt = FMT;
    boxRow(ws, r, ['A', 'B', 'C', 'D', 'E']);
  });
  return start + (lines || []).length;
};

const totalCells = (ws, r, label, first, last, base, tax) => {
  ws.getCell(`A${r}`).value = label;
  ws.getCell(`B${r}`).value = { formula: `SUM(B${first}:B${last})`, result: r2(base) };
  ws.getCell(`E${r}`).value = { formula: `SUM(E${first}:E${last})`, result: r2(tax) };
  ['A', 'B', 'E'].forEach((c) => { ws.getCell(`${c}${r}`).font = { bold: true }; });
  ['B', 'E'].forEach((c) => { ws.getCell(`${c}${r}`).numFmt = FMT; });
  boxRow(ws, r, ['A', 'B', 'C', 'D', 'E']);
};

const payBlock = (ws, r, rem) => {
  ws.getCell(`A${r}`).value = 'Payment details';
  ws.getCell(`A${r}`).font = { bold: true };
  const rows = [
    ['Date of remittance', toDate(rem?.dateRemitted)],
    ['Bank', rem?.bank || ''],
    ['Payment Ref. #', rem?.paymentRef || ''],
    ['Amount paid', rem?.amount ?? null],
  ];
  rows.forEach(([k, v], i) => {
    ws.getCell(`A${r + 1 + i}`).value = k;
    const c = ws.getCell(`B${r + 1 + i}`);
    c.value = v;
    c.alignment = { horizontal: 'left' };
    if (k === 'Date of remittance' && v) c.numFmt = 'mm/dd/yyyy';
    if (k === 'Amount paid') c.numFmt = FMT;
  });
};

const cols5 = [{ width: 38 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 28 }];

// ---------------- 0619-E ----------------
const build0619 = (ExcelJS, d, year) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${MONTHS[d.month - 1].slice(0, 3)} ${year}`);
  ws.columns = cols5;
  title(ws, 1, 'MONTHLY WITHHOLDING TAX EXPANDED(0619E)');
  title(ws, 2, `PERIOD COVERED - ${MONTHS[d.month - 1].toUpperCase()} ${year}`, false);
  head(ws, 3, ['Description', 'Tax Base Amount', 'ATC', 'Tax Rate', 'Tax Withheld for the Month']);
  const end = lineRows(ws, 4, d.lines);
  totalCells(ws, end, 'Total Amount of Remittance(item no.14)', 4, end - 1, d.totalBase, d.totalTax);
  payBlock(ws, end + 2, d.remittance);
  return wb;
};

// ---------------- 1601-EQ ----------------
const build1601 = (ExcelJS, d, year) => {
  const wb = new ExcelJS.Workbook();
  const m1 = d.quarter * 3 - 2;
  const ws = wb.addWorksheet(`Q${d.quarter} ${year}`);
  ws.columns = cols5;
  title(ws, 1, 'QUARTERLY WITHHOLDING TAX EXPANDED(1601EQ)');
  title(ws, 2, `PERIOD COVERED - Q${d.quarter} ${year} (${MONTHS[m1 - 1].toUpperCase()} - ${MONTHS[m1 + 1].toUpperCase()})`, false);
  head(ws, 3, ['Description', 'Tax Base for the Quarter', 'ATC', 'Tax Rate', 'Tax Withheld for the Quarter']);
  const end = lineRows(ws, 4, d.lines);
  totalCells(ws, end, 'Total Amount Still Due', 4, end - 1, d.totalBase, d.totalDue);
  ws.getCell(`A${end + 1}`).value = 'Less:';
  const pays = d.payments || [];
  pays.forEach((p, i) => {
    const r = end + 2 + i;
    ws.getCell(`B${r}`).value = `Payments - ${MONTHS[p.month - 1]}`;
    ws.getCell(`E${r}`).value = r2(p.amount);
    ws.getCell(`E${r}`).numFmt = FMT;
  });
  const sr = end + 2 + pays.length + 1;
  ws.getCell(`A${sr}`).value = 'Tax Still Due for the Quarter (over-remittance)';
  ws.getCell(`A${sr}`).font = { bold: true };
  const f = `E${end}` + pays.map((_, i) => `-E${end + 2 + i}`).join('');
  ws.getCell(`E${sr}`).value = { formula: f, result: r2(d.stillDue) };
  ws.getCell(`E${sr}`).numFmt = FMT;
  ws.getCell(`E${sr}`).font = { bold: true };
  payBlock(ws, sr + 2, d.remittance);
  return wb;
};

// ---------------- 1604-E ----------------
const QL = ['1ST', '2ND', '3RD', '4TH'];
const build1604 = (ExcelJS, d, year) => {
  const wb = new ExcelJS.Workbook();

  const s = wb.addWorksheet(`SUMMARY_${year}`);
  s.columns = [{ width: 12 }, { width: 22 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 22 }];
  title(s, 1, '1604-E');
  head(s, 2, ['QUARTER', 'DATE OF REMITTANCE', 'BANK', 'Payment Ref. #', 'TAXES WITHHELD', 'AMOUNT PAID']);
  (d.quarters || []).forEach((q, i) => {
    const r = 3 + i;
    s.getCell(`A${r}`).value = QL[q.quarter - 1] || `Q${q.quarter}`;
    const dt = toDate(q.remittance?.dateRemitted);
    s.getCell(`B${r}`).value = dt;
    if (dt) s.getCell(`B${r}`).numFmt = 'mm/dd/yyyy';
    s.getCell(`C${r}`).value = q.remittance?.bank || '';
    s.getCell(`D${r}`).value = q.remittance?.paymentRef || '';
    s.getCell(`E${r}`).value = r2(q.taxesWithheld);
    s.getCell(`F${r}`).value = q.remittance?.amount ?? null;
    ['E', 'F'].forEach((c) => { s.getCell(`${c}${r}`).numFmt = FMT; });
    boxRow(s, r, ['A', 'B', 'C', 'D', 'E', 'F']);
  });
  s.getCell('A7').value = 'TOTAL';
  s.getCell('E7').value = { formula: 'SUM(E3:E6)', result: r2(d.totalWithheld) };
  s.getCell('F7').value = { formula: 'SUM(F3:F6)', result: (d.quarters || []).reduce((a, q) => a + r2(q.remittance?.amount), 0) };
  ['A', 'E', 'F'].forEach((c) => { s.getCell(`${c}7`).font = { bold: true }; });
  ['E', 'F'].forEach((c) => { s.getCell(`${c}7`).numFmt = FMT; });
  boxRow(s, 7, ['A', 'B', 'C', 'D', 'E', 'F']);

  const a = wb.addWorksheet(`ALPHALIST_${year}`);
  a.columns = [{ width: 22 }, { width: 42 }, { width: 10 }, { width: 26 }, { width: 26 }];
  title(a, 1, 'ALPHALIST_1604E');
  head(a, 2, ['TIN', 'REGISTERED NAME', 'ATC', 'ANNUAL INCOME PAYMENT', 'ANNUAL TAX WITHHELD']);
  const rows = d.alphalist || [];
  rows.forEach((l, i) => {
    const r = 3 + i;
    a.getCell(`A${r}`).value = l.tin || '';
    a.getCell(`B${r}`).value = l.name || l.description || '';
    a.getCell(`C${r}`).value = l.atc;
    a.getCell(`C${r}`).alignment = { horizontal: 'center' };
    a.getCell(`D${r}`).value = r2(l.base);
    a.getCell(`E${r}`).value = { formula: `ROUND(D${r}*${n(l.rate)},2)`, result: r2(l.tax) };
    ['D', 'E'].forEach((c) => { a.getCell(`${c}${r}`).numFmt = FMT; });
    boxRow(a, r, ['A', 'B', 'C', 'D', 'E']);
  });
  const t = 3 + rows.length;
  a.getCell(`A${t}`).value = 'TOTAL';
  a.getCell(`D${t}`).value = { formula: `SUM(D3:D${t - 1})`, result: r2(d.totalBase) };
  a.getCell(`E${t}`).value = { formula: `SUM(E3:E${t - 1})`, result: r2(d.totalTax) };
  ['A', 'D', 'E'].forEach((c) => { a.getCell(`${c}${t}`).font = { bold: true }; });
  ['D', 'E'].forEach((c) => { a.getCell(`${c}${t}`).numFmt = FMT; });
  boxRow(a, t, ['A', 'B', 'C', 'D', 'E']);
  return wb;
};

export const exportEwt = async (kind, d, year) => {
  if (!d) throw new Error('Nothing to export yet');
  const ExcelJS = (await import('exceljs')).default;
  if (kind === '0619') return saveWorkbook(build0619(ExcelJS, d, year), `0619-E ${MONTHS[d.month - 1]} ${year}.xlsx`);
  if (kind === '1601') return saveWorkbook(build1601(ExcelJS, d, year), `1601-EQ Q${d.quarter} ${year}.xlsx`);
  return saveWorkbook(build1604(ExcelJS, d, year), `1604-E ${year}.xlsx`);
};