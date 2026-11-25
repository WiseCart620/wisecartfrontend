import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import useBir2550q from './useBir2550q';
import useBir2550qTabs from './useBir2550qTabs';
import { api } from '../../../../services/api';
import { downloadFullReturn } from './exports/bir2550qFullExport';
import { s, Field, Btn, money } from './bir2550qShared';
import SalesTab from './tabs/SalesTab';
import PurchasesTab from './tabs/PurchasesTab';
import RecoveredTab from './tabs/RecoveredTab';
import FilingTab, { FilingSummary } from './tabs/FilingTab';

// BIR Form 2550Q: quarterly VAT return. One file per tab in ./tabs.
export default function Bir2550qPage({ companyId }) {
  const bir = useBir2550q(companyId);
  const { tab, setTab, tabs } = useBir2550qTabs();
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
  const pickRow = (e) => {
    if (!e.target.closest || e.target.closest('input, select, button, textarea')) return;
    const tr = e.target.closest('tbody tr');
    if (!tr) return;
    const table = tr.closest('table');
    if (table) table.querySelectorAll('tr.bir-sel').forEach((x) => x.classList.remove('bir-sel'));
    tr.classList.add('bir-sel');
  };

  return (
    <div className="bir-page" onClick={pickRow} style={{ padding: 16, maxWidth: 1800, margin: '0 auto' }}>
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
        .bir-page table tbody tr { cursor: pointer; }
        .bir-page table tbody tr:not(.bir-sel):hover > td { background-color: #fff7ed !important; }
        .bir-page table tbody tr.bir-sel > td { background-color: #fed7aa !important; }
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
        <div>{view.loading ? 'Loading...' : 'No data.'}</div>
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
