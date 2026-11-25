import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../../../../../services/api';
import { downloadRecoveredSchedule } from '../exports/bir2550qRecoveredSchedule';
import { s, Field, Btn, Text, Num, Modal, useFilters, inRange, includesText, qInfo, money, today, n } from '../bir2550qShared';

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

export default RecoveredTab;
