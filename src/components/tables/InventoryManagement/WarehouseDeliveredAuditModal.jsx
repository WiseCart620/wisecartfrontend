import React, { useState } from 'react';
import { X, Loader2, SearchCheck, Wrench } from 'lucide-react';
import { api } from '../../../services/api';

const WarehouseDeliveredAuditModal = ({ isOpen, onClose, onFixed }) => {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const unwrap = (res) => (res && res.data !== undefined && res.success !== undefined ? res.data : res);

  const runAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/deliveries/admin/audit-warehouse-delivered');
      setResult(unwrap(res));
    } catch (e) {
      setError(e?.message || 'Audit failed (super admin only)');
    } finally {
      setLoading(false);
    }
  };

  const runFix = async () => {
    if (!window.confirm(
      `Reset the Delivered counter on ${result.rowsWithDifference} warehouse stock row(s) ` +
      'to match the delivered deliveries?')) return;
    setFixing(true);
    setError('');
    try {
      const res = await api.post('/deliveries/admin/audit-warehouse-delivered?fix=true');
      setResult(unwrap(res));
      onFixed && onFixed();
    } catch (e) {
      setError(e?.message || 'Fix failed');
    } finally {
      setFixing(false);
    }
  };

  const close = () => { setResult(null); setError(''); onClose(); };
  const n = (v) => Number(v ?? 0).toLocaleString('en-US');
  const diff = result ? (result.warehouseStockDeliveredTotal ?? 0) - (result.deliveredDeliveriesTotal ?? 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={close}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col text-black"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold">Audit Delivered Counter</h2>
          <button onClick={close} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-auto space-y-4">
          <p className="text-sm">
            Compares each warehouse stock row's Delivered number with the delivered quantity of its
            DELIVERED deliveries. Running the audit changes nothing.
          </p>

          {error && <div className="text-sm border border-gray-300 rounded p-2">{error}</div>}

          {result && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500">Warehouse stock Delivered</div>
                  <div className="text-lg font-semibold">{n(result.warehouseStockDeliveredTotal)}</div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500">From deliveries</div>
                  <div className="text-lg font-semibold">{n(result.deliveredDeliveriesTotal)}</div>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-500">Difference</div>
                  <div className="text-lg font-semibold">{diff > 0 ? '+' : ''}{n(diff)}</div>
                </div>
              </div>

              {result.fixed && (
                <div className="text-sm border border-gray-300 rounded p-2">
                  Fixed. Counters were reset to match the deliveries.
                </div>
              )}

              {(result.rows || []).length === 0 ? (
                <p className="text-sm">No rows differ.</p>
              ) : (
                <div className="border border-gray-200 rounded overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2 text-left">Warehouse</th>
                        <th className="px-2 py-2 text-left">Product</th>
                        <th className="px-2 py-2 text-right">Stock</th>
                        <th className="px-2 py-2 text-right">Deliveries</th>
                        <th className="px-2 py-2 text-right">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5">{r.warehouse}</td>
                          <td className="px-2 py-1.5">
                            {r.product}{r.variationId ? ` (var ${r.variationId})` : ''}
                          </td>
                          <td className="px-2 py-1.5 text-right">{n(r.stockDelivered)}</td>
                          <td className="px-2 py-1.5 text-right">{n(r.fromDeliveries)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">
                            {r.difference > 0 ? '+' : ''}{n(r.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button onClick={close} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100">
            Close
          </button>
          <button onClick={runAudit} disabled={loading || fixing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <SearchCheck size={14} />}
            {result && !result.fixed ? 'Run again' : 'Run audit'}
          </button>
          {result && !result.fixed && result.rowsWithDifference > 0 && (
            <button onClick={runFix} disabled={fixing || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50">
              {fixing ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              Fix {result.rowsWithDifference} row(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseDeliveredAuditModal;