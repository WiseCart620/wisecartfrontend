import React, { useMemo, useState } from 'react';
import { X, Upload, UploadCloud, CheckCircle2, AlertTriangle, Search, Layers, Building2, Store, CalendarDays, XCircle, FileWarning, ClipboardPaste } from 'lucide-react';
import SearchableDropdown from '../common/SaleSearchableDropdown';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
    parseMassUploadReports,
    matchBranch,
    matchProductToItem,
    buildSaleItemsFromMatches,
    isReportComplete,
} from '../../utils/massUploadParser';


const getBranchCompanyId = (branch) => {
    const id = branch?.companyId ?? branch?.company?.id ?? null;
    return id === null || id === undefined ? null : String(id);
};

const MassUploadModal = ({ branches, companies, productOptions, onClose, onConfirm, onBulkUploadComplete, defaultCompanyId }) => {
    const [rawText, setRawText] = useState('');
    const [reports, setReports] = useState(null);
    const [totalDraft, setTotalDraft] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [search, setSearch] = useState('');
    const [bulkRunning, setBulkRunning] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
    const [bulkSummary, setBulkSummary] = useState(null);
    const [companyFilterId, setCompanyFilterId] = useState(defaultCompanyId ? String(defaultCompanyId) : '');

    const companyOptions = (companies || []).map(c => ({ id: c.id, name: c.companyName }));
    const scopedBranches = useMemo(() => {
        if (!companyFilterId) return branches;
        const filtered = branches.filter(b => getBranchCompanyId(b) === String(companyFilterId));
        if (filtered.length === 0 && branches.length > 0) {
            console.warn(
                '[MassUpload] Company filter matched 0 branches — check that branch.company.id (or branch.companyId) actually corresponds to the selected company id.',
                { companyFilterId, sampleBranch: branches[0] }
            );
        }
        return filtered;
    }, [branches, companyFilterId]);

    const branchOptions = scopedBranches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

    const runMatching = (branchPool) => {
        const results = parseMassUploadReports(rawText);
        const withMatches = results.map((r) => {
            const matchedRows = r.items.map(item => ({ ...item, matched: matchProductToItem(item, productOptions) }));
            const guessedBranch = matchBranch(r.siteName, branchPool);
            return {
                ...r,
                matchedRows,
                branchId: guessedBranch ? guessedBranch.id : '',
                month: r.month || new Date().getMonth() + 1,
                year: r.year || new Date().getFullYear(),
            };
        });
        setReports(withMatches);
        setActiveIndex(0);
        setBulkSummary(null);
    };

    const handleParse = () => runMatching(scopedBranches);

    const handleCompanyFilterChange = (val) => {
        setCompanyFilterId(val);
        if (reports) {
            const nextPool = val ? branches.filter(b => String(getBranchCompanyId(b)) === String(val)) : branches;
            setReports(prev => prev.map(r => {
                const guessedBranch = matchBranch(r.siteName, nextPool);
                return { ...r, branchId: guessedBranch ? guessedBranch.id : '' };
            }));
        }
    };

    const handleFileText = async (file) => {
        if (!file) return;
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            alert('PDF parsing needs a text-extraction step first. Please paste the report text instead for now.');
            return;
        }
        setRawText(await file.text());
    };

    const updateActiveReport = (patch) => {
        setReports(prev => prev.map((r, i) => (i === activeIndex ? { ...r, ...patch } : r)));
    };

    const active = reports && reports[activeIndex];

    const filteredIndexes = useMemo(() => {
        if (!reports) return [];
        const q = search.trim().toLowerCase();
        return reports
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => !q || r.siteName.toLowerCase().includes(q))
            .map(({ idx }) => idx);
    }, [reports, search]);


    const activeTotal = active
        ? active.matchedRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0)
        : 0;
    const activeQty = active
        ? active.matchedRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
        : 0;
    const handleTotalDraftChange = (e) => {
        setTotalDraft(e.target.value.replace(/[^0-9.]/g, ''));
    };

    const applyActiveTotal = () => {
        const target = parseFloat(totalDraft);
        setTotalDraft('');

        if (Number.isNaN(target) || target < 0 || activeTotal <= 0) return;

        const scale = target / activeTotal;

        const scaledRows = active.matchedRows.map(row => {
            const currentCost = Number(row.unitCost) || 0;
            const newUnitCost = Math.round(currentCost * scale * 100) / 100;
            return { ...row, unitCost: newUnitCost };
        });

        updateActiveReport({ matchedRows: scaledRows });
    };


    const matchedCount = active ? active.matchedRows.filter(r => r.matched).length : 0;
    const unmatchedCount = active ? active.matchedRows.length - matchedCount : 0;
    const activeComplete = active ? isReportComplete(active.matchedRows) : false;

    const handleConfirmSingle = () => {
        if (!active.branchId) { toast.error('Please select a branch for this report'); return; }
        if (!activeComplete) { toast.error('Every item must be matched to a product before this can be added'); return; }
        const items = buildSaleItemsFromMatches(active.matchedRows);
        onConfirm({ branchId: active.branchId, month: active.month, year: active.year, items });
    };

    const handleBulkCreate = async () => {
        const eligible = reports.filter(r => r.branchId && isReportComplete(r.matchedRows));
        const skipped = reports.length - eligible.length;

        if (!eligible.length) {
            toast.error('No branches have a selected branch and 100% matched products to upload');
            return;
        }
        const confirmMsg = `This will create ${eligible.length} separate PENDING sale${eligible.length === 1 ? '' : 's'}, one per branch` +
            (skipped ? `. ${skipped} branch(es) will be skipped (no branch match or incomplete product matches — nothing partial gets uploaded).` : '.') +
            ' Continue?';
        if (!window.confirm(confirmMsg)) return;

        setBulkRunning(true);
        setBulkSummary(null);
        setBulkProgress({ done: 0, total: eligible.length });

        const success = [];
        const failed = [];

        for (const report of eligible) {
            const items = buildSaleItemsFromMatches(report.matchedRows);
            try {
                const res = await api.post('/sales', {
                    branchId: report.branchId,
                    month: report.month,
                    year: report.year,
                    items,
                    createdBy: '',
                });
                if (res.success || res.id) {
                    success.push(report.siteName);
                } else {
                    failed.push({ siteName: report.siteName, error: res.message || 'Unknown error' });
                }
            } catch (error) {
                failed.push({
                    siteName: report.siteName,
                    error: error.response?.data?.message || error.response?.data || error.message || 'Failed',
                });
            }
            setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }));
        }

        setBulkRunning(false);
        setBulkSummary({ success, failed, skipped });

        if (success.length) toast.success(`Created ${success.length} sale(s) successfully`);
        if (failed.length) toast.error(`${failed.length} branch(es) failed — see details below`);
        if (onBulkUploadComplete) onBulkUploadComplete();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-6">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="px-5 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <UploadCloud size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Mass Upload Sale Items</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Paste a consignment sales report to auto-fill branch, products, and quantities.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>

                {!reports && (
                    <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                        {companyOptions.length > 0 && (
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                    <Building2 size={14} /> Company <span className="text-xs text-gray-400 font-normal">(optional — narrows branch matching)</span>
                                </label>
                                <SearchableDropdown
                                    options={companyOptions}
                                    value={companyFilterId}
                                    onChange={handleCompanyFilterChange}
                                    placeholder="All companies"
                                    displayKey="name" valueKey="id"
                                />
                            </div>
                        )}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                <ClipboardPaste size={14} /> Paste report text
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={12}
                                placeholder={`Site Name: 2277 ABACUS - Taft\nVendor Name: 60002182 WISECART MERCHANTS CORP.\nSALES ARTICLE GTIN ARTICLE DESCRIPTION QTY UNIT COST AMOUNT\n200000294801 S200000294801 JOURNAL NB A5 80S BLACK LEATHER 17 139.29 2,367.97`}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer text-sm text-gray-600 hover:bg-gray-50 transition">
                                <Upload size={16} />
                                Upload .txt
                                <input type="file" accept=".txt" className="hidden" onChange={(e) => handleFileText(e.target.files[0])} />
                            </label>
                            <button
                                type="button"
                                onClick={handleParse}
                                disabled={!rawText.trim()}
                                className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Parse & Preview
                            </button>
                        </div>
                    </div>
                )}

                {reports && reports.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        <FileWarning size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No sale items could be parsed from this text.</p>
                        <button type="button" onClick={() => setReports(null)} className="mt-3 text-sm text-blue-600 hover:underline">← Back to paste</button>
                    </div>
                )}

                {reports && reports.length > 0 && (
                    <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
                        {/* Left: branch list */}
                        <div className="sm:w-72 border-b sm:border-b-0 sm:border-r border-gray-200 flex flex-col bg-gray-50 min-h-0">
                            <div className="p-3 border-b border-gray-200 bg-white">
                                <div className="relative">
                                    <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search branches..."
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{reports.length} branch{reports.length === 1 ? '' : 'es'} detected</p>
                            </div>
                            {companyOptions.length > 0 && (
                                <div className="px-3 py-2 border-b border-gray-200 bg-white">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                                        <Building2 size={12} /> Company
                                    </label>
                                    <SearchableDropdown
                                        options={companyOptions}
                                        value={companyFilterId}
                                        onChange={handleCompanyFilterChange}
                                        placeholder="All companies"
                                        displayKey="name" valueKey="id"
                                    />
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto">
                                {filteredIndexes.map((idx) => {
                                    const r = reports[idx];
                                    const rMatched = r.matchedRows.filter(row => row.matched).length;
                                    const rTotal = r.matchedRows.length;
                                    const rComplete = isReportComplete(r.matchedRows);
                                    const isActive = idx === activeIndex;
                                    const hasBranch = !!r.branchId;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveIndex(idx)}
                                            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-white border-l-4 border-l-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Store size={13} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-900 truncate">{r.siteName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {!hasBranch && (
                                                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                                        <AlertTriangle size={10} /> No branch match
                                                    </span>
                                                )}
                                                {!rComplete && (
                                                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                                        <XCircle size={10} /> Incomplete
                                                    </span>
                                                )}
                                                <span className={`flex items-center gap-1 text-[11px] font-medium ${rComplete ? 'text-green-700' : 'text-gray-500'}`}>
                                                    {rComplete && <CheckCircle2 size={11} />} {rMatched}/{rTotal} matched
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="p-3 border-t border-gray-200 bg-white">
                                <button
                                    type="button"
                                    onClick={handleBulkCreate}
                                    disabled={bulkRunning}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm disabled:opacity-50"
                                >
                                    <Layers size={15} />
                                    {bulkRunning ? `Creating ${bulkProgress.done}/${bulkProgress.total}...` : `Create Sales for All (${reports.length})`}
                                </button>
                                <p className="text-[11px] text-gray-400 mt-1.5 text-center">Creates one PENDING sale per branch that has a matched branch and at least one matched product.</p>
                            </div>
                        </div>

                        {/* Right: active report detail */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
                            {bulkSummary && (
                                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                        <Layers size={16} /> Bulk upload result
                                    </div>
                                    <p className="text-sm text-green-700">{bulkSummary.success.length} sale(s) created successfully</p>
                                    {bulkSummary.skipped > 0 && (
                                        <p className="text-sm text-amber-700">{bulkSummary.skipped} branch(es) skipped (no branch match or no matched products)</p>
                                    )}
                                    {bulkSummary.failed.length > 0 && (
                                        <div className="text-sm text-red-700">
                                            <p className="font-medium">{bulkSummary.failed.length} failed:</p>
                                            <ul className="list-disc list-inside">
                                                {bulkSummary.failed.map((f, i) => <li key={i}>{f.siteName}: {f.error}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Branch {active.siteName && <span className="text-xs text-gray-400 font-normal">(detected: "{active.siteName}")</span>}
                                    </label>
                                    {companyFilterId ? (
                                        <p className="text-xs text-blue-600 mb-1.5">
                                            Filtering by company: <strong>{companyOptions.find(c => String(c.id) === String(companyFilterId))?.name || 'Unknown'}</strong> — showing only its {branchOptions.length} branch{branchOptions.length === 1 ? '' : 'es'}.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-amber-600 mb-1.5">
                                            No company filter is active — showing all {branchOptions.length} branches across every company.
                                        </p>
                                    )}
                                    <SearchableDropdown
                                        options={branchOptions}
                                        value={active.branchId}
                                        onChange={(val) => updateActiveReport({ branchId: val })}
                                        placeholder={companyFilterId ? 'Select Branch (filtered by company)' : 'Select Branch'}
                                        displayKey="name" valueKey="id" required
                                    />
                                    {!active.branchId && (
                                        <p className="text-xs text-red-500 mt-1">
                                            Could not auto-detect branch — please select manually{companyFilterId ? ' (only this company\'s branches are shown)' : ''}.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <CalendarDays size={14} /> Month
                                    </label>
                                    <input
                                        type="number" min={1} max={12}
                                        value={active.month}
                                        onChange={(e) => updateActiveReport({ month: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                                        <CalendarDays size={14} /> Year
                                    </label>
                                    <input
                                        type="number"
                                        value={active.year}
                                        onChange={(e) => updateActiveReport({ year: parseInt(e.target.value) || new Date().getFullYear() })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm flex-wrap">
                                <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={16} /> {matchedCount} matched</span>
                                {unmatchedCount > 0 && (
                                    <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle size={16} /> {unmatchedCount} not found</span>
                                )}
                                {!activeComplete && (
                                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
                                        All items must match a product before this branch can be uploaded.
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 py-2 w-8"></th>
                                            {['Article', 'GTIN', 'Description', 'Matched Product', 'Qty', 'Unit Cost'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {active.matchedRows.map((row, i) => (
                                            <tr key={i} className={row.matched ? '' : 'bg-red-50'}>
                                                <td className="px-3 py-2">
                                                    {row.matched
                                                        ? <CheckCircle2 size={15} className="text-green-600" />
                                                        : <XCircle size={15} className="text-red-500" />}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">{row.articleCode}</td>
                                                <td className="px-3 py-2 text-gray-700">{row.gtin}</td>
                                                <td className="px-3 py-2 text-gray-700">{row.description}</td>
                                                <td className="px-3 py-2">
                                                    {row.matched
                                                        ? <span className="text-green-700 font-medium">{row.matched.option.fullName}</span>
                                                        : <span className="text-red-600 italic">Not found in product list</span>}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">{row.qty}</td>
                                                <td className="px-3 py-2 text-gray-700">{Number(row.unitCost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                        <tr>
                                            <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Grand Total</td>
                                            <td className="px-3 py-2 text-sm font-bold text-gray-900">{activeQty.toLocaleString('en-US')}</td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={totalDraft !== '' ? totalDraft : activeTotal.toFixed(2)}
                                                    onFocus={() => setTotalDraft(activeTotal.toFixed(2))}
                                                    onChange={handleTotalDraftChange}
                                                    onBlur={applyActiveTotal}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                                                    disabled={active.matchedRows.length === 0}
                                                    placeholder="0.00"
                                                    className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-blue-600 text-right focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition disabled:bg-transparent disabled:border-transparent"
                                                />
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => { setReports(null); setBulkSummary(null); }} className="text-sm text-gray-600 hover:underline">
                                    ← Re-paste data
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmSingle}
                                        disabled={!activeComplete}
                                        title={!activeComplete ? 'All items must be matched before this sale can be created' : undefined}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Add {matchedCount} Item{matchedCount === 1 ? '' : 's'} to This Sale
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MassUploadModal;