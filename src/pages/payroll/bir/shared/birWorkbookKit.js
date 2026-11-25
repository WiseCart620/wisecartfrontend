// Shared pieces for every BIR Excel export: number formats, borders, name helpers, cell styling, file save.
// Builds the three BIR / QuickBooks workbooks with the same layout, headers, formulas and styles
// as the company templates, filled with payroll data from the system.
// ExcelJS is passed in (loaded lazily by the page) so this file has no hard dependency.

export const NUM = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"??_-;_-@_-';
export const NUM2 = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';
export const thin = { style: 'thin' };
export const medium = { style: 'medium' };
export const THIN_BOX = { top: thin, left: thin, bottom: thin, right: thin };
export const MED_BOX = { top: medium, left: medium, bottom: medium, right: medium };

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
export const MONTH_SHEETS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY.', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const n = (v) => Number(v || 0);
export const r2 = (v) => Math.round(n(v) * 100) / 100;
export const col = (i) => { let s = ''; let x = i; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };
export const up = (s) => String(s || '').trim().toUpperCase();
export const cap = (s) => String(s || '').trim().toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

// "JONATHAN L. ELANO"
export const shortName = (r) => {
  const mid = String(r.middleName || '').trim();
  const initial = mid ? ` ${mid[0].toUpperCase()}.` : '';
  return `${up(r.firstName)}${initial} ${up(r.lastName)}`.replace(/\s+/g, ' ').trim();
};
// "ELANO, JONATHAN LUMBRES"
export const lastFirst = (r) => `${up(r.lastName)}, ${up(r.firstName)}${r.middleName ? ' ' + up(r.middleName) : ''}`.trim();
// "Elano, Jonathan"
export const qbName = (r) => `${cap(r.lastName)}, ${cap(r.firstName)}`;

export const styleCell = (c, o = {}) => {
  c.font = { name: o.font || 'Arial', size: o.size || 8, bold: !!o.bold, color: o.color ? { argb: o.color } : undefined };
  if (o.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } };
  if (o.border) c.border = o.border;
  if (o.align || o.wrap || o.valign) c.alignment = { horizontal: o.align, vertical: o.valign, wrapText: !!o.wrap };
  if (o.fmt) c.numFmt = o.fmt;
};

export const saveWorkbook = async (wb, filename) => {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
