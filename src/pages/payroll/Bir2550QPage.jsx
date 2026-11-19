import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Lock, Plus, Trash2, Pencil, Save, Unlock, X } from 'lucide-react';
import useBir2550Q from '../../hooks/data/useBir2550Q';
import { api } from '../../services/api';
import useBirTabs from '../../hooks/ui/useBirTabs';
import { downloadRecoveredSchedule } from './birRecoveredSchedule';
import { downloadFullReturn } from './birFullExport';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const money = (v) => (v === null || v === undefined ? '' : peso.format(Number(v)));
const today = () => new Date().toISOString().slice(0, 10);
const n = (v) => Number(v || 0);
const qInfo = (date, fye) => {
  if (!date) return { key: '0000-0', label: 'No date' };
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const ty = m <= fye ? y : y + 1;
  const q = Math.floor((y * 12 + m - (ty * 12 + fye - 11)) / 3) + 1;
  return { key: `${ty}-${q}`, label: `Q${q} ${ty}` };
};

const SALE_CLASSES = {
  VATABLE_PRIVATE: 'Vatable (private)',
  VATABLE_GOVERNMENT: 'Vatable (government)',
  ZERO_RATED: 'Zero-rated',
  EXEMPT: 'Exempt',
};
const PURCHASE_CATEGORIES = {
  DOMESTIC_GOODS: 'Domestic goods',
  DOMESTIC_SERVICES: 'Domestic services',
  CAPITAL_GOODS: 'Capital goods',
  IMPORTATION: 'Importation',
  SERVICES_NONRESIDENT: 'Services by non-resident',
  OTHER: 'Other',
  NO_INPUT_TAX: 'No input tax',
  EXEMPT_IMPORTATION: 'VAT-exempt importation',
};
const s = {
  card: { background: 'var(--card-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  th: { textAlign: 'left', padding: '6px 4px', borderBottom: '1px solid #e5e7eb', fontSize: 'clamp(9px, 1.1vw, 12px)', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  td: { padding: '6px 4px', borderBottom: '1px solid #f3f4f6', fontSize: 'clamp(10px, 1.2vw, 13px)', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fixed: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  plainSelect: { width: '100%', border: 'none', background: 'transparent', padding: 0, margin: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textOverflow: 'ellipsis', appearance: 'none', WebkitAppearance: 'none', outline: 'none', textDecoration: 'underline dotted', textUnderlineOffset: 3 },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  input: { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  primary: { background: '#ea580c', color: '#fff', borderColor: '#ea580c' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  label: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { background: '#fff', borderRadius: 10, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  dialogHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' },
  dialogBody: { padding: 16, overflowY: 'auto' },
  dialogFoot: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #e5e7eb' },
  toolbar: { display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' },
};

const Field = ({ label, children }) => (
  <label>
    <span style={s.label}>{label}</span>
    {children}
  </label>
);

const Btn = ({ primary, style, ...p }) => (
  <button
    type="button"
    {...p}
    className={`bir-btn${primary ? ' bir-primary' : ''}`}
    style={{ ...s.btn, ...(primary ? s.primary : {}), ...style, opacity: p.disabled ? 0.5 : 1 }}
  />
);

const Text = ({ value, onChange, ...p }) => (
  <input style={s.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />
);
const Num = ({ value, onChange, ...p }) => (
  <input
    style={{ ...s.input, textAlign: 'right' }}
    type="number"
    step="0.01"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    {...p}
  />
);
const Pick = ({ value, onChange, options, ...p }) => (
  <select style={s.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p}>
    {Object.entries(options).map(([k, v]) => (
      <option key={k} value={k}>{v}</option>
    ))}
  </select>
);

// ------------------------------------------------------------------ Modal

const Modal = ({ title, onClose, footer, children }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={s.overlay} onMouseDown={onClose}>
      <div style={s.dialog} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div style={s.dialogHead}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <Btn onClick={onClose} aria-label="Close" style={{ padding: '4px 6px' }}><X size={14} /></Btn>
        </div>
        <div style={s.dialogBody}>{children}</div>
        <div style={s.dialogFoot}>{footer}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ Filters

const useFilters = (initial) => {
  const [f, setF] = useState(initial);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const reset = () => setF(initial);
  const active = JSON.stringify(f) !== JSON.stringify(initial);
  return { f, set, reset, active };
};

const inRange = (date, from, to) => {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};
const includesText = (q, ...fields) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((x) => String(x ?? '').toLowerCase().includes(needle));
};

// ------------------------------------------------------------------ Sales

const emptySale = () => ({ saleDate: today(), invoiceNumber: '', customerName: '', customerTin: '', customerAddress: '', classification: 'ZERO_RATED', salesAmount: '', outputVat: null, remarks: '' });
const saleFilters = { q: '', cls: 'ALL', source: 'ALL', from: '', to: '', sort: 'customer', showExcluded: true };
const custKey = (r) => (r.customerName || '').trim().toLowerCase();
const invoiceAmount = (r) => n(r.salesAmount) + n(r.outputVat);

const SalesTab = ({ data, bir }) => {
  const [yr, setYr] = useState(bir.year);
  const [qt, setQt] = useState(bir.quarter);
  const [all, setAll] = useState(null);
  const yearOpts = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 8 + i);
  useEffect(() => { setYr(bir.year); setQt(bir.quarter); }, [bir.year, bir.quarter]);
  useEffect(() => {
    let alive = true;
    const qs = yr === 'ALL' ? '' : `?year=${yr}${qt === 'ALL' ? '' : `&quarter=${qt}`}`;
    api.get(`/bir/2550q/sales/all${qs}`)
      .then((r) => {
        let x = r && r.data !== undefined ? r.data : r;
        if (x && x.success === true && x.data !== undefined) x = x.data;
        if (alive) setAll(Array.isArray(x) ? x : null);
      })
      .catch(() => { if (alive) setAll(null); });
    return () => { alive = false; };
  }, [yr, qt, data]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptySale());
  const { f, set: setFilter, reset, active } = useFilters(saleFilters);
  const locked = data.locked;
  const set = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  const close = useCallback(() => setOpen(false), []);

  const openModal = () => { setForm(emptySale()); setOpen(true); };
  const submit = async () => {
    if (!form.saleDate || !form.salesAmount) return;
    const ok = await bir.saveManualSale(form);
    if (ok) setOpen(false);
  };

  const fye = data.fiscalYearEndMonth || 12;
  const groupByQuarter = yr === 'ALL' || qt === 'ALL';

  const rows = useMemo(() => {
    const list = (all || data.sales || []).filter((r) =>
      inRange(r.date, f.from, f.to) &&
      (f.cls === 'ALL' || r.classification === f.cls) &&
      (f.source === 'ALL' || r.source === f.source) &&
      (f.showExcluded || !r.excluded) &&
      includesText(f.q, r.invoiceNumber, r.customerName, r.customerTin, r.customerAddress));
    list.sort((a, b) => {
      if (groupByQuarter) {
        const qc = qInfo(b.date, fye).key.localeCompare(qInfo(a.date, fye).key);
        if (qc !== 0) return qc;
      }
      if (f.sort === 'customer') {
        const c = (a.customerName || '').localeCompare(b.customerName || '');
        if (c !== 0) return c;
      }
      return String(a.date || '').localeCompare(String(b.date || ''));
    });
    const gk = (r) => (groupByQuarter ? `${qInfo(r.date, fye).key}|` : '') + custKey(r);
    const totals = {};
    list.forEach((r) => { if (!r.excluded) totals[gk(r)] = (totals[gk(r)] || 0) + invoiceAmount(r); });
    const seen = new Set();
    return list.map((r) => {
      const k = gk(r);
      const first = !seen.has(k);
      seen.add(k);
      return { ...r, _q: groupByQuarter ? qInfo(r.date, fye).label : null, _customerTotal: first ? totals[k] || 0 : null };
    });
  }, [data.sales, all, f, groupByQuarter, fye]);

  const qSums = useMemo(() => {
    const out = {};
    rows.forEach((r) => {
      if (!r._q) return;
      const g = out[r._q] || (out[r._q] = { sales: 0, vat: 0, inv: 0, count: 0 });
      g.count += 1;
      if (!r.excluded) { g.sales += n(r.salesAmount); g.vat += n(r.outputVat); g.inv += invoiceAmount(r); }
    });
    return out;
  }, [rows]);

  const sums = useMemo(() => rows.filter((r) => !r.excluded).reduce(
    (a, r) => ({ sales: a.sales + n(r.salesAmount), vat: a.vat + n(r.outputVat), inv: a.inv + invoiceAmount(r) }),
    { sales: 0, vat: 0, inv: 0 }), [rows]);

  const override = (r, patch) =>
    bir.saveOverride({
      invoiceProfileId: r.refId,
      classification: (patch.classification ?? r.classification) === 'VATABLE_PRIVATE' ? null : (patch.classification ?? r.classification),
      excluded: patch.excluded ?? r.excluded,
      uncollected: false,
      remarks: r.remarks,
    });

  const heads = ['Date', 'Invoice #', 'Sold to', 'Address', 'TIN', 'Source', 'Classification', 'Sales amount', 'Output VAT', 'Invoice amount', 'Total invoice amount', 'Exclude', '12% VAT', ''];
  const numHeads = ['Sales amount', 'Output VAT', 'Invoice amount', 'Total invoice amount'];
  const widths = ['7%', '6%', '9%', '9%', '9%', '4%', '9%', '8%', '7%', '8%', '8%', '5%', '8%', '3%'];

  return (
    <>
      <div style={{ ...s.card, ...s.toolbar }}>
        <div style={{ flex: '1 1 220px' }}>
          <Field label="Search"><Text placeholder="Invoice #, customer, TIN, address" value={f.q} onChange={setFilter('q')} /></Field>
        </div>
        <Field label="Classification">
          <Pick options={{ ALL: 'All', ...SALE_CLASSES }} value={f.cls} onChange={setFilter('cls')} />
        </Field>
        <Field label="Source">
          <Pick options={{ ALL: 'All', INVOICE: 'Journal', MANUAL: 'Manual' }} value={f.source} onChange={setFilter('source')} />
        </Field>
        <Field label="From"><Text type="date" value={f.from} onChange={setFilter('from')} /></Field>
        <Field label="To"><Text type="date" value={f.to} onChange={setFilter('to')} /></Field>
        <Field label="Year">
          <select style={s.input} value={yr} onChange={(e) => setYr(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
            <option value="ALL">All years</option>
            {yearOpts.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Quarter">
          <select style={s.input} value={yr === 'ALL' ? 'ALL' : qt} disabled={yr === 'ALL'} onChange={(e) => setQt(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
            <option value="ALL">All quarters</option>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </Field>
        <Field label="Sort by">
          <Pick options={{ customer: 'Customer, then date', date: 'Date' }} value={f.sort} onChange={setFilter('sort')} />
        </Field>
        <label style={{ fontSize: 13, paddingBottom: 8 }}>
          <input type="checkbox" checked={f.showExcluded} onChange={(e) => setFilter('showExcluded')(e.target.checked)} /> Show excluded
        </label>
        {active && <Btn onClick={reset}><X size={14} /> Clear filters</Btn>}
        <div style={{ marginLeft: 'auto' }}>
          <Btn primary disabled={locked} onClick={openModal}><Plus size={14} /> Add sale</Btn>
        </div>
      </div>

      <div className="bir-wrap" style={s.card}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Showing {rows.length} of {(all || data.sales || []).length} sales
        </div>
        <table className="bir-table">
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              {heads.map((h, i) => <th key={i} title={h} style={{ ...s.th, ...(numHeads.includes(h) ? s.num : {}) }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td style={s.td} colSpan={heads.length}>No sales match.</td></tr>
            )}
            {rows.map((r, idx) => (
              <React.Fragment key={`${r.source}-${r.refId}`}>
              {r._q && (idx === 0 || rows[idx - 1]._q !== r._q) && (
                <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                  <td style={s.td} colSpan={7}>{r._q}</td>
                  <td style={{ ...s.td, ...s.num }}>{money(qSums[r._q].sales)}</td>
                  <td style={{ ...s.td, ...s.num }}>{money(qSums[r._q].vat)}</td>
                  <td style={{ ...s.td, ...s.num }}>{money(qSums[r._q].inv)}</td>
                  <td style={s.td} colSpan={4} />
                </tr>
              )}
              <tr style={{ ...(r.excluded ? { opacity: 0.5 } : {}), ...(f.sort === 'customer' && idx > 0 && rows[idx - 1]._q === r._q && custKey(rows[idx - 1]) !== custKey(r) ? { borderTop: '2px solid #111827' } : {}) }}>
                <td style={s.td} title={r.date}>{r.date}</td>
                <td style={s.td} title={r.invoiceNumber}>{r.invoiceNumber}</td>
                <td style={s.td} title={r.customerName}><div className="clamp3">{r.customerName}</div></td>
                <td style={s.td} title={r.customerAddress}><div className="clamp3">{r.customerAddress}</div></td>
                <td style={s.td} title={r.customerTin}>{r.customerTin}</td>
                <td style={s.td}>{r.source === 'INVOICE' ? 'Journal' : 'Manual'}</td>
                <td style={s.td} title={SALE_CLASSES[r.classification]}>
                  {r.source === 'INVOICE' ? (
                    <select style={s.plainSelect} disabled={locked} value={r.classification} onChange={(e) => override(r, { classification: e.target.value })}>
                      {Object.entries(SALE_CLASSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : SALE_CLASSES[r.classification]}
                </td>
                <td style={{ ...s.td, ...s.num }} title={money(r.salesAmount)}>{money(r.salesAmount)}</td>
                <td style={{ ...s.td, ...s.num }} title={money(r.outputVat)}>{money(r.outputVat)}</td>
                <td style={{ ...s.td, ...s.num }} title={money(invoiceAmount(r))}>{money(invoiceAmount(r))}</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 600 }} title={r._customerTotal === null ? '' : money(r._customerTotal)}>{r._customerTotal === null ? '' : money(r._customerTotal)}</td>
                <td style={s.td}>
                  {r.source === 'INVOICE' && (
                    <input type="checkbox" disabled={locked} checked={r.excluded} onChange={(e) => override(r, { excluded: e.target.checked })} />
                  )}
                </td>
                <td style={s.td}>
                  {r.source === 'INVOICE' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: r.uncollected ? '#b45309' : '#047857' }}>
                      {r.uncollected ? '12% Uncollected' : '12% Collected'}{r.collectedDate ? <span style={{ display: 'block', fontWeight: 400, fontSize: 10 }}>{r.collectedDate}</span> : null}
                    </span>
                  )}
                </td>
                <td style={s.td}>
                  {r.source === 'MANUAL' && (
                    <Btn style={{ padding: '2px 4px' }} disabled={locked} onClick={() => window.confirm('Delete this sale?') && bir.deleteManualSale(r.refId)}>
                      <Trash2 size={12} />
                    </Btn>
                  )}
                </td>
              </tr>
              </React.Fragment>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 600, background: '#f9fafb' }}>
                <td style={s.td} colSpan={7}>Total (excluded rows left out)</td>
                <td style={{ ...s.td, ...s.num }} title={money(sums.sales)}>{money(sums.sales)}</td>
                <td style={{ ...s.td, ...s.num }} title={money(sums.vat)}>{money(sums.vat)}</td>
                <td style={{ ...s.td, ...s.num }} title={money(sums.inv)}>{money(sums.inv)}</td>
                <td style={s.td} colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {open && (
        <Modal
          title="Add a sale"
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn primary disabled={locked || bir.saving || !form.saleDate || !form.salesAmount} onClick={submit}>
                <Plus size={14} /> Add sale
              </Btn>
            </>
          }
        >
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            For zero-rated, exempt or government sales and one-offs that are not in the invoice journals. Output VAT is computed at 12% when left blank and the sale is vatable.
          </p>
          <div style={s.grid}>
            <Field label="Date"><Text type="date" value={form.saleDate} onChange={set('saleDate')} /></Field>
            <Field label="Invoice #"><Text value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
            <Field label="Sold to"><Text value={form.customerName} onChange={set('customerName')} /></Field>
            <Field label="TIN"><Text value={form.customerTin} onChange={set('customerTin')} /></Field>
            <Field label="Address"><Text value={form.customerAddress} onChange={set('customerAddress')} /></Field>
            <Field label="Classification"><Pick options={SALE_CLASSES} value={form.classification} onChange={set('classification')} /></Field>
            <Field label="Sales amount (VAT-exclusive)"><Num value={form.salesAmount} onChange={set('salesAmount')} /></Field>
            <Field label="Output VAT (optional)"><Num value={form.outputVat} onChange={set('outputVat')} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
};

// ------------------------------------------------------------------ Purchases

const emptyPurchase = () => ({ transactionDate: today(), invoiceNumber: '', supplierName: '', supplierTin: '', branchCode: '', supplierAddress: '', category: 'DOMESTIC_GOODS', otherSpecify: '', netAmount: '', inputVat: null, exemptAmount: null, claimable: true, remarks: '' });
const purchaseFilters = { q: '', cat: 'ALL', claimed: 'ALL', from: '', to: '' };
const isServiceCat = (c) => c === 'DOMESTIC_SERVICES' || c === 'SERVICES_NONRESIDENT';
const noVatCat = (c) => c === 'NO_INPUT_TAX' || c === 'EXEMPT_IMPORTATION';
const purchaseTotal = (p) => n(p.netAmount) + n(p.inputVat) + n(p.exemptAmount);
const plain = (v) => (Math.abs(n(v)) < 0.005 ? '' : n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtUsDate = (d) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}/${d.slice(0, 4)}` : (d || ''));

const PurchasesTab = ({ data, bir }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPurchase());
  const { f, set: setFilter, reset, active } = useFilters(purchaseFilters);
  const locked = data.locked;
  const set = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  const close = useCallback(() => setOpen(false), []);

  const openNew = () => { setForm(emptyPurchase()); setOpen(true); };
  const openEdit = (p) => { setForm({ ...p, netAmount: p.netAmount ?? '' }); setOpen(true); };
  const needsSpecify = form.category === 'OTHER' && !(form.otherSpecify || '').trim();
  const hasNet = form.netAmount !== '' && form.netAmount !== null && form.netAmount !== undefined;
  const hasAmount = hasNet || n(form.exemptAmount) !== 0;
  const submit = async () => {
    if (!form.transactionDate || !hasAmount || needsSpecify) return;
    const ok = await bir.savePurchase({
      ...form,
      netAmount: hasNet ? form.netAmount : 0,
      exemptAmount: form.exemptAmount === null || form.exemptAmount === '' ? 0 : form.exemptAmount,
      otherSpecify: form.category === 'OTHER' ? form.otherSpecify.trim() : null,
    });
    if (ok) setOpen(false);
  };

  const fye = data.fiscalYearEndMonth || 12;
  const groupByQuarter = bir.year === 'ALL' || bir.quarter === 'ALL';

  const rows = useMemo(() => {
    const list = (data.purchases || []).filter((p) =>
      inRange(p.transactionDate, f.from, f.to) &&
      (f.cat === 'ALL' || p.category === f.cat) &&
      (f.claimed === 'ALL' || (f.claimed === 'YES' ? p.claimable : !p.claimable)) &&
      includesText(f.q, p.invoiceNumber, p.supplierName, p.supplierTin, p.branchCode, p.supplierAddress, p.otherSpecify));
    if (!groupByQuarter) return list;
    return list
      .map((p) => ({ ...p, _q: qInfo(p.transactionDate, fye) }))
      .sort((a, b) => b._q.key.localeCompare(a._q.key) || String(a.transactionDate || '').localeCompare(String(b.transactionDate || '')));
  }, [data.purchases, f, groupByQuarter, fye]);

  const sums = useMemo(() => rows.reduce(
    (a, p) => ({ vatable: a.vatable + n(p.netAmount), vat: a.vat + n(p.inputVat), exempt: a.exempt + n(p.exemptAmount), total: a.total + purchaseTotal(p) }),
    { vatable: 0, vat: 0, exempt: 0, total: 0 }), [rows]);

  const qSums = useMemo(() => {
    const out = {};
    rows.forEach((p) => {
      if (!p._q) return;
      const g = out[p._q.label] || (out[p._q.label] = { vatable: 0, vat: 0, exempt: 0, total: 0, count: 0 });
      g.count += 1; g.vatable += n(p.netAmount); g.vat += n(p.inputVat); g.exempt += n(p.exemptAmount); g.total += purchaseTotal(p);
    });
    return out;
  }, [rows]);

  const periodLabel = bir.quarter === 'ALL'
    ? String(bir.year === 'ALL' ? 'All years' : bir.year)
    : `Q${bir.quarter} ${bir.year === 'ALL' ? 'All years' : bir.year}`;

  const heads = ['Invoice Date', 'Supplier TIN', 'Branch Code', 'Supplier Name', 'Supplier Address', 'Invoice No.', 'VATable Amount', 'VAT Amount', 'Exempt Sales', 'Total Amount', 'Type', ''];
  const widths = ['7%', '8%', '5%', '13%', '17%', '10%', '8%', '7%', '7%', '8%', '5%', '5%'];
  const classLabel = (p) => (p.category === 'OTHER' && p.otherSpecify ? `Other: ${p.otherSpecify}` : PURCHASE_CATEGORIES[p.category]);

  const grid = { border: '1px solid #d1d5db' };
  const hd = { ...s.th, ...grid, textAlign: 'center', background: '#fff', color: '#111827', fontWeight: 700, padding: '8px 4px', whiteSpace: 'normal' };
  const cd = { ...s.td, ...grid };
  const cn = { ...s.td, ...grid, ...s.num };
  const totalCell = { ...cn, fontWeight: 700, background: '#f3f4f6' };

  const isSvcForm = isServiceCat(form.category);
  const noVatForm = noVatCat(form.category);
  const vatPreview = noVatForm ? 0
    : (form.inputVat !== null && form.inputVat !== '' && form.inputVat !== undefined ? n(form.inputVat) : Math.round(n(form.netAmount) * 12) / 100);
  const totalPreview = n(form.netAmount) + vatPreview + n(form.exemptAmount);

  return (
    <>
      <div style={{ ...s.card, ...s.toolbar }}>
        <div style={{ flex: '1 1 220px' }}>
          <Field label="Search"><Text placeholder="Invoice #, supplier, TIN, branch, address" value={f.q} onChange={setFilter('q')} /></Field>
        </div>
        <Field label="Classification">
          <Pick options={{ ALL: 'All', ...PURCHASE_CATEGORIES }} value={f.cat} onChange={setFilter('cat')} />
        </Field>
        <Field label="Claimed">
          <Pick options={{ ALL: 'All', YES: 'Claimed', NO: 'Not claimed' }} value={f.claimed} onChange={setFilter('claimed')} />
        </Field>
        <Field label="From"><Text type="date" value={f.from} onChange={setFilter('from')} /></Field>
        <Field label="To"><Text type="date" value={f.to} onChange={setFilter('to')} /></Field>
        {active && <Btn onClick={reset}><X size={14} /> Clear filters</Btn>}
        <div style={{ marginLeft: 'auto' }}>
          <Btn primary disabled={locked} onClick={openNew}><Plus size={14} /> Add purchase</Btn>
        </div>
      </div>

      <div className="bir-wrap" style={s.card}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>PURCHASES - INPUT TAX</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Showing {rows.length} of {(data.purchases || []).length} purchases. Red = no input VAT (exempt or non-VAT supplier). Greyed = not claimed. Hover the Type column to see the classification.
        </div>
        <table className="bir-table" style={{ border: '1px solid #d1d5db' }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>{heads.map((h, i) => <th key={i} title={h} style={hd}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td style={cd} colSpan={heads.length}>No purchases match.</td></tr>
            )}
            {rows.length > 0 && (
              <tr>
                <td style={{ ...cd, fontWeight: 700, background: '#f3f4f6' }} colSpan={6}>{periodLabel}</td>
                <td style={totalCell}>{plain(sums.vatable)}</td>
                <td style={totalCell}>{plain(sums.vat)}</td>
                <td style={totalCell}>{plain(sums.exempt)}</td>
                <td style={totalCell}>{plain(sums.total)}</td>
                <td style={{ ...cd, background: '#f3f4f6' }} colSpan={2} />
              </tr>
            )}
            {rows.map((p, idx) => {
              const claimedVat = p.claimable && n(p.inputVat) > 0;
              const tone = claimedVat ? null : (p.claimable ? { color: '#dc2626' } : null);
              const tc = { ...cd, ...tone };
              const tn = { ...cn, ...tone };
              return (
                <React.Fragment key={p.id}>
                {p._q && (idx === 0 || rows[idx - 1]._q.label !== p._q.label) && (
                  <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                    <td style={cd} colSpan={6}>{p._q.label}</td>
                    <td style={cn}>{plain(qSums[p._q.label].vatable)}</td>
                    <td style={cn}>{plain(qSums[p._q.label].vat)}</td>
                    <td style={cn}>{plain(qSums[p._q.label].exempt)}</td>
                    <td style={cn}>{plain(qSums[p._q.label].total)}</td>
                    <td style={cd} colSpan={2} />
                  </tr>
                )}
                <tr style={!p.claimable ? { opacity: 0.55 } : undefined}>
                  <td style={tc} title={p.transactionDate}>{fmtUsDate(p.transactionDate)}</td>
                  <td style={tc} title={p.supplierTin}>{p.supplierTin}</td>
                  <td style={{ ...tc, textAlign: 'center' }} title={p.branchCode}>{p.branchCode}</td>
                  <td style={tc} title={p.supplierName}><div className="clamp3">{p.supplierName}</div></td>
                  <td style={tc} title={p.supplierAddress}><div className="clamp3">{p.supplierAddress}</div></td>
                  <td style={tc} title={p.invoiceNumber}>{p.invoiceNumber}</td>
                  <td style={tn}>{plain(p.netAmount)}</td>
                  <td style={tn}>{plain(p.inputVat)}</td>
                  <td style={tn}>{plain(p.exemptAmount)}</td>
                  <td style={tn}>{plain(purchaseTotal(p))}</td>
                  <td style={{ ...tc, textAlign: 'center' }} title={classLabel(p)}>{isServiceCat(p.category) ? 'Services' : 'Goods'}</td>
                  <td style={tc}>
                    <Btn style={{ padding: '2px 4px' }} disabled={locked} onClick={() => openEdit(p)}><Pencil size={12} /></Btn>{' '}
                    <Btn style={{ padding: '2px 4px' }} disabled={locked} onClick={() => window.confirm('Delete this purchase?') && bir.deletePurchase(p.id)}><Trash2 size={12} /></Btn>
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal
          title={form.id ? 'Edit purchase' : 'Add a purchase'}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn primary disabled={locked || bir.saving || !form.transactionDate || !hasAmount || needsSpecify} onClick={submit}>
                <Save size={14} /> {form.id ? 'Update' : 'Add purchase'}
              </Btn>
            </>
          }
        >
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            Enter the VATable amount (VAT-exclusive) and the VAT amount, or enter only Exempt Sales for a supplier with no VAT. The VAT amount is computed at 12% of the VATable amount when left blank. Capital goods above PHP 1,000,000 net have their input VAT deferred automatically.
          </p>
          <div style={s.grid}>
            <Field label="Invoice Date"><Text type="date" value={form.transactionDate} onChange={set('transactionDate')} /></Field>
            <Field label="Supplier TIN"><Text value={form.supplierTin} onChange={set('supplierTin')} /></Field>
            <Field label="Branch Code"><Text placeholder="e.g. 00535" value={form.branchCode} onChange={set('branchCode')} /></Field>
            <Field label="Supplier Name"><Text value={form.supplierName} onChange={set('supplierName')} /></Field>
            <Field label="Supplier Address"><Text value={form.supplierAddress} onChange={set('supplierAddress')} /></Field>
            <Field label="Invoice No."><Text value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
            <Field label="Classification (Goods / Services)"><Pick options={PURCHASE_CATEGORIES} value={form.category} onChange={set('category')} /></Field>
            {form.category === 'OTHER' && (
              <Field label="Specify classification">
                <Text placeholder="e.g. Office supplies" value={form.otherSpecify} onChange={set('otherSpecify')} />
              </Field>
            )}
            <Field label={isSvcForm ? 'VATable Amount (services, VAT-exclusive)' : 'VATable Amount (goods, VAT-exclusive)'}>
              <Num value={form.netAmount} onChange={set('netAmount')} />
            </Field>
            <Field label="VAT Amount (blank = 12% computed)"><Num value={form.inputVat} onChange={set('inputVat')} disabled={noVatForm} /></Field>
            <Field label="Exempt Sales"><Num value={form.exemptAmount} onChange={set('exemptAmount')} /></Field>
            <Field label="Total Amount (computed)">
              <Text disabled value={plain(totalPreview) || '0.00'} onChange={() => {}} />
            </Field>
          </div>
          <label style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
            <input type="checkbox" checked={!!form.claimable} onChange={(e) => set('claimable')(e.target.checked)} /> Include in this quarter's return (claim the input VAT)
          </label>
        </Modal>
      )}
    </>
  );
};
// ------------------------------------------------------------------ Creditable VAT (Schedule 3)

const blankCredit = () => ({ periodCovered: '', agentName: '', agentTin: '', certificateNumber: '', incomePayment: '', taxWithheld: '' });

const CreditsTab = ({ data, bir }) => {
  const [rows, setRows] = useState([]);
  useEffect(() => setRows((data.creditableVat || []).map((r) => ({ ...r }))), [data.creditableVat]);
  const locked = data.locked;
  const upd = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const total = rows.reduce((a, r) => a + Number(r.taxWithheld || 0), 0);

  return (
    <div style={{ ...s.card, overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Schedule 3: creditable VAT withheld</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>One row per certificate. Saving replaces the whole list for this return.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Period covered', 'Withholding agent', 'Agent TIN', 'Certificate #', 'Income payment', 'Tax withheld', ''].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={s.td}><Text disabled={locked} value={r.periodCovered} onChange={(v) => upd(i, 'periodCovered', v)} /></td>
              <td style={s.td}><Text disabled={locked} value={r.agentName} onChange={(v) => upd(i, 'agentName', v)} /></td>
              <td style={s.td}><Text disabled={locked} value={r.agentTin} onChange={(v) => upd(i, 'agentTin', v)} /></td>
              <td style={s.td}><Text disabled={locked} value={r.certificateNumber} onChange={(v) => upd(i, 'certificateNumber', v)} /></td>
              <td style={s.td}><Num disabled={locked} value={r.incomePayment} onChange={(v) => upd(i, 'incomePayment', v)} /></td>
              <td style={s.td}><Num disabled={locked} value={r.taxWithheld} onChange={(v) => upd(i, 'taxWithheld', v)} /></td>
              <td style={s.td}><Btn disabled={locked} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><Trash2 size={14} /></Btn></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td style={{ ...s.td, fontWeight: 600 }} colSpan={5}>Total</td><td style={{ ...s.td, ...s.num, fontWeight: 600 }}>{money(total)}</td><td /></tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Btn disabled={locked} onClick={() => setRows((rs) => [...rs, blankCredit()])}><Plus size={14} /> Add row</Btn>
        <Btn primary disabled={locked || bir.saving} onClick={() => bir.saveCreditable(rows)}><Save size={14} /> Save Schedule 3</Btn>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ Adjustments

const ADJ_GROUPS = [
  ['Input tax (carried over and other)', [
    ['inputTaxCarriedOver', 'Input tax carried over from previous quarter'],
    ['deferredCapitalGoodsPrev', 'Deferred input tax on capital goods from previous period'],
    ['transitionalInputTax', 'Transitional input tax'],
    ['presumptiveInputTax', 'Presumptive input tax'],
    ['otherInputTax', 'Other input tax'],
  ]],
  ['Deductions from input tax', [
    ['inputTaxGovtClosedToExpense', 'Input tax on sales to government closed to expense'],
    ['inputTaxAllocableToExempt', 'Input tax allocable to exempt sales'],
    ['vatRefundTccClaimed', 'VAT refund / TCC claimed'],
    ['otherDeductions', 'Other deductions'],
  ]],
  ['Tax credits and payments', [
    ['advanceVatPayments', 'Advance VAT payments (Schedule 4)'],
    ['previousReturnPayment', 'VAT paid in return previously filed (amended return)'],
    ['advancePaymentsMade', 'Advance payments made'],
    ['otherCredits', 'Other credits / payments'],
  ]],
  ['Penalties', [
    ['surcharge', 'Surcharge'],
    ['interest', 'Interest'],
    ['compromise', 'Compromise'],
  ]],
];

const AdjustmentsTab = ({ data, bir }) => {
  const [form, setForm] = useState(data.form);
  useEffect(() => setForm(data.form), [data.form]);
  const locked = data.locked;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const suggested = Number(data.suggestedCarryOver || 0);

  return (
    <>
      {ADJ_GROUPS.map(([title, fields]) => (
        <div key={title} style={s.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{title}</h3>
          <div style={s.grid}>
            {fields.map(([k, label]) => (
              <Field key={k} label={label}><Num disabled={locked} value={form[k]} onChange={set(k)} /></Field>
            ))}
          </div>
          {title.startsWith('Input tax') && suggested > 0 && (
            <div style={{ marginTop: 12, fontSize: 13 }}>
              Previous quarter excess input tax: <strong>{money(suggested)}</strong>{' '}
              <Btn disabled={locked} onClick={() => set('inputTaxCarriedOver')(suggested)}>Use as carried over</Btn>
            </div>
          )}
        </div>
      ))}
      <div style={s.card}>
        <div style={s.grid}>
          <Field label="Other credits, specify"><Text disabled={locked} value={form.otherCreditsSpecify} onChange={set('otherCreditsSpecify')} /></Field>
          <Field label="Sheets attached"><Num disabled={locked} value={form.sheetsAttached} onChange={set('sheetsAttached')} /></Field>
          <Field label="Tax relief, specify"><Text disabled={locked} value={form.taxReliefSpecify} onChange={set('taxReliefSpecify')} /></Field>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, display: 'flex', gap: 24 }}>
          <label><input type="checkbox" disabled={locked} checked={!!form.shortPeriod} onChange={(e) => set('shortPeriod')(e.target.checked)} /> Short period return</label>
          <label><input type="checkbox" disabled={locked} checked={!!form.availingTaxRelief} onChange={(e) => set('availingTaxRelief')(e.target.checked)} /> Availing tax relief</label>
        </div>
        <Field label="Notes"><textarea style={{ ...s.input, marginTop: 12, minHeight: 60 }} disabled={locked} value={form.notes ?? ''} onChange={(e) => set('notes')(e.target.value)} /></Field>
      </div>
      <Btn primary disabled={locked || bir.saving} onClick={() => bir.saveForm(form)}><Save size={14} /> Save adjustments</Btn>
    </>
  );
};

// ------------------------------------------------------------------ Taxpayer

const TAXPAYER_FIELDS = [
  ['tin', 'TIN'], ['rdoCode', 'RDO code'], ['registeredName', 'Registered name'], ['tradeName', 'Trade name'],
  ['registeredAddress', 'Registered address'], ['zipCode', 'ZIP code'], ['telephone', 'Telephone'], ['email', 'Email'],
  ['taxpayerClassification', 'Taxpayer classification'], ['lineOfBusiness', 'Line of business'],
  ['signatoryName', 'Authorized signatory'], ['signatoryTitle', 'Signatory title'], ['signatoryTin', 'Signatory TIN'],
];

const TaxpayerTab = ({ data, bir }) => {
  const [t, setT] = useState(data.taxpayer || {});
  useEffect(() => setT(data.taxpayer || {}), [data.taxpayer]);
  const set = (k) => (v) => setT((x) => ({ ...x, [k]: v }));
  return (
    <div style={s.card}>
      <div style={s.grid}>
        {TAXPAYER_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}><Text value={t[k]} onChange={set(k)} /></Field>
        ))}
        <Field label="Fiscal year end month (12 = calendar year)">
          <Num value={t.fiscalYearEndMonth} onChange={(v) => set('fiscalYearEndMonth')(v === null ? null : Number(v))} />
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Btn primary disabled={bir.saving} onClick={() => bir.saveTaxpayer(t)}><Save size={14} /> Save taxpayer</Btn>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ Filing

const FilingSummary = ({ data, bir }) => {
  const L = (k) => (data.lines || []).find((l) => l.key === k) || {};
  const vatable = n(L('sales_vatable_private').base) + n(L('sales_vatable_govt').base);
  const end = data.periodEnd ? new Date(`${data.periodEnd}T00:00:00`) : null;
  const endLabel = end ? end.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : '';
  const rows = [
    ['Vatable Sales for the Quarter', vatable, null, true],
    ['Vatable Sales for Recovered receivables', n(L('out_recovered_sales').base), null, true],
    ['Output Tax for the Quarter', null, n(L('total_sales_output').tax), false],
    ['Add: Output Vat on recovered Uncollectible Receivables Previously Deducted', null, n(L('out_recovered_vat').tax), false],
    ['Less: Output VAT on Uncollected Receivables', null, n(L('out_uncollected').tax), false],
    ['Less: INPUT VAT', null, n(L('input_allowable').tax), false],
  ];
  const total = n(L('out_due').tax) - n(L('input_allowable').tax);
  const cell = { border: '1px solid #111', padding: '2px 6px', fontSize: 13 };
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Quarterly VAT computation</h3>
        
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
        <tbody>
          <tr><td colSpan={3} style={{ ...cell, textAlign: 'center', fontWeight: 700, lineHeight: 1.5 }}>
            {(data.taxpayer?.registeredName || 'COMPANY NAME').toUpperCase()}<br />
            SUMMARY OF QUARTERLY VALUE-ADDED TAX (VAT) COMPUTATION<br />
            BIR Form No. 2550Q | Quarter Ending {endLabel}
          </td></tr>
          {rows.map(([label, base, tax, bold]) => (
            <tr key={label}>
              <td style={{ ...cell, fontWeight: bold ? 700 : 400 }}>{label}</td>
              <td style={{ ...cell, ...s.num, width: 150 }}>{base === null ? '' : money(base)}</td>
              <td style={{ ...cell, ...s.num, width: 150 }}>{tax === null ? '' : money(tax)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, fontWeight: 700 }}>TOTAL STILL PAYABLE FOR THE QUARTER</td>
            <td style={cell} />
            <td style={{ ...cell, ...s.num, fontWeight: 700 }}>{money(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const FilingTab = ({ data, bir }) => {
  const f = data.form || {};
  const [d, setD] = useState({ filedDate: today(), referenceNumber: '', paymentBank: '', paymentReference: '', paymentDate: '' });
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: v }));

  return (
    <>
      <div style={s.card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Status: {data.locked ? 'Filed' : 'Draft'}</h3>
        {data.locked ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              Filed on {f.filedDate || 'â€”'}; reference {f.referenceNumber || 'â€”'}.<br />
              Payment: {f.paymentBank || 'â€”'} / {f.paymentReference || 'â€”'} / {f.paymentDate || 'â€”'}
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn onClick={() => window.confirm('Reopen this return? Its entries become editable again.') && bir.reopenReturn()}>
                <Unlock size={14} /> Reopen
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div style={s.grid}>
              <Field label="Filing date"><Text type="date" value={d.filedDate} onChange={set('filedDate')} /></Field>
              <Field label="Reference number"><Text value={d.referenceNumber} onChange={set('referenceNumber')} /></Field>
              <Field label="Payment bank"><Text value={d.paymentBank} onChange={set('paymentBank')} /></Field>
              <Field label="Payment reference"><Text value={d.paymentReference} onChange={set('paymentReference')} /></Field>
              <Field label="Payment date"><Text type="date" value={d.paymentDate} onChange={set('paymentDate')} /></Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn
                primary
                disabled={bir.saving}
                onClick={() =>
                  window.confirm('Mark as filed? Sales, purchases and credits in this quarter will be locked.') &&
                  bir.fileReturn({ ...d, paymentDate: d.paymentDate || null })
                }
              >
                <Lock size={14} /> Mark as filed
              </Btn>
            </div>
          </>
        )}
      </div>
      <div style={s.card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Export</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>CSV with the summary, sales, purchases and Schedule 3, for the relief-style attachments and your accountant.</p>
        <Btn onClick={bir.exportCsv}><Download size={14} /> Download CSV</Btn>
      </div>
    </>
  );
};

// ------------------------------------------------------------------ Recovered receivables

const emptyRecovered = () => ({ dateCollected: today(), clientName: '', invoiceNumber: '', invoiceDate: '', amountCollected: null, recoveredAmount: null, totalSales: null, withholdingTax: null, rebates: null, remarks: '' });
const recoveredFilters = { q: '', from: '', to: '' };
const recBase = (a) => n(a) / 1.12;
const recVat = (a) => (n(a) * 12) / 112;
const recAmount = (r) => (r.recoveredAmount !== null && r.recoveredAmount !== undefined && r.recoveredAmount !== '' && n(r.recoveredAmount) !== 0 ? n(r.recoveredAmount) : n(r.amountCollected));

const RecoveredTab = ({ data, bir }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyRecovered());
  const { f, set: setFilter, reset, active } = useFilters(recoveredFilters);
  const locked = data.locked;
  const set = (k) => (v) => setForm((x) => ({ ...x, [k]: v }));
  const close = useCallback(() => setOpen(false), []);

  const [found, setFound] = useState([]);
  const [looked, setLooked] = useState(false);
  const [busy, setBusy] = useState(false);

  const unwrap = (r) => {
    let x = r && r.data !== undefined ? r.data : r;
    if (x && x.success === true && x.data !== undefined) x = x.data;
    return Array.isArray(x) ? x : [];
  };
  const toForm = (x) => ({
    ...emptyRecovered(),
    clientName: x.clientName || '',
    invoiceNumber: x.invoiceNumber || '',
    invoiceDate: x.invoiceDate || '',
    totalSales: x.totalSales,
    withholdingTax: x.withholdingTax,
    amountCollected: x.amountCollected,
    recoveredAmount: x.recoveredAmount,
    dateCollected: x.dateCollected || today(),
    remarks: x.reversal ? `Reversal via DV ${x.reference || ''}` : (x.reference ? `DV ${x.reference}` : ''),
  });
  const toSave = (x) => ({ ...toForm(x), invoiceDate: x.invoiceDate || null });

  const lookup = async () => {
    const no = (form.invoiceNumber || '').trim();
    if (!no || form.id) return;
    try {
      const list = unwrap(await api.get(`/bir/2550q/recovered/lookup?invoiceNumber=${encodeURIComponent(no)}`));
      setFound(list);
      setLooked(true);
      if (list.length) setForm(toForm(list[0]));
    } catch { setFound([]); setLooked(true); }
  };
  const addAll = async () => {
    setBusy(true);
    for (const x of found) await bir.saveRecovered(toSave(x));
    setBusy(false);
    setOpen(false);
  };
  const [yr, setYr] = useState(bir.year);
  const [qt, setQt] = useState(bir.quarter);
  const [list, setList] = useState([]);
  const yearOpts = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i);
  const scopeQs = () => (yr === 'ALL' ? '' : `?year=${yr}${qt === 'ALL' ? '' : `&quarter=${qt}`}`);

  useEffect(() => { setYr(bir.year); setQt(bir.quarter); }, [bir.year, bir.quarter]);


  useEffect(() => {
    let alive = true;
    api.get(`/bir/2550q/recovered/all${scopeQs()}`)
      .then((r) => { if (alive) setList(unwrap(r)); })
      .catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [yr, qt, data]);

  const openNew = () => { setForm(emptyRecovered()); setFound([]); setLooked(false); setOpen(true); };
  const openEdit = (r) => { setForm({ ...r, invoiceDate: r.invoiceDate || '' }); setFound([]); setLooked(false); setOpen(true); };
  const formValid = !!form.dateCollected && recAmount(form) !== 0;
  const submit = async () => {
    if (!formValid) return;
    const ok = await bir.saveRecovered({ ...form, invoiceDate: form.invoiceDate || null });
    if (ok) setOpen(false);
  };

  const rows = useMemo(() => list.filter((r) =>
    inRange(r.dateCollected, f.from, f.to) &&
    includesText(f.q, r.clientName, r.invoiceNumber, r.remarks)),
  [list, f]);

  const sums = useMemo(() => rows.reduce(
    (a, r) => ({ collected: a.collected + n(r.amountCollected), recovered: a.recovered + recAmount(r) }),
    { collected: 0, recovered: 0 }), [rows]);

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const has = (v) => v !== null && v !== undefined && v !== '';
  const heads = ['Month', 'Client', 'Invoice date', 'Invoice #', 'Total sales', 'Vatable sales', 'Output VAT', 'Withholding tax',
    'Accounts receivable', 'CLP 1%', 'Amount to be collected', 'Rebates (deductions)', 'Amount collected', 'Date collected',
    'Output VAT on recovered', 'Vatable sales on recovered', ''];
  const textHeads = ['Month', 'Client', 'Invoice date', 'Invoice #', 'Date collected', ''];

  const fye = data.fiscalYearEndMonth || 12;
  const groupByQuarter = yr === 'ALL' || qt === 'ALL';

  const groups = useMemo(() => {
    const map = new Map();
    const list = [];
    rows.forEach((r) => {
      const no = (r.invoiceNumber || '').trim();
      const qi = groupByQuarter ? qInfo(r.dateCollected, fye) : null;
      const base = no ? `${(r.clientName || '').trim().toLowerCase()}|${no}` : `id:${r.id}`;
      const key = (qi ? `${qi.key}|` : '') + base;
      let g = map.get(key);
      if (!g) { g = { first: r, items: [], _q: qi }; map.set(key, g); list.push(g); }
      g.items.push(r);
    });
    list.sort((a, b) =>
      (a._q && b._q ? b._q.key.localeCompare(a._q.key) : 0) ||
      String(a.first.invoiceDate || '9999').localeCompare(String(b.first.invoiceDate || '9999')) ||
      String(a.first.invoiceNumber || '').localeCompare(String(b.first.invoiceNumber || '')));
    return list.map((g) => {
      const inv = g.items.find((x) => has(x.totalSales)) || g.first;
      const d = g.first.invoiceDate || '';
      const hasTotal = has(inv.totalSales);
      const total = hasTotal ? n(inv.totalSales) : 0;
      const vatable = total / 1.12;
      const wht = has(inv.withholdingTax) ? n(inv.withholdingTax) : vatable * 0.01;
      const ar = total - wht;
      const rec = g.items.reduce((a, x) => a + recAmount(x), 0);
      return {
        ...g,
        month: d ? `${MON[Number(d.slice(5, 7)) - 1]}-${d.slice(2, 4)}` : '',
        hasTotal, total, vatable, outVat: vatable * 0.12, wht, ar, clp: 0, atbc: ar, rebate: n(inv.rebates),
        collected: g.items.reduce((a, x) => a + n(x.amountCollected), 0),
        recVat: recVat(rec), recBase: recBase(rec),
      };
    });
  }, [rows, groupByQuarter, fye]);

  const qSums = useMemo(() => {
    const out = {};
    groups.forEach((g) => {
      if (!g._q) return;
      const t = out[g._q.label] || (out[g._q.label] = { collected: 0, recVat: 0, recBase: 0, count: 0 });
      t.count += g.items.length; t.collected += g.collected; t.recVat += g.recVat; t.recBase += g.recBase;
    });
    return out;
  }, [groups]);

  const gsum = (k) => groups.reduce((a, g) => a + (k === 'collected' || k.startsWith('rec') || g.hasTotal ? g[k] : 0), 0);

  return (
    <>
      <div style={{ ...s.card, ...s.toolbar }}>
        <div style={{ flex: '1 1 220px' }}>
          <Field label="Search"><Text placeholder="Client, invoice #, remarks" value={f.q} onChange={setFilter('q')} /></Field>
        </div>
        <Field label="Year">
          <select style={s.input} value={yr} onChange={(e) => setYr(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
            <option value="ALL">All years</option>
            {yearOpts.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Quarter">
          <select style={s.input} value={yr === 'ALL' ? 'ALL' : qt} disabled={yr === 'ALL'} onChange={(e) => setQt(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
            <option value="ALL">All quarters</option>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </Field>
        <div style={{ display: 'none' }}>
        </div>
        <Field label="From"><Text type="date" value={f.from} onChange={setFilter('from')} /></Field>
        <Field label="To"><Text type="date" value={f.to} onChange={setFilter('to')} /></Field>
        {active && <Btn onClick={reset}><X size={14} /> Clear filters</Btn>}
        <div style={{ marginLeft: 'auto' }}>
          
          <Btn disabled={!(data.recoveredReceivables || []).length} onClick={() => downloadRecoveredSchedule({ rows: data.recoveredReceivables || [], companyName: data.taxpayer?.registeredName, periodStart: data.periodStart, periodEnd: data.periodEnd, year: bir.year, quarter: bir.quarter })}><Download size={14} /> Download schedule</Btn>{' '}
          <Btn primary disabled={locked} onClick={openNew}><Plus size={14} /> Add recovered receivable</Btn>
        </div>
      </div>

      <div className="bir-wrap" style={{ ...s.card, overflowX: 'auto' }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Receivables from earlier quarters that were collected in this quarter. Output VAT on recovered = net amount recovered x 12/112. A negative amount reverses a payment. CLP 1% is not stored yet, so it shows as a dash. Showing {rows.length} of {list.length} entries.
        </div>
        <table style={{ ...s.fixed, tableLayout: 'auto', minWidth: 2100 }}>
          <thead>
            <tr>{heads.map((h, i) => <th key={i} title={h} style={{ ...s.th, whiteSpace: 'normal', ...(textHeads.includes(h) ? {} : s.num), ...(h === 'Date collected' ? { paddingLeft: 32 } : {}), ...(h === 'Amount collected' ? { paddingRight: 16 } : {}) }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td style={s.td} colSpan={heads.length}>No recovered receivables for this quarter.</td></tr>
            )}
            {groups.map((g, gi) => (
              <React.Fragment key={`g${gi}`}>
              {g._q && (gi === 0 || groups[gi - 1]._q.label !== g._q.label) && (
                <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                  <td style={s.td} colSpan={12}>{g._q.label}</td>
                  <td style={{ ...s.td, ...s.num, paddingRight: 16 }}>{money(qSums[g._q.label].collected)}</td>
                  <td style={s.td} />
                  <td style={{ ...s.td, ...s.num }}>{money(qSums[g._q.label].recVat)}</td>
                  <td style={{ ...s.td, ...s.num }}>{money(qSums[g._q.label].recBase)}</td>
                  <td style={s.td} />
                </tr>
              )}
              {g.items.map((x, i) => {
              const sp = { rowSpan: g.items.length };
              const gt = { ...s.td, verticalAlign: 'top' };
              const gn = { ...gt, ...s.num };
              const first = i === 0;
              const nz = (v) => (g.hasTotal && Math.abs(v) > 0.004 ? money(v) : '');
              return (
                <tr key={x.id}>
                  {first && <td {...sp} style={gt}>{g.month}</td>}
                  {first && <td {...sp} style={gt}>{g.first.clientName}</td>}
                  {first && <td {...sp} style={gt}>{g.first.invoiceDate}</td>}
                  {first && <td {...sp} style={gt}>{g.first.invoiceNumber}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.total)}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.vatable)}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.outVat)}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.wht)}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.ar)}</td>}
                  {first && <td {...sp} style={gn}>{g.hasTotal ? '-' : ''}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.atbc)}</td>}
                  {first && <td {...sp} style={gn}>{nz(g.rebate)}</td>}
                  <td style={{ ...s.td, ...s.num, paddingRight: 16 }}>{money(x.amountCollected)}</td>
                  <td style={{ ...s.td, paddingLeft: 32 }}>{x.dateCollected}</td>
                  {first && <td {...sp} style={gn}>{money(g.recVat)}</td>}
                  {first && <td {...sp} style={gn}>{money(g.recBase)}</td>}
                  <td style={s.td}>
                    <Btn style={{ padding: '2px 4px' }} disabled={locked} onClick={() => openEdit(x)}><Pencil size={12} /></Btn>{' '}
                    <Btn style={{ padding: '2px 4px' }} disabled={locked} onClick={() => window.confirm('Delete this entry?') && bir.deleteRecovered(x.id)}><Trash2 size={12} /></Btn>
                  </td>
                </tr>
              );
            })}
              </React.Fragment>
            ))}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 600, background: '#f9fafb' }}>
                <td style={s.td} colSpan={4}>Total</td>
                {['total', 'vatable', 'outVat', 'wht', 'ar'].map((k) => <td key={k} style={{ ...s.td, ...s.num }}>{money(gsum(k))}</td>)}
                <td style={s.td} />
                <td style={{ ...s.td, ...s.num }}>{money(gsum('atbc'))}</td>
                <td style={{ ...s.td, ...s.num }}>{money(gsum('rebate'))}</td>
                <td style={{ ...s.td, ...s.num }}>{money(gsum('collected'))}</td>
                <td style={s.td} />
                <td style={{ ...s.td, ...s.num }}>{money(gsum('recVat'))}</td>
                <td style={{ ...s.td, ...s.num }}>{money(gsum('recBase'))}</td>
                <td style={s.td} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {open && (
        <Modal
          title={form.id ? 'Edit recovered receivable' : 'Add a recovered receivable'}
          onClose={close}
          footer={
            <>
              <Btn onClick={close}>Cancel</Btn>
              <Btn primary disabled={locked || bir.saving || !formValid} onClick={submit}>
                <Save size={14} /> {form.id ? 'Update' : 'Add'}
              </Btn>
            </>
          }
        >
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            Amount recovered is the VAT-inclusive sales amount the output VAT is based on (usually the full invoice amount, not the cash received). Leave it blank to use the amount collected.
          </p>
          <div style={s.grid}>
            <Field label="Date collected"><Text type="date" value={form.dateCollected} onChange={set('dateCollected')} /></Field>
            <Field label="Client"><Text value={form.clientName} onChange={set('clientName')} /></Field>
            <Field label="Invoice # (type it to auto-fill)"><input style={s.input} value={form.invoiceNumber ?? ''} onChange={(e) => set('invoiceNumber')(e.target.value)} onBlur={lookup} /></Field>
            <Field label="Invoice date (optional)"><Text type="date" value={form.invoiceDate} onChange={set('invoiceDate')} /></Field>
            <Field label="Amount collected (cash received)"><Num value={form.amountCollected} onChange={set('amountCollected')} /></Field>
            <Field label="Amount recovered (VAT-inclusive)"><Num value={form.recoveredAmount} onChange={set('recoveredAmount')} /></Field>
            <Field label="Invoice total sales (VAT-inclusive)"><Num value={form.totalSales} onChange={set('totalSales')} /></Field>
            <Field label="Withholding tax (blank = 1% of vatable)"><Num value={form.withholdingTax} onChange={set('withholdingTax')} /></Field>
            <Field label="Rebates (deductions)"><Num value={form.rebates} onChange={set('rebates')} /></Field>
          </div>
          {looked && found.length === 0 && (
            <div style={{ fontSize: 12, color: '#b45309', margin: '8px 0' }}>No payment posted for this invoice in the Sales Journal.</div>
          )}
          {found.length > 1 && (
            <div style={{ fontSize: 12, margin: '8px 0' }}>
              {found.length} payments/reversals found for this invoice.{' '}
              <Btn disabled={busy || locked} onClick={addAll}>Add all {found.length}</Btn>
            </div>
          )}
          <Field label="Remarks"><Text value={form.remarks} onChange={set('remarks')} /></Field>
        </Modal>
      )}
    </>
  );
};
// ------------------------------------------------------------------ Page

export default function Bir2550QPage({ companyId }) {
  const bir = useBir2550Q(companyId);
  const { tab, setTab, tabs } = useBirTabs();
  const [yv, setYv] = useState(bir.year);
  const [qv, setQv] = useState(bir.quarter);
  const [agg, setAgg] = useState(null);
  const [aggLoading, setAggLoading] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const aggMode = yv === 'ALL' || qv === 'ALL';
  useEffect(() => { if (!aggMode) { setYv(bir.year); setQv(bir.quarter); } }, [bir.year, bir.quarter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!aggMode) { setAgg(null); return undefined; }
    let alive = true;
    setAggLoading(true);
    const qs = new URLSearchParams();
    if (yv !== 'ALL') qs.set('year', yv);
    if (qv !== 'ALL') qs.set('quarter', qv);
    qs.set('amended', bir.amended ? 'true' : 'false');
    if (companyId) qs.set('companyId', companyId);
    api.get(`/bir/2550q/aggregate?${qs.toString()}`)
      .then((r) => {
        let x = r && r.data !== undefined ? r.data : r;
        if (x && x.success === true && x.data !== undefined) x = x.data;
        if (alive) setAgg(x && x.lines ? x : null);
      })
      .catch(() => { if (alive) setAgg(null); })
      .finally(() => { if (alive) setAggLoading(false); });
    return () => { alive = false; };
  }, [aggMode, yv, qv, bir.amended, companyId, syncTick]);
  // Keep Recovered receivables in step with the Sales Journal (adds new payments, removes deleted/edited ones).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const qs = yv === 'ALL' ? '' : `?year=${yv}${qv === 'ALL' ? '' : `&quarter=${qv}`}`;
        const r = await api.post(`/bir/2550q/recovered/sync${qs}`, {});
        const changed = Number(r?.data?.data ?? r?.data ?? 0) || 0;
        if (alive && changed > 0) {
          bir.reload();
          setSyncTick((t) => t + 1);
        }
      } catch { /* the page still loads with what is saved */ }
    })();
    return () => { alive = false; };
  }, [yv, qv]); // eslint-disable-line react-hooks/exhaustive-deps
  // combined view is read-only: tabs get locked=true, the Excel export gets the real value
  const data = useMemo(() => (aggMode ? (agg ? { ...agg, locked: true } : null) : bir.data), [aggMode, agg, bir.data]);
  const view = { ...bir, year: yv, quarter: qv, loading: aggMode ? aggLoading : bir.loading };
  const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div style={{ padding: 16, maxWidth: 1800, margin: '0 auto' }}>
      <style>{`
        .bir-btn, .bir-btn:hover, .bir-btn:focus, .bir-btn:focus-visible, .bir-btn:active { border-color: #d1d5db !important; outline: none !important; box-shadow: none !important; }
        .bir-btn.bir-primary, .bir-btn.bir-primary:hover, .bir-btn.bir-primary:focus, .bir-btn.bir-primary:focus-visible, .bir-btn.bir-primary:active { border-color: #ea580c !important; }
        .bir-wrap { container-type: inline-size; }
        .bir-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .bir-table th, .bir-table td { white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
        .bir-table th[style*="text-align: right"], .bir-table td[style*="text-align: right"] { overflow: hidden; text-overflow: ellipsis; }
        @container (max-width: 1100px) {
          .bir-table th, .bir-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: normal; word-break: normal; }
        }
              .bir-table .clamp3 { white-space: normal; overflow-wrap: anywhere; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; }
        .bir-table th:nth-child(11), .bir-table td:nth-child(11) { padding-right: 28px !important; }
        .bir-table th:nth-child(12), .bir-table td:nth-child(12) { padding-left: 12px !important; }
              .bir-table select:hover:not(:disabled) { color: inherit; text-decoration-style: solid; }
        .bir-table select:disabled { color: inherit; text-decoration: none; cursor: default; }
        .bir-table select option { color: #111827; }
      `}</style>
      <h2 style={{ margin: '0 0 4px' }}>BIR Form 2550Q: Quarterly VAT Return</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
        Sales come from your invoice journals. Everything else is entered here.
      </p>

      <div style={{ ...s.card, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <Field label="Year">
          <select style={s.input} value={yv} onChange={(e) => { const v = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value); setYv(v); if (v !== 'ALL') bir.setYear(v); }}>
            <option value="ALL">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Quarter">
          <select style={s.input} value={qv} onChange={(e) => { const v = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value); setQv(v); if (v !== 'ALL') bir.setQuarter(v); }}>
            <option value="ALL">All quarters</option>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </Field>
        <label style={{ fontSize: 13, paddingBottom: 8 }}>
          <input type="checkbox" checked={bir.amended} onChange={(e) => bir.setAmended(e.target.checked)} /> Amended return
        </label>
        <Btn primary disabled={!(aggMode ? agg : data)} onClick={() => downloadFullReturn(aggMode ? agg : data, { year: yv, quarter: qv, overview: bir.overview })}><Download size={14} /> Download Excel (all tabs)</Btn>
        {data && (
          <div style={{ marginLeft: 'auto', fontSize: 13, textAlign: 'right' }}>
            <div>{data.periodStart} to {data.periodEnd}</div>
            <div>{aggMode ? 'Combined view, read-only' : <>Due {data.dueDate}</>} {!aggMode && data.locked && <span style={{ color: '#047857' }}>(filed)</span>}</div>
          </div>
        )}
      </div>

      {data && (
        <div style={{ ...s.grid, marginBottom: 16 }}>
          {[
            ['Output tax', data.totalOutputTax],
            ['Allowable input tax', data.totalAllowableInputTax],
            ['Net VAT payable', data.netVatPayable],
            ['Total amount payable', data.totalAmountPayable],
          ].map(([label, v]) => (
            <div key={label} style={s.card}>
              <div style={s.label}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{money(v)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((t) => (
          <Btn key={t.id} primary={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Btn>
        ))}
      </div>

      {!data ? (
        <div>{view.loading ? 'Loadingâ€¦' : 'No data.'}</div>
      ) : (
        <>
          {tab === 'sales' && <SalesTab data={data} bir={view} />}
          {tab === 'purchases' && <PurchasesTab data={data} bir={view} />}
          {tab === 'recovered' && <RecoveredTab data={data} bir={view} />}
          {tab === 'filing' && (<><FilingSummary data={data} bir={view} />{!aggMode && <FilingTab data={data} bir={view} />}</>)}
        </>
      )}
    </div>
  );
}