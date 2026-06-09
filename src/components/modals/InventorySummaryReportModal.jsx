import React, { useRef } from 'react';
import { X, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const fmt = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};

const formatPeso = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 });

const sum = (arr, key) => arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

const InventorySummaryReportModal = ({ isOpen, onClose, data = [], filters, warehouses = [] }) => {
    const printRef = useRef();

    if (!isOpen) return null;

    const warehouseName = warehouses.find(w => String(w.id) === String(filters.warehouse))?.warehouseName || 'All Warehouses';
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportNo = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

    const totals = {
        begStock: sum(data, 'begStock'),
        stockIn: sum(data, 'stockIn'),
        transferIn: sum(data, 'transferIn'),
        transferOut: sum(data, 'transferOut'),
        returns: sum(data, 'returns'),
        damage: sum(data, 'damage'),
        adjustment: sum(data, 'adjustment'),
        qtyDelivered: sum(data, 'qtyDelivered'),
        drCount: sum(data, 'drCount'),
        stockOnHand: sum(data, 'stockOnHand'),
    };

    const truncateText = (text, maxLength = 35) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const originalTitle = document.title;
        document.title = `Inventory_Summary_${warehouseName}_${new Date().toISOString().split('T')[0]}`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Inventory Summary Report</title>
                    <meta charset="UTF-8">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            margin: 0; padding: 15px;
                            background: white; font-size: 9pt; line-height: 1.3;
                        }
                        .report-header { margin-bottom: 15px; border-bottom: 2px solid #185FA5; padding-bottom: 10px; }
                        .company-name { font-size: 14pt; font-weight: bold; color: #185FA5; margin-bottom: 3px; }
                        .report-meta { float: right; text-align: right; font-size: 8pt; color: #666; }
                        .report-meta div { margin-bottom: 2px; }
                        .report-title {
                            clear: both; text-align: center; font-size: 12pt;
                            font-weight: bold; color: #0C447C;
                            margin: 15px 0 12px 0; text-transform: uppercase;
                        }
                        .report-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 7pt; table-layout: fixed; }
                        .report-table th, .report-table td { border: 1px solid #aaa; padding: 5px 3px; vertical-align: middle; }
                        .report-table th {
                            background-color: #E6F1FB; color: #0C447C;
                            font-weight: bold; text-align: center; font-size: 7pt;
                        }
                        .report-table td { text-align: right; padding: 4px 3px; font-size: 7pt; }
                        .product-cell { text-align: left !important; word-wrap: break-word; word-break: break-word; }
                        .stock-column { background-color: #E6F1FB; color: #0C447C; font-weight: bold; }
                        .totals-row { background-color: #E6F1FB; color: #0C447C; font-weight: bold; }
                        .report-footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 6.5pt; color: #999; text-align: center; }
                        .clearfix::after { content: ""; clear: both; display: table; }
                        @media print {
                            @page { size: landscape; margin: 10mm; }
                            body { margin: 0; padding: 8px; }
                        }
                    </style>
                </head>
                <body><div class="report-container">${printContent}</div></body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        document.title = originalTitle;
    };

    const handleExportExcel = () => {
        const excelData = data.map(row => ({
            'Product': truncateText(row.productName, 40),
            'Variation': row.variationName || '',
            'Beg. Stock': row.begStock || 0,
            'Stock In': row.stockIn || 0,
            'Transfer In': row.transferIn || 0,
            'Transfer Out': row.transferOut || 0,
            'Returns': row.returns || 0,
            'Damage': row.damage || 0,
            'Adjustment': row.adjustment || 0,
            'Delivery Qty': row.qtyDelivered || 0,
            'No. of DR': row.drCount || 0,
            'Stock on Hand': row.stockOnHand || 0,
            'Actual': '',
            'Remarks': '',
        }));

        if (data.length > 0) {
            excelData.push({
                'Product': 'TOTAL',
                'Variation': '',
                'Beg. Stock': totals.begStock,
                'Stock In': totals.stockIn,
                'Transfer In': totals.transferIn,
                'Transfer Out': totals.transferOut,
                'Returns': totals.returns,
                'Damage': totals.damage,
                'Adjustment': totals.adjustment,
                'Delivery Qty': totals.qtyDelivered,
                'No. of DR': totals.drCount,
                'Stock on Hand': totals.stockOnHand,
                'Actual': '',
                'Remarks': '',
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
            { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            { wch: 12 }, { wch: 12 }, { wch: 20 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory Summary');
        const fileName = `Inventory_Summary_${warehouseName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] max-h-[95vh] flex flex-col" style={{ width: '1400px', maxWidth: '98vw' }}>
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 no-print">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Inventory Summary Report</h2>
                        <p className="text-xs text-gray-500">{warehouseName} · {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Printer size={14} />Print / PDF
                        </button>
                        <button onClick={handleExportExcel} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                            <FileSpreadsheet size={14} />Excel
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                    </div>
                </div>

                {/* Report body */}
                <div className="overflow-auto flex-1 p-5" ref={printRef}>
                    {/* Header */}
                    <div className="clearfix" style={{ marginBottom: '15px', borderBottom: '2px solid #185FA5', paddingBottom: '10px' }}>
                        <div style={{ float: 'left' }}>
                            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#185FA5' }}>WiseCart Merchants Corp</div>
                            <div style={{ fontSize: '10pt', color: '#555', marginTop: '3px' }}>{warehouseName}</div>
                        </div>
                        <div style={{ float: 'right', textAlign: 'right', fontSize: '8pt', color: '#666' }}>
                            <div><strong>Period:</strong> {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</div>
                            <div><strong>Generated:</strong> {today}</div>
                            <div><strong>Report no.:</strong> {reportNo}</div>
                        </div>
                        <div style={{ clear: 'both' }}></div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', color: '#0C447C', margin: '15px 0 12px', textTransform: 'uppercase' }}>
                        Inventory Summary Report
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    {/* Product */}
                                    <th rowSpan="2" style={{ width: '18%', textAlign: 'left', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Product</th>
                                    {/* Beg. Stock */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Beg. Stock</th>
                                    {/* Stock In */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Stock In</th>
                                    {/* Transfer In */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Transfer In</th>
                                    {/* Transfer Out */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Transfer Out</th>
                                    {/* Returns */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Returns</th>
                                    {/* Damage */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Damage</th>
                                    {/* Adjustment */}
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#FFF3E0', color: '#E65100' }}>Adjustment</th>
                                    {/* Delivery (grouped header) */}
                                    <th colSpan="2" style={{ textAlign: 'center', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Delivery</th>
                                    {/* Stock on Hand — blank input column (was "Actual") */}
                                    <th rowSpan="2" style={{ width: '7%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#C8DCEF', color: '#0C447C', fontWeight: 'bold' }}>Actual</th>
                                    <th rowSpan="2" style={{ width: '7%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#C8DCEF', color: '#0C447C', fontWeight: 'bold' }}>Stock on Hand</th>

                                    {/* Remarks */}
                                    <th rowSpan="2" style={{ width: '10%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Remarks</th>
                                </tr>
                                <tr>
                                    {/* Delivery sub-columns */}
                                    <th style={{ width: '6%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>Qty</th>
                                    <th style={{ width: '6%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px', border: '1px solid #aaa', background: '#E6F1FB', color: '#0C447C' }}>No. of DR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" style={{ textAlign: 'center', padding: '30px', color: '#888', border: '1px solid #aaa' }}>
                                            No data available for the selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.map((row, i) => (
                                            <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                                                {/* Product name + variation */}
                                                <td style={{ textAlign: 'left', padding: '5px 4px', wordWrap: 'break-word', wordBreak: 'break-word', border: '1px solid #aaa' }}>
                                                    <div style={{ fontSize: '7.5pt', fontWeight: 500, lineHeight: 1.3 }}>{truncateText(row.productName, 45)}</div>
                                                    {row.variationName && (
                                                        <div style={{ fontSize: '6.5pt', color: '#666', marginTop: '2px' }}>{truncateText(row.variationName, 35)}</div>
                                                    )}
                                                </td>
                                                {/* Beg. Stock */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.begStock || 0).toLocaleString()}</td>
                                                {/* Stock In */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.stockIn || 0).toLocaleString()}</td>
                                                {/* Transfer In */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.transferIn || 0).toLocaleString()}</td>
                                                {/* Transfer Out */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.transferOut || 0).toLocaleString()}</td>
                                                {/* Returns */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.returns || 0).toLocaleString()}</td>
                                                {/* Damage */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.damage || 0).toLocaleString()}</td>
                                                {/* Adjustment */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: (row.adjustment || 0) !== 0 ? '#E65100' : 'inherit' }}>{(row.adjustment || 0).toLocaleString()}</td>
                                                {/* Delivery Qty */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.qtyDelivered || 0).toLocaleString()}</td>
                                                {/* No. of DR — FIXED: was showing qtyDelivered again */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa' }}>{(row.drCount || 0).toLocaleString()}</td>
                                                {/* Stock on Hand — blank, for manual counting input */}
                                                {/* Stock on Hand — computed */}
                                                <td style={{ textAlign: 'right', padding: '5px 4px', fontWeight: 'bold', backgroundColor: '#C8DCEF', color: '#0C447C', border: '1px solid #aaa' }}>
                                                    {(row.stockOnHand || 0).toLocaleString()}
                                                </td>
                                                {/* Actual — blank for manual input */}
                                                <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #aaa' }}></td>
                                                {/* Remarks */}
                                                <td style={{ textAlign: 'left', padding: '5px 4px', fontSize: '6.5pt', fontStyle: 'italic', color: '#999', border: '1px solid #aaa' }}></td>
                                            </tr>
                                        ))}
                                        {/* Totals row */}
                                        <tr style={{ backgroundColor: '#E6F1FB', fontWeight: 'bold' }}>
                                            <td style={{ textAlign: 'left', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>TOTAL</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.begStock.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.stockIn.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.transferIn.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.transferOut.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.returns.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.damage.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#E65100', fontWeight: 'bold' }}>{totals.adjustment.toLocaleString()}</td>
                                            {/* Delivery totals */}
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.qtyDelivered.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}>{totals.drCount.toLocaleString()}</td>
                                            {/* Stock on Hand total — computed */}
                                            <td style={{ textAlign: 'right', padding: '5px 4px', fontWeight: 'bold', backgroundColor: '#C8DCEF', color: '#0C447C', border: '1px solid #aaa' }}>
                                                {totals.stockOnHand.toLocaleString()}
                                            </td>
                                            {/* Actual total — blank */}
                                            <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}></td>
                                            {/* Remarks total — blank */}
                                            <td style={{ textAlign: 'left', padding: '5px 4px', border: '1px solid #aaa', color: '#0C447C' }}></td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '15px', paddingTop: '8px', borderTop: '1px solid #ccc', fontSize: '6.5pt', color: '#999', textAlign: 'center' }}>
                        <span>This report is computer-generated. Valid only when signed by an authorized representative.</span>
                        <span style={{ float: 'right' }}>Page 1 of 1</span>
                        <div style={{ clear: 'both' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventorySummaryReportModal;