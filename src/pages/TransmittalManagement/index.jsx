import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Printer, Eye, Trash2, FileText, Search, ArrowLeft, ArrowUpDown, Clock, Hash, ClipboardList, Filter } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TransmittalFormModal from '../../components/modals/TransmittalFormModal';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';
import { transmittalApi, toTransmittalRequest } from '../../services/transmittalApi';
import { api } from '../../services/api';

const SORT_OPTIONS = [
    { value: 'control_desc', label: 'Control # — Highest first', icon: Hash },
    { value: 'control_asc', label: 'Control # — Lowest first', icon: Hash },
    { value: 'date_desc', label: 'Date — Newest first', icon: Clock },
    { value: 'date_asc', label: 'Date — Oldest first', icon: Clock },
];

// PrintableTransmittal component - updated styles
const PrintableTransmittal = ({ transmittal }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    const totalUnitsForItem = (item) =>
        (parseFloat(item.unitsPerCase) || 0) * (parseFloat(item.caseQty) || 0);

    const grandTotal = (transmittal.items || []).reduce((s, it) => s + totalUnitsForItem(it), 0);
    const EMPTY_ROWS = Math.max(0, 18 - (transmittal.items || []).length);

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
                                let description = '';
                                if (item.product?.sku && item.product.sku !== '' && item.product.sku !== 'N/A') {
                                    description = item.product.sku;
                                } else if (item.sku && item.sku !== '' && item.sku !== 'N/A') {
                                    description = item.sku;
                                }
                                const productName = item.product?.productName || item.productName || '';
                                description += description ? ` - ${productName}` : productName;
                                if (item.variationDisplay && item.variationDisplay !== '' &&
                                    item.variationDisplay !== 'No variations' &&
                                    !productName.includes(item.variationDisplay)) {
                                    description += ` - ${item.variationDisplay}`;
                                }
                                return (
                                    <tr key={i} className="align-top">
                                        <td className="px-2 py-2 text-base text-gray-900">{i + 1}</td>
                                        <td className="px-2 py-2 text-base font-mono text-gray-900">{item.upc || item.product?.upc || '—'}</td>
                                        <td className="px-2 py-2 text-base text-gray-900">
                                            <div className="font-medium">{description}</div>
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


const TransmittalManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── data state ─────────────────────────────────────────────────────────────
    const [transmittals, setTransmittals] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [productOptions, setProductOptions] = useState([]);

    // ── UI state ───────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [modalState, setModalState] = useState({ show: false, mode: 'create', transmittal: null });
    const [printTarget, setPrintTarget] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortMode, setSortMode] = useState('control_desc');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [selectedProductForSearch, setSelectedProductForSearch] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState({
        productSearch: '',
        dateFrom: '',
        dateTo: ''
    });
    const ITEMS_PER_PAGE = 10;

    // ── Prepare product options for VariationSearchableDropdown ───────────────
    useEffect(() => {
        if (products.length > 0) {
            const options = [];
            products.forEach(p => {
                if (p.variations && p.variations.length > 0) {
                    p.variations.forEach(v => {
                        options.push({
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
                            allCompanyPrices: v.allCompanyPrices || p.allCompanyPrices || [],
                        });
                    });
                } else {
                    options.push({
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
                        allCompanyPrices: p.allCompanyPrices || [],
                    });
                }
            });
            setProductOptions(options);
        }
    }, [products]);

    // ── load reference data + transmittals on mount ───────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [transmittalRes, branchRes, productRes] = await Promise.all([
                transmittalApi.getAll(),
                api.get('/branches'),
                api.get('/products'),
            ]);
            if (transmittalRes.success) setTransmittals(transmittalRes.data || []);
            if (branchRes.success) setBranches(branchRes.data || []);
            if (productRes.success) {
                setProducts(productRes.data || []);
            }
        } catch (err) {
            console.error('Failed to load transmittal data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── sorting function ───────────────────────────────────────────────────────
    const getSortedTransmittals = (transmittalsList, sortModeValue) => {
        return [...transmittalsList].sort((a, b) => {
            switch (sortModeValue) {
                case 'control_asc':
                    return (a.controlNumber || '').localeCompare(b.controlNumber || '');
                case 'control_desc':
                    return (b.controlNumber || '').localeCompare(a.controlNumber || '');
                case 'date_asc':
                    return new Date(a.date || 0) - new Date(b.date || 0);
                case 'date_desc':
                    return new Date(b.date || 0) - new Date(a.date || 0);
                default:
                    return (b.controlNumber || '').localeCompare(a.controlNumber || '');
            }
        });
    };

    // ── Enhanced search function that checks products in transmittal items ──
    const matchesProductSearch = (transmittal, searchTerm) => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase().trim();

        // Check if any item in the transmittal matches the search
        return (transmittal.items || []).some(item => {
            // Check product name
            const productName = (item.product?.productName || item.productName || '').toLowerCase();
            if (productName.includes(term)) return true;

            // Check SKU
            const sku = (item.product?.sku || item.sku || '').toLowerCase();
            if (sku.includes(term)) return true;

            // Check UPC
            const upc = (item.upc || item.product?.upc || '').toLowerCase();
            if (upc.includes(term)) return true;

            // Check variation display
            const variation = (item.variationDisplay || '').toLowerCase();
            if (variation.includes(term)) return true;

            return false;
        });
    };

    const matchesAdvancedFilters = (transmittal) => {
        // Product search in items
        if (advancedFilters.productSearch) {
            if (!matchesProductSearch(transmittal, advancedFilters.productSearch)) {
                return false;
            }
        }

        // Date range filter
        if (advancedFilters.dateFrom) {
            const transmittalDate = new Date(transmittal.date);
            const fromDate = new Date(advancedFilters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (transmittalDate < fromDate) return false;
        }

        if (advancedFilters.dateTo) {
            const transmittalDate = new Date(transmittal.date);
            const toDate = new Date(advancedFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (transmittalDate > toDate) return false;
        }

        return true;
    };

    // ── Main filter function ─────────────────────────────────────────────────
    const filterTransmittals = (transmittalsList) => {
        return transmittalsList.filter(t => {
            // Basic search (control #, branch, prepared by)
            const q = searchQuery.toLowerCase();
            const matchesBasic = !searchQuery || (
                t.controlNumber?.toLowerCase().includes(q) ||
                t.branch?.branchName?.toLowerCase().includes(q) ||
                t.preparedBy?.toLowerCase().includes(q)
            );

            if (!matchesBasic) return false;

            // Advanced filters (product search, date range)
            return matchesAdvancedFilters(t);
        });
    };

    // ── Handle product selection from dropdown ───────────────────────────────
    const handleProductSearchChange = (productId) => {
        setSelectedProductForSearch(productId);
        const selectedOption = productOptions.find(opt => opt.id === productId);
        if (selectedOption) {
            // Set the search term to the product's full name with variation
            const searchTerm = selectedOption.variationId
                ? `${selectedOption.fullName}`
                : selectedOption.fullName;
            setAdvancedFilters(prev => ({ ...prev, productSearch: searchTerm }));
        } else {
            setAdvancedFilters(prev => ({ ...prev, productSearch: '' }));
        }
        setCurrentPage(1);
    };

    // ── Clear product search ─────────────────────────────────────────────────
    const clearProductSearch = () => {
        setSelectedProductForSearch('');
        setAdvancedFilters(prev => ({ ...prev, productSearch: '' }));
        setCurrentPage(1);
    };

    // ── print ──────────────────────────────────────────────────────────────────
    const handlePrint = async (row) => {
        setActionLoading(true);
        setLoadingMessage('Preparing print…');
        try {
            const res = await transmittalApi.getById(row.id);
            if (res.success) {
                setPrintTarget(res.data);
                setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                        setPrintTarget(null);
                    }, 1000);
                }, 200);
            } else {
                alert('Failed to load transmittal for printing.');
            }
        } catch (err) {
            alert('Error loading transmittal: ' + err.message);
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    // ── save (create or update) ────────────────────────────────────────────────
    const handleSave = async (formData) => {
        setActionLoading(true);
        setLoadingMessage(modalState.mode === 'create' ? 'Creating transmittal…' : 'Updating transmittal…');
        try {
            const payload = toTransmittalRequest(formData);
            let res;
            if (modalState.mode === 'create') {
                res = await transmittalApi.create(payload);
            } else {
                res = await transmittalApi.update(modalState.transmittal.id, payload);
            }
            if (res.success) {
                alert(`Transmittal ${modalState.mode === 'create' ? 'created' : 'updated'} successfully!`);
                setModalState({ show: false, mode: 'create', transmittal: null });
                await loadData();
            } else {
                alert(res.error || 'Failed to save transmittal.');
            }
        } catch (err) {
            alert('Error saving transmittal: ' + err.message);
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    // ── delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this transmittal? This cannot be undone.')) return;
        setActionLoading(true);
        setLoadingMessage('Deleting…');
        try {
            const res = await transmittalApi.delete(id);
            if (res.success) {
                await loadData();
            } else {
                alert(res.error || 'Failed to delete transmittal.');
            }
        } catch (err) {
            alert('Error deleting transmittal: ' + err.message);
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    // ── open modal for edit (fetch full details first) ─────────────────────────
    const handleEdit = async (row) => {
        setActionLoading(true);
        setLoadingMessage('Loading transmittal…');
        try {
            const res = await transmittalApi.getById(row.id);
            if (res.success) {
                setModalState({ show: true, mode: 'edit', transmittal: res.data });
            } else {
                alert(res.error || 'Failed to load transmittal.');
            }
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    // ── open modal for create ─────────────────────────────────────
    const handleCreate = async () => {
        setModalState({ show: true, mode: 'create', transmittal: null });
    };

    // ── reset filters ────────────────────────────────────────────────────────
    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedProductForSearch('');
        setAdvancedFilters({
            productSearch: '',
            dateFrom: '',
            dateTo: ''
        });
        setCurrentPage(1);
    };

    // ── filtering & pagination ────────────────────────────────────────────────
    const filtered = getSortedTransmittals(filterTransmittals(transmittals), sortMode);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const fmtDate = (d) => {
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { return d; }
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    
                    #transmittal-print-root,
                    #transmittal-print-root * {
                        visibility: visible !important;
                    }
                    
                    #transmittal-print-root {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: white !important;
                    }
                }
            `}</style>

            <LoadingOverlay show={actionLoading} message={loadingMessage || 'Loading…'} />

            <div className="p-6 max-w-[1640px] mx-auto">
                {/* Sliding Navigation Bar */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex">
                        <button
                            onClick={() => navigate('/deliveries')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${location.pathname === '/deliveries'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <ClipboardList size={18} />
                            <span>Delivery Management</span>
                        </button>
                        <button
                            onClick={() => navigate('/transmittals')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${location.pathname === '/transmittals'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <FileText size={18} />
                            <span>Transmittal Forms</span>
                        </button>
                    </div>
                </div>

                {/* Page header */}
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/deliveries')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Transmittal Forms</h1>
                        <p className="text-gray-600 text-sm mt-0.5">
                            Create and manage transmittal documents for branch deliveries
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    {/* Left: action buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                        >
                            <Plus size={18} />
                            <span>New Transmittal</span>
                        </button>

                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by control #, branch, prepared by..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-80"
                            />
                        </div>

                        {/* Advanced Search Toggle Button */}
                        <button
                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${showAdvancedSearch || advancedFilters.productSearch || advancedFilters.dateFrom || advancedFilters.dateTo
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <Filter size={16} />
                            <span>Advanced Search</span>
                            {(advancedFilters.productSearch || advancedFilters.dateFrom || advancedFilters.dateTo) && (
                                <span className="ml-1 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                    !
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Right: Sort control */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <ArrowUpDown size={16} className="text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort by:</span>
                        <select
                            value={sortMode}
                            onChange={e => { setSortMode(e.target.value); setCurrentPage(1); }}
                            className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Advanced Search Panel */}
                {showAdvancedSearch && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search by Product
                                </label>
                                <VariationSearchableDropdown
                                    options={productOptions}
                                    value={selectedProductForSearch}
                                    onChange={handleProductSearchChange}
                                    placeholder="Search by product name, UPC, SKU, or variation..."
                                    formData={{}}
                                    index={-1}
                                    hideLocationHint={true}
                                />
                                {advancedFilters.productSearch && (
                                    <div className="mt-2 flex items-center justify-between">
                                        <p className="text-xs text-blue-600">
                                            Searching for: {advancedFilters.productSearch}
                                        </p>
                                        <button
                                            onClick={clearProductSearch}
                                            className="text-xs text-red-600 hover:text-red-800"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Range
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        placeholder="From"
                                        value={advancedFilters.dateFrom}
                                        onChange={(e) => {
                                            setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }));
                                            setCurrentPage(1);
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                    <input
                                        type="date"
                                        placeholder="To"
                                        value={advancedFilters.dateTo}
                                        onChange={(e) => {
                                            setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }));
                                            setCurrentPage(1);
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleResetFilters}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
                    ) : paginated.length === 0 ? (
                        <div className="py-20 text-center">
                            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500 font-medium">No transmittals found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {searchQuery || advancedFilters.productSearch || advancedFilters.dateFrom || advancedFilters.dateTo
                                    ? 'Try adjusting your search filters.'
                                    : 'Click "New Transmittal" to create one.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {['Control No.', 'Date', 'Branch', 'Prepared By', 'Items', 'Grand Total', 'Actions'].map(h => (
                                        <th
                                            key={h}
                                            className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider
                        ${['Items', 'Grand Total', 'Actions'].includes(h) ? 'text-center' : 'text-left'}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.map(t => {
                                    const grand = t.grandTotal ??
                                        (t.items || []).reduce((s, it) =>
                                            s + (parseInt(it.unitsPerCase, 10) || 0) * (parseInt(it.caseQty, 10) || 0), 0);
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-semibold text-blue-700 text-sm">{t.controlNumber}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(t.date)}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">{t.branch?.branchName || '—'}</div>
                                                {t.branchAddress && (
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">{t.branchAddress}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{t.preparedBy || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                                                    {t.itemCount ?? (t.items || []).length}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-900 text-sm">
                                                {grand.toLocaleString('en-US')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Edit"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrint(t)}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                        title="Print"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages} ({filtered.length} total)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden print DOM */}
            {printTarget && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <PrintableTransmittal transmittal={printTarget} />
                </div>
            )}

            {/* Modal */}
            {modalState.show && (
                <TransmittalFormModal
                    mode={modalState.mode}
                    transmittal={modalState.transmittal}
                    onClose={() => setModalState({ show: false, mode: 'create', transmittal: null })}
                    onSave={handleSave}
                    branches={branches}
                    products={products}
                    isLoading={actionLoading}
                />
            )}
        </>
    );
};

export default TransmittalManagement;