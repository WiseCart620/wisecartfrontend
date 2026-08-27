import React, { useState, useMemo } from 'react';
import {
    RefreshCw, AlertTriangle, Building, Store, Layers,
    Search, ChevronDown, CheckCircle2, XCircle, Clock, ShieldAlert, X, ArrowRight,
    Lock, KeyRound, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

// ---- helpers -------------------------------------------------------------
const productLabel = (p) => `${p.productName || p.name || 'Unnamed'}${p.sku ? ` · ${p.sku}` : ''}`;

const getVariationLabel = (v) => {
    if (v.combinationDisplay && v.combinationDisplay.trim()) {
        return v.combinationDisplay;
    }
    if (v.attributes && typeof v.attributes === 'object' && Object.keys(v.attributes).length > 0) {
        return Object.entries(v.attributes)
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ');
    }
    if (v.variationName && v.variationName.trim()) {
        return v.variationName;
    }
    if (v.variationType && v.variationValue) {
        return `${v.variationType}: ${v.variationValue}`;
    }
    if (v.sku) {
        return `SKU: ${v.sku}`;
    }
    return `Variation #${v.id}`;
};

const MultiSelect = ({ label, values, onChange, options, getLabel, getSearchText, getId, placeholder, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const selectedSet = useMemo(() => new Set(values.map(String)), [values]);

    const filtered = useMemo(() => {
        if (!query) return options;
        const q = query.toLowerCase();
        const searchFn = getSearchText || getLabel;
        return options.filter((o) => searchFn(o).toLowerCase().includes(q));
    }, [options, query, getLabel, getSearchText]);

    const toggle = (id) => {
        const idStr = String(id);
        if (selectedSet.has(idStr)) {
            onChange(values.filter((v) => String(v) !== idStr));
        } else {
            onChange([...values, id]);
        }
    };

    const selectAllFiltered = () => {
        const ids = filtered.map(getId);
        const merged = Array.from(new Set([...values.map(String), ...ids.map(String)]));
        onChange(merged);
    };

    const clearAll = () => onChange([]);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] border rounded-md text-left transition ${disabled
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white hover:border-[#185FA5]/50'
                    } ${open ? 'border-[#185FA5] ring-2 ring-[#185FA5]/10' : 'border-slate-200'
                    }`}
            >
                <span className={values.length ? 'text-slate-900' : 'text-slate-400'}>
                    {values.length === 0
                        ? placeholder
                        : values.length === 1
                            ? getLabel(options.find((o) => String(getId(o)) === String(values[0])) || {})
                            : `${values.length} selected`}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {values.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {values.slice(0, 6).map((id) => {
                        const opt = options.find((o) => String(getId(o)) === String(id));
                        if (!opt) return null;
                        return (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E6F1FB] text-[#0C447C] text-[11px] font-medium"
                            >
                                {getLabel(opt)}
                                <button type="button" onClick={() => toggle(id)} className="hover:text-red-600">
                                    <X size={11} />
                                </button>
                            </span>
                        );
                    })}
                    {values.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">
                            +{values.length - 6} more
                        </span>
                    )}
                </div>
            )}

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-hidden flex flex-col">
                    <div className="relative border-b border-slate-100">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-2 py-2 text-sm outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-xs">
                        <button type="button" onClick={selectAllFiltered} className="text-[#185FA5] font-medium hover:underline">
                            Select all {query ? 'matching' : ''}
                        </button>
                        <button type="button" onClick={clearAll} className="text-slate-500 hover:underline">
                            Clear
                        </button>
                    </div>
                    <div className="overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">No matches</div>
                        ) : (
                            filtered.map((o) => {
                                const id = getId(o);
                                const checked = selectedSet.has(String(id));
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => toggle(id)}
                                        className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm hover:bg-[#E6F1FB] transition ${checked ? 'bg-[#E6F1FB] text-[#0C447C] font-medium' : 'text-slate-700'
                                            }`}
                                    >
                                        <input type="checkbox" readOnly checked={checked} className="pointer-events-none" />
                                        {getLabel(o)}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ---- shared password gate (single source of truth, used once by index.jsx) ----

export const PasswordGate = ({ onUnlock, bare = false }) => {
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
        <div className={bare ? 'h-full flex items-center justify-center py-12' : 'h-full flex items-center justify-center p-5'}>
            <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-6px); }
                40%, 80% { transform: translateX(6px); }
            }
        `}</style>

            <div className="w-full max-w-sm border border-slate-200 rounded-lg p-6 bg-white shadow-sm">
                <div className={`flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                    <div className="w-8 h-8 rounded-md bg-[#185FA5] flex items-center justify-center shrink-0">
                        <Lock size={15} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Stock tools</h3>
                        <p className="text-xs text-slate-400">Enter the access password to continue</p>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed text-center">
                    These tools permanently rewrite transaction history.
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
                        {checking ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                        {checking ? 'Verifying...' : 'Unlock panel'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ---- results table ---------------------------------------------------------

const StatusBadge = ({ status }) => {
    if (status === 'RUNNING') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                <RefreshCw size={11} className="animate-spin" /> Running
            </span>
        );
    }
    if (status === 'PENDING') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Queued
            </span>
        );
    }
    if (status === 'ERROR') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                <XCircle size={11} /> Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 size={11} /> Rebuilt
        </span>
    );
};

const LocationChip = ({ type, name }) => {
    const isWarehouse = type === 'Warehouse';
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isWarehouse ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-violet-50 text-violet-600'
                    }`}
            >
                {isWarehouse ? <Building size={11} /> : <Store size={11} />}
            </span>
            <span className="text-slate-700">{name}</span>
        </span>
    );
};

const QtyDelta = ({ before, after }) => {
    if (before === null || after === null || before === undefined || after === undefined) {
        return <span className="text-slate-300 tabular-nums">—</span>;
    }
    const diff = after - before;
    const diffColor = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-slate-400';
    return (
        <div className="flex items-center justify-end gap-2 tabular-nums">
            <span className="text-slate-400">{before}</span>
            <ArrowRight size={11} className="text-slate-300 shrink-0" />
            <span className="font-semibold text-slate-900">{after}</span>
            {diff !== 0 && (
                <span className={`text-[11px] font-medium ${diffColor}`}>
                    ({diff > 0 ? '+' : ''}{diff})
                </span>
            )}
        </div>
    );
};

const ResultsTable = ({ rows }) => {
    if (rows.length === 0) return null;

    const doneCount = rows.filter((r) => r.status === 'DONE').length;
    const errorCount = rows.filter((r) => r.status === 'ERROR').length;
    const pendingCount = rows.filter((r) => r.status === 'PENDING' || r.status === 'RUNNING').length;

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
                <span className="font-medium text-slate-500">{rows.length} total</span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {doneCount} rebuilt
                </span>
                {errorCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {errorCount} failed
                    </span>
                )}
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> {pendingCount} in queue
                    </span>
                )}
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Product</th>
                            <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Variation</th>
                            <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Location</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Quantity</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Retired</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.id}
                                className={`border-b border-slate-100 last:border-0 transition-colors ${r.status === 'PENDING' ? 'opacity-45' : 'hover:bg-slate-50'
                                    } ${r.status === 'ERROR' ? 'bg-red-50/40' : ''}`}
                            >
                                <td className="px-4 py-2 text-slate-900 font-medium whitespace-nowrap">{r.productName}</td>
                                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{r.variationName}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                    <LocationChip type={r.locationType} name={r.locationName} />
                                </td>
                                <td className="px-4 py-2">
                                    <QtyDelta before={r.qtyBefore} after={r.qtyAfter} />
                                </td>
                                <td className="px-4 py-2 text-right text-slate-500 tabular-nums">{r.retired ?? '—'}</td>
                                <td className="px-4 py-2">
                                    <div className="flex flex-col items-end gap-1">
                                        <StatusBadge status={r.status} />
                                        {r.status === 'ERROR' && r.error && (
                                            <span
                                                className="text-[10px] text-red-500 max-w-[180px] truncate text-right"
                                                title={r.error}
                                            >
                                                {r.error}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- branch queue banner ----------------------------------------------------

const BranchQueueBanner = ({ queue, activeIndex }) => {
    if (!queue || queue.length === 0) return null;

    const active = queue[activeIndex];
    const completed = activeIndex;
    const remaining = queue.length - activeIndex - 1;

    if (!active) {
        return (
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 size={14} /> All {queue.length} branches complete
                </p>
            </div>
        );
    }

    return (
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Branch {activeIndex + 1} of {queue.length} — {remaining} remaining
            </p>
            <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-[#185FA5] border-[#185FA5] text-white">
                    <RefreshCw size={11} className="animate-spin" />
                    {active.locationName}
                    <span className="opacity-80">({active.done}/{active.total})</span>
                </span>
                {completed > 0 && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11} /> {completed} branch{completed !== 1 ? 'es' : ''} done
                    </span>
                )}
            </div>
        </div>
    );
};

// ---- main component --------------------------------------------------------

let rowCounter = 0;

const PRODUCT_DETAIL_ENABLED = false;
const PRODUCT_DETAIL_ENDPOINT = (id) => `/admin/products/${id}`;

const StockRebuildPanel = ({ products = [], warehouses = [], branches = [], onRebuilt, bare = false }) => {
    const [scope] = useState('BOTH');
    const [warehouseIds, setWarehouseIds] = useState([]);
    const [branchIds, setBranchIds] = useState([]);
    const [autoAllBranches, setAutoAllBranches] = useState(false);
    const [productIds, setProductIds] = useState([]);
    const [includeVariations, setIncludeVariations] = useState(true);
    const [selectedVariationKeys, setSelectedVariationKeys] = useState([]);
    const [running, setRunning] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]);
    const [currentOpLabel, setCurrentOpLabel] = useState('');
    const [warningOpen, setWarningOpen] = useState(false);
    const [jobId, setJobId] = useState(null);
    const pollRef = React.useRef(null);

    const [branchQueue, setBranchQueue] = useState([]);
    const [activeBranchIndex, setActiveBranchIndex] = useState(-1);
    const [productDetailCache, setProductDetailCache] = useState({});
    const [loadingVariationsFor, setLoadingVariationsFor] = useState(new Set());

    React.useEffect(() => {
        const checkActive = async () => {
            try {
                const res = await api.get('/admin/stock-rebuild/jobs/active');
                if (res.status === 204 || !res.data) return;
                const data = res.data || res;
                if (data.jobId) {
                    setJobId(data.jobId);
                    hydrateFromJob(data);
                    startPolling(data.jobId);
                }
            } catch (err) {
                // no active job — fine
            }
        };
        checkActive();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const hydrateFromJob = (data) => {
        setRunning(data.status === 'PENDING' || data.status === 'RUNNING');
        setProgress({ done: data.doneOps, total: data.totalOps });
        setResults(
            (data.results || []).map((r) => ({
                id: ++rowCounter,
                productName: r.productName,
                variationName: r.variationName || 'Base',
                locationType: r.locationType === 'WAREHOUSE' ? 'Warehouse' : 'Branch',
                locationName: r.locationName,
                status: r.status,
                qtyBefore: r.qtyBefore,
                qtyAfter: r.qtyAfter,
                retired: r.retired,
                error: r.error,
            }))
        );
        if (data.status === 'DONE') {
            toast.success(`Rebuild finished — ${data.successCount} succeeded, ${data.failCount} failed`);
            if (onRebuilt) onRebuilt();
        }
    };

    const startPolling = (id) => {
        if (!id) {
            console.error('startPolling called with invalid id:', id);
            return;
        }
        if (pollRef.current) clearInterval(pollRef.current);
        const tick = async () => {
            try {
                const res = await api.get(`/admin/stock-rebuild/jobs/${id}`);
                const data = res.data || res;
                hydrateFromJob(data);
                if (data.status === 'DONE') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            } catch (err) {
                console.error('Job poll failed', err);
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
        tick();
        pollRef.current = setInterval(tick, 750);
    };
    React.useEffect(() => {
        if (!PRODUCT_DETAIL_ENABLED) return;

        const idsNeedingFetch = productIds.filter((id) => {
            if (productDetailCache[id]) return false;
            const fromProp = products.find((p) => String(p.id) === String(id));
            const alreadyHasVariations = fromProp && Array.isArray(fromProp.variations) && fromProp.variations.length > 0;
            return !alreadyHasVariations && !loadingVariationsFor.has(String(id));
        });

        if (idsNeedingFetch.length === 0) return;

        setLoadingVariationsFor((prev) => {
            const next = new Set(prev);
            idsNeedingFetch.forEach((id) => next.add(String(id)));
            return next;
        });

        idsNeedingFetch.forEach(async (id) => {
            try {
                const res = await api.get(PRODUCT_DETAIL_ENDPOINT(id));
                const full = res.data || res;
                setProductDetailCache((prev) => ({ ...prev, [id]: full }));
            } catch (err) {
                console.error(`Failed to load variations for product ${id}`, err);
            } finally {
                setLoadingVariationsFor((prev) => {
                    const next = new Set(prev);
                    next.delete(String(id));
                    return next;
                });
            }
        });
    }, [productIds, products]);

    const resolvedProduct = (p) => productDetailCache[p.id] || p;

    const needsWarehouse = scope === 'WAREHOUSE' || scope === 'BOTH';
    const needsBranch = scope === 'BRANCH' || scope === 'BOTH';

    const selectedProducts = products
        .filter((p) => productIds.map(String).includes(String(p.id)))
        .map(resolvedProduct);

    const anyHasVariations = selectedProducts.some((p) => (p.variations || []).length > 0);
    const variationsStillLoading = productIds.some((id) => loadingVariationsFor.has(String(id)));

    const allSelectedVariations = useMemo(() => {
        const list = [];
        for (const id of productIds) {
            const base = products.find((p) => String(p.id) === String(id));
            if (!base) continue;
            const p = resolvedProduct(base);
            for (const v of p.variations || []) {
                list.push({
                    key: `${p.id}_${v.id}`,
                    productId: p.id,
                    productName: productLabel(p),
                    variationId: v.id,
                    variationLabel: getVariationLabel(v),
                    sku: v.sku || '',
                    upc: v.upc || '',
                    raw: v,
                });
            }
        }
        return list;
    }, [productIds, products, productDetailCache]);

    const hasBranchSelection = autoAllBranches ? branches.length > 0 : branchIds.length > 0;

    const canRun =
        productIds.length > 0 &&
        (warehouseIds.length > 0 || hasBranchSelection);

    const buildProductVariationTargets = () => {
        const targets = [];

        for (const p of selectedProducts) {
            const productVariations = p.variations || [];
            const hasVariations = productVariations.length > 0;

            if (!hasVariations) {
                targets.push({ productId: p.id, productName: productLabel(p), variationId: null, variationName: 'Base' });
                continue;
            }

            if (!includeVariations) {
                targets.push({ productId: p.id, productName: productLabel(p), variationId: null, variationName: 'Base' });
                continue;
            }

            if (selectedVariationKeys.length > 0) {
                const keySet = new Set(selectedVariationKeys.map(String));
                for (const v of allSelectedVariations) {
                    if (v.productId === p.id && keySet.has(String(v.key))) {
                        targets.push({
                            productId: v.productId,
                            productName: v.productName,
                            variationId: v.variationId,
                            variationName: v.variationLabel,
                        });
                    }
                }
            } else {
                for (const v of productVariations) {
                    targets.push({
                        productId: p.id,
                        productName: productLabel(p),
                        variationId: v.id,
                        variationName: getVariationLabel(v),
                    });
                }
            }
        }
        return targets;
    };

    const warehouseMap = useMemo(() => {
        const m = new Map();
        warehouses.forEach((w) => m.set(String(w.id), w));
        return m;
    }, [warehouses]);

    const branchMap = useMemo(() => {
        const m = new Map();
        branches.forEach((b) => m.set(String(b.id), b));
        return m;
    }, [branches]);

    const buildOperations = () => {
        const pvTargets = buildProductVariationTargets();
        const ops = [];

        if (needsWarehouse) {
            for (const pv of pvTargets) {
                for (const wId of warehouseIds) {
                    const wh = warehouseMap.get(String(wId));
                    ops.push({
                        ...pv,
                        locationType: 'Warehouse',
                        locationId: wId,
                        locationName: wh?.warehouseName || `Warehouse #${wId}`,
                        endpoint: '/admin/stock-rebuild/warehouse',
                        locationParam: 'warehouseId',
                    });
                }
            }
        }

        if (needsBranch) {
            const targetBranchIds = autoAllBranches
                ? branches.map((b) => b.id)
                : branchIds;

            for (const bId of targetBranchIds) {
                const br = branchMap.get(String(bId));
                for (const pv of pvTargets) {
                    ops.push({
                        ...pv,
                        locationType: 'Branch',
                        locationId: bId,
                        locationName: br?.branchName || `Branch #${bId}`,
                        endpoint: '/admin/stock-rebuild/branch',
                        locationParam: 'branchId',
                    });
                }
            }
        }
        return ops;
    };

    const totalOperations = useMemo(() => {
        if (!canRun) return 0;
        return buildOperations().length;
    }, [productIds, warehouseIds, branchIds, scope, includeVariations, selectedVariationKeys, products, autoAllBranches, branches]);

    const pollJobToCompletion = (id, offset, batchTotal) => {
        return new Promise((resolve, reject) => {
            const tick = async () => {
                try {
                    const res = await api.get(`/admin/stock-rebuild/jobs/${id}`);
                    const data = res.data || res;

                    const batchResults = (data.results || []).map((r) => ({
                        productName: r.productName,
                        variationName: r.variationName || 'Base',
                        locationType: r.locationType === 'WAREHOUSE' ? 'Warehouse' : 'Branch',
                        locationName: r.locationName,
                        status: r.status,
                        qtyBefore: r.qtyBefore,
                        qtyAfter: r.qtyAfter,
                        retired: r.retired,
                        error: r.error,
                    }));
                    setResults((prev) => {
                        const next = [...prev];
                        for (let i = 0; i < batchResults.length; i++) {
                            const idx = offset + i;
                            if (next[idx]) next[idx] = { ...next[idx], ...batchResults[i] };
                        }
                        return next;
                    });
                    setProgress((prev) => ({
                        ...prev,
                        done: Math.min(prev.total, offset + (data.doneOps || 0)),
                    }));

                    if (data.status === 'DONE') {
                        clearInterval(interval);
                        resolve(data);
                    }
                } catch (err) {
                    clearInterval(interval);
                    reject(err);
                }
            };
            tick();
            const interval = setInterval(tick, 750);
        });
    };
    const runRebuild = async () => {
        setConfirmOpen(false);
        const ops = buildOperations();
        if (ops.length === 0) return;

        const batchMap = new Map();
        const batchOrder = [];
        for (const op of ops) {
            const key = `${op.locationType}:${op.locationId}`;
            if (!batchMap.has(key)) {
                batchMap.set(key, { locationType: op.locationType, locationId: op.locationId, locationName: op.locationName, ops: [] });
                batchOrder.push(key);
            }
            batchMap.get(key).ops.push(op);
        }
        const batches = batchOrder.map((k) => batchMap.get(k));
        const flattenedOps = batches.flatMap((b) => b.ops); // matches the order batches actually run in

        const queue = batches
            .filter((b) => b.locationType === 'Branch')
            .map((b) => ({ locationId: b.locationId, locationName: b.locationName, done: 0, total: b.ops.length }));
        setBranchQueue(queue);
        setActiveBranchIndex(queue.length > 0 ? 0 : -1);

        setRunning(true);
        setProgress({ done: 0, total: flattenedOps.length });
        setResults(
            flattenedOps.map((op) => ({
                id: ++rowCounter,
                productName: op.productName,
                variationName: op.variationName,
                locationType: op.locationType,
                locationName: op.locationName,
                status: 'PENDING', qtyBefore: null, qtyAfter: null, retired: null, error: null,
            }))
        );

        let overallDone = 0, overallSuccess = 0, overallFail = 0, branchQueueIdx = 0, opOffset = 0;

        for (const batch of batches) {
            if (batch.locationType === 'Branch') setActiveBranchIndex(branchQueueIdx);
            setCurrentOpLabel(`${batch.locationName} — ${batch.ops.length} operations`);

            const payload = batch.ops.map((op) => ({
                productId: op.productId,
                productName: op.productName,
                variationId: op.variationId,
                variationName: op.variationName,
                locationType: op.locationType === 'Warehouse' ? 'WAREHOUSE' : 'BRANCH',
                locationId: op.locationId,
                locationName: op.locationName,
            }));

            try {
                const res = await api.post('/admin/stock-rebuild/jobs', payload);
                const data = res.data || res;
                if (!data.jobId) {
                    toast.error(`Failed to start rebuild for ${batch.locationName}`);
                    overallFail += batch.ops.length;
                    opOffset += batch.ops.length;
                    continue;
                }
                setJobId(data.jobId);

                const finished = await pollJobToCompletion(data.jobId, opOffset, batch.ops.length);
                overallDone += batch.ops.length;
                overallSuccess += finished.successCount || 0;
                overallFail += finished.failCount || 0;
                setProgress((prev) => ({ ...prev, done: overallDone }));

                if (batch.locationType === 'Branch') {
                    setBranchQueue((prev) => {
                        const next = [...prev];
                        if (next[branchQueueIdx]) next[branchQueueIdx] = { ...next[branchQueueIdx], done: batch.ops.length };
                        return next;
                    });
                    branchQueueIdx++;
                }
            } catch (err) {
                toast.error(`Rebuild failed for ${batch.locationName}`);
                overallFail += batch.ops.length;
            }
            opOffset += batch.ops.length;
        }


        setActiveBranchIndex(queue.length);
        setRunning(false);
        setCurrentOpLabel('');
        if (overallFail === 0) {
            toast.success(`Rebuilt ${overallSuccess} record(s) across ${batches.length} location(s)`);
        } else {
            toast.error(`${overallSuccess} succeeded, ${overallFail} failed across ${batches.length} location(s)`);
        }
        if (onRebuilt) onRebuilt();
    };

    return (
        <div className="space-y-4">
            <div className={bare ? '' : 'border border-slate-200 rounded-lg p-5 bg-white'}>
                <div className="max-w-2xl">
                    <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-md bg-[#E6F1FB] flex items-center justify-center">
                            <Layers size={15} className="text-[#185FA5]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Rebuild targets</h3>
                            <p className="text-xs text-slate-400">Choose what to recalculate and where</p>
                        </div>
                    </div>

                    {/* Collapsible warning */}
                    <div className="rounded-md border border-amber-200 bg-amber-50 overflow-hidden mb-4">
                        <button
                            type="button"
                            onClick={() => setWarningOpen((o) => !o)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-amber-800 hover:text-amber-900 transition"
                        >
                            <span className="flex items-center gap-1.5">
                                <ShieldAlert size={13} className="text-amber-600 shrink-0" />
                                This tool rewrites stock history
                            </span>
                            <ChevronDown
                                size={12}
                                className={`text-amber-500 transition-transform shrink-0 ${warningOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {warningOpen && (
                            <p className="px-3 pb-2.5 text-[11px] text-amber-700 leading-relaxed border-t border-amber-100 pt-2">
                                It permanently retires existing transactions for each selected product at each selected location
                                and regenerates them from the source Sale / Delivery / Inventory records. Branches are processed
                                one at a time, in full, before the next branch starts automatically. Review the results table
                                after running before trusting the numbers downstream.
                            </p>
                        )}
                    </div>

                    {/* Scope indicator */}
                    <div className="inline-flex items-center gap-1.5 mb-4 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-xs font-medium text-slate-500">
                        <Layers size={12} className="text-[#185FA5]" />
                        Warehouse + Branch
                    </div>

                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <MultiSelect
                                    label="Products"
                                    values={productIds}
                                    onChange={setProductIds}
                                    options={products}
                                    getId={(p) => p.id}
                                    getLabel={productLabel}
                                    getSearchText={(p) => `${p.productName || p.name || ''} ${p.sku || ''} ${p.upc || ''}`}
                                    placeholder="Search products by name, SKU, or UPC..."
                                />
                            </div>

                            {(anyHasVariations || variationsStillLoading) && (
                                <>
                                    <div className="sm:col-span-2 flex items-center gap-2">
                                        <input
                                            id="includeVariations"
                                            type="checkbox"
                                            checked={includeVariations}
                                            disabled={variationsStillLoading && !anyHasVariations}
                                            onChange={(e) => {
                                                setIncludeVariations(e.target.checked);
                                                if (!e.target.checked) setSelectedVariationKeys([]);
                                            }}
                                            className="rounded border-slate-300"
                                        />
                                        <label htmlFor="includeVariations" className="text-xs text-slate-600">
                                            {variationsStillLoading && !anyHasVariations
                                                ? 'Checking for variations...'
                                                : 'Include variations of the selected products'}
                                        </label>
                                    </div>

                                    {includeVariations && anyHasVariations && (
                                        <div className="sm:col-span-2">
                                            <MultiSelect
                                                label="Which variations (leave empty for all)"
                                                values={selectedVariationKeys}
                                                onChange={setSelectedVariationKeys}
                                                options={allSelectedVariations}
                                                getId={(v) => v.key}
                                                getLabel={(v) => `${v.variationLabel} — ${v.productName}${v.sku ? ` · SKU: ${v.sku}` : ''}${v.upc ? ` · UPC: ${v.upc}` : ''}`}
                                                getSearchText={(v) => `${v.variationLabel} ${v.productName} ${v.sku} ${v.upc}`}
                                                placeholder="Search variations..."
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {needsWarehouse && (
                                <MultiSelect
                                    label="Warehouses"
                                    values={warehouseIds}
                                    onChange={setWarehouseIds}
                                    options={warehouses}
                                    getId={(w) => w.id}
                                    getLabel={(w) => w.warehouseName}
                                    placeholder="Select warehouses..."
                                />
                            )}

                            {needsBranch && (
                                <div>
                                    <MultiSelect
                                        label="Branches"
                                        values={branchIds}
                                        onChange={setBranchIds}
                                        options={branches}
                                        getId={(b) => b.id}
                                        getLabel={(b) => b.branchCode ? `${b.branchName} (${b.branchCode})` : b.branchName}
                                        getSearchText={(b) => `${b.branchName || ''} ${b.branchCode || ''}`}
                                        placeholder="Select branches..."
                                        disabled={autoAllBranches}
                                    />

                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            id="autoAllBranches"
                                            type="checkbox"
                                            checked={autoAllBranches}
                                            onChange={(e) => {
                                                setAutoAllBranches(e.target.checked);
                                                if (e.target.checked) setBranchIds([]);
                                            }}
                                            className="rounded border-slate-300"
                                        />
                                        <label htmlFor="autoAllBranches" className="text-xs text-slate-600">
                                            Auto-run through all {branches.length} branches, one at a time
                                        </label>
                                    </div>

                                    {(autoAllBranches || branchIds.length > 1) && (
                                        <p className="text-[11px] text-slate-400 mt-1.5">
                                            Branches always run one at a time, fully, {autoAllBranches ? 'in list order' : 'in the order selected'} —
                                            the next branch starts automatically when the current one finishes.
                                        </p>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => setConfirmOpen(true)}
                                            disabled={!canRun || running}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#185FA5] text-white rounded-md hover:bg-[#0C447C] disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
                                            {running ? `Rebuilding ${progress.done}/${progress.total}...` : 'Rebuild stock'}
                                        </button>
                                        <p className="text-xs text-slate-500 mt-2 text-center">
                                            {canRun ? `${totalOperations} rebuild operation${totalOperations !== 1 ? 's' : ''} will run` : 'Select products and at least one location'}
                                        </p>

                                        {running && (
                                            <>
                                                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="bg-[#185FA5] h-1.5 transition-all"
                                                        style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                {currentOpLabel && (
                                                    <p className="text-xs text-slate-500 mt-1.5">Now processing: {currentOpLabel}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch auto-advance queue */}
            {running && branchQueue.length > 0 && (
                <BranchQueueBanner queue={branchQueue} activeIndex={activeBranchIndex} />
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Clock size={14} /> Results
                    </h3>
                    <ResultsTable rows={results} />
                </div>
            )}

            {/* Confirm modal */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-red-50 rounded-md">
                                <AlertTriangle className="text-red-600" size={18} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Confirm stock rebuild</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                            You're about to run <span className="font-semibold text-slate-900">{totalOperations}</span> rebuild
                            operation{totalOperations !== 1 ? 's' : ''} across:
                        </p>
                        <ul className="text-sm text-slate-700 mb-3 mt-2 space-y-1">
                            <li>• {productIds.length} product{productIds.length !== 1 ? 's' : ''}{includeVariations && anyHasVariations ? ' (incl. variations)' : ''}</li>
                            {needsWarehouse && warehouseIds.length > 0 && <li>• {warehouseIds.length} warehouse{warehouseIds.length !== 1 ? 's' : ''}</li>}
                            {needsBranch && (autoAllBranches ? branches.length : branchIds.length) > 0 && (
                                <li>
                                    • {autoAllBranches ? branches.length : branchIds.length} branch
                                    {(autoAllBranches ? branches.length : branchIds.length) !== 1 ? 'es' : ''} — processed one at a
                                    time, auto-advancing
                                </li>
                            )}
                        </ul>
                        <p className="text-xs text-slate-500 mb-5">
                            Existing transactions for each product at each selected location will be retired and regenerated
                            from source records. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runRebuild}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                            >
                                Yes, rebuild all
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockRebuildPanel;