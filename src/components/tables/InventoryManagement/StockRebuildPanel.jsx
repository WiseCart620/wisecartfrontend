import React, { useState, useMemo } from 'react';
import {
    RefreshCw, AlertTriangle, Building, Store, Layers,
    Search, ChevronDown, CheckCircle2, XCircle, Clock, ShieldAlert, X, ArrowRight,
    Lock, KeyRound, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

// ---- helpers -------------------------------------------------------------
const SCOPES = [
    { id: 'BOTH', label: 'Warehouse + Branch', icon: Layers },
];

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

const MultiSelect = ({ label, values, onChange, options, getLabel, getSearchText, getId, placeholder }) => {
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
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg text-left transition bg-white hover:border-gray-400 ${open ? 'border-[#185FA5] ring-2 ring-[#185FA5]/20' : 'border-gray-300'
                    }`}
            >
                <span className={values.length ? 'text-gray-900' : 'text-gray-400'}>
                    {values.length === 0
                        ? placeholder
                        : values.length === 1
                            ? getLabel(options.find((o) => String(getId(o)) === String(values[0])) || {})
                            : `${values.length} selected`}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {values.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {values.slice(0, 6).map((id) => {
                        const opt = options.find((o) => String(getId(o)) === String(id));
                        if (!opt) return null;
                        return (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F1FB] text-[#0C447C] text-xs font-medium"
                            >
                                {getLabel(opt)}
                                <button type="button" onClick={() => toggle(id)} className="hover:text-red-600">
                                    <X size={11} />
                                </button>
                            </span>
                        );
                    })}
                    {values.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                            +{values.length - 6} more
                        </span>
                    )}
                </div>
            )}

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
                    <div className="relative border-b border-gray-100">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-2 py-2 text-sm outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50 text-xs">
                        <button type="button" onClick={selectAllFiltered} className="text-[#185FA5] font-medium hover:underline">
                            Select all {query ? 'matching' : ''}
                        </button>
                        <button type="button" onClick={clearAll} className="text-gray-500 hover:underline">
                            Clear
                        </button>
                    </div>
                    <div className="overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-gray-400 text-center">No matches</div>
                        ) : (
                            filtered.map((o) => {
                                const id = getId(o);
                                const checked = selectedSet.has(String(id));
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => toggle(id)}
                                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-[#E6F1FB] transition ${checked ? 'bg-[#E6F1FB] text-[#0C447C] font-medium' : 'text-gray-700'
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


const PasswordGate = ({ onUnlock }) => {
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
        <div className="flex items-center justify-center py-16">
            <div
                className={`w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-7 text-center ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
                    }`}
            >
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-6px); }
                        40%, 80% { transform: translateX(6px); }
                    }
                `}</style>

                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#E6F1FB] flex items-center justify-center">
                    <Lock size={20} className="text-[#185FA5]" />
                </div>

                <h3 className="text-base font-semibold text-gray-900">Restricted panel</h3>
                <p className="text-sm text-gray-500 mt-1 mb-5">
                    Stock Rebuild permanently rewrites transaction history. Enter the access password to continue.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                            className={`w-full pl-9 pr-9 py-2.5 text-sm border rounded-lg outline-none transition focus:ring-2 disabled:bg-gray-50 ${error
                                ? 'border-red-300 focus:ring-red-100'
                                : 'border-gray-300 focus:ring-[#185FA5]/20 focus:border-[#185FA5]'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 text-left -mt-1">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={checking || !value}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#185FA5] text-white rounded-lg hover:bg-[#0C447C] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                <RefreshCw size={11} className="animate-spin" /> Running
            </span>
        );
    }
    if (status === 'PENDING') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Queued
            </span>
        );
    }
    if (status === 'ERROR') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <XCircle size={11} /> Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> Rebuilt
        </span>
    );
};

const LocationChip = ({ type, name }) => {
    const isWarehouse = type === 'Warehouse';
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isWarehouse ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-violet-50 text-violet-600'
                    }`}
            >
                {isWarehouse ? <Building size={12} /> : <Store size={12} />}
            </span>
            <span className="text-gray-700">{name}</span>
        </span>
    );
};

const QtyDelta = ({ before, after }) => {
    if (before === null || after === null || before === undefined || after === undefined) {
        return <span className="text-gray-300 tabular-nums">—</span>;
    }
    const diff = after - before;
    const diffColor = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400';
    return (
        <div className="flex items-center justify-end gap-2 tabular-nums">
            <span className="text-gray-400">{before}</span>
            <ArrowRight size={11} className="text-gray-300 shrink-0" />
            <span className="font-semibold text-gray-900">{after}</span>
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
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-5 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs">
                <span className="font-medium text-gray-500">{rows.length} total</span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {doneCount} rebuilt
                </span>
                {errorCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {errorCount} failed
                    </span>
                )}
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> {pendingCount} in queue
                    </span>
                )}
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 440px)' }}>
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-white border-b border-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Variation</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Quantity</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Retired</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr
                                key={r.id}
                                className={`border-b border-gray-100 last:border-0 transition-colors ${r.status === 'PENDING' ? 'opacity-45' : 'hover:bg-[#F7FAFD]'
                                    } ${r.status === 'ERROR' ? 'bg-red-50/40' : ''}`}
                            >
                                <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{r.productName}</td>
                                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.variationName}</td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                    <LocationChip type={r.locationType} name={r.locationName} />
                                </td>
                                <td className="px-4 py-2.5">
                                    <QtyDelta before={r.qtyBefore} after={r.qtyAfter} />
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{r.retired ?? '—'}</td>
                                <td className="px-4 py-2.5">
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
    return (
        <div className="border border-[#185FA5]/20 bg-[#E6F1FB] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#0C447C] mb-2">
                Branch queue — processed one at a time, auto-advancing
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
                {queue.map((b, i) => {
                    const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
                    return (
                        <React.Fragment key={b.locationId}>
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${state === 'done'
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : state === 'active'
                                        ? 'bg-[#185FA5] border-[#185FA5] text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-400'
                                    }`}
                            >
                                {state === 'done' && <CheckCircle2 size={11} />}
                                {state === 'active' && <RefreshCw size={11} className="animate-spin" />}
                                {b.locationName}
                                {state !== 'pending' && (
                                    <span className="opacity-80">
                                        ({b.done}/{b.total})
                                    </span>
                                )}
                            </span>
                            {i < queue.length - 1 && <ArrowRight size={12} className="text-gray-300 shrink-0" />}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// ---- main component --------------------------------------------------------

let rowCounter = 0;

const PRODUCT_DETAIL_ENABLED = false;
const PRODUCT_DETAIL_ENDPOINT = (id) => `/admin/products/${id}`;
const StockRebuildPanel = ({ products = [], warehouses = [], branches = [], onRebuilt }) => {
    const [unlocked, setUnlocked] = useState(false);
    const [scope, setScope] = useState('BOTH');
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

    // Branch auto-advance queue: [{ locationId, locationName, done, total }]
    const [branchQueue, setBranchQueue] = useState([]);
    const [activeBranchIndex, setActiveBranchIndex] = useState(-1);

    // On-demand full-product cache (id -> product with variations populated).
    // The `products` prop is often a lightweight list response that omits
    // variations; when PRODUCT_DETAIL_ENABLED is true this fills the gap for
    // whichever products get selected. Disabled by default (see above) since
    // there's no working detail endpoint yet — products without variations
    // already present in the `products` prop will just be treated as
    // variation-less until this is turned back on.
    const [productDetailCache, setProductDetailCache] = useState({});
    const [loadingVariationsFor, setLoadingVariationsFor] = useState(new Set());

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

    const resetTargets = (nextScope) => {
        setScope(nextScope);
        if (nextScope === 'WAREHOUSE') setBranchIds([]);
        if (nextScope === 'BRANCH') setWarehouseIds([]);
    };

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

    // Warehouse lookup maps (avoid O(n) .find() inside loops)
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

    // Builds ops as: [ all warehouse ops ] then [ branch 1's ops, branch 2's ops, ... ]
    // Branches are ALWAYS processed one fully-completed branch at a time — no interleaving.
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

    const runRebuild = async () => {
        setConfirmOpen(false);
        const ops = buildOperations();
        if (ops.length === 0) return;

        // Build the branch queue for the banner (branch ops only, in the order they'll run)
        const queue = [];
        {
            let current = null;
            for (const op of ops) {
                if (op.locationType !== 'Branch') continue;
                if (!current || String(current.locationId) !== String(op.locationId)) {
                    current = { locationId: op.locationId, locationName: op.locationName, done: 0, total: 0 };
                    queue.push(current);
                }
                current.total++;
            }
        }
        setBranchQueue(queue);
        setActiveBranchIndex(queue.length > 0 ? 0 : -1);

        setRunning(true);
        setProgress({ done: 0, total: ops.length });

        let successCount = 0;
        let failCount = 0;
        let currentBranchQueueIdx = queue.length > 0 ? 0 : -1;

        // Generate row ids up front so ops[i] always maps to ids[i], regardless of
        // React's async state batching.
        const ids = ops.map(() => ++rowCounter);
        setResults(
            ops.map((op, i) => ({
                id: ids[i],
                productName: op.productName,
                variationName: op.variationName,
                locationType: op.locationType,
                locationName: op.locationName,
                status: 'PENDING',
                qtyBefore: null,
                qtyAfter: null,
                retired: null,
                error: null,
            }))
        );

        const updateRow = (rowId, patch) => {
            setResults((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
        };

        const runOne = async (op, rowId) => {
            updateRow(rowId, { status: 'RUNNING' });
            setCurrentOpLabel(`${op.locationName} — ${op.productName}${op.variationName !== 'Base' ? ` (${op.variationName})` : ''}`);
            try {
                const params = new URLSearchParams();
                params.append('productId', op.productId);
                if (op.variationId) params.append('variationId', op.variationId);
                params.append(op.locationParam, op.locationId);

                const res = await api.post(`${op.endpoint}?${params.toString()}`, {});
                const data = res.data || res;

                updateRow(rowId, {
                    status: 'DONE',
                    qtyBefore: data.storedQuantityBefore,
                    qtyAfter: data.storedQuantityAfter,
                    retired: data.retiredOldTransactions,
                });
                successCount++;
            } catch (err) {
                updateRow(rowId, { status: 'ERROR', error: err?.message || 'Rebuild failed' });
                failCount++;
            } finally {
                setProgress((p) => ({ ...p, done: p.done + 1 }));
            }
        };

        // Strictly sequential — one op at a time, one branch fully finished before the next starts.
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];

            if (op.locationType === 'Branch') {
                const q = queue[currentBranchQueueIdx];
                if (!q || String(q.locationId) !== String(op.locationId)) {
                    currentBranchQueueIdx++;
                    setActiveBranchIndex(currentBranchQueueIdx);
                }
            }

            await runOne(op, ids[i]);

            if (op.locationType === 'Branch' && currentBranchQueueIdx >= 0) {
                setBranchQueue((prev) => {
                    const next = [...prev];
                    if (next[currentBranchQueueIdx]) {
                        next[currentBranchQueueIdx] = {
                            ...next[currentBranchQueueIdx],
                            done: next[currentBranchQueueIdx].done + 1,
                        };
                    }
                    return next;
                });
            }
        }

        // Mark the branch queue fully past the last branch so all chips show "done"
        setActiveBranchIndex(queue.length);

        setRunning(false);
        setCurrentOpLabel('');
        if (failCount === 0) {
            toast.success(`Rebuilt ${successCount} record${successCount !== 1 ? 's' : ''} successfully`);
        } else {
            toast.error(`${successCount} succeeded, ${failCount} failed — check the table for details`);
        }
        if (onRebuilt) onRebuilt();
    };

    if (!unlocked) {
        return <PasswordGate onUnlock={() => setUnlocked(true)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">This tool rewrites stock history.</p>
                    <p className="mt-0.5 text-amber-700">
                        It permanently retires existing transactions for each selected product at each selected location and
                        regenerates them from the source Sale / Delivery / Inventory records. Branches are processed one at a
                        time, in full, before the next branch starts automatically. Review the results table after running
                        before trusting the numbers downstream.
                    </p>
                </div>
            </div>

            {/* Config card */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Rebuild targets</h3>

                {/* Scope selector */}
                <div className="flex gap-2 mb-5">
                    {SCOPES.map((s) => {
                        const Icon = s.icon;
                        const active = scope === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => resetTargets(s.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${active
                                    ? 'bg-[#185FA5] border-[#185FA5] text-white shadow-sm'
                                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon size={15} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <MultiSelect
                            label="Products"
                            values={productIds}
                            onChange={setProductIds}
                            options={products}
                            getId={(p) => p.id}
                            getLabel={productLabel}
                            getSearchText={(p) => `${p.productName || p.name || ''} ${p.sku || ''} ${p.upc || ''}`}
                            placeholder="Select one or more products (search by name, SKU, or UPC)..."
                        />
                    </div>

                    {(anyHasVariations || variationsStillLoading) && (
                        <>
                            <div className="sm:col-span-2 flex items-center gap-2 -mt-1">
                                <input
                                    id="includeVariations"
                                    type="checkbox"
                                    checked={includeVariations}
                                    disabled={variationsStillLoading && !anyHasVariations}
                                    onChange={(e) => {
                                        setIncludeVariations(e.target.checked);
                                        if (!e.target.checked) setSelectedVariationKeys([]);
                                    }}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="includeVariations" className="text-xs text-gray-600">
                                    {variationsStillLoading && !anyHasVariations
                                        ? 'Checking for variations...'
                                        : 'Include variations of the selected products'}
                                </label>
                            </div>

                            {includeVariations && anyHasVariations && (
                                <div className="sm:col-span-2">
                                    <MultiSelect
                                        label="Which variations (leave empty to include ALL variations)"
                                        values={selectedVariationKeys}
                                        onChange={setSelectedVariationKeys}
                                        options={allSelectedVariations}
                                        getId={(v) => v.key}
                                        getLabel={(v) => `${v.variationLabel} — ${v.productName}${v.sku ? ` · SKU: ${v.sku}` : ''}${v.upc ? ` · UPC: ${v.upc}` : ''}`}
                                        getSearchText={(v) => `${v.variationLabel} ${v.productName} ${v.sku} ${v.upc}`}
                                        placeholder="All variations (search by name, SKU, or UPC)..."
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
                            placeholder="Select one or more warehouses..."
                        />
                    )}

                    {needsBranch && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    id="autoAllBranches"
                                    type="checkbox"
                                    checked={autoAllBranches}
                                    onChange={(e) => {
                                        setAutoAllBranches(e.target.checked);
                                        if (e.target.checked) setBranchIds([]);
                                    }}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="autoAllBranches" className="text-xs text-gray-600">
                                    Auto-run through <span className="font-medium">all {branches.length} branches</span>, one at a time
                                </label>
                            </div>

                            {!autoAllBranches && (
                                <MultiSelect
                                    label="Branches"
                                    values={branchIds}
                                    onChange={setBranchIds}
                                    options={branches}
                                    getId={(b) => b.id}
                                    getLabel={(b) => b.branchCode ? `${b.branchName} (${b.branchCode})` : b.branchName}
                                    getSearchText={(b) => `${b.branchName || ''} ${b.branchCode || ''}`}
                                    placeholder="Select one or more branches (search by name or branch code)..."
                                />
                            )}

                            {(autoAllBranches || branchIds.length > 1) && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Branches always run one at a time, fully, {autoAllBranches ? 'in list order' : 'in the order selected'} —
                                    the next branch starts automatically when the current one finishes.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        {canRun ? `${totalOperations} rebuild operation${totalOperations !== 1 ? 's' : ''} will run` : 'Select products and at least one location'}
                    </span>
                    <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={!canRun || running}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#185FA5] text-white rounded-lg hover:bg-[#0C447C] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
                        {running ? `Rebuilding ${progress.done}/${progress.total}...` : 'Rebuild Stock'}
                    </button>
                </div>

                {running && (
                    <>
                        <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-[#185FA5] h-1.5 transition-all"
                                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                            />
                        </div>
                        {currentOpLabel && (
                            <p className="text-xs text-gray-500 mt-1.5">Now processing: {currentOpLabel}</p>
                        )}
                    </>
                )}
            </div>

            {/* Branch auto-advance queue */}
            {running && branchQueue.length > 0 && (
                <BranchQueueBanner queue={branchQueue} activeIndex={activeBranchIndex} />
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Clock size={14} /> Results
                    </h3>
                    <ResultsTable rows={results} />
                </div>
            )}

            {/* Confirm modal */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-50 rounded-full">
                                <AlertTriangle className="text-red-600" size={20} />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900">Confirm stock rebuild</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                            You're about to run <span className="font-semibold text-gray-900">{totalOperations}</span> rebuild
                            operation{totalOperations !== 1 ? 's' : ''} across:
                        </p>
                        <ul className="text-sm text-gray-700 mb-4 mt-2 space-y-1">
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
                        <p className="text-xs text-gray-500 mb-5">
                            Existing transactions for each product at each selected location will be retired and regenerated
                            from source records. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runRebuild}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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