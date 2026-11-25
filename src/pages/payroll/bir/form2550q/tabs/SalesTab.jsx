import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '../../../../../services/api';
import { s, Field, Btn, Text, Num, Pick, Modal, useFilters, inRange, includesText, qInfo, money, today, n, SALE_CLASSES } from '../bir2550qShared';

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

export default SalesTab;
