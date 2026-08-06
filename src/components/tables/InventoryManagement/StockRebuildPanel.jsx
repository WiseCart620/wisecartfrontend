import React, { useState, useMemo } from 'react';
import {
    RefreshCw, AlertTriangle, Building, Store, Layers,
    Search, ChevronDown, CheckCircle2, XCircle, Clock, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';

// ---- helpers -------------------------------------------------------------

const SCOPES = [
    { id: 'WAREHOUSE', label: 'Warehouse', icon: Building, endpoint: '/admin/stock-rebuild/warehouse' },
    { id: 'BRANCH', label: 'Branch', icon: Store, endpoint: '/admin/stock-rebuild/branch' },
    { id: 'BOTH', label: 'Warehouse + Branch', icon: Layers, endpoint: '/admin/stock-rebuild/full' },
];

const productLabel = (p) => `${p.productName || p.name || 'Unnamed'}${p.sku ? ` · ${p.sku}` : ''}`;

// A small searchable dropdown so long product/warehouse/branch lists stay usable.
const SearchSelect = ({ label, value, onChange, options, getLabel, getId, placeholder, disabled }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.find((o) => String(getId(o)) === String(value));

    const filtered = useMemo(() => {
        if (!query) return options;
        const q = query.toLowerCase();
        return options.filter((o) => getLabel(o).toLowerCase().includes(q));
    }, [options, query, getLabel]);

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg text-left transition ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-400'
                    } ${open ? 'border-[#185FA5] ring-2 ring-[#185FA5]/20' : 'border-gray-300'}`}
            >
                <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && !disabled && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
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
                    <div className="overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-gray-400 text-center">No matches</div>
                        ) : (
                            filtered.map((o) => (
                                <button
                                    key={getId(o)}
                                    type="button"
                                    onClick={() => { onChange(getId(o)); setOpen(false); setQuery(''); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#E6F1FB] transition ${String(getId(o)) === String(value) ? 'bg-[#E6F1FB] text-[#0C447C] font-medium' : 'text-gray-700'
                                        }`}
                                >
                                    {getLabel(o)}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatPair = ({ label, before, after }) => {
    const changed = before !== after;
    return (
        <div className="flex flex-col gap-0.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</span>
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-gray-400 line-through">{before ?? '—'}</span>
                <span className="text-gray-300">→</span>
                <span className={`text-base font-bold ${changed ? 'text-[#0C447C]' : 'text-gray-700'}`}>{after ?? '—'}</span>
            </div>
        </div>
    );
};

// Renders one rebuild result block (warehouse or branch shaped payload).
const ResultBlock = ({ title, icon: Icon, data }) => {
    if (!data) return null;
    if (data.error) {
        return (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                    <XCircle size={16} /> {title} failed
                </div>
                <p className="text-xs text-red-600">{data.error}</p>
            </div>
        );
    }
    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#0C447C] font-semibold text-sm mb-3">
                <Icon size={16} /> {title}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> {data.status || 'REBUILT'}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <StatPair label="Quantity" before={data.storedQuantityBefore} after={data.storedQuantityAfter} />
                {'storedReservedBefore' in data && (
                    <StatPair label="Reserved" before={data.storedReservedBefore} after={data.storedReservedAfter} />
                )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    Retired: {data.retiredOldTransactions ?? 0}
                </span>
                {'saleTransactionsRebuilt' in data && (
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Sales rebuilt: {data.saleTransactionsRebuilt}
                    </span>
                )}
                {'inventoryTransactionsRebuilt' in data && (
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Inventory tx rebuilt: {data.inventoryTransactionsRebuilt}
                    </span>
                )}
                {'deliveryTransactionsRebuilt' in data && (
                    <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Delivery tx rebuilt: {data.deliveryTransactionsRebuilt}
                    </span>
                )}
            </div>
        </div>
    );
};

// ---- main component --------------------------------------------------------

const StockRebuildPanel = ({ products = [], warehouses = [], branches = [], onRebuilt }) => {
    const [scope, setScope] = useState('WAREHOUSE');
    const [warehouseId, setWarehouseId] = useState('');
    const [branchId, setBranchId] = useState('');
    const [productId, setProductId] = useState('');
    const [variationId, setVariationId] = useState('');
    const [running, setRunning] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [history, setHistory] = useState([]);

    const selectedProduct = products.find((p) => String(p.id) === String(productId));
    const variationOptions = selectedProduct?.variations || [];

    const needsWarehouse = scope === 'WAREHOUSE' || scope === 'BOTH';
    const needsBranch = scope === 'BRANCH' || scope === 'BOTH';

    const canRun =
        !!productId &&
        (!needsWarehouse || !!warehouseId) &&
        (!needsBranch || !!branchId);

    const resetTargets = (nextScope) => {
        setScope(nextScope);
        if (nextScope === 'WAREHOUSE') setBranchId('');
        if (nextScope === 'BRANCH') setWarehouseId('');
    };

    const describeTarget = () => {
        const wh = warehouses.find((w) => String(w.id) === String(warehouseId));
        const br = branches.find((b) => String(b.id) === String(branchId));
        const parts = [];
        if (needsWarehouse && wh) parts.push(`Warehouse "${wh.warehouseName}"`);
        if (needsBranch && br) parts.push(`Branch "${br.branchName}"`);
        return parts.join(' and ');
    };

    const runRebuild = async () => {
        setConfirmOpen(false);
        setRunning(true);
        setLastResult(null);
        try {
            const params = new URLSearchParams();
            params.append('productId', productId);
            if (variationId) params.append('variationId', variationId);

            const scopeMeta = SCOPES.find((s) => s.id === scope);
            let payload;

            if (scope === 'WAREHOUSE') {
                params.append('warehouseId', warehouseId);
                const res = await api.post(`${scopeMeta.endpoint}?${params.toString()}`, {});
                payload = { warehouse: res.data || res };
            } else if (scope === 'BRANCH') {
                params.append('branchId', branchId);
                const res = await api.post(`${scopeMeta.endpoint}?${params.toString()}`, {});
                payload = { branch: res.data || res };
            } else {
                params.append('warehouseId', warehouseId);
                params.append('branchId', branchId);
                const res = await api.post(`${scopeMeta.endpoint}?${params.toString()}`, {});
                const data = res.data || res;
                payload = { warehouse: data.warehouse, branch: data.branch };
            }

            setLastResult({ scope, productName: selectedProduct ? productLabel(selectedProduct) : `Product #${productId}`, target: describeTarget(), payload, at: new Date() });
            setHistory((h) => [
                { scope, productName: selectedProduct ? productLabel(selectedProduct) : `Product #${productId}`, target: describeTarget(), at: new Date(), success: true },
                ...h,
            ].slice(0, 10));

            toast.success('Stock rebuilt successfully');
            if (onRebuilt) onRebuilt();
        } catch (err) {
            console.error('Rebuild failed', err);
            toast.error(err?.message || 'Rebuild failed');
            setHistory((h) => [
                { scope, productName: selectedProduct ? productLabel(selectedProduct) : `Product #${productId}`, target: describeTarget(), at: new Date(), success: false },
                ...h,
            ].slice(0, 10));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Warning banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">This tool rewrites stock history.</p>
                    <p className="mt-0.5 text-amber-700">
                        It permanently retires existing transactions for the selected product at the selected location(s) and
                        regenerates them from the source Sale / Delivery / Inventory records. Run it on one product at a time and
                        double-check the result before moving to the next.
                    </p>
                </div>
            </div>

            {/* Config card */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Rebuild target</h3>

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
                        <SearchSelect
                            label="Product"
                            value={productId}
                            onChange={(id) => { setProductId(id); setVariationId(''); }}
                            options={products}
                            getId={(p) => p.id}
                            getLabel={productLabel}
                            placeholder="Select a product..."
                        />
                    </div>

                    {variationOptions.length > 0 && (
                        <div className="sm:col-span-2">
                            <SearchSelect
                                label="Variation (optional — leave blank for base product)"
                                value={variationId}
                                onChange={setVariationId}
                                options={variationOptions}
                                getId={(v) => v.id}
                                getLabel={(v) => v.variationName || v.name || `Variation #${v.id}`}
                                placeholder="Base product (no variation)"
                            />
                        </div>
                    )}

                    {needsWarehouse && (
                        <SearchSelect
                            label="Warehouse"
                            value={warehouseId}
                            onChange={setWarehouseId}
                            options={warehouses}
                            getId={(w) => w.id}
                            getLabel={(w) => w.warehouseName}
                            placeholder="Select a warehouse..."
                        />
                    )}

                    {needsBranch && (
                        <SearchSelect
                            label="Branch"
                            value={branchId}
                            onChange={setBranchId}
                            options={branches}
                            getId={(b) => b.id}
                            getLabel={(b) => b.branchName}
                            placeholder="Select a branch..."
                        />
                    )}
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={!canRun || running}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#185FA5] text-white rounded-lg hover:bg-[#0C447C] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
                        {running ? 'Rebuilding...' : 'Rebuild Stock'}
                    </button>
                </div>
            </div>

            {/* Result */}
            {lastResult && (
                <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">
                            Result — {lastResult.productName}
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                {lastResult.target} · {lastResult.at.toLocaleTimeString()}
                            </span>
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ResultBlock title="Warehouse" icon={Building} data={lastResult.payload.warehouse} />
                        <ResultBlock title="Branch" icon={Store} data={lastResult.payload.branch} />
                    </div>
                </div>
            )}

            {/* Recent activity */}
            {history.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Clock size={14} /> Recent rebuilds (this session)
                    </h3>
                    <ul className="divide-y divide-gray-100">
                        {history.map((h, i) => (
                            <li key={i} className="flex items-center justify-between py-2 text-sm">
                                <div className="flex items-center gap-2">
                                    {h.success ? (
                                        <CheckCircle2 size={14} className="text-green-600" />
                                    ) : (
                                        <XCircle size={14} className="text-red-600" />
                                    )}
                                    <span className="text-gray-700">{h.productName}</span>
                                    <span className="text-gray-400 text-xs">· {h.target}</span>
                                </div>
                                <span className="text-xs text-gray-400">{h.at.toLocaleTimeString()}</span>
                            </li>
                        ))}
                    </ul>
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
                            You're about to rebuild stock for:
                        </p>
                        <p className="text-sm font-medium text-gray-900 mb-4">
                            {selectedProduct ? productLabel(selectedProduct) : `Product #${productId}`} — {describeTarget()}
                        </p>
                        <p className="text-xs text-gray-500 mb-5">
                            Existing transactions for this product at this location will be retired and regenerated from source
                            records. This cannot be undone.
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
                                Yes, rebuild
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockRebuildPanel;