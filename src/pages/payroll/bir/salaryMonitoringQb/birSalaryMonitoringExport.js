// Salary Monitoring for QuickBooks workbook (SSS / PHIC / HDMF / non-employee sheets + one sheet per payroll run).
import { NUM, NUM2, THIN_BOX, MED_BOX, MONTHS, n, r2, col, qbName, styleCell } from '../shared/birWorkbookKit';

const monthPart = (iso) => MONTHS[Number(iso.slice(5, 7)) - 1];
const sheetNameOf = (run, used) => {
  const a = run.periodStart; const b = run.periodEnd;
  const d1 = Number(a.slice(8)); const d2 = Number(b.slice(8));
  let name = monthPart(a) === monthPart(b)
    ? `${monthPart(a)} ${d1} to ${d2}, ${b.slice(0, 4)}`
    : `${monthPart(a).slice(0, 3)} ${d1} to ${monthPart(b).slice(0, 3)} ${d2}, ${b.slice(0, 4)}`;
  name = name.slice(0, 31);
  let k = 2; const base = name;
  while (used.has(name.toLowerCase())) { name = `${base.slice(0, 27)} (${k++})`; }
  used.add(name.toLowerCase());
  return name;
};

const QB_YELLOW = 'FFFFFF00';

// Excel note on a number cell: pay type, amount and remarks (same as the tooltip on screen)
const DK = { reimb: ['reimb', 'otherEarn', 'incentives'], ot: ['overtime', 'holiday', 'night', 'hazard'], otherDed: ['otherDed', 'mp2', 'leaveOverdraw'] };
const noteOf = (x, k) => {
  const lines = (DK[k] || [k]).flatMap((d) => (x.details && x.details[d]) || []);
  if (!lines.length) return null;
  return lines.map((l) => `${l.label}: ${n(l.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${l.remarks ? `\n${l.remarks}` : ''}`).join('\n\n');
};

const buildRunSheet = (wb, run, used) => {
  const ws = wb.addWorksheet(sheetNameOf(run, used));
  const rows = run.rows || [];
  const sum = (k) => rows.reduce((s, x) => s + n(x[k]), 0);
  const has13 = sum('thirteenth') > 0;
  const hasOver = false;
  const hasOther = sum('otherDed') + sum('mp2') + sum('leaveOverdraw') > 0;
  const earn = [
    { h: 'Gross Salary', f: (x) => x.basic, k: 'basic' },
    { h: 'De Minimis', f: (x) => x.deMinimis, k: 'deMinimis' },
    { h: 'Refunds / Reimb./Other Admin Expense', f: (x) => n(x.reimb) + n(x.otherEarn) + n(x.incentives), k: 'reimb' },
    { h: 'Overtime/Holiday', f: (x) => n(x.overtime) + n(x.holiday) + n(x.night) + n(x.hazard), k: 'ot' },
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
    ...(hasOther ? [{ h: 'Other Deductions (incl. HDMF MP2)', f: (x) => n(x.otherDed) + n(x.mp2) + n(x.leaveOverdraw), k: 'otherDed' }] : []),
    { h: 'Withholding Tax Payable', f: (x) => x.wht, k: 'wht' },
  ];
  const all = [{ h: 'Employee Name', k: 'name' }, ...earn, ...ded, { h: 'NET PAY', k: 'net' }];
  const cEarn1 = 2; const cEarn2 = 1 + earn.length;
  const cDed1 = cEarn2 + 1; const cDed2 = cEarn2 + ded.length; const cNet = cDed2 + 1;
  const letter = {}; all.forEach((c, i) => { letter[c.k] = col(i + 1); });

  all.forEach((c, i) => {
    const cell = ws.getCell(1, i + 1); cell.value = c.h;
    styleCell(cell, { size: 9, bold: true, align: 'center', valign: 'middle', wrap: true, border: MED_BOX });
  });
  rows.forEach((x, i) => {
    const r = i + 2;
    ws.getCell(r, 1).value = qbName(x);
    earn.forEach((c, j) => { const v = r2(c.f(x)); if (v) { ws.getCell(r, 2 + j).value = v; const nt = noteOf(x, c.k); if (nt) ws.getCell(r, 2 + j).note = nt; } });
    ded.forEach((c, j) => { const v = r2(c.f(x)); if (v) { ws.getCell(r, cDed1 + j).value = v; const nt = noteOf(x, c.k); if (nt) ws.getCell(r, cDed1 + j).note = nt; } });
    ws.getCell(r, cNet).value = { formula: `SUM(${col(cEarn1)}${r}:${col(cEarn2)}${r})-SUM(${col(cDed1)}${r}:${col(cDed2)}${r})` };
    for (let c = 1; c <= cNet; c++) {
      styleCell(ws.getCell(r, c), { size: 9, fill: QB_YELLOW, border: MED_BOX, align: 'left', wrap: true, fmt: c > 1 ? NUM2 : undefined });
    }
  });
  const last = rows.length + 1;
  const t = last + 1;
  ws.getCell(t, 1).value = 'TOTALS';
  for (let c = 2; c <= cNet; c++) ws.getCell(t, c).value = { formula: `SUM(${col(c)}2:${col(c)}${Math.max(last, 2)})` };
  for (let c = 1; c <= cNet; c++) styleCell(ws.getCell(t, c), { size: 9, bold: true, border: MED_BOX, align: 'left', fmt: c > 1 ? NUM2 : undefined });

  // Debit / Credit summary for QuickBooks
  const T = (k) => `${letter[k]}${t}`;
  const hdr = t + 3;
  ws.getCell(hdr, 4).value = 'Debit'; ws.getCell(hdr, 5).value = 'Credit';
  [3, 4, 5].forEach((c) => styleCell(ws.getCell(hdr, c), { font: 'Calibri', size: 11, bold: true, align: 'center', border: THIN_BOX }));
  const lines = [
    ['Basic', 'D', `${T('basic')}+${T('ot')}-${T('absUnder')}`],
    ['De Minimis', 'D', T('deMinimis')],
    ['Refunds', 'D', T('reimb')],
    ...(has13 ? [['13th Month', 'D', T('thirteenth')]] : []),
    ['SSS', 'C', T('sss')],
    ['PHIC', 'C', T('phic')],
    ['HDMF', 'C', T('hdmf')],
    ['HMO', 'C', T('hmo')],
    ['SSS Loan', 'C', `${T('sssSal')}+${T('sssCal')}`],
    ['HDMF Loan', 'C', `${T('hdmfCal')}+${T('hdmfMpl')}`],
    ...(hasOther ? [['Other Deductions', 'C', T('otherDed')]] : []),
    ['Withholding Tax', 'C', T('wht')],
    ['Advances to Employee', 'C', T('cashAdvance')],
    ...(hasOver ? [['Leave Overdraw Recovery', 'C', T('leaveOverdraw')]] : []),
    ['Net Pay To Release to Employee', 'C', T('net')],
  ];
  lines.forEach(([label, side, f], i) => {
    const r = hdr + 1 + i;
    ws.getCell(r, 2).value = i + 1;
    ws.getCell(r, 3).value = label;
    ws.getCell(r, side === 'D' ? 4 : 5).value = { formula: f };
    [2, 3, 4, 5].forEach((c) => styleCell(ws.getCell(r, c), { font: 'Calibri', size: 11, border: THIN_BOX, fmt: c >= 4 ? NUM2 : undefined }));
  });
  const tr = hdr + 1 + lines.length;
  ws.getCell(tr, 3).value = 'Total (Debit must equal Credit)';
  ws.getCell(tr, 4).value = { formula: `SUM(D${hdr + 1}:D${tr - 1})` };
  ws.getCell(tr, 5).value = { formula: `SUM(E${hdr + 1}:E${tr - 1})` };
  [3, 4, 5].forEach((c) => styleCell(ws.getCell(tr, c), { font: 'Calibri', size: 11, bold: true, border: THIN_BOX, fmt: c >= 4 ? NUM2 : undefined }));

  // Breakdown of cash advances of this run (add other advances by hand)
  const advCol = 8;
  ws.getCell(hdr, advCol).value = 'Breakdown of Advances to Employees for QB Recording';
  ws.mergeCells(hdr, advCol, hdr, advCol + 3);
  for (let c = advCol; c <= advCol + 3; c++) styleCell(ws.getCell(hdr, c), { font: 'Calibri', size: 11, bold: true, fill: 'FF00B050', align: 'center', border: THIN_BOX });
  let ar = hdr + 1;
  rows.filter((x) => n(x.cashAdvance) > 0).forEach((x) => {
    ws.getCell(ar, advCol).value = 'Cash Advance';
    ws.getCell(ar, advCol + 1).value = r2(x.cashAdvance);
    ws.getCell(ar, advCol + 2).value = qbName(x);
    ws.getCell(ar, advCol + 3).value = ((x.details && x.details.cashAdvance) || []).map((l) => l.remarks).filter(Boolean).join('; ') || null;
    for (let c = advCol; c <= advCol + 3; c++) styleCell(ws.getCell(ar, c), { font: 'Calibri', size: 11, fill: 'FFA8D08D', border: THIN_BOX, fmt: c === advCol + 1 ? NUM : undefined });
    ar += 1;
  });
  const widths = [20, 15.6, 18.6, 15, 15.7]; all.forEach((_, i) => { ws.getColumn(i + 1).width = widths[i] || 13.5; });
  ws.getColumn(advCol).width = Math.max(ws.getColumn(advCol).width || 0, 24);
  ws.getRow(1).height = 38;
  return ws;
};

const dataSheet = (wb, name, head, widths) => {
  const ws = wb.addWorksheet(name);
  head.forEach((h, i) => { const c = ws.getCell(1, i + 1); c.value = h; styleCell(c, { bold: true, size: 10 }); });
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  return ws;
};
const fmtRow = (ws, r, cols) => { cols.forEach((c) => { ws.getCell(r, c).numFmt = NUM2; ws.getCell(r, c).font = { name: 'Arial', size: 10 }; }); ws.getCell(r, 1).font = { name: 'Arial', size: 10 }; };
const totalRow = (ws, cols) => {
  ws.getCell(14, 1).value = 'TOTAL:'; ws.getCell(14, 1).font = { name: 'Arial', size: 10, bold: true };
  cols.forEach((c) => { const cell = ws.getCell(14, c); cell.value = { formula: `SUM(${col(c)}2:${col(c)}13)` }; cell.numFmt = NUM2; cell.font = { name: 'Arial', size: 10, bold: true }; });
};

export const buildSalaryMonitoring = (ExcelJS, data) => {
  const wb = new ExcelJS.Workbook();

  // Non-employee contributions come from BIR settings. No sheet when none were entered.
  const nonEmp = ((data.settings || {}).nonEmployees) || [];
  if (nonEmp.length) {
    const inv = dataSheet(wb, 'Non-Employee Contributions', ['Name', 'SSS ', 'PhilHealth ', 'Pag-IBIG ', 'HMO '], [28, 16, 22.6, 16.7, 12]);
    nonEmp.forEach((p, i) => {
      const r = i + 2;
      inv.getCell(r, 1).value = p.name;
      [p.sss, p.phic, p.hdmf, p.hmo].forEach((v, c) => { if (n(v)) inv.getCell(r, c + 2).value = r2(v); });
      fmtRow(inv, r, [2, 3, 4, 5]);
    });
    const tr = nonEmp.length + 2;
    inv.getCell(tr, 1).value = 'TOTAL:';
    inv.getCell(tr, 1).font = { name: 'Arial', size: 10, bold: true };
    ['B', 'C', 'D', 'E'].forEach((L) => {
      const c = inv.getCell(`${L}${tr}`);
      c.value = { formula: `SUM(${L}2:${L}${tr - 1})` };
      c.numFmt = NUM2;
      c.font = { name: 'Arial', size: 10, bold: true };
    });
  }
  const mon = data.monthly || [];
  const z = (v) => (n(v) ? r2(v) : null);

  // 3. HDMF
  const hd = dataSheet(wb, 'HDMF Payment', ['Month', 'Regular Savings (P1)', 'MP2 Savings', 'Multi-Purpose Loan (MPL)', 'Calamity Loan', 'Monthly Total', 'Remarks'], [27, 22.6, 22.4, 29.1, 13.6, 16.4, 14.3]);
  MONTHS.forEach((m, i) => {
    const r = i + 2; const x = mon[i] || {};
    hd.getCell(r, 1).value = m;
    [z(n(x.hdmfEe) + n(x.hdmfEr)), z(x.mp2), z(x.hdmfMpl), z(x.hdmfCal)].forEach((v, c) => { if (v !== null) hd.getCell(r, c + 2).value = v; });
    hd.getCell(r, 6).value = { formula: `SUM(B${r}:E${r})` };
    fmtRow(hd, r, [2, 3, 4, 5, 6]);
  });
  totalRow(hd, [2, 3, 4, 5, 6]);

  // 4. PHIC
  const ph = dataSheet(wb, 'PHIC Payment', ['Month', 'Employee Share', 'Employer Share', 'Contribution', 'Monthly Total', 'Remarks'], [27, 22.6, 22.4, 20, 16.4, 14.3]);
  MONTHS.forEach((m, i) => {
    const r = i + 2; const x = mon[i] || {};
    ph.getCell(r, 1).value = m;
    if (z(x.phicEe) !== null) ph.getCell(r, 2).value = z(x.phicEe);
    if (z(x.phicEr) !== null) ph.getCell(r, 3).value = z(x.phicEr);
    ph.getCell(r, 4).value = { formula: `SUM(B${r}:C${r})` };
    ph.getCell(r, 5).value = { formula: `SUM(D${r})` };
    fmtRow(ph, r, [2, 3, 4, 5]);
  });
  totalRow(ph, [2, 3, 4, 5]);

  // 5. SSS
  const ss = dataSheet(wb, 'SSS Payment', ['Month', 'Contribution', 'Employee Compensation(EC)', 'Salary Loan/Calamity Loan', 'Monthly Total', 'Remarks'], [27, 30.9, 25.6, 25.6, 16.4, 14.3]);
  MONTHS.forEach((m, i) => {
    const r = i + 2; const x = mon[i] || {};
    ss.getCell(r, 1).value = m;
    if (z(n(x.sssEe) + n(x.sssEr)) !== null) ss.getCell(r, 2).value = z(n(x.sssEe) + n(x.sssEr));
    if (z(x.ec) !== null) ss.getCell(r, 3).value = z(x.ec);
    if (z(n(x.sssSal) + n(x.sssCal)) !== null) ss.getCell(r, 4).value = z(n(x.sssSal) + n(x.sssCal));
    ss.getCell(r, 5).value = { formula: `SUM(B${r}:D${r})` };
    fmtRow(ss, r, [2, 3, 4, 5]);
  });
  totalRow(ss, [2, 3, 4, 5]);
  ss.getCell('A16').value = 'Employee Compensation (EC) comes from the SSS EC rule in BIR settings. It stays empty when no rule is saved.';
  ss.getCell('A16').font = { name: 'Arial', size: 9, italic: true };

  // 6. One sheet per payroll run (cutoff)
  const used = new Set(wb.worksheets.map((w) => w.name.toLowerCase()));
  (data.runs || []).forEach((run) => buildRunSheet(wb, run, used));
  return wb;
};
