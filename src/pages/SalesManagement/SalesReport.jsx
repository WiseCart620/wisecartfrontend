import React, { useState, useCallback } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { X, FileText, Printer, ChevronDown, ChevronUp, ChevronLeft, Package } from 'lucide-react';

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SalesReport = ({ onBack, filterData, companies, branches }) => {
    const [salesReportFilter, setSalesReportFilter] = useState({ startDate: '', endDate: '' });
    const [salesReportData, setSalesReportData] = useState(null);
    const [salesReportLoading, setSalesReportLoading] = useState(false);
    const [expandedReportMonths, setExpandedReportMonths] = useState({});
    const [selectedReportMonths, setSelectedReportMonths] = useState({});
    const [expandedCompanyProducts, setExpandedCompanyProducts] = useState({});

    React.useEffect(() => {
        generateSalesReport();
    }, []);

    const mergeSalesByMonthCompanyBranch = (salesList) => {
        const mergedMap = new Map();
        salesList.forEach(sale => {
            const key = `${sale.year}_${sale.month}_${sale.company?.id}_${sale.branch?.id}`;
            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key);
                const mergedItems = [...(existing.items || [])];
                (sale.items || []).forEach(newItem => {
                    const existingIndex = mergedItems.findIndex(item =>
                        item.product?.id === newItem.product?.id &&
                        (item.variation?.id || null) === (newItem.variation?.id || null)
                    );
                    if (existingIndex !== -1) {
                        mergedItems[existingIndex].quantity += newItem.quantity;
                        mergedItems[existingIndex].amount += newItem.amount;
                    } else {
                        mergedItems.push({ ...newItem });
                    }
                });
                mergedMap.set(key, {
                    ...existing,
                    items: mergedItems,
                    totalAmount: (existing.totalAmount || 0) + (sale.totalAmount || 0),
                    mergedSaleIds: [...(existing.mergedSaleIds || [existing.id]), sale.id]
                });
            } else {
                mergedMap.set(key, { ...sale, mergedSaleIds: [sale.id], items: [...(sale.items || [])] });
            }
        });
        return Array.from(mergedMap.values());
    };


    const buildJournaledPeriods = (profiles) => {
        const set = new Set();
        (profiles || []).forEach(p => {
            const companyId = p.companyId;
            const branchId = p.branchId || null;
            const sYear = p.startYear || p.endYear;
            const eYear = p.endYear || p.startYear;
            const sMonth = p.startMonth || 1;
            const eMonth = p.endMonth || 12;
            if (!companyId || !sYear) return;

            let y = sYear, m = sMonth;
            while (y < eYear || (y === eYear && m <= eMonth)) {
                const key = branchId ? `${companyId}_${branchId}_${y}_${m}` : `${companyId}_all_${y}_${m}`;
                set.add(key);
                m++;
                if (m > 12) { m = 1; y++; }
            }
        });
        return set;
    };

    const isSaleJournaled = (sale, journaledSet) => {
        const cid = sale.company?.id;
        const bid = sale.branch?.id;
        const y = sale.year;
        const m = sale.month;
        if (!cid || !y || !m) return false;
        if (bid && journaledSet.has(`${cid}_${bid}_${y}_${m}`)) return true;
        if (journaledSet.has(`${cid}_all_${y}_${m}`)) return true;
        return false;
    };


    const generateSalesReport = async () => {
        setSalesReportLoading(true);
        try {
            const params = new URLSearchParams({ page: 0, size: 9999, status: 'INVOICED' });
            if (filterData.companyId) params.append('companyId', filterData.companyId);
            if (filterData.branchId) params.append('branchId', filterData.branchId);
            if (salesReportFilter.startDate) {
                const d = new Date(salesReportFilter.startDate);
                params.append('startYear', d.getFullYear());
                params.append('startMonth', d.getMonth() + 1);
            }
            if (salesReportFilter.endDate) {
                const d = new Date(salesReportFilter.endDate);
                params.append('endYear', d.getFullYear());
                params.append('endMonth', d.getMonth() + 1);
            }
            const [salesResponse, profilesResponse] = await Promise.all([
                api.get(`/sales/all?${params}`),
                api.get('/invoice-profiles'),
            ]);

            const rawSales = salesResponse.data?.content || [];
            const profiles = profilesResponse.data?.data || profilesResponse.data || [];
            const journaledSet = buildJournaledPeriods(profiles);
            const allSales = rawSales.filter(sale => isSaleJournaled(sale, journaledSet));

            const grouped = {};
            allSales.forEach(sale => {
                const yr = sale.year;
                if (!grouped[yr]) grouped[yr] = [];
                grouped[yr].push(sale);
            });

            const rows = Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(yr => {
                const yrSales = grouped[yr];
                const monthMap = {};
                const mergedSales = mergeSalesByMonthCompanyBranch(yrSales);
                mergedSales.forEach(sale => {
                    const mo = sale.month;
                    if (!monthMap[mo]) monthMap[mo] = [];
                    monthMap[mo].push(sale);
                });

                const monthRows = Object.keys(monthMap).sort((a, b) => Number(a) - Number(b)).map(mo => {
                    const moSales = monthMap[mo];
                    const moAmount = moSales.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
                    const moVatable = moAmount / 1.12;
                    const moVat = moVatable * 0.12;
                    const moEwt = moVatable * 0.01;
                    const moDue = moAmount - moEwt;

                    const companyMap = {};
                    moSales.forEach(sale => {
                        const companyId = sale.company?.id || 'unknown';
                        if (!companyMap[companyId]) companyMap[companyId] = { company: sale.company, sales: [] };
                        companyMap[companyId].sales.push(sale);
                    });

                    const companyGroups = Object.values(companyMap).map(cg => {
                        const cgAmount = cg.sales.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
                        const cgVatable = cgAmount / 1.12;
                        const cgVat = cgVatable * 0.12;
                        const cgEwt = cgVatable * 0.01;
                        const cgDue = cgAmount - cgEwt;

                        // Aggregate products for this company in this month
                        const productMap = new Map();
                        cg.sales.forEach(sale => {
                            (sale.items || []).forEach(item => {
                                const key = `${item.product?.id}_${item.variation?.id || 'no-var'}`;
                                if (productMap.has(key)) {
                                    const ex = productMap.get(key);
                                    ex.quantity += item.quantity;
                                    ex.amount += item.amount;
                                } else {
                                    productMap.set(key, {
                                        id: key,
                                        productName: item.product?.productName || '—',
                                        variationDisplay: item.variation?.combinationDisplay ||
                                            (item.variation?.variationType && item.variation?.variationValue
                                                ? `${item.variation.variationType}: ${item.variation.variationValue}`
                                                : null),
                                        sku: item.variation?.sku || item.product?.sku || '—',
                                        upc: item.variation?.upc || item.product?.upc || '—',
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        amount: item.amount,
                                    });
                                }
                            });
                        });

                        return {
                            company: cg.company,
                            sales: cg.sales,
                            salesCount: cg.sales.length,
                            amount: cgAmount,
                            vatableSales: cgVatable,
                            vat: cgVat,
                            lesEwt: cgEwt,
                            due: cgDue,
                            aggregatedProducts: Array.from(productMap.values()).sort((a, b) => a.productName.localeCompare(b.productName)),
                        };
                    });

                    const moStoreCount = new Set(moSales.map(s => s.branch?.id).filter(Boolean)).size;

                    return {
                        month: Number(mo),
                        amount: moAmount,
                        vatableSales: moVatable,
                        vat: moVat,
                        lesEwt: moEwt,
                        due: moDue,
                        salesCount: moSales.length,
                        storeCount: moStoreCount,
                        sales: moSales,
                        companyGroups,
                    };
                });

                const grossTotal = yrSales.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
                const vatableTotal = grossTotal / 1.12;
                const vatTotal = vatableTotal * 0.12;
                const ewtTotal = vatableTotal * 0.01;
                const dueTotal = grossTotal - ewtTotal;

                return { year: yr, sales: yrSales, grossTotal, vatableTotal, vatTotal, ewtTotal, dueTotal, products: monthRows };
            });

            setSalesReportData(rows);
            setSelectedReportMonths(Object.fromEntries(rows.map(r => [r.year, r.products[0]?.month ?? null])));
            setExpandedCompanyProducts({});
        } catch (e) {
            toast.error('Failed to generate sales report');
            console.error(e);
        } finally {
            setSalesReportLoading(false);
        }
    };

    React.useEffect(() => {
        generateSalesReport();
    }, []);

    const exportReportToExcel = () => {
        if (!salesReportData) return;
        const rows = [];
        rows.push(['WISECART MERCHANTS CORP.']);
        rows.push(['Sales Report']);
        rows.push([`Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`]);
        rows.push([]);

        const totalGross = salesReportData.reduce((s, r) => s + r.vatableTotal, 0);
        const totalVat = salesReportData.reduce((s, r) => s + r.vatTotal, 0);
        const totalEwt = salesReportData.reduce((s, r) => s + r.ewtTotal, 0);
        const totalDue = salesReportData.reduce((s, r) => s + r.dueTotal, 0);

        rows.push(['SUMMARY']);
        rows.push(['Total Gross/Vatable:', `₱${totalGross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]);
        rows.push(['Total VAT:', `₱${totalVat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]);
        rows.push(['Total Less EWT:', `₱${totalEwt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]);
        rows.push(['Total Amount Due:', `₱${totalDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]);
        rows.push([]);
        rows.push(['#', 'Year', 'Month', 'Gross / Vatable', 'VAT/PT', 'Less: EWT', 'Total Due', 'Invoices']);

        let rowNum = 1;
        salesReportData.forEach(yr => {
            yr.products.forEach(p => {
                rows.push([
                    rowNum++, yr.year, monthsFull[p.month - 1],
                    `₱${p.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                    `₱${p.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                    `₱${p.lesEwt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                    `₱${p.due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                    p.salesCount
                ]);
                p.sales.forEach(sale => {
                    rows.push([`  └─ Sale #${sale.id}`, sale.branch?.branchName || '', sale.status, '', '', '', `₱${formatCurrency(sale.totalAmount)}`, '']);
                    (sale.items || []).forEach((item, idx) => {
                        rows.push([`     ${idx + 1}.`, item.product?.productName || '', item.variation?.combinationDisplay || 'No variation', item.quantity, `₱${formatCurrency(item.unitPrice)}`, `₱${formatCurrency(item.amount)}`, '', '']);
                    });
                    rows.push([]);
                });
            });
            rows.push([`YEAR ${yr.year} TOTAL`, '', '', `₱${yr.vatableTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, `₱${yr.vatTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, `₱${yr.ewtTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, `₱${yr.dueTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, yr.sales.length]);
            rows.push([]);
        });

        const csvContent = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded!');
    };

    const printSalesReport = () => {
        const printContent = document.getElementById('sales-report-print-content');
        if (!printContent) return;
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Sales Report</title><style>
      * { font-family: Arial, sans-serif; }
      body { padding: 20px; margin: 0; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; font-weight: bold; }
      .text-right { text-align: right; }
    </style></head><body>
      <h2>WISECART MERCHANTS CORP. — Sales Report</h2>
      <p>Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${printContent.outerHTML}
    </body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };


    // Report view
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-5 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                        <ChevronLeft size={18} /> Back to Sales Management
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Sales Report</h1>
                        <p className="text-xs text-gray-500">
                            {salesReportFilter.startDate || salesReportFilter.endDate
                                ? `${salesReportFilter.startDate || 'All'} — ${salesReportFilter.endDate || 'All'}`
                                : 'All periods'
                            } {salesReportData ? `· ${salesReportData.reduce((s, r) => s + r.products.length, 0)} months` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {salesReportData && (
                        <>
                            <button onClick={exportReportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                                <FileText size={16} /> Export CSV
                            </button>
                            <button onClick={printSalesReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                <Printer size={16} /> Print
                            </button>
                        </>
                    )}
                    <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Filter + Summary always visible */}
            <div className="px-4 pt-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-4 mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Filter Report</h2>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                            <input type="date" value={salesReportFilter.startDate}
                                onChange={e => setSalesReportFilter(p => ({ ...p, startDate: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                            <input type="date" value={salesReportFilter.endDate}
                                onChange={e => setSalesReportFilter(p => ({ ...p, endDate: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <button onClick={generateSalesReport} disabled={salesReportLoading}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                            {salesReportLoading ? 'Generating...' : 'Generate Report'}
                        </button>
                        {filterData.companyId && (
                            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                Filtered by selected company/branch
                            </span>
                        )}
                    </div>

                    {salesReportData && (
                        <div className="flex flex-wrap gap-6 text-sm mt-4 pt-4 border-t border-gray-100">
                            <div><span className="text-gray-500">Years:</span> <span className="font-semibold">{salesReportData.length}</span></div>
                            <div><span className="text-gray-500">Months:</span> <span className="font-semibold">{salesReportData.reduce((s, r) => s + r.products.length, 0)}</span></div>
                            <div><span className="text-gray-500">Gross / Vatable:</span> <span className="font-semibold text-blue-700">₱{salesReportData.reduce((s, r) => s + r.vatableTotal, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                            <div><span className="text-gray-500">VAT/PT:</span> <span className="font-semibold text-indigo-700">₱{salesReportData.reduce((s, r) => s + r.vatTotal, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                            <div><span className="text-gray-500">Less EWT:</span> <span className="font-semibold text-red-600">₱{salesReportData.reduce((s, r) => s + r.ewtTotal, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                            <div><span className="text-gray-500">Total Due:</span> <span className="font-semibold text-green-700">₱{salesReportData.reduce((s, r) => s + r.dueTotal, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main table */}
            {salesReportData && (
                <div className="px-4 pb-4" id="sales-report-print-content">
                    {salesReportData.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 italic">No sales data found for the selected period.</div>
                    ) : (
                        <table className="w-full text-sm border-collapse bg-white rounded-b-xl shadow-sm overflow-hidden border border-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase w-10">#</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase">Year</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase">Month</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase">Gross / Vatable</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase">VAT/PT</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase">Less: EWT</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase">Due</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-600 uppercase w-20">Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesReportData.map((row, idx) => {
                                    const activeMonth = selectedReportMonths[row.year] ?? row.products[0]?.month ?? null;
                                    const activeProd = row.products.find(p => p.month === activeMonth);
                                    const monthKey = `${row.year}_${activeMonth}`;
                                    const isInvoicesExpanded = expandedReportMonths[monthKey];

                                    return (
                                        <React.Fragment key={`report-row-${row.year}`}>
                                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">{row.year}</td>
                                                <td className="px-4 py-3">
                                                    <div className="relative inline-block">
                                                        <select
                                                            value={activeMonth ?? ''}
                                                            onChange={(e) => {
                                                                const newMonth = Number(e.target.value);
                                                                setSelectedReportMonths(prev => ({ ...prev, [row.year]: newMonth }));
                                                                setExpandedReportMonths(prev => ({ ...prev, [`${row.year}_${newMonth}`]: false }));
                                                                setExpandedCompanyProducts({});
                                                            }}
                                                            className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:ring-2 focus:ring-gray-400 cursor-pointer font-medium"
                                                        >
                                                            {row.products.map(p => (
                                                                <option key={p.month} value={p.month}>
                                                                    {monthsFull[p.month - 1]} ({p.storeCount} store{p.storeCount !== 1 ? 's' : ''})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <ChevronDown size={14} strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                    {activeProd ? `₱${activeProd.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                    {activeProd ? `₱${activeProd.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-800">
                                                    {activeProd ? `₱${activeProd.lesEwt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                    {activeProd ? `₱${activeProd.due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {activeProd && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedReportMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))}
                                                            className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200 mx-auto ${isInvoicesExpanded ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-500'}`}
                                                            title={isInvoicesExpanded ? 'Hide invoices' : 'Show invoices'}
                                                        >
                                                            {isInvoicesExpanded ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>

                                            {isInvoicesExpanded && activeProd && (
                                                <tr>
                                                    <td colSpan={8} className="p-0 bg-white">
                                                        <div className="mx-4 my-2 space-y-3">
                                                            {(activeProd.companyGroups || []).map((cg, cgIdx) => {
                                                                const cgKey = `${monthKey}_company_${cg.company?.id}`;
                                                                const isCgExpanded = expandedReportMonths[cgKey] ?? true;
                                                                // NEW key for inline product expansion
                                                                const productsKey = `products_${monthKey}_${cg.company?.id}`;
                                                                const isProductsExpanded = expandedCompanyProducts[productsKey];

                                                                return (
                                                                    <div key={cgIdx} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                                        {/* Company header */}
                                                                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setExpandedReportMonths(prev => ({ ...prev, [cgKey]: !isCgExpanded }))}
                                                                                    className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200 ${isCgExpanded ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-400 text-gray-500'}`}
                                                                                >
                                                                                    {isCgExpanded ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
                                                                                </button>
                                                                                <span className="text-sm font-bold text-gray-800">{cg.company?.companyName || 'Unknown Company'}</span>
                                                                                <span className="text-xs text-gray-500">({cg.salesCount} invoice{cg.salesCount !== 1 ? 's' : ''})</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                                                                    <span>Vatable: ₱{cg.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                                                    <span className="font-bold text-gray-800">Total: ₱{cg.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                                                </div>
                                                                                {/* NEW: inline products toggle icon */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setExpandedCompanyProducts(prev => ({ ...prev, [productsKey]: !prev[productsKey] }))}
                                                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${isProductsExpanded ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'}`}
                                                                                    title={isProductsExpanded ? 'Hide all products' : 'View all products'}
                                                                                >
                                                                                    <Package size={13} />
                                                                                    <span className="hidden sm:inline">{isProductsExpanded ? 'Hide Products' : 'All Products'}</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* NEW: Inline aggregated products panel */}
                                                                        {isProductsExpanded && (
                                                                            <div className="border-b border-purple-200 bg-purple-50">
                                                                                <div className="px-4 py-2 bg-purple-100 border-b border-purple-200 flex items-center justify-between">
                                                                                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wide flex items-center gap-1">
                                                                                        <Package size={12} /> All Products — {cg.company?.companyName}
                                                                                    </span>
                                                                                    <span className="text-xs text-purple-600">
                                                                                        {cg.aggregatedProducts.length} products · {cg.aggregatedProducts.reduce((s, p) => s + p.quantity, 0).toLocaleString()} units · ₱{cg.aggregatedProducts.reduce((s, p) => s + p.amount, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                                    </span>
                                                                                </div>
                                                                                <table className="w-full text-xs">
                                                                                    <thead className="bg-purple-200">
                                                                                        <tr>
                                                                                            <th className="px-4 py-2 text-left font-semibold text-purple-900">#</th>
                                                                                            <th className="px-4 py-2 text-left font-semibold text-purple-900">Product</th>
                                                                                            <th className="px-4 py-2 text-left font-semibold text-purple-900">Variation</th>
                                                                                            <th className="px-4 py-2 text-left font-semibold text-purple-900">SKU</th>
                                                                                            <th className="px-4 py-2 text-left font-semibold text-purple-900">UPC</th>
                                                                                            <th className="px-4 py-2 text-right font-semibold text-purple-900">Qty</th>
                                                                                            <th className="px-4 py-2 text-right font-semibold text-purple-900">Unit Price</th>
                                                                                            <th className="px-4 py-2 text-right font-semibold text-purple-900">Amount</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-purple-100 bg-white">
                                                                                        {cg.aggregatedProducts.map((product, pi) => (
                                                                                            <tr key={product.id} className="hover:bg-purple-50">
                                                                                                <td className="px-4 py-2 text-gray-400">{pi + 1}</td>
                                                                                                <td className="px-4 py-2 font-medium text-gray-900">{product.productName}</td>
                                                                                                <td className="px-4 py-2">
                                                                                                    {product.variationDisplay
                                                                                                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">{product.variationDisplay}</span>
                                                                                                        : <span className="text-gray-400 italic">None</span>
                                                                                                    }
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-gray-500">{product.sku}</td>
                                                                                                <td className="px-4 py-2 text-gray-500">{product.upc}</td>
                                                                                                <td className="px-4 py-2 text-right font-semibold text-gray-900">{product.quantity.toLocaleString()}</td>
                                                                                                <td className="px-4 py-2 text-right text-gray-700">₱{formatCurrency(product.unitPrice)}</td>
                                                                                                <td className="px-4 py-2 text-right font-bold text-blue-700">₱{formatCurrency(product.amount)}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                    <tfoot className="bg-purple-100 border-t border-purple-200">
                                                                                        <tr>
                                                                                            <td colSpan={5} className="px-4 py-2 font-bold text-purple-800 text-right">TOTAL</td>
                                                                                            <td className="px-4 py-2 text-right font-bold text-gray-900">{cg.aggregatedProducts.reduce((s, p) => s + p.quantity, 0).toLocaleString()}</td>
                                                                                            <td className="px-4 py-2"></td>
                                                                                            <td className="px-4 py-2 text-right font-bold text-blue-800">₱{cg.aggregatedProducts.reduce((s, p) => s + p.amount, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                        </tr>
                                                                                    </tfoot>
                                                                                </table>
                                                                            </div>
                                                                        )}

                                                                        {/* Sales invoices table */}
                                                                        {isCgExpanded && (
                                                                            <table className="w-full text-xs">
                                                                                <thead className="bg-gray-700 text-white">
                                                                                    <tr>
                                                                                        <th className="px-4 py-2 text-left font-semibold">Branch</th>
                                                                                        <th className="px-4 py-2 text-left font-semibold">Encoded By</th>
                                                                                        <th className="px-4 py-2 text-center font-semibold">Status</th>
                                                                                        <th className="px-4 py-2 text-right font-semibold">Vatable</th>
                                                                                        <th className="px-4 py-2 text-right font-semibold">VAT</th>
                                                                                        <th className="px-4 py-2 text-right font-semibold">EWT</th>
                                                                                        <th className="px-4 py-2 text-right font-semibold">Total Amount</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                                                    {cg.sales.map((s, si) => {
                                                                                        const sVatable = (Number(s.totalAmount) || 0) / 1.12;
                                                                                        const sVat = sVatable * 0.12;
                                                                                        const sEwt = sVatable * 0.01;
                                                                                        const saleProductsKey = `sale_products_${s.id}`;
                                                                                        const saleProductsExpanded = expandedReportMonths[saleProductsKey];
                                                                                        return (
                                                                                            <React.Fragment key={s.id}>
                                                                                                <tr className={`hover:bg-gray-50 transition ${si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                                                                    <td className="px-4 py-2">
                                                                                                        <div className="font-medium text-gray-900">{s.branch?.branchName}</div>
                                                                                                        <div className="text-[10px] text-gray-400">{s.branch?.branchCode}</div>
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-gray-600">{s.createdBy || '—'}</td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                                                                            {s.status}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-right text-gray-800 font-medium">₱{sVatable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                                    <td className="px-4 py-2 text-right text-gray-700">₱{sVat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                                    <td className="px-4 py-2 text-right text-gray-700">₱{sEwt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                                    <td className="px-4 py-2 text-right font-bold text-gray-900">
                                                                                                        <div className="flex items-center justify-end gap-2">
                                                                                                            ₱{formatCurrency(s.totalAmount)}
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => setExpandedReportMonths(prev => ({ ...prev, [saleProductsKey]: !prev[saleProductsKey] }))}
                                                                                                                className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200 ${saleProductsExpanded ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-500'}`}
                                                                                                                title={saleProductsExpanded ? 'Hide items' : 'Show items'}
                                                                                                            >
                                                                                                                {saleProductsExpanded ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                                {saleProductsExpanded && (
                                                                                                    <tr>
                                                                                                        <td colSpan={7} className="p-0 bg-gray-50">
                                                                                                            <div className="mx-6 my-2 rounded-lg border border-gray-200 overflow-hidden">
                                                                                                                <table className="w-full text-xs">
                                                                                                                    <thead className="bg-gray-100 border-b border-gray-200">
                                                                                                                        <tr>
                                                                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                                                                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Product</th>
                                                                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Variation</th>
                                                                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">SKU</th>
                                                                                                                            <th className="px-3 py-2 text-left font-semibold text-gray-600">UPC</th>
                                                                                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Qty</th>
                                                                                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Unit Price</th>
                                                                                                                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                                                                                                                        </tr>
                                                                                                                    </thead>
                                                                                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                                                                                        {(s.items || []).map((item, ii) => (
                                                                                                                            <tr key={item.id || ii} className="hover:bg-gray-50">
                                                                                                                                <td className="px-3 py-2 text-gray-400">{ii + 1}</td>
                                                                                                                                <td className="px-3 py-2 font-medium text-gray-900">{item.product?.productName || '—'}</td>
                                                                                                                                <td className="px-3 py-2 text-gray-600">
                                                                                                                                    {item.variation
                                                                                                                                        ? (item.variation.combinationDisplay || `${item.variation.variationType}: ${item.variation.variationValue}`)
                                                                                                                                        : <span className="text-gray-400 italic">None</span>
                                                                                                                                    }
                                                                                                                                </td>
                                                                                                                                <td className="px-3 py-2 text-gray-500">{item.variation ? (item.variation.sku || '—') : (item.product?.sku || '—')}</td>
                                                                                                                                <td className="px-3 py-2 text-gray-500">{item.variation ? (item.variation.upc || '—') : (item.product?.upc || '—')}</td>
                                                                                                                                <td className="px-3 py-2 text-right text-gray-800 font-medium">{(item.quantity || 0).toLocaleString()}</td>
                                                                                                                                <td className="px-3 py-2 text-right text-gray-700">₱{formatCurrency(item.unitPrice)}</td>
                                                                                                                                <td className="px-3 py-2 text-right font-semibold text-gray-900">₱{formatCurrency(item.amount)}</td>
                                                                                                                            </tr>
                                                                                                                        ))}
                                                                                                                    </tbody>
                                                                                                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                                                                                                        <tr>
                                                                                                                            <td colSpan={5} className="px-3 py-2 text-xs font-bold text-gray-600">Sale Total</td>
                                                                                                                            <td className="px-3 py-2 text-right text-xs font-bold">{(s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0).toLocaleString()}</td>
                                                                                                                            <td></td>
                                                                                                                            <td className="px-3 py-2 text-right text-xs font-bold">₱{formatCurrency(s.totalAmount)}</td>
                                                                                                                        </tr>
                                                                                                                    </tfoot>
                                                                                                                </table>
                                                                                                            </div>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                )}
                                                                                            </React.Fragment>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                                                                    <tr>
                                                                                        <td colSpan={3} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase">{cg.company?.companyName} Total</td>
                                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">₱{cg.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">₱{cg.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-gray-700">₱{cg.lesEwt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-gray-900">₱{cg.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                                                                    </tr>
                                                                                </tfoot>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default SalesReport;