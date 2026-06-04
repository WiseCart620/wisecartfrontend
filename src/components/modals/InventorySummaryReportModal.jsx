import React, { useRef } from 'react';
import { X } from 'lucide-react';

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
    if (!isOpen) return null;

    const warehouseName = warehouses.find(w => String(w.id) === String(filters.warehouse))?.name || 'All Warehouses';
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportNo = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

    const totals = {
        stockIn: sum(data, 'stockIn'),
        transferOut: sum(data, 'transferOut'),
        returns: sum(data, 'returns'),
        damage: sum(data, 'damage'),
        qtyDelivered: sum(data, 'qtyDelivered'),
        drCount: sum(data, 'drCount'),
        qtySold: sum(data, 'qtySold'),
        totalValue: sum(data, 'totalValue'),
        begStock: sum(data, 'begStock'),
        endStock: sum(data, 'endStock'),
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
                {/* Modal header — hidden on print */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 print:hidden">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Inventory Summary Report</h2>
                        <p className="text-xs text-gray-500">{warehouseName} · {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-1.5 text-sm bg-[#185FA5] text-white rounded-lg hover:bg-[#0C447C] transition"
                        >
                            Print
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Scrollable report body */}
                <div className="overflow-auto flex-1 p-5" id="report-print-area">
                    {/* Report header */}
                    <div className="flex justify-between items-start border-b-2 border-[#185FA5] pb-3 mb-4">
                        <div>
                            <div className="text-sm font-medium text-gray-800">MerchantCo Philippines, Inc.</div>
                            <div className="text-xs text-gray-500 mt-0.5">{warehouseName}</div>
                        </div>
                        <div className="text-right text-xs text-gray-500 leading-6">
                            <div><span className="font-medium text-gray-700">Period:</span> {fmt(filters.dateFrom)} – {fmt(filters.dateTo)}</div>
                            <div><span className="font-medium text-gray-700">Generated:</span> {today}</div>
                            <div><span className="font-medium text-gray-700">Report no.:</span> {reportNo}</div>
                        </div>
                    </div>

                    <div className="text-xs font-medium text-[#0C447C] mb-3 tracking-wide uppercase">Inventory Summary Report</div>

                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed', minWidth: '780px' }}>
                            <thead>
                                <tr>
                                    <th rowSpan={2} style={thBase({ width: '14%', textAlign: 'left', verticalAlign: 'middle' })}>Product</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>Stock In</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>Transfer Out</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>Returns</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>Damage</th>
                                    <th colSpan={2} style={thGroup('#E1F5EE', '#085041')}>Delivery</th>
                                    <th colSpan={2} style={thGroup('#FAEEDA', '#633806')}>Sales</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>Beg. Stock</th>
                                    <th rowSpan={2} style={thBase({ width: '6%' })}>End Stock</th>
                                    <th colSpan={2} style={thGroup('#EEEDFE', '#3C3489')}>Physical Count</th>
                                    <th rowSpan={2} style={{ ...thBase({ width: '10%' }), background: '#EEEDFE', color: '#3C3489', verticalAlign: 'middle' }}>Remarks</th>
                                </tr>
                                <tr>
                                    <th style={thSub('#E1F5EE', '#085041')}>Qty</th>
                                    <th style={thSub('#E1F5EE', '#085041')}>No. of DR</th>
                                    <th style={thSub('#FAEEDA', '#633806')}>Qty Sold</th>
                                    <th style={thSub('#FAEEDA', '#633806')}>Total Value</th>
                                    <th style={thSub('#EEEDFE', '#3C3489')}>Actual</th>
                                    <th style={thSub('#EEEDFE', '#3C3489')}>Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '12px' }}>
                                            No data available for the selected filters.
                                        </td>
                                    </tr>
                                ) : data.map((row, i) => (
                                    <tr key={i} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                                        <td style={tdLeft}>{row.productName}</td>
                                        <td style={tdCenter}>{row.stockIn}</td>
                                        <td style={tdCenter}>{row.transferOut}</td>
                                        <td style={tdCenter}>{row.returns}</td>
                                        <td style={tdCenter}>{row.damage}</td>
                                        <td style={tdCenter}>{row.qtyDelivered}</td>
                                        <td style={tdCenter}>{row.drCount}</td>
                                        <td style={tdCenter}>{row.qtySold}</td>
                                        <td style={tdCenter}>{formatPeso(row.totalValue)}</td>
                                        <td style={tdCenter}>{row.begStock}</td>
                                        <td style={tdCenter}>{row.endStock}</td>
                                        <td style={tdCenter}></td>
                                        <td style={tdCenter}></td>
                                        <td style={{ ...tdCenter, fontStyle: 'italic', color: '#9CA3AF', fontSize: '10px' }}></td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                {data.length > 0 && (
                                    <tr style={{ background: '#E6F1FB', color: '#0C447C', fontWeight: 500 }}>
                                        <td style={tdLeft}>Total</td>
                                        <td style={tdCenter}>{totals.stockIn.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.transferOut.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.returns.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.damage.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.qtyDelivered.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.drCount.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.qtySold.toLocaleString()}</td>
                                        <td style={tdCenter}>{formatPeso(totals.totalValue)}</td>
                                        <td style={tdCenter}>{totals.begStock.toLocaleString()}</td>
                                        <td style={tdCenter}>{totals.endStock.toLocaleString()}</td>
                                        <td style={tdCenter}></td>
                                        <td style={tdCenter}></td>
                                        <td></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 flex justify-between border-t border-gray-200 pt-2">
                        <p className="text-[10px] text-gray-400">This report is computer-generated. Valid only when signed by an authorized representative.</p>
                        <p className="text-[10px] text-gray-400">Page 1 of 1</p>
                    </div>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
        @media print {
          body > *:not(#report-print-area) { display: none !important; }
          .print\\:hidden { display: none !important; }
          #report-print-area { overflow: visible !important; }
        }
      `}</style>
        </div>
    );
};

// Style helpers
const border = '0.5px solid #B5D4F4';
const thBase = (extra = {}) => ({
    background: '#E6F1FB', color: '#0C447C', fontWeight: 500,
    padding: '6px', textAlign: 'center', border,
    fontSize: '10px', verticalAlign: 'middle', ...extra
});
const thGroup = (bg, color) => ({
    background: bg, color, fontWeight: 500,
    padding: '6px', textAlign: 'center', border, fontSize: '10px'
});
const thSub = (bg, color) => ({
    background: bg, color, fontWeight: 500,
    padding: '6px', textAlign: 'center', border, fontSize: '10px'
});
const tdCenter = { padding: '5px 6px', border: '0.5px solid #E5E7EB', textAlign: 'center', fontSize: '11px' };
const tdLeft = { ...tdCenter, textAlign: 'left' };

export default InventorySummaryReportModal;