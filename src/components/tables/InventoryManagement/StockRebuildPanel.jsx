import React, { useState, useMemo } from 'react';
import {
    RefreshCw, AlertTriangle, Building, Store, Layers,
    Search, ChevronDown, CheckCircle2, XCircle, Clock, ShieldAlert, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

// ---- helpers -------------------------------------------------------------

const SCOPES = [
    { id: 'WAREHOUSE', label: 'Warehouse', icon: Building },
    { id: 'BRANCH', label: 'Branch', icon: Store },
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

const MultiSelect = ({ label, values, onChange, options, getLabel, getId, placeholder }) => {
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
        return options.filter((o) => getLabel(o).toLowerCase().includes(q));
    }, [options, query, getLabel]);

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

// ---- results table ---------------------------------------------------------

const StatusBadge = ({ status }) => {
    if (status === 'RUNNING') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <RefreshCw size={11} className="animate-spin" /> Running
            </span>
        );
    }
    if (status === 'ERROR') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                <XCircle size={11} /> Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={11} /> Rebuilt
        </span>
    );
};

const ResultsTable = ({ rows }) => {
    if (rows.length === 0) return null;
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty Before → After</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Retired</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{r.productName}</td>
                                <td className="px-3 py-2 text-gray-600">{r.variationName}</td>
                                <td className="px-3 py-2 text-gray-600">
                                    <span className="inline-flex items-center gap-1">
                                        {r.locationType === 'Warehouse' ? <Building size={12} /> : <Store size={12} />}
                                        {r.locationName}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-700">
                                    {r.qtyBefore ?? '—'} → <span className="font-semibold text-[#0C447C]">{r.qtyAfter ?? '—'}</span>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">{r.retired ?? '—'}</td>
                                <td className="px-3 py-2 text-center">
                                    <StatusBadge status={r.status} />
                                    {r.status === 'ERROR' && r.error && (
                                        <div className="text-[10px] text-red-500 mt-0.5 max-w-[160px] truncate" title={r.error}>
                                            {r.error}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ---- main component --------------------------------------------------------

let rowCounter = 0;

const StockRebuildPanel = ({ products = [], warehouses = [], branches = [], onRebuilt }) => {
    const [scope, setScope] = useState('WAREHOUSE');
    const [warehouseIds, setWarehouseIds] = useState([]);
    const [branchIds, setBranchIds] = useState([]);
    const [productIds, setProductIds] = useState([]);
    const [includeVariations, setIncludeVariations] = useState(true);
    const [selectedVariationKeys, setSelectedVariationKeys] = useState([]);
    const [running, setRunning] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]);

    const needsWarehouse = scope === 'WAREHOUSE' || scope === 'BOTH';
    const needsBranch = scope === 'BRANCH' || scope === 'BOTH';

    const selectedProducts = products.filter((p) => productIds.map(String).includes(String(p.id)));

    const anyHasVariations = selectedProducts.some((p) => (p.variations || []).length > 0);
    const allSelectedVariations = useMemo(() => {
        const list = [];
        for (const p of selectedProducts) {
            for (const v of p.variations || []) {
                list.push({
                    key: `${p.id}_${v.id}`,
                    productId: p.id,
                    productName: productLabel(p),
                    variationId: v.id,
                    variationLabel: getVariationLabel(v),
                    raw: v,
                });
            }
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productIds, products]);

    const canRun =
        productIds.length > 0 &&
        (!needsWarehouse || warehouseIds.length > 0) &&
        (!needsBranch || branchIds.length > 0);

    const resetTargets = (nextScope) => {
        setScope(nextScope);
        if (nextScope === 'WAREHOUSE') setBranchIds([]);
        if (nextScope === 'BRANCH') setWarehouseIds([]);
    };


    const buildProductVariationTargets = () => {
        const targets = [];
        for (const p of selectedProducts) {
            targets.push({ productId: p.id, productName: productLabel(p), variationId: null, variationName: 'Base' });
        }

        if (includeVariations) {
            if (selectedVariationKeys.length > 0) {
                const keySet = new Set(selectedVariationKeys.map(String));
                for (const v of allSelectedVariations) {
                    if (keySet.has(String(v.key))) {
                        targets.push({
                            productId: v.productId,
                            productName: v.productName,
                            variationId: v.variationId,
                            variationName: v.variationLabel,
                        });
                    }
                }
            } else {
                for (const p of selectedProducts) {
                    for (const v of p.variations || []) {
                        targets.push({
                            productId: p.id,
                            productName: productLabel(p),
                            variationId: v.id,
                            variationName: getVariationLabel(v),
                        });
                    }
                }
            }
        }
        return targets;
    };

    const buildOperations = () => {
        const pvTargets = buildProductVariationTargets();
        const ops = [];

        if (needsWarehouse) {
            for (const pv of pvTargets) {
                for (const wId of warehouseIds) {
                    const wh = warehouses.find((w) => String(w.id) === String(wId));
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
            for (const pv of pvTargets) {
                for (const bId of branchIds) {
                    const br = branches.find((b) => String(b.id) === String(bId));
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
    }, [productIds, warehouseIds, branchIds, scope, includeVariations, selectedVariationKeys, products]);

    const runRebuild = async () => {
        setConfirmOpen(false);
        const ops = buildOperations();
        if (ops.length === 0) return;

        setRunning(true);
        setResults(ops.map((op) => ({
            id: ++rowCounter,
            productName: op.productName,
            variationName: op.variationName,
            locationType: op.locationType,
            locationName: op.locationName,
            status: 'RUNNING',
            qtyBefore: null,
            qtyAfter: null,
            retired: null,
            error: null,
        })));
        setProgress({ done: 0, total: ops.length });

        const CONCURRENCY = 3;
        let cursor = 0;
        let successCount = 0;
        let failCount = 0;

        const runOne = async (op, rowId) => {
            try {
                const params = new URLSearchParams();
                params.append('productId', op.productId);
                if (op.variationId) params.append('variationId', op.variationId);
                params.append(op.locationParam, op.locationId);

                const res = await api.post(`${op.endpoint}?${params.toString()}`, {});
                const data = res.data || res;

                setResults((prev) => prev.map((r) => r.id === rowId ? {
                    ...r,
                    status: 'DONE',
                    qtyBefore: data.storedQuantityBefore,
                    qtyAfter: data.storedQuantityAfter,
                    retired: data.retiredOldTransactions,
                } : r));
                successCount++;
            } catch (err) {
                setResults((prev) => prev.map((r) => r.id === rowId ? {
                    ...r,
                    status: 'ERROR',
                    error: err?.message || 'Rebuild failed',
                } : r));
                failCount++;
            } finally {
                setProgress((p) => ({ ...p, done: p.done + 1 }));
            }
        };

        const rowIds = results.length === ops.length ? null : null; // placeholder, real ids captured below

        // Need the actual row ids we just set — re-derive by index since order matches
        setResults((prev) => {
            const withIds = prev.map((r, i) => ({ ...r, _opIndex: i }));
            return withIds;
        });

        // Run with limited concurrency, matching ops[i] to the row created at the same index
        let opsWithRowIds = [];
        setResults((prev) => {
            opsWithRowIds = ops.map((op, i) => ({ op, rowId: prev[i].id }));
            return prev;
        });

        // Wait a microtask so state above committed (React batches synchronously here, safe in practice)
        await Promise.resolve();

        const worker = async () => {
            while (cursor < opsWithRowIds.length) {
                const idx = cursor++;
                const { op, rowId } = opsWithRowIds[idx];
                await runOne(op, rowId);
            }
        };

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ops.length) }, () => worker()));

        setRunning(false);
        if (failCount === 0) {
            toast.success(`Rebuilt ${successCount} record${successCount !== 1 ? 's' : ''} successfully`);
        } else {
            toast.error(`${successCount} succeeded, ${failCount} failed — check the table for details`);
        }
        if (onRebuilt) onRebuilt();
    };

    return (
        <div className="space-y-6">
            {/* Warning banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">This tool rewrites stock history.</p>
                    <p className="mt-0.5 text-amber-700">
                        It permanently retires existing transactions for each selected product at each selected location and
                        regenerates them from the source Sale / Delivery / Inventory records. Review the results table
                        after running before trusting the numbers downstream.
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
                            placeholder="Select one or more products..."
                        />
                    </div>

                    {anyHasVariations && (
                        <>
                            <div className="sm:col-span-2 flex items-center gap-2 -mt-1">
                                <input
                                    id="includeVariations"
                                    type="checkbox"
                                    checked={includeVariations}
                                    onChange={(e) => {
                                        setIncludeVariations(e.target.checked);
                                        if (!e.target.checked) setSelectedVariationKeys([]);
                                    }}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="includeVariations" className="text-xs text-gray-600">
                                    Include variations of the selected products
                                </label>
                            </div>

                            {includeVariations && (
                                <div className="sm:col-span-2">
                                    <MultiSelect
                                        label="Which variations (leave empty to include ALL variations)"
                                        values={selectedVariationKeys}
                                        onChange={setSelectedVariationKeys}
                                        options={allSelectedVariations}
                                        getId={(v) => v.key}
                                        getLabel={(v) => `${v.variationLabel} — ${v.productName}`}
                                        placeholder="All variations (default) — or pick specific ones..."
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
                        <MultiSelect
                            label="Branches"
                            values={branchIds}
                            onChange={setBranchIds}
                            options={branches}
                            getId={(b) => b.id}
                            getLabel={(b) => b.branchName}
                            placeholder="Select one or more branches..."
                        />
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
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-[#185FA5] h-1.5 transition-all"
                            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Clock size={14} /> Results ({results.filter(r => r.status === 'DONE').length} rebuilt
                        {results.some(r => r.status === 'ERROR') && `, ${results.filter(r => r.status === 'ERROR').length} failed`})
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
                            {needsWarehouse && <li>• {warehouseIds.length} warehouse{warehouseIds.length !== 1 ? 's' : ''}</li>}
                            {needsBranch && <li>• {branchIds.length} branch{branchIds.length !== 1 ? 'es' : ''}</li>}
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