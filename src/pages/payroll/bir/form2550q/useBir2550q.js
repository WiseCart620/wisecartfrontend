import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';

// The api wrapper adds the /api prefix.
const BASE = '/bir/2550q';

// api.get/put/post take only (endpoint, data), so query strings go in the URL.
const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

// api returns { success, data: <backend body>, status } or { success:false, error, status }.
const unwrap = (res) => {
  if (res && res.success === false) {
    const err = new Error(res.error || res.message || 'Request failed');
    err.silent = true; // api.js already showed a toast for this
    throw err;
  }
  const body = res && res.data && res.data.success !== undefined ? res.data : res;
  if (body && body.success === false) throw new Error(body.message || body.error || 'Request failed');
  return body && body.data !== undefined ? body.data : null;
};

const report = (e) => {
  if (!e?.silent) toast.error(e?.message || 'Something went wrong');
};

const currentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

export default function useBir2550q(companyId) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(currentQuarter());
  const [amended, setAmended] = useState(false);
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const coId = companyId ? { companyId } : {};

  const params = useCallback(
    () => ({ year, quarter, amended, ...(companyId ? { companyId } : {}) }),
    [year, quarter, amended, companyId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ret, yrs] = await Promise.all([
        api.get(`${BASE}/return${qs(params())}`),
        api.get(`${BASE}/years${qs({ year, ...(companyId ? { companyId } : {}) })}`),
      ]);
      setData(unwrap(ret));
      setOverview(unwrap(yrs) || []);
    } catch (e) {
      report(e);
    } finally {
      setLoading(false);
    }
  }, [params, year, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs a write, reloads the return, and reports the result.
  const act = useCallback(
    async (fn, okMessage) => {
      setSaving(true);
      try {
        const out = await fn();
        const result = unwrap(out);
        if (okMessage) toast.success(okMessage);
        await load();
        return result === null || result === undefined ? true : result;
      } catch (e) {
        report(e);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const key = { taxYear: year, quarter, amendedReturn: amended };

  return {
    year, setYear, quarter, setQuarter, amended, setAmended,
    data, overview, loading, saving, reload: load,

    saveForm: (form) =>
      act(() => api.put(`${BASE}/return${qs(coId)}`, { ...form, ...key }), 'Return saved'),
    fileReturn: (details) =>
      act(() => api.post(`${BASE}/return/file${qs(coId)}`, { ...details, ...key }), 'Marked as filed'),
    reopenReturn: () =>
      act(() => api.post(`${BASE}/return/reopen${qs(params())}`, {}), 'Return reopened'),

    saveTaxpayer: (t) => act(() => api.put(`${BASE}/taxpayer`, t), 'Taxpayer saved'),

    savePurchase: (p) =>
      act(
        () => (p.id ? api.put(`${BASE}/purchases/${p.id}`, p) : api.post(`${BASE}/purchases`, p)),
        'Purchase saved'
      ),
    deletePurchase: (id) => act(() => api.delete(`${BASE}/purchases/${id}`), 'Purchase deleted'),

    saveManualSale: (s) =>
      act(
        () => (s.id ? api.put(`${BASE}/manual-sales/${s.id}`, s) : api.post(`${BASE}/manual-sales`, s)),
        'Sale saved'
      ),
    deleteManualSale: (id) => act(() => api.delete(`${BASE}/manual-sales/${id}`), 'Sale deleted'),

    saveRecovered: (r) =>
      act(
        () => (r.id ? api.put(`${BASE}/recovered/${r.id}`, r) : api.post(`${BASE}/recovered`, r)),
        'Recovered receivable saved'
      ),
    deleteRecovered: (id) => act(() => api.delete(`${BASE}/recovered/${id}`), 'Recovered receivable deleted'),

    saveOverride: (o) => act(() => api.put(`${BASE}/sales-override`, o)),
    saveCreditable: (rows) =>
      act(() => api.put(`${BASE}/creditable-vat${qs(params())}`, rows), 'Creditable VAT saved'),

    exportCsv: async () => {
      try {
        const res = await api.download(`${BASE}/export${qs(params())}`);
        if (!res || !res.success) return;
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BIR-2550Q-${year}-Q${quarter}${amended ? '-amended' : ''}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        report(e);
      }
    },
  };
}