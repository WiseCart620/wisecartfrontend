import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, Search, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

const TransactionCleanupPanel = ({ onCleaned }) => {
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [deletedCount, setDeletedCount] = useState(null);

  const loadDeletedCount = useCallback(async () => {
    try {
      const res = await api.get('/transactions/cleanup/deleted-count');
      setDeletedCount(res.count ?? 0);
    } catch (err) {
      console.error('Failed to load deleted count', err);
    }
  }, []);

  useEffect(() => {
    loadDeletedCount();
  }, [loadDeletedCount]);

  const handleScan = async () => {
    setScanning(true);
    setDryRunResult(null);
    try {
      const res = await api.post('/transactions/cleanup/duplicate-sales?dryRun=true');
      setDryRunResult(res);
      if (!res.groupsWithDuplicates) {
        toast.success('No duplicate sale transactions found');
      } else {
        toast(`Found ${res.groupsWithDuplicates} sale(s) with duplicate transactions`, { icon: '⚠️' });
      }
    } catch (err) {
      console.error('Scan failed', err);
      toast.error('Failed to scan for duplicates');
    } finally {
      setScanning(false);
    }
  };

  const handleFix = async () => {
    if (!dryRunResult || !dryRunResult.groupsWithDuplicates) return;
    if (!window.confirm(
      `This will soft-delete ${dryRunResult.rowsToRetire} duplicate transaction row(s) across ${dryRunResult.groupsWithDuplicates} sale(s). ` +
      `The most recent transaction per sale/product is kept as active; older ones are marked deleted (recoverable, not erased). Continue?`
    )) return;

    setFixing(true);
    try {
      const res = await api.post('/transactions/cleanup/duplicate-sales?dryRun=false');
      toast.success(`Fixed: retired ${res.rowsToRetire} duplicate transaction(s)`);
      setDryRunResult(null);
      await loadDeletedCount();
      if (onCleaned) onCleaned();
    } catch (err) {
      console.error('Fix failed', err);
      toast.error('Failed to fix duplicates');
    } finally {
      setFixing(false);
    }
  };

  const handlePurge = async () => {
    if (!deletedCount) return;
    if (!window.confirm(
      `This will PERMANENTLY delete ${deletedCount} soft-deleted transaction row(s) from the database. ` +
      `This cannot be undone — these are already excluded from reports and totals, this only removes them from storage. Continue?`
    )) return;

    setPurging(true);
    try {
      const res = await api.delete('/transactions/cleanup/purge-deleted');
      toast.success(res.message || `Permanently deleted ${res.purgedCount} transaction(s)`);
      await loadDeletedCount();
      if (onCleaned) onCleaned();
    } catch (err) {
      console.error('Purge failed', err);
      toast.error('Failed to purge deleted transactions');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Transaction cleanup</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Find and retire duplicate sale transaction rows, then permanently purge old soft-deleted records.
        </p>
      </div>

      {/* Step 1: Scan + Fix duplicates */}
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-800">1. Duplicate sale transactions</p>
            <p className="text-xs text-gray-500">Scans active SALE transactions for sales with more than one active row per product.</p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Search size={14} className={scanning ? 'animate-pulse' : ''} />
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {dryRunResult && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {dryRunResult.groupsWithDuplicates > 0 ? (
              <>
                <div className="flex items-center gap-2 text-amber-700 text-sm mb-2">
                  <AlertTriangle size={16} />
                  <span>
                    {dryRunResult.groupsWithDuplicates} sale(s) affected, {dryRunResult.rowsToRetire} row(s) would be retired
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1 text-gray-500">Reference</th>
                        <th className="text-left px-2 py-1 text-gray-500">Product</th>
                        <th className="text-left px-2 py-1 text-gray-500">Active rows</th>
                        <th className="text-left px-2 py-1 text-gray-500">Keeping</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunResult.details.map((d, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1">{d.referenceNumber}</td>
                          <td className="px-2 py-1">{d.productName}</td>
                          <td className="px-2 py-1">{d.totalActiveBefore}</td>
                          <td className="px-2 py-1">#{d.keptTransactionId} ({d.keptAction})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleFix}
                  disabled={fixing}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {fixing ? 'Fixing...' : `Fix ${dryRunResult.rowsToRetire} duplicate row(s)`}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 size={16} />
                No duplicates found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Purge soft-deleted */}
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-800">2. Purge soft-deleted transactions</p>
            <p className="text-xs text-gray-500">
              Permanently removes transactions already marked as deleted (from deletions, cancellations, or the fix above).
              {deletedCount !== null && (
                <span className="ml-1 font-medium text-gray-700">
                  Currently {deletedCount} soft-deleted row(s) in the database.
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handlePurge}
            disabled={purging || !deletedCount}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-300"
          >
            <Trash2 size={14} />
            {purging ? 'Purging...' : 'Purge permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionCleanupPanel;