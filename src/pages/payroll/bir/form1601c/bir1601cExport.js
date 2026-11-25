// BIR 1601-C workbook (12 month sheets + Adjustments + TAX).
import { NUM, THIN_BOX, thin, MONTHS, MONTH_SHEETS, n, r2, col, shortName, styleCell } from '../shared/birWorkbookKit';

const HEAD_1601 = ['Basic Pay (Regular Rate, either Monthly or MWE)', 'Overtime Pay', 'Holiday Pay',
  'Night Shift Differential', 'Hazard Pay', 'Absences and Undertime', 'Miscalculation Adjustments', 'Incentives',
  '13th Month Pay (Item 17)', 'De Minimis (Item 18)', 'Total Compensation (Item 14)', 'SSS -EE ', 'PHIC -EE', 'HDMF -EE',
  'Statutory Minimum Wage (Item 15)', 'Holiday, Overtime, Night Shift, Hazard (MWE) (Item 16)',
  'Total Mandatory Contributions (Item 19)', 'Non-Taxable Compensation (Item 21)', 'Taxable Compensation (Item 22)',
  'Taxable Compensation but not Subject to Wtax (Item 23)', 'Net Taxable Compensation (Item 24)', 'Withholding Tax', 'NET PAY'];
const WIDTH_1601 = { A: 2.6, B: 4.3, C: 23.1, D: 14.9, E: 8.4, F: 16.3, G: 11.6, H: 11.9, I: 12.4, J: 12.6, K: 13.1, L: 13.3, M: 11.5, N: 13.9, O: 13.3, P: 14.6, Q: 12.1, R: 12, S: 10.9, T: 12.9, U: 15.4, V: 15, W: 13.3, X: 12.4, Y: 15.4, Z: 13.9, AA: 13.1, AB: 11.6 };

const taxFormula = (r, last) => `IF(Z${r}=0,0,((Z${r}-VLOOKUP(Z${r},TAX!$B$4:$E$${last},1))*VLOOKUP(Z${r},TAX!$B$4:$E$${last},3))+VLOOKUP(Z${r},TAX!$B$4:$E$${last},4))`;

// Excel notes on 1601-C cells (sheet column number -> pay-entry lines)
const NOTE_1601 = {
  7: { keys: ['overtime'] }, 8: { keys: ['holiday'] }, 9: { keys: ['night'] }, 10: { keys: ['hazard'] },
  11: { keys: ['absUnder'], neg: ['absUnder'] },
  12: { keys: ['otherEarn', 'otherDed', 'leaveOverdraw'], neg: ['otherDed', 'leaveOverdraw'] },
  13: { keys: ['incentives'] }, 14: { keys: ['thirteenth'] }, 15: { keys: ['deMinimis'] },
};
const note1601 = (d, spec) => {
  const lines = spec.keys.flatMap((k) => ((d.details && d.details[k]) || [])
    .map((l) => ({ ...l, amount: spec.neg && spec.neg.includes(k) ? -n(l.amount) : n(l.amount) })));
  if (!lines.length) return null;
  return lines.map((l) => `${l.label}: ${l.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${l.remarks ? `\n${l.remarks}` : ''}`).join('\n\n');
};

const fill1601 = (ws, monthIdx, rows, tax) => {
  Object.entries(WIDTH_1601).forEach(([k, w]) => { ws.getColumn(k).width = w; });
  ws.mergeCells('B2:B3'); ws.mergeCells('C2:C3'); ws.mergeCells('D2:D3'); ws.mergeCells('E2:E3'); ws.mergeCells('F2:AB2');
  ws.getCell('C2').value = "Employee's Name";
  ws.getCell('D2').value = "Taxpayer's Identification Number";
  ws.getCell('E2').value = 'MWE or NOT';
  ws.getCell('F2').value = MONTHS[monthIdx].toUpperCase();
  HEAD_1601.forEach((h, i) => { ws.getCell(3, 6 + i).value = h; });
  ws.getRow(3).height = 45;
  for (let c = 2; c <= 28; c++) {
    [2, 3].forEach((r) => styleCell(ws.getCell(r, c), { bold: true, align: 'center', valign: 'middle', wrap: true, border: THIN_BOX, fmt: NUM }));
  }
  styleCell(ws.getCell('F2'), { bold: true, align: 'center', valign: 'middle', wrap: true, border: THIN_BOX, fill: 'FFF4B084' });

  const last = Math.max(53, 3 + rows.length);
  for (let r = 4; r <= last; r++) {
    const d = rows[r - 4];
    ws.getCell(r, 2).value = r === 4 ? 1 : { formula: `B${r - 1}+1` };
    if (d) {
      ws.getCell(r, 3).value = shortName(d);
      ws.getCell(r, 4).value = d.tin || null;
      ws.getCell(r, 5).value = d.mwe ? 'MWE' : 'NOT';
      const put = (c, v) => { if (n(v)) ws.getCell(r, c).value = r2(v); };
      put(6, d.basic); put(7, d.overtime); put(8, d.holiday); put(9, d.night); put(10, d.hazard);
      put(11, -n(d.absUnder)); put(12, n(d.otherEarn) - n(d.otherDed) - n(d.leaveOverdraw)); put(13, d.incentives); put(14, d.thirteenth); put(15, d.deMinimis);
      put(17, d.sss); put(18, d.phic); put(19, d.hdmf);
      Object.entries(NOTE_1601).forEach(([c, spec]) => { const nt = note1601(d, spec); if (nt) ws.getCell(r, Number(c)).note = nt; });
    }
    ws.getCell(r, 16).value = { formula: `SUM(F${r}:O${r})` };
    ws.getCell(r, 20).value = { formula: `IF(E${r}="MWE",F${r},0)` };
    ws.getCell(r, 21).value = { formula: `IF(E${r}="MWE",SUM(G${r}:M${r}),0)` };
    ws.getCell(r, 22).value = { formula: `IF(E${r}="NOT",SUM(Q${r}:S${r}),0)` };
    ws.getCell(r, 23).value = { formula: `T${r}+U${r}+V${r}+N${r}+O${r}` };
    ws.getCell(r, 24).value = { formula: `P${r}-W${r}` };
    ws.getCell(r, 25).value = { formula: `IF(E${r}="NOT",IF(X${r}<TAX!$G$4,X${r},0),0)` };
    ws.getCell(r, 26).value = { formula: `IF(Y${r}=0,X${r},0)` };
    ws.getCell(r, 27).value = (d ? r2(d.wht) : { formula: taxFormula(r, tax.last) });
    ws.getCell(r, 28).value = { formula: `P${r}-Q${r}-R${r}-S${r}-AA${r}` };
    for (let c = 2; c <= 28; c++) {
      styleCell(ws.getCell(r, c), { fmt: NUM, align: c === 3 ? 'left' : 'center', border: c <= 5 ? THIN_BOX : { right: thin } });
    }
    ws.getCell(r, 4).numFmt = '@';
  }
  const t = last + 1;
  ws.getCell(t, 2).value = 'TOTAL';
  for (let c = 6; c <= 28; c++) ws.getCell(t, c).value = { formula: `SUM(${col(c)}4:${col(c)}${last})` };
  for (let c = 2; c <= 28; c++) styleCell(ws.getCell(t, c), { bold: true, fill: 'FFA9D08E', border: THIN_BOX, fmt: NUM });
  ws.views = [{ state: 'frozen', xSplit: 5, ySplit: 3 }];
  return t;
};

// The withholding tax table comes from the BIR settings (database). Nothing is fixed here.
const taxSheet = (wb, rows) => {
  const tax = wb.addWorksheet('TAX');
  ['Lower Bracket', 'Upper Bracket', 'Tax on Excess', 'Prescribed Minimum Tax'].forEach((h, i) => {
    const c = tax.getCell(3, 2 + i); c.value = h; styleCell(c, { bold: true });
  });
  rows.forEach((t, i) => {
    const r = 4 + i;
    const next = rows[i + 1];
    tax.getCell(r, 2).value = n(t.lower);
    if (next) tax.getCell(r, 3).value = r2(n(next.lower) - 0.01);
    tax.getCell(r, 4).value = n(t.rate);
    tax.getCell(r, 5).value = n(t.fixed);
    [2, 3, 5].forEach((c) => { tax.getCell(r, c).numFmt = NUM; });
    tax.getCell(r, 4).numFmt = '0.00';
  });
  const firstTaxed = rows.findIndex((t) => n(t.rate) > 0);
  tax.getCell('G3').value = 'Not subject to withholding below';
  styleCell(tax.getCell('G3'), { bold: true });
  tax.getCell('G4').value = firstTaxed >= 0 ? { formula: `B${4 + firstTaxed}` } : 0;
  tax.getCell('G4').numFmt = NUM;
  [9.1, 14.1, 13.3, 12.1, 22, 9.1, 30].forEach((w, i) => { tax.getColumn(i + 1).width = w; });
};
export const build1601c = (ExcelJS, data) => {
  const wb = new ExcelJS.Workbook();
  const taxRows = ((data.settings || {}).taxTable) || [];
  if (!taxRows.length) throw new Error('Set the withholding tax table in BIR settings first');
  const taxInfo = { last: 3 + taxRows.length };
  const totals = [];
  for (let m = 0; m < 12; m++) {
    const ws = wb.addWorksheet(MONTH_SHEETS[m]);
    const rows = ((data.months || [])[m] || {}).rows || [];
    totals.push(fill1601(ws, m, rows, taxInfo));
  }
  // Adjustments: monthly withholding tax comes straight from each month sheet
  const adj = wb.addWorksheet('Adjustments');
  ['Months', 'Withholding Tax', 'Date Paid', 'Payment Reference Number', 'Overpaid from previous month', 'Paid Amount', 'Overpaid', 'Adjustments']
    .forEach((h, i) => { const c = adj.getCell(1, i + 1); c.value = h; styleCell(c, { bold: true }); });
  for (let m = 0; m < 12; m++) {
    const r = m + 2;
    adj.getCell(r, 1).value = MONTHS[m];
    adj.getCell(r, 2).value = { formula: `'${MONTH_SHEETS[m]}'!AA${totals[m]}` };
    if (m > 0) adj.getCell(r, 5).value = { formula: `G${r - 1}` };
    adj.getCell(r, 7).value = { formula: `SUM(E${r}:F${r})-B${r}` };
    adj.getCell(r, 3).numFmt = 'm/d/yyyy';
    [2, 5, 6, 7].forEach((c) => { adj.getCell(r, c).numFmt = NUM; });
  }
  adj.getCell(14, 1).value = 'TOTAL';
  adj.getCell(14, 2).value = { formula: 'SUM(B2:B13)' };
  adj.getCell(14, 6).value = { formula: 'SUM(F2:F13)' };
  adj.getCell(14, 2).numFmt = NUM; adj.getCell(14, 6).numFmt = NUM;
  [11.7, 15, 11.7, 11.9, 13.7, 13, 13.1, 13.6].forEach((w, i) => { adj.getColumn(i + 1).width = w; });
  adj.getCell('A16').value = 'Fill in Date Paid, Payment Reference Number and Paid Amount after each remittance. Withholding Tax is taken from the monthly sheets.';
  adj.getCell('A16').font = { name: 'Arial', size: 8, italic: true };

  taxSheet(wb, taxRows);
  return wb;
};
