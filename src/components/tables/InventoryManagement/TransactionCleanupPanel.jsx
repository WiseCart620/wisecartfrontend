import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, Search, CheckCircle2, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
const REBUILD_UNLOCK_KEY = 'stockRebuildUnlockedUntil';
const UNLOCK_TTL_MS = 30 * 60 * 1000;

const PasswordGate = ({ onUnlock, bare = false }) => {
    const [value, setValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!value || checking) return;
        setChecking(true);
        setError('');
        try {
            const res = await api.post('/admin/stock-rebuild/verify-access', { password: value });
            const data = res.data || res;
            if (data.authorized) {
                onUnlock();
            } else {
                setError(data.error || 'Incorrect password.');
                setShake(true);
                setTimeout(() => setShake(false), 400);
            }
        } catch (err) {
            const serverMessage = err?.response?.data?.error;
            setError(serverMessage || 'Could not verify password. Try again.');
            setShake(true);
            setTimeout(() => setShake(false), 400);
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={bare ? 'h-full' : 'border border-slate-200 rounded-lg p-5 bg-white h-full'}>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
            `}</style>

            <div className={`flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                <div className="w-8 h-8 rounded-md bg-[#185FA5] flex items-center justify-center shrink-0">
                    <Lock size={15} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Transaction cleanup</h3>
                    <p className="text-xs text-slate-400">Enter the access password to continue</p>
                </div>
            </div>

            <div className="max-w-sm">
                <p className="text-xs text-slate-500 mb-4 leading-relaxed border-l-2 border-amber-300 pl-2.5">
                    This tool permanently retires and purges transaction rows.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={value}
                            autoFocus
                            disabled={checking}
                            onChange={(e) => {
                                setValue(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Access password"
                            className={`w-full pl-9 pr-9 py-2.5 text-sm border rounded-md outline-none transition focus:ring-2 disabled:bg-slate-50 ${error
                                ? 'border-red-300 focus:ring-red-100'
                                : 'border-slate-200 focus:ring-[#185FA5]/15 focus:border-[#185FA5]'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={checking || !value}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#185FA5] text-white rounded-md hover:bg-[#0C447C] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <Lock size={14} />
                        {checking ? 'Verifying...' : 'Unlock panel'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const TransactionCleanupPanel = ({ onCleaned, bare = false }) => {
    const [unlocked, setUnlocked] = useState(() => {
        try {
            const expiry = sessionStorage.getItem(REBUILD_UNLOCK_KEY);
            return expiry ? Date.now() < Number(expiry) : false;
        } catch {
            return false;
        }
    });
    const [scanning, setScanning] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [purging, setPurging] = useState(false);
    const [dryRunResult, setDryRunResult] = useState(null);
    const [deletedCount, setDeletedCount] = useState(null);
    const [countError, setCountError] = useState(false);

    const loadDeletedCount = useCallback(async () => {
        setCountError(false);
        try {
            const res = await api.get('/transactions/cleanup/deleted-count');
            const count = res.data?.count;
            if (typeof count !== 'number') {
                console.error('Unexpected response shape:', res);
                setCountError(true);
                setDeletedCount(null);
                return;
            }
            setDeletedCount(count);
        } catch (err) {
            console.error('Failed to load deleted count', err);
            setCountError(true);
            setDeletedCount(null);
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
            setDryRunResult(res.data);
            if (!res.data?.groupsWithDuplicates) {
                toast.success('No duplicate sale transactions found');
            } else {
                toast(`Found ${res.data.groupsWithDuplicates} sale(s) with duplicate transactions`, { icon: '⚠️' });
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
            toast.success(`Fixed: retired ${res.data?.rowsToRetire} duplicate transaction(s)`);
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
            toast.success(res.data?.message || `Permanently deleted ${res.data?.purgedCount} transaction(s)`);
            await loadDeletedCount();
            if (onCleaned) onCleaned();
        } catch (err) {
            console.error('Purge failed', err);
            toast.error('Failed to purge deleted transactions');
        } finally {
            setPurging(false);
        }
    };

    const handleUnlock = () => {
        try {
            sessionStorage.setItem(REBUILD_UNLOCK_KEY, String(Date.now() + UNLOCK_TTL_MS));
        } catch {
        }
        setUnlocked(true);
    };

    const handleRelock = () => {
        try {
            sessionStorage.removeItem(REBUILD_UNLOCK_KEY);
        } catch { }
        setUnlocked(false);
    };

    if (!unlocked) {
        return <PasswordGate onUnlock={handleUnlock} bare={bare} />;
    }

    return (
        <div className={bare ? 'h-full' : 'border border-slate-200 rounded-lg p-5 bg-white h-full'}>
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Transaction cleanup</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Find and retire duplicate sale transaction rows, then permanently purge old soft-deleted records.
                    </p>
                </div>
                <button
                    onClick={handleRelock}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
                >
                    <Lock size={12} /> Lock
                </button>
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
                            {countError && (
                                <span className="ml-1 font-medium text-red-600">
                                    Could not load count — check backend is deployed with the cleanup endpoints.
                                </span>
                            )}
                            {!countError && deletedCount !== null && (
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