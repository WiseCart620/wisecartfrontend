import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import SearchableDropdown from '../common/SaleSearchableDropdown';
import { parseMassUploadText, matchBranch, matchProductToItem } from '../../utils/massUploadParser';

const MassUploadModal = ({ branches, productOptions, onClose, onConfirm }) => {
    const [rawText, setRawText] = useState('');
    const [parsed, setParsed] = useState(null);
    const [matchedRows, setMatchedRows] = useState([]);
    const [branchId, setBranchId] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

    const handleParse = () => {
        const result = parseMassUploadText(rawText);
        setParsed(result);

        const rows = result.items.map((item) => ({ ...item, matched: matchProductToItem(item, productOptions) }));
        setMatchedRows(rows);

        const guessedBranch = matchBranch(result.siteName, branches);
        if (guessedBranch) setBranchId(guessedBranch.id);

        if (result.month) setMonth(result.month);
        if (result.year) setYear(result.year);
    };

    const handleFileText = async (file) => {
        if (!file) return;
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            alert('PDF parsing needs the pdfjs-dist package to extract text first. Please paste the text instead for now.');
            return;
        }
        setRawText(await file.text());
    };

    const matchedCount = matchedRows.filter(r => r.matched).length;
    const unmatchedCount = matchedRows.length - matchedCount;

    const handleConfirm = () => {
        if (!branchId) { alert('Please select a branch'); return; }
        const validRows = matchedRows.filter(r => r.matched);
        if (!validRows.length) { alert('No matched products to add'); return; }

        const items = validRows.map(r => ({
            productId: r.matched.option.parentProductId,
            variationId: r.matched.option.variationId || null,
            quantity: r.qty,
            unitPrice: r.unitCost ? r.unitCost.toString() : null,
        }));

        onConfirm({ branchId, month, year, items });
    };

    return (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-2 sm:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Mass Upload Sale Items</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                    {!parsed && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Paste the sales data below (Site Name, Vendor Name, and the article table)
                                </label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    rows={12}
                                    placeholder={`Site Name: 2277 ABACUS - Taft\nVendor Name: 60002182 WISECART MERCHANTS CORP.\nSALES ARTICLE GTIN ARTICLE DESCRIPTION QTY UNIT COST AMOUNT\n200000294801 S200000294801 JOURNAL NB A5 80S BLACK LEATHER 17 139.29 2,367.97`}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer text-sm text-gray-600 hover:bg-gray-50">
                                    <Upload size={16} />
                                    Upload .txt / .pdf
                                    <input type="file" accept=".txt,.pdf" className="hidden" onChange={(e) => handleFileText(e.target.files[0])} />
                                </label>
                                <button
                                    type="button"
                                    onClick={handleParse}
                                    disabled={!rawText.trim()}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                                >
                                    Parse & Preview
                                </button>
                            </div>
                        </>
                    )}

                    {parsed && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Branch {parsed.siteName && <span className="text-xs text-gray-400">(detected: "{parsed.siteName}")</span>}
                                    </label>
                                    <SearchableDropdown
                                        options={branchOptions}
                                        value={branchId}
                                        onChange={setBranchId}
                                        placeholder="Select Branch"
                                        displayKey="name" valueKey="id" required
                                    />
                                    {!branchId && <p className="text-xs text-red-500 mt-1">Could not auto-detect branch — please select manually.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Month {parsed.month && <span className="text-xs text-gray-400">(detected)</span>}
                                    </label>
                                    <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Year {parsed.year && <span className="text-xs text-gray-400">(detected)</span>}
                                    </label>
                                    <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={16} /> {matchedCount} matched</span>
                                {unmatchedCount > 0 && <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={16} /> {unmatchedCount} not found</span>}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {['Article', 'GTIN', 'Description', 'Matched Product', 'Qty', 'Unit Cost'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {matchedRows.map((row, i) => (
                                            <tr key={i} className={row.matched ? '' : 'bg-red-50'}>
                                                <td className="px-3 py-2">{row.articleCode}</td>
                                                <td className="px-3 py-2">{row.gtin}</td>
                                                <td className="px-3 py-2">{row.description}</td>
                                                <td className="px-3 py-2">
                                                    {row.matched
                                                        ? <span className="text-green-700 font-medium">{row.matched.option.fullName}</span>
                                                        : <span className="text-red-600 italic">Not found in product list</span>}
                                                </td>
                                                <td className="px-3 py-2">{row.qty}</td>
                                                <td className="px-3 py-2">{row.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between pt-2">
                                <button type="button" onClick={() => { setParsed(null); setMatchedRows([]); }} className="px-4 py-2 text-sm text-gray-600 hover:underline">
                                    ← Re-paste data
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                                    <button type="button" onClick={handleConfirm} disabled={matchedCount === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                                        Add {matchedCount} Item{matchedCount === 1 ? '' : 's'} to Sale
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MassUploadModal;