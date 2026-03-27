// src/components/modals/TransmittalFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Printer, Save, Package, Plus } from 'lucide-react';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';


const TransmittalFormModal = ({
    mode = 'create',
    transmittal = null,
    onClose,
    onSave,
    branches = [],
    products = [],
    warehouses = [],
    companies = [],
    isLoading = false,
}) => {
    // ── initial state ──────────────────────────────────────────────────────────
    const emptyForm = () => ({
        controlNumber: transmittal?.controlNumber || '',
        date: new Date().toISOString().slice(0, 16),
        preparedBy: localStorage.getItem('fullName') || localStorage.getItem('username') || '',
        branchId: '',
        branchName: '',
        branchAddress: '',
        remarks: '',
        items: [],
    });
    const [branchSearch, setBranchSearch] = useState('');
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [view, setView] = useState('form');
    const [selectedProductForAdd, setSelectedProductForAdd] = useState('');

    const addedKeys = new Set(
        formData.items.flatMap(it => [
            it.id,
            it.variationId ? `${it.parentProductId}_${it.variationId}` : `prod_${it.parentProductId}`,
        ]).filter(Boolean)
    );
    const productOptions = products.flatMap(p => {
        if (!p) return [];
        if (p.variations && p.variations.length > 0) {
            return p.variations.map(v => ({
                // VariationSearchableDropdown keys
                id: `${p.id}_${v.id}`,
                parentProductId: p.id,
                variationId: v.id,
                name: p.productName,
                fullName: `${p.productName} (${v.combinationDisplay || 'Variation'})`,
                subLabel: v.combinationDisplay || 'Variation',
                upc: v.upc || p.upc || '',
                sku: v.sku || p.sku || '',
                uom: p.uom || '',
                isVariation: true,
                allCompanyPrices: [],
                isAdded: addedKeys.has(`${p.id}_${v.id}`),
            }));
        }
        return [{
            id: `prod_${p.id}`,
            parentProductId: p.id,
            variationId: null,
            name: p.productName,
            fullName: p.productName,
            subLabel: 'No variations',
            upc: p.upc || '',
            sku: p.sku || '',
            uom: p.uom || '',
            isVariation: false,
            allCompanyPrices: [],
            isAdded: addedKeys.has(`prod_${p.id}`),
        }];
    });

    // ── populate form when editing ────────────────────────────────────────────
    useEffect(() => {
        if (mode === 'edit' && transmittal) {
            // items arriving from the API response shape (TransmittalResponse)
            const mappedItems = (transmittal.items || []).map(it => ({
                // keys that match productOptions so the dropdown can resolve the selection
                id: it.variationId
                    ? `${it.product?.id}_${it.variationId}`
                    : `prod_${it.product?.id}`,
                parentProductId: it.product?.id,
                variationId: it.variationId || null,
                productName: it.product?.productName || '',
                variationDisplay: it.variationDisplay || '',
                upc: it.upc || it.product?.upc || '',
                sku: it.sku || it.product?.sku || '',
                uom: it.uom || '',
                unitsPerCase: it.unitsPerCase ?? '',
                caseQty: it.caseQty ?? '',
            }));

            setFormData({
                controlNumber: transmittal.controlNumber || '',
                date: transmittal.date ? transmittal.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
                preparedBy: transmittal.preparedBy || '',
                branchId: transmittal.branch?.id || '',
                branchName: transmittal.branch?.branchName || '',
                branchAddress: transmittal.branchAddress || '',
                remarks: transmittal.remarks || '',
                items: mappedItems,
            });
        }
    }, [mode, transmittal]);

    // ── branch change ─────────────────────────────────────────────────────────
    const handleBranchChange = (branchId) => {
        const branch = branches.find(b => String(b.id) === String(branchId));
        setFormData(prev => ({
            ...prev,
            branchId,
            branchName: branch ? branch.branchName : '',
            branchAddress: branch
                ? [branch.address, branch.city, branch.province]
                    .filter(Boolean).join(', ')
                : '',
        }));
    };

    const handleAddProductToTable = () => {
        if (!selectedProductForAdd) { alert('Please select a product first.'); return; }
        const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
        if (!selectedOption) { alert('Selected product not found.'); return; }
        const exists = formData.items.some(
            it => it.parentProductId === selectedOption.parentProductId &&
                it.variationId === selectedOption.variationId
        );
        if (exists) { alert('This product is already in the transmittal list.'); return; }

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: selectedOption.id,
                    parentProductId: selectedOption.parentProductId,
                    variationId: selectedOption.variationId,
                    productName: selectedOption.fullName,
                    variationDisplay: selectedOption.subLabel !== 'No variations' ? selectedOption.subLabel : '',
                    upc: selectedOption.upc,
                    sku: selectedOption.sku || '',
                    uom: selectedOption.uom,
                    unitsPerCase: '',
                    caseQty: '',
                },
            ],
        }));
        setSelectedProductForAdd('');
    };

    // ── item field change ─────────────────────────────────────────────────────
    const handleItemChange = (index, field, value) => {
        setFormData(prev => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    // ── computed ──────────────────────────────────────────────────────────────
    const totalUnitsForItem = (item) =>
        (parseFloat(item.unitsPerCase) || 0) * (parseFloat(item.caseQty) || 0);

    const grandTotal = formData.items.reduce((s, it) => s + totalUnitsForItem(it), 0);

    // ── save / print ──────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!formData.branchId) { alert('Please select a branch.'); return; }
        if (formData.items.length === 0) { alert('Please add at least one product.'); return; }
        onSave(formData);
    };

    const handlePrint = () => {
        setView('print');
        setTimeout(() => {
            window.print();
            setTimeout(() => setView('form'), 800);
        }, 200);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PRINT VIEW — with proper alignment
    // ─────────────────────────────────────────────────────────────────────────
    if (view === 'print') {
        // Calculate empty rows to fill page
        const EMPTY_ROWS = Math.max(0, 18 - formData.items.length);

        return (
            <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible" id="transmittal-print-root">
                <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0.5cm !important;
                    }
                    
                    html, body {
                        overflow: hidden !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    body * { visibility: hidden !important; }
                    
                    #transmittal-print-area,
                    #transmittal-print-area * { 
                        visibility: visible !important;
                        color: black !important;
                        border-color: #000000 !important;
                    }

                    #transmittal-print-area .text-base { font-size: 13px !important; }
                    #transmittal-print-area .text-sm { font-size: 13px !important; }
                    #transmittal-print-area .text-lg { font-size: 15px !important; }
                    
                    #transmittal-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }

                    /* Force all text to be black */
                    #transmittal-print-area * {
                        color: black !important;
                    }

                    /* Border visibility */
                    #transmittal-print-area .border-b,
                    #transmittal-print-area .border-b-2,
                    #transmittal-print-area .border-b-gray-900 {
                        border-bottom-color: #9ca3af !important;
                        border-bottom-width: 0.5px !important;
                    }
                    
                    #transmittal-print-area .border-b-2 {
                        border-bottom-width: 1px !important;
                    }
                    
                    /* Table styling */
                    #transmittal-print-area table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    
                    #transmittal-print-area thead th {
                        padding: 6px 4px !important;
                        border-bottom: 1px solid #000 !important;
                    }
                    
                    #transmittal-print-area td {
                        border: none !important;
                    }
                    
                    #transmittal-print-area tbody td {
                        padding-top: 4px !important;
                        padding-bottom: 4px !important;
                    }

                    /* Remove border from tfoot */
                    #transmittal-print-area tfoot tr {
                        border-top: none !important;
                    }

                    /* Font size adjustments for print - INCREASED SIZES */
                    #transmittal-print-area .text-\\[34px\\] { font-size: 26px !important; }
                    #transmittal-print-area .text-\\[18px\\] { font-size: 14px !important; }
                    #transmittal-print-area .text-3xl { font-size: 20px !important; }
                    #transmittal-print-area .text-lg { font-size: 15px !important; }
                    #transmittal-print-area .text-sm { font-size: 13px !important; }
                    #transmittal-print-area .text-xs { font-size: 12px !important; }
                    #transmittal-print-area .text-\\[11px\\] { font-size: 11px !important; }
                    #transmittal-print-area .text-\\[7\\.5px\\] { font-size: 9px !important; }
                    #transmittal-print-area .text-\\[8px\\] { font-size: 8px !important; }
                    #transmittal-print-area .text-\\[6px\\] { font-size: 6px !important; }

                    /* Spacing overrides */
                    #transmittal-print-area .p-8 { padding: 0 !important; }
                    #transmittal-print-area .mb-5 { margin-bottom: 8px !important; }
                    #transmittal-print-area .mb-4 { margin-bottom: 6px !important; }
                    #transmittal-print-area .mb-7 { margin-bottom: 6px !important; }
                    #transmittal-print-area .mb-3 { margin-bottom: 5px !important; }
                    #transmittal-print-area .mt-2 { margin-top: 5px !important; }
                    #transmittal-print-area .mt-4 { margin-top: 7px !important; }
                    #transmittal-print-area .py-1 { padding-top: 3px !important; padding-bottom: 3px !important; }
                    #transmittal-print-area .gap-8 { gap: 14px !important; }
                    #transmittal-print-area .pb-4 { padding-bottom: 5px !important; }
                    
                    /* Make content area flexible */
                    #transmittal-print-area .print-content {
                        flex: 1 !important;
                    }
                    
                    /* Border above receive note */
                    #transmittal-print-area .receive-note-container {
                        border-top: 1.5px solid #111827 !important;
                        padding-top: 10px !important;
                        margin-top: 10px !important;
                    }
                    
                    /* Footer positioning - minimized */
                    #transmittal-print-area .footer-section {
                        margin-top: auto !important;
                        position: relative !important;
                        bottom: 0 !important;
                        width: 100% !important;
                        padding-top: 5px !important;
                        padding-bottom: 3px !important;
                    }
                    
                    /* Signature line blanks */
                    #transmittal-print-area .h-5 {
                        display: block !important;
                        height: 20px !important;
                        border-bottom: 0.5px solid #9ca3af !important;
                    }
                    
                    /* Align receive note with signature text */
                    #transmittal-print-area .receive-note-wrapper {
                        display: flex !important;
                        justify-content: flex-end !important;
                        width: 100% !important;
                    }
                    
                    #transmittal-print-area .receive-note {
                        width: calc(50% - 16px) !important;
                        text-align: left !important;
                        margin-right: 0 !important;
                    }
                    
                    /* Make signature section grid consistent */
                    #transmittal-print-area .signature-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 2rem !important;
                    }
                    
                    /* Table header font */
                    #transmittal-print-area thead th {
                        font-size: 13px !important;
                    }
                    
                    /* Table body font */
                    #transmittal-print-area tbody td {
                        font-size: 13px !important;
                    }
                    
                    /* Grand total font */
                    #transmittal-print-area tfoot td {
                        font-size: 14px !important;
                    }
                    
                    /* Minimized footer text */
                    #transmittal-print-area .footer-section .footer-permit-text {
                        font-size: 8px !important;
                        margin-bottom: 2px !important;
                    }

                    #transmittal-print-area .footer-section .footer-disclaimer {
                        font-size: 11px !important;
                    }
                }
            `}</style>

                <div id="transmittal-print-area" className="flex flex-col">
                    {/* Letterhead */}
                    <div className="mb-5 pb-2">
                        <div className="text-left leading-none space-y-0">
                            <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight">
                                WISECART MERCHANTS CORP.
                            </div>
                            <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
                                <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                                <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                                <div>VAT REG. TIN 010-751-561-00000</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-baseline mt-3">
                            <div className="text-3xl font-bold text-gray-900 tracking-widest">
                                TRANSMITTAL FORM
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">Control No.:</span>
                                <div className="text-black-900 text-lg border-b-2 border-gray-900 px-2">
                                    {transmittal.controlNumber}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header fields */}
                    <div className="grid grid-cols-2 gap-8 mb-5">
                        <div>
                            <div className="flex items-start mb-4">
                                <span className="font-bold text-gray-900 text-base w-32 flex-shrink-0">DELIVERED TO:</span>
                                <div className="text-black-900 text-lg flex-1 border-b border-gray-300 px-2 break-words min-h-[1.5rem]">
                                    {transmittal.branch?.branchName || transmittal.branchName || ''}
                                </div>
                            </div>
                            <div className="flex items-start mb-4">
                                <span className="font-bold text-gray-900 text-base w-32 flex-shrink-0">ADDRESS:</span>
                                <div className="text-black-900 text-lg flex-1 border-b border-gray-300 px-2 break-words min-h-[1.5rem]">
                                    {transmittal.branchAddress || ''}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-start mb-4">
                                <span className="font-bold text-gray-900 text-base w-32 flex-shrink-0">DATE:</span>
                                <div className="text-black-900 text-lg flex-1 border-b border-gray-300 px-2 break-words min-h-[1.5rem]">
                                    {formatDate(transmittal.date)}
                                </div>
                            </div>
                            {transmittal.remarks && (
                                <div className="flex items-start mb-4">
                                    <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">REMARKS:</span>
                                    <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 break-words min-h-[1.5rem]">
                                        {transmittal.remarks}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="leading-normal print-content">
                        <div className="border-t border-gray-900 mb-0 mt-5"></div>
                        <table className="w-full border-collapse">
                            <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '55%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '7%' }} />
                                <col style={{ width: '7%' }} />
                            </colgroup>
                            <thead>
                                <tr className="border-b border-gray-900">
                                    <th className="text-left px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">No.</th>
                                    <th className="text-left px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">UPC/EAN</th>
                                    <th className="text-left px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">DESCRIPTION</th>
                                    <th className="text-left px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">UOM</th>
                                    <th className="text-right px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">UNIT/CASE</th>
                                    <th className="text-right px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">CASE QTY</th>
                                    <th className="text-right px-2 py-2 font-bold text-gray-900 text-base whitespace-nowrap">TOTAL UNITS</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {(transmittal.items || []).map((item, i) => {
                                    const productName = item.product?.productName || item.productName || '';
                                    let description = productName;
                                    if (item.variationDisplay && item.variationDisplay !== '' &&
                                        item.variationDisplay !== 'No variations' &&
                                        !productName.includes(item.variationDisplay)) {
                                        description += ` - ${item.variationDisplay}`;
                                    }
                                    return (
                                        <tr key={i} className="align-top">
                                            <td className="px-2 py-2 text-base text-gray-900">{i + 1}</td>
                                            <td className="px-2 py-2 text-base font-mono text-gray-900">{item.upc || item.product?.upc || '—'}</td>
                                            <td className="px-2 py-2 text-gray-900">
                                                <div className="font-medium text-[10.5px]">
                                                    {description}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-base text-gray-900">{item.uom || 'pcs'}</td>
                                            <td className="px-2 py-2 text-base text-right text-gray-900">{item.unitsPerCase || '—'}</td>
                                            <td className="px-2 py-2 text-base text-right text-gray-900">{item.caseQty || '—'}</td>
                                            <td className="px-2 py-2 text-base text-right font-semibold text-gray-900">
                                                {totalUnitsForItem(item) > 0 ? totalUnitsForItem(item).toLocaleString('en-US') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                                    <tr key={`e-${i}`}>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                        <td className="px-2 py-1 text-sm">&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={6} className="py-2 px-2 text-right font-bold text-base uppercase tracking-wide text-gray-900">
                                        Grand Total
                                    </td>
                                    <td className="py-2 px-2 text-right font-bold text-gray-900 text-base">
                                        {grandTotal.toLocaleString('en-US')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="receive-note-container">
                        <div className="flex justify-end w-full">
                            <div className="w-[33%] text-left">
                                <div className="text-[9.5px] text-black-900 mt-1 font-bold leading-tight whitespace-nowrap">
                                    Receive the above goods in good order and condition
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures section */}
                    <div className="signature-grid mt-3">
                        <div>
                            <div className="flex items-center mb-0">
                                <span className="font-bold text-gray-900 text-base w-28">Prepared by:</span>
                                <div className="text-black-900 text-base border-b border-gray-300 px-2 flex-1">
                                    {transmittal.preparedBy}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center mb-0">
                                <span className="font-bold text-gray-900 text-base w-40">Received by:</span>
                                <div className="text-black-900 text-base w-full border-b border-gray-300 h-5">&nbsp;</div>
                            </div>
                            <div className="text-xs text-black-900 mt-0 font-bold leading-tight" style={{ marginLeft: '107px' }}>
                                Customer Signature over Printed Name
                            </div>
                            <div className="flex items-center mt-1 mb-8">
                                <span className="font-bold text-gray-900 text-base w-40">Date Received:</span>
                                <div className="text-black-900 text-base w-full border-b border-gray-300 h-5">&nbsp;</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Minimized */}
                    <div className="footer-section text-center">
                        <div className="footer-permit-text text-[9px] text-gray-900 mb-2 leading-tight">
                            PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002 • DATE ISSUED: OCT. 11, 2024 •
                            BIR AUTHORITY TO PRINT No. 080AU20240000016398 • DATE ISSUED: OCT. 23, 2024 •
                            APPROVED SERIES: 05001-10000 • 100PADS (2X)
                        </div>
                        <div className="footer-disclaimer text-xs font-bold text-gray-900 italic leading-tight">
                            *THIS DOCUMENT IS NOT VALID FOR CLAIM INPUT TAX*
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // FORM VIEW
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {mode === 'create' ? 'Create Transmittal Form' : 'Edit Transmittal Form'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">Control No.: {formData.controlNumber || '(auto-generated)'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* ── Control Number / Date / Prepared By ── */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Control Number</label>
                            <input
                                type="text"
                                value={formData.controlNumber}
                                onChange={e => setFormData(p => ({ ...p, controlNumber: e.target.value }))}
                                placeholder="Auto-generated on save"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Prepared By *</label>
                            <input
                                type="text"
                                value={formData.preparedBy}
                                onChange={e => setFormData(p => ({ ...p, preparedBy: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* ── Branch ── */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Deliver To (Branch) *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={showBranchDropdown ? branchSearch : formData.branchName}
                                onChange={e => {
                                    setBranchSearch(e.target.value);
                                    setShowBranchDropdown(true);
                                    if (!e.target.value) {
                                        setFormData(p => ({ ...p, branchId: '', branchName: '', branchAddress: '' }));
                                    }
                                }}
                                onFocus={() => {
                                    setBranchSearch('');
                                    setShowBranchDropdown(true);
                                }}
                                onBlur={() => setTimeout(() => setShowBranchDropdown(false), 150)}
                                placeholder="Search branch by name or code..."
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            {showBranchDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {branches
                                        .filter(b =>
                                            b.branchName.toLowerCase().includes(branchSearch.toLowerCase()) ||
                                            b.branchCode?.toLowerCase().includes(branchSearch.toLowerCase())
                                        )
                                        .map(b => (
                                            <div
                                                key={b.id}
                                                onMouseDown={() => {
                                                    handleBranchChange(String(b.id));
                                                    setShowBranchDropdown(false);
                                                    setBranchSearch('');
                                                }}
                                                className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm ${String(formData.branchId) === String(b.id)
                                                    ? 'bg-blue-50 font-semibold text-blue-700'
                                                    : 'text-gray-800'
                                                    }`}
                                            >
                                                <div className="font-medium">{b.branchName}</div>
                                                {b.branchCode && (
                                                    <div className="text-xs text-gray-400">{b.branchCode}</div>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {branches.filter(b =>
                                        b.branchName.toLowerCase().includes(branchSearch.toLowerCase()) ||
                                        b.branchCode?.toLowerCase().includes(branchSearch.toLowerCase())
                                    ).length === 0 && (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No branches found</div>
                                        )}
                                </div>
                            )}
                        </div>
                        {formData.branchName && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                <span className="font-semibold">{formData.branchName}</span>
                                {formData.branchAddress && (
                                    <span className="ml-2 text-green-600">— {formData.branchAddress}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Add Product — VariationSearchableDropdown ── */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Products</label>
                        <VariationSearchableDropdown
                            options={productOptions}
                            value={selectedProductForAdd}
                            onChange={(value) => setSelectedProductForAdd(value)}
                            placeholder="Search by name, UPC, SKU or variation..."
                            formData={{
                                items: formData.items.map(it => ({
                                    productId: it.parentProductId,
                                    variationId: it.variationId,
                                }))
                            }}
                            index={-1}
                            onAddProduct={handleAddProductToTable}
                            hideLocationHint={true}
                        />
                    </div>

                    {/* ── Items Table ── */}
                    {formData.items.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Package size={40} className="mx-auto mb-3 text-gray-400" />
                            <p className="text-sm font-medium text-gray-500">No products added yet</p>
                            <p className="text-xs text-gray-400">Search and select a product above, then click "Add to List"</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UPC</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UOM</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit/Case</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Case Qty</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Units</th>
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Remove</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {formData.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-gray-500 font-semibold">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-700 font-mono">{item.upc || '—'}</td>
                                            <td className="px-3 py-2.5 font-medium text-gray-900 max-w-xs">
                                                {item.sku && item.sku !== '' && item.sku !== 'N/A' && (
                                                    <div className="text-xs text-gray-400 font-mono truncate">{item.sku}</div>
                                                )}
                                                <div className="truncate">
                                                    {item.productName}
                                                    {item.variationDisplay &&
                                                        !item.productName.includes(item.variationDisplay) &&
                                                        ` (${item.variationDisplay})`}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-700">{item.uom || '—'}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.unitsPerCase}
                                                    onChange={e => handleItemChange(i, 'unitsPerCase', e.target.value)}
                                                    className="w-20 px-2 py-1.5 border border-blue-300 bg-blue-50 rounded text-sm text-right font-medium focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.caseQty}
                                                    onChange={e => handleItemChange(i, 'caseQty', e.target.value)}
                                                    className="w-20 px-2 py-1.5 border border-green-300 bg-green-50 rounded text-sm text-right font-medium focus:ring-2 focus:ring-green-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                                                {totalUnitsForItem(item) > 0
                                                    ? totalUnitsForItem(item).toLocaleString('en-US')
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(i)}
                                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 border-t-2 border-gray-300">
                                        <td colSpan={6} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            Grand Total ({formData.items.length} item{formData.items.length !== 1 ? 's' : ''})
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                                            {grandTotal.toLocaleString('en-US')}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-between items-center sticky bottom-0 bg-white rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition font-medium text-sm"
                        >
                            <Printer size={16} />
                            Print Preview
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50"
                        >
                            <Save size={16} />
                            {isLoading
                                ? 'Saving…'
                                : mode === 'create' ? 'Save Transmittal' : 'Update Transmittal'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransmittalFormModal;