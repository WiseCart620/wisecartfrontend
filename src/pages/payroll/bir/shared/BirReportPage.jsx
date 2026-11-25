import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Settings2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { useAuth, can, uiAllowed } from '../../../../context/AuthContext';
import PageShell from '../../../../components/payroll/PageShell';
import { inputCls } from '../../../../components/payroll/Shared';
import { saveWorkbook } from './birWorkbookKit';
import BirSettingsModal from './BirSettingsModal';

/*
 * Common page for the payroll-based BIR reports (1601-C, 1604-C, Salary Monitoring QB).
 * Each form passes:
 *   config  { title, subtitle, url, fileName(year), build(ExcelJS, data), isEmpty(data), missingSetup(data), note }
 *   Preview component that renders the table for its data
 */
const BirReportBody = ({ config, Preview }) => {
  const { user } = useAuth();
  const canEditSettings = can(user, 'payroll', 'create');
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`${config.url}?year=${year}`);
      setData(r.success ? r.data : null);
    } catch { toast.error('Failed to load report'); setData(null); } finally { setLoading(false); }
  }, [config.url, year]);
  useEffect(() => { load(); }, [load]);

  const empty = useMemo(() => !data || config.isEmpty(data), [data, config]);
  const setupMissing = useMemo(() => (data ? config.missingSetup(data) : []), [data, config]);

  const download = async () => {
    if (!data || setupMissing.length) return;
    setBusy(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      await saveWorkbook(config.build(ExcelJS, data), config.fileName(year));
      toast.success('Excel file downloaded');
    } catch (e) { toast.error(e.message || 'Failed to build the Excel file'); } finally { setBusy(false); }
  };

  const action = (
    <div className="flex flex-wrap items-center gap-2">
      <select className={`${inputCls} !w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {Array.from({ length: 5 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
        <Settings2 size={16} /> BIR settings
      </button>
      <button onClick={download} disabled={busy || loading || empty || setupMissing.length > 0}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
        <Download size={16} /> {busy ? 'Building...' : 'Download Excel'}
      </button>
    </div>
  );

  return (
    <PageShell title={config.title} subtitle={config.subtitle} action={action}>
      <Toaster position="top-right" />
      {setupMissing.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800">
          Set <b>{setupMissing.join(' and ')}</b> in BIR settings before downloading this report.
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <p className="px-5 py-12 text-center text-gray-500">Loading...</p>
          : !data ? <p className="px-5 py-12 text-center text-gray-500">No data</p>
            : <Preview data={data} />}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Built from approved and paid payroll runs of {year}. The table above is the same as the downloaded workbook (same columns, formulas and totals).
        {config.note || ''}
      </p>
      {showSettings && <BirSettingsModal canEdit={canEditSettings} onClose={() => setShowSettings(false)} onSaved={() => { setShowSettings(false); load(); }} />}
    </PageShell>
  );
};

const BirReportPage = ({ config, Preview }) => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'payroll_tabs', 'tab_an')) return <Navigate to="/welcome" replace />;
  return <BirReportBody config={config} Preview={Preview} />;
};

export default BirReportPage;