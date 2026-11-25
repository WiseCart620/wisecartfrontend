import React, { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { s, Field, Btn, Text, Num, Pick, Modal, useFilters, inRange, includesText, qInfo, today, n, PURCHASE_CATEGORIES } from '../bir2550qShared';

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

export default PurchasesTab;
