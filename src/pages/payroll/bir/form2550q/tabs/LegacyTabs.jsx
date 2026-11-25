// NOT wired into the 2550Q page (the tab list is Sales, Purchases, Recovered, Filing).
// Kept for reference. Delete this file if you will never bring these tabs back.
import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { s, Field, Text, Num, Btn, money } from '../bir2550qShared';

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

export { CreditsTab, AdjustmentsTab, TaxpayerTab };
