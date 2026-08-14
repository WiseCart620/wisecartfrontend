import React, { useRef, useState, useMemo } from 'react';
import { X, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const fmt = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};

const sum = (arr, key) => arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

const BranchSummaryReportModal = ({ isOpen, onClose, data = [], filters = {} }) => {
    const printRef = useRef();
    const [companyFilter, setCompanyFilter] = useState('ALL');

    const companyOptions = useMemo(() => {
        const seen = new Map();
        data.forEach(r => {
            if (r.companyId != null && !seen.has(r.companyId)) {
                seen.set(r.companyId, r.companyName || `Company ${r.companyId}`);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    const filteredRows = useMemo(() => {
        if (companyOptions.length === 1) return data;
        if (companyFilter === 'ALL') return data;
        return data.filter(r => String(r.companyId) === String(companyFilter));
    }, [data, companyFilter, companyOptions]);

    const aggregated = useMemo(() => {
        const map = new Map();
        filteredRows.forEach(r => {
            const key = `${r.productId}_${r.variationId ?? 'base'}`;
            if (!map.has(key)) {
                map.set(key, {
                    productName: r.productName,
                    sku: r.variationSku || r.productSku || 'N/A',
                    upc: r.variationUpc || r.productUpc || 'N/A',
                    variationName: r.variationName || '',
                    totalStock: 0, delivered: 0, totalSales: 0,
                    pendingDelivery: 0, pendingSale: 0, available: 0,
                });
            }
            const e = map.get(key);
            e.totalStock += Number(r.totalStock) || 0;
            e.delivered += Number(r.delivered) || 0;
            e.totalSales += Number(r.totalSales) || 0;
            e.pendingDelivery += Number(r.pendingDelivery) || 0;
            e.pendingSale += Number(r.pendingSale) || 0;
            e.available += Number(r.available) || 0;
        });
        return Array.from(map.values()).filter(row =>
            row.totalStock !== 0 ||
            row.delivered !== 0 ||
            row.totalSales !== 0 ||
            row.pendingDelivery !== 0 ||
            row.pendingSale !== 0 ||
            row.available !== 0
        );
    }, [filteredRows]);

    if (!isOpen) return null;

    const totals = {
        totalStock: sum(aggregated, 'totalStock'),
        delivered: sum(aggregated, 'delivered'),
        totalSales: sum(aggregated, 'totalSales'),
        pendingDelivery: sum(aggregated, 'pendingDelivery'),
        pendingSale: sum(aggregated, 'pendingSale'),
        available: sum(aggregated, 'available'),
    };

    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportNo = `CO-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

    const scopeLabel = companyOptions.length === 1
        ? companyOptions[0].name
        : companyFilter === 'ALL'
            ? 'All Selected Companies'
            : companyOptions.find(c => String(c.id) === String(companyFilter))?.name || 'Company';

    const truncate = (text, maxLength = 40) =>
        !text ? '' : (text.length > maxLength ? text.substring(0, maxLength) + '...' : text);

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Company Stock Summary</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding:15px; font-size:9pt; }
        .report-table { width:100%; border-collapse:collapse; font-size:7.5pt; table-layout:fixed; }
        .report-table th, .report-table td { border:1px solid #aaa; padding:5px 4px; }
        .report-table th { background:#E6F1FB; color:#0C447C; text-align:center; font-weight:bold; }
        .report-table td { text-align:right; }
        .product-cell { text-align:left !important; word-wrap:break-word; }
        .totals-row { background:#E6F1FB; color:#0C447C; font-weight:bold; }
        .clearfix::after { content:""; clear:both; display:table; }
        @media print { @page { size: landscape; margin:10mm; } }
      </style></head>
      <body>${printContent}</body></html>
    `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    };

    const handleExportExcel = () => {
        const rows = aggregated.map(r => ({
            Product: truncate(r.productName), Variation: r.variationName,
            SKU: r.sku, UPC: r.upc,
            'Total Stock': r.totalStock, 'Delivered': r.delivered, 'Total Sales': r.totalSales,
            'Pending Delivery': r.pendingDelivery, 'Pending Sale': r.pendingSale, 'Available': r.available,
        }));
        rows.push({ Product: 'TOTAL', Variation: '', SKU: '', UPC: '', ...totals });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Company Stock Summary');
        XLSX.writeFile(wb, `Company_Stock_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const columns = [
        ['Total Stock', 'totalStock'], ['Delivered', 'delivered'], ['Total Sales', 'totalSales'],
        ['Pending Delivery', 'pendingDelivery'], ['Pending Sale', 'pendingSale'], ['Available', 'available'],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-h-[95vh] flex flex-col" style={{ width: '1300px', maxWidth: '98vw' }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 no-print">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Company Stock Summary</h2>
                        <p className="text-xs text-gray-500">{scopeLabel} · {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {companyOptions.length > 1 && (
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Companies</option>
                                {companyOptions.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={handlePrint} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Printer size={14} />Print / PDF
                        </button>
                        <button onClick={handleExportExcel} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <FileSpreadsheet size={14} />Excel
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                    </div>
                </div>

                <div className="overflow-auto flex-1 p-5" ref={printRef}>
                    <div className="clearfix" style={{ marginBottom: 15, borderBottom: '2px solid #185FA5', paddingBottom: 10 }}>
                        <div style={{ float: 'left' }}>
                            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#185FA5' }}>WiseCart Merchants Corp</div>
                            <div style={{ fontSize: '10pt', color: '#555', marginTop: 3 }}>{scopeLabel}</div>
                        </div>
                        <div style={{ float: 'right', textAlign: 'right', fontSize: '8pt', color: '#666' }}>
                            <div><strong>Period:</strong> {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</div>
                            <div><strong>Generated:</strong> {today}</div>
                            <div><strong>Report no.:</strong> {reportNo}</div>
                        </div>
                        <div style={{ clear: 'both' }}></div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', color: '#0C447C', margin: '15px 0 12px', textTransform: 'uppercase' }}>
                        Company Stock Summary
                    </div>

                    {aggregated.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">No data for the selected filters.</div>
                    ) : (
                        <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th className="product-cell" style={{ width: '22%', textAlign: 'left', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Product</th>
                                    <th style={{ width: '14%', textAlign: 'center', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>SKU/UPC</th>
                                    {columns.map(([label]) => (
                                        <th key={label} style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {aggregated.map((row, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                                        <td className="product-cell" style={{ textAlign: 'left', padding: '5px 4px', border: '1px solid #aaa' }}>
                                            <div style={{ fontSize: '7.5pt', fontWeight: 500 }}>{truncate(row.productName)}</div>
                                            {row.variationName && <div style={{ fontSize: '6.5pt', color: '#666' }}>{truncate(row.variationName, 35)}</div>}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '5px 4px', fontSize: '6.5pt', border: '1px solid #aaa' }}>
                                            <div>{row.sku}</div>
                                            {row.upc !== 'N/A' && <div style={{ color: '#888' }}>{row.upc}</div>}
                                        </td>
                                        {columns.map(([label, key]) => (
                                            <td key={key} style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row[key] || 0).toLocaleString()}</td>
                                        ))}
                                    </tr>
                                ))}
                                <tr className="totals-row" style={{ backgroundColor: '#E6F1FB', fontWeight: 'bold' }}>
                                    <td className="product-cell" style={{ padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>TOTAL</td>
                                    <td style={{ padding: '5px 4px', border: '1px solid #aaa' }}></td>
                                    {columns.map(([label, key]) => (
                                        <td key={key} style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{(totals[key] || 0).toLocaleString()}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    )}

                    <div style={{ marginTop: 15, paddingTop: 8, borderTop: '1px solid #ccc', fontSize: '6.5pt', color: '#999', textAlign: 'center' }}>
                        This report is computer-generated. Valid only when signed by an authorized representative.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchSummaryReportModal;