export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export const n = (v) => Number(v || 0);
export const r2 = (v) => Math.round(n(v) * 100) / 100;
export const up = (s) => String(s || '').trim().toUpperCase();
export const cap = (s) => String(s || '').trim().toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

export const shortName = (r) => {
  const mid = String(r.middleName || '').trim();
  const initial = mid ? ` ${mid[0].toUpperCase()}.` : '';
  return `${up(r.firstName)}${initial} ${up(r.lastName)}`.replace(/\s+/g, ' ').trim();
};
export const lastFirst = (r) => `${up(r.lastName)}, ${up(r.firstName)}${r.middleName ? ' ' + up(r.middleName) : ''}`.trim();
export const qbName = (r) => `${cap(r.lastName)}, ${cap(r.firstName)}`;
export const fullName = (r) => `${r.lastName || ''}, ${r.firstName || ''}${r.middleName ? ' ' + r.middleName : ''}`;

// accounting style like the workbook: zero shows as "-"
export const acc = (v) => (Math.abs(n(v)) < 0.005 ? '-' : n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));