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
        stockIn: sum(data, 'stockIn'),
        transferIn: sum(data, 'transferIn'),
        transferOut: sum(data, 'transferOut'),
        returns: sum(data, 'returns'),
        damage: sum(data, 'damage'),
        qtyDelivered: sum(data, 'qtyDelivered'),
        drCount: sum(data, 'drCount'),
        qtySold: sum(data, 'qtySold'),
        totalValue: sum(data, 'totalValue'),
        stock: sum(data, 'stockOnHand'),
    };

    // Truncate long text
    const truncateText = (text, maxLength = 35) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Print function with professional layout
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
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            margin: 0;
                            padding: 15px;
                            background: white;
                            font-size: 9pt;
                            line-height: 1.3;
                        }
                        
                        .report-container {
                            max-width: 100%;
                            overflow-x: auto;
                        }
                        
                        .report-header {
                            margin-bottom: 15px;
                            border-bottom: 2px solid #185FA5;
                            padding-bottom: 10px;
                        }
                        
                        .company-info {
                            float: left;
                        }
                        
                        .company-name {
                            font-size: 14pt;
                            font-weight: bold;
                            color: #185FA5;
                            margin-bottom: 3px;
                        }
                        
                        .warehouse-name {
                            font-size: 10pt;
                            color: #555;
                        }
                        
                        .report-meta {
                            float: right;
                            text-align: right;
                            font-size: 8pt;
                            color: #666;
                        }
                        
                        .report-meta div {
                            margin-bottom: 2px;
                        }
                        
                        .report-title {
                            clear: both;
                            text-align: center;
                            font-size: 12pt;
                            font-weight: bold;
                            color: #0C447C;
                            margin: 15px 0 12px 0;
                            text-transform: uppercase;
                        }
                        
                        .report-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 8px;
                            font-size: 7pt;
                            table-layout: fixed;
                        }
                        
                        .report-table th,
                        .report-table td {
                            border: 1px solid #aaa;
                            padding: 5px 3px;
                            vertical-align: middle;
                        }
                        
                        .report-table th {
                            background-color: #E6F1FB;
                            color: #0C447C;
                            font-weight: bold;
                            text-align: center;
                            font-size: 7pt;
                            white-space: normal;
                            word-wrap: break-word;
                        }
                        
                        .report-table td {
                            text-align: right;
                            padding: 4px 3px;
                            font-size: 7pt;
                        }
                        
                        .report-table td.text-left,
                        .report-table th.text-left {
                            text-align: left;
                        }
                        
                        .product-cell {
                            text-align: left;
                            word-wrap: break-word;
                            word-break: break-word;
                            white-space: normal;
                            padding: 4px 3px;
                        }
                        
                        .product-name {
                            font-weight: 500;
                            font-size: 7pt;
                            margin-bottom: 2px;
                            line-height: 1.2;
                        }
                        
                        .variation-name {
                            font-size: 6pt;
                            color: #666;
                            margin-top: 1px;
                        }
                        
                        .stock-column {
                            background-color: #E6F1FB;
                            color: #0C447C;
                            font-weight: bold;
                        }
                        
                        .totals-row {
                            background-color: #E6F1FB;
                            color: #0C447C;
                            font-weight: bold;
                        }
                        
                        .totals-row td {
                            font-size: 7pt;
                            font-weight: bold;
                        }
                        
                        .report-footer {
                            margin-top: 15px;
                            padding-top: 8px;
                            border-top: 1px solid #ccc;
                            font-size: 6.5pt;
                            color: #999;
                            text-align: center;
                        }
                        
                        .page-number {
                            float: right;
                        }
                        
                        @media print {
                            @page {
                                size: landscape;
                                margin: 10mm;
                            }
                            body {
                                margin: 0;
                                padding: 8px;
                            }
                            .no-print {
                                display: none !important;
                            }
                            .report-table {
                                page-break-inside: avoid;
                            }
                            tr {
                                page-break-inside: avoid;
                                page-break-after: avoid;
                            }
                        }
                        
                        .clearfix::after {
                            content: "";
                            clear: both;
                            display: table;
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        ${printContent}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        document.title = originalTitle;
    };

    // Export to Excel
    const handleExportExcel = () => {
        const excelData = data.map(row => ({
            'Product': truncateText(row.productName, 40),
            'Variation': row.variationName || '',
            'Stock In': row.stockIn || 0,
            'Transfer In': row.transferIn || 0,
            'Transfer Out': row.transferOut || 0,
            'Returns': row.returns || 0,
            'Damage': row.damage || 0,
            'Delivery Qty': row.qtyDelivered || 0,
            'No. of DR': row.drCount || 0,
            'Qty Sold': row.qtySold || 0,
            'Total Value': row.totalValue || 0,
            'Stock': row.stockOnHand || 0,
            'Actual': '',
            'Remarks': '',
        }));

        if (data.length > 0) {
            excelData.push({
                'Product': 'TOTAL',
                'Variation': '',
                'Stock In': totals.stockIn,
                'Transfer In': totals.transferIn,
                'Transfer Out': totals.transferOut,
                'Returns': totals.returns,
                'Damage': totals.damage,
                'Delivery Qty': totals.qtyDelivered,
                'No. of DR': totals.drCount,
                'Qty Sold': totals.qtySold,
                'Total Value': totals.totalValue,
                'Stock': totals.stock,
                'Actual': '',
                'Remarks': '',
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
            { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
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
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <Printer size={14} />
                            Print / PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                        >
                            <FileSpreadsheet size={14} />
                            Excel
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Scrollable report body */}
                <div className="overflow-auto flex-1 p-5" ref={printRef}>
                    {/* Report header */}
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
                        <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{ width: '16%', textAlign: 'left', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Product</th>
                                    <th rowSpan="2" style={{ width: '5.5%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Stock In</th>
                                    <th rowSpan="2" style={{ width: '5.5%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Transfer In</th>
                                    <th rowSpan="2" style={{ width: '5.5%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Transfer Out</th>
                                    <th rowSpan="2" style={{ width: '5%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Returns</th>
                                    <th rowSpan="2" style={{ width: '5%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Damage</th>
                                    <th colSpan="2" style={{ textAlign: 'center', fontSize: '7pt', padding: '6px 4px' }}>Delivery</th>
                                    <th colSpan="2" style={{ textAlign: 'center', fontSize: '7pt', padding: '6px 4px' }}>Sales</th>
                                    <th rowSpan="2" style={{ width: '7%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px', backgroundColor: '#E6F1FB', color: '#0C447C' }}>Stock</th>
                                    <th rowSpan="2" style={{ width: '6%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Actual</th>
                                    <th rowSpan="2" style={{ width: '10%', textAlign: 'center', verticalAlign: 'middle', fontSize: '7pt', padding: '6px 4px' }}>Remarks</th>
                                </tr>
                                <tr>
                                    <th style={{ width: '5.5%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px' }}>Qty</th>
                                    <th style={{ width: '5.5%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px' }}>No. of DR</th>
                                    <th style={{ width: '5.5%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px' }}>Qty Sold</th>
                                    <th style={{ width: '7.5%', textAlign: 'center', fontSize: '6.5pt', padding: '5px 3px' }}>Total Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan="13" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                            No data available for the selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.map((row, i) => (
                                            <tr key={i} style={{ backgroundColor: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                                                <td className="product-cell" style={{ textAlign: 'left', padding: '5px 4px', wordWrap: 'break-word', wordBreak: 'break-word' }}>
                                                    <div className="product-name" style={{ fontSize: '7.5pt', fontWeight: 500, lineHeight: 1.3 }}>{truncateText(row.productName, 45)}</div>
                                                    {row.variationName && (
                                                        <div className="variation-name" style={{ fontSize: '6.5pt', color: '#666', marginTop: '2px' }}>{truncateText(row.variationName, 35)}</div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.stockIn?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.transferIn?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.transferOut?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.returns?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.damage?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.qtyDelivered?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.drCount?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{row.qtySold?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{formatPeso(row.totalValue)}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px', fontWeight: 'bold', backgroundColor: '#E6F1FB', color: '#0C447C' }}>
                                                    {row.stockOnHand?.toLocaleString() || 0}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '5px 4px' }}>-</td>
                                                <td style={{ textAlign: 'left', padding: '5px 4px', fontSize: '6.5pt', fontStyle: 'italic', color: '#999' }}>-</td>
                                            </tr>
                                        ))}
                                        {/* Totals row */}
                                        {data.length > 0 && (
                                            <tr className="totals-row" style={{ backgroundColor: '#E6F1FB', fontWeight: 'bold' }}>
                                                <td style={{ textAlign: 'left', padding: '5px 4px' }}>TOTAL</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.stockIn.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.transferIn.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.transferOut.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.returns.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.damage.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.qtyDelivered.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.drCount.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{totals.qtySold.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px' }}>{formatPeso(totals.totalValue)}</td>
                                                <td style={{ textAlign: 'right', padding: '5px 4px', fontWeight: 'bold', backgroundColor: '#E6F1FB', color: '#0C447C' }}>
                                                    {totals.stock.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '5px 4px' }}>-</td>
                                                <td style={{ textAlign: 'left', padding: '5px 4px' }}>-</td>
                                            </tr>
                                        )}
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