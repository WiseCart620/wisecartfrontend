import React, { useState } from 'react';
import { Download, Lock, Unlock } from 'lucide-react';
import { s, Field, Btn, Text, money, today, n } from '../bir2550qShared';

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
              Filed on {f.filedDate || '-'}; reference {f.referenceNumber || '-'}.<br />
              Payment: {f.paymentBank || '-'} / {f.paymentReference || '-'} / {f.paymentDate || '-'}
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

export { FilingSummary };
export default FilingTab;
