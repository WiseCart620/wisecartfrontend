import toast from 'react-hot-toast';

const NUMFMT = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-';
const WIDTHS = [14.6, 34, 17.1, 15.4, 17.8, 17, 15.1, 16.3, 16.1, 14.1, 19, 13, 13, 19, 26, 22];
const HEADS = ['Month', 'Client', 'Date', 'Sales Invoice #', 'Total Sales', 'Vatable Sales', 'Output VAT', 'Withholding tax',
  'Accounts Receivable', 'CLP 1%', 'Amount to be Collected', 'Rebates (Deductions)', 'Amount Collected', 'Date Collected',
  'Output VAT on Recovered Receivable', 'VATABLE SALES on RECOVERED RECEIVABLE'];
const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const MONEY_COLS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16];

const num = (v) => Number(v || 0);
const has = (v) => v !== null && v !== undefined && v !== '';
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const utc = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const monthStart = (s) => {
  const d = utc(s);
  return d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) : null;
};
const monthName = (s) => utc(s).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
const periodLabel = (start, end) => {
  const ys = String(start).slice(0, 4);
  const ye = String(end).slice(0, 4);
  return ys === ye
    ? `For the Month ${monthName(start)} to ${monthName(end)} ${ye}`
    : `For the Month ${monthName(start)} ${ys} to ${monthName(end)} ${ye}`;
};
// VAT-inclusive amount the output VAT is based on (same rule as the app)
const recAmt = (r) => (has(r.recoveredAmount) && num(r.recoveredAmount) !== 0 ? num(r.recoveredAmount) : num(r.amountCollected));

export async function downloadRecoveredSchedule({ rows, companyName, periodStart, periodEnd, year, quarter }) {
  try {
    const mod = await import('exceljs');
    const ExcelJS = mod.default || mod;

    // one block per invoice (client + invoice #); entries without an invoice # stand alone
    const groups = [];
    const byKey = new Map();
    (rows || []).forEach((r) => {
      const inv = (r.invoiceNumber || '').trim();
      const key = inv ? `${(r.clientName || '').trim().toLowerCase()}|${inv}` : `id:${r.id}`;
      let g = byKey.get(key);
      if (!g) {
        g = { first: r, items: [] };
        byKey.set(key, g);
        groups.push(g);
      }
      g.items.push(r);
    });
    groups.sort((a, b) =>
      String(a.first.invoiceDate || '9999').localeCompare(String(b.first.invoiceDate || '9999')) ||
      String(a.first.invoiceNumber || '').localeCompare(String(b.first.invoiceNumber || '')));

    const wb = new ExcelJS.Workbook();
    wb.calcProperties.fullCalcOnLoad = true;
    const ws = wb.addWorksheet(`Output Vat Recovered Q${quarter} ${year}`.slice(0, 31));
    ws.columns = WIDTHS.map((width) => ({ width }));
    ws.views = [{ state: 'frozen', ySplit: 5 }];
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

    const put = (addr, value, fmt) => {
      const c = ws.getCell(addr);
      c.value = value;
      if (fmt) c.numFmt = fmt;
      return c;
    };

    [
      [1, 'OUTPUT VAT ON RECOVERED RECEIVABLES'],
      [2, (companyName || 'COMPANY NAME').toUpperCase()],
      [3, periodLabel(periodStart, periodEnd)],
    ].forEach(([r, text]) => {
      ws.mergeCells(`A${r}:O${r}`);
      const c = put(`A${r}`, text);
      c.font = { name: 'Arial', size: 12, bold: true };
      c.alignment = { horizontal: 'center' };
    });

    HEADS.forEach((h, i) => {
      const c = ws.getCell(5, i + 1);
      c.value = h;
      c.font = { name: 'Arial', size: 10, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER;
    });
    ws.getRow(5).height = 32;

    let row = 7;
    const tot = { E: 0, F: 0, G: 0, H: 0, I: 0, L: 0, M: 0, O: 0, P: 0 };

    groups.forEach((g) => {
      const inv = g.items.find((x) => has(x.totalSales)) || g.first;
      const a = row;
      const b = row + g.items.length - 1;

      put(`A${a}`, monthStart(g.first.invoiceDate), 'mmm-yy');
      put(`B${a}`, g.first.clientName || '');
      put(`C${a}`, utc(g.first.invoiceDate), 'd-mmm-yy');
      put(`D${a}`, g.first.invoiceNumber || '');

      if (has(inv.totalSales)) {
        const total = num(inv.totalSales);
        const rebate = num(inv.rebates);
        const vat = total / 1.12;
        const given = has(inv.withholdingTax);
        const wht = given ? num(inv.withholdingTax) : vat * 0.01;
        put(`E${a}`, total);
        put(`F${a}`, { formula: `E${a}/1.12`, result: vat });
        put(`G${a}`, { formula: `F${a}*0.12`, result: vat * 0.12 });
        put(`H${a}`, given ? wht : { formula: `F${a}*0.01`, result: wht });
        put(`I${a}`, { formula: `E${a}-H${a}-L${a}`, result: total - wht - rebate });
        if (rebate) put(`L${a}`, rebate);
        tot.E += total; tot.F += vat; tot.G += vat * 0.12; tot.H += wht; tot.I += total - wht - rebate; tot.L += rebate;
      }

      let sumM = 0;
      let sumRec = 0;
      let same = true;
      g.items.forEach((x, i) => {
        const m = has(x.amountCollected) ? num(x.amountCollected) : recAmt(x);
        put(`M${a + i}`, m);
        put(`N${a + i}`, utc(x.dateCollected), 'd-mmm-yy');
        sumM += m;
        sumRec += recAmt(x);
        if (Math.abs(recAmt(x) - m) > 0.005) same = false;
      });

      // O and P are formulas when recovered = collected; otherwise the app's own figure is written as a value
      const oVal = (sumRec * 12) / 112;
      const pVal = sumRec / 1.12;
      put(`O${a}`, same ? { formula: `SUM(M${a}:M${b})*12/112`, result: oVal } : r2(oVal));
      put(`P${a}`, same ? { formula: `SUM(M${a}:M${b})/1.12`, result: pVal } : r2(pVal));
      if (b > a) {
        ws.mergeCells(`O${a}:O${b}`);
        ws.mergeCells(`P${a}:P${b}`);
      }
      tot.M += sumM; tot.O += oVal; tot.P += pVal;

      for (let r = a; r <= b; r += 1) {
        for (let c = 1; c <= 16; c += 1) {
          const cell = ws.getCell(r, c);
          cell.font = { name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
          cell.border = BORDER;
          if (MONEY_COLS.includes(c)) cell.numFmt = NUMFMT;
          if (c >= 15) cell.alignment = { vertical: 'middle' };
        }
      }
      row = b + 1;
    });

    for (let c = 1; c <= 16; c += 1) {
      const cell = ws.getCell(row, c);
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.border = BORDER;
    }
    put(`B${row}`, 'Total');
    Object.keys(tot).forEach((col) => {
      put(`${col}${row}`, { formula: `SUM(${col}7:${col}${row - 1})`, result: tot[col] }, NUMFMT);
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Output-VAT-Recovered-${year}-Q${quarter}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error(e?.message || 'Could not build the schedule');
  }
}