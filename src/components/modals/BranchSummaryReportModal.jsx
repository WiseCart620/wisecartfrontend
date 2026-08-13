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

const BranchSummaryReportModal = ({ isOpen, onClose, data = [], filters, companies = [] }) => {
  const printRef = useRef();
  const [companyFilter, setCompanyFilter] = useState('ALL');

  const companyOptions = useMemo(() => {
    const seen = new Map();
    data.forEach(r => {
      if (r.companyId != null && !seen.has(r.companyId)) {
        seen.set(r.companyId, r.companyName || companies.find(c => c.id === r.companyId)?.companyName || `Company ${r.companyId}`);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data, companies]);

  const filteredRows = useMemo(() => {
    if (companyFilter === 'ALL') return data;
    return data.filter(r => String(r.companyId) === String(companyFilter));
  }, [data, companyFilter]);

  const aggregated = useMemo(() => {
    const map = new Map();
    filteredRows.forEach(r => {
      const key = `${r.productId}_${r.variationId ?? 'base'}`;
      if (!map.has(key)) {
        map.set(key, {
          productName: r.productName,
          variationName: r.variationName || '',
          stockIn: 0, transferOut: 0, returns: 0, damage: 0, cancelledReturns: 0,
          delivered: 0, totalSales: 0, pendingDelivery: 0, pendingSale: 0,
          totalStock: 0, available: 0,
        });
      }
      const entry = map.get(key);
      entry.stockIn += Number(r.stockIn) || 0;
      entry.transferOut += Number(r.transferOut) || 0;
      entry.returns += Number(r.returns) || 0;
      entry.damage += Number(r.damage) || 0;
      entry.cancelledReturns += Number(r.cancelledReturns) || 0;
      entry.delivered += Number(r.delivered) || 0;
      entry.totalSales += Number(r.totalSales) || 0;
      entry.pendingDelivery += Number(r.pendingDelivery) || 0;
      entry.pendingSale += Number(r.pendingSale) || 0;
      entry.totalStock += Number(r.totalStock) || 0;
      entry.available += Number(r.available) || 0;
    });
    return Array.from(map.values());
  }, [filteredRows]);

  if (!isOpen) return null;

  const totals = {
    stockIn: sum(aggregated, 'stockIn'),
    transferOut: sum(aggregated, 'transferOut'),
    returns: sum(aggregated, 'returns'),
    damage: sum(aggregated, 'damage'),
    cancelledReturns: sum(aggregated, 'cancelledReturns'),
    delivered: sum(aggregated, 'delivered'),
    totalSales: sum(aggregated, 'totalSales'),
    pendingDelivery: sum(aggregated, 'pendingDelivery'),
    pendingSale: sum(aggregated, 'pendingSale'),
    totalStock: sum(aggregated, 'totalStock'),
    available: sum(aggregated, 'available'),
  };

  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const scopeLabel = companyFilter === 'ALL'
    ? 'All Selected Companies'
    : companyOptions.find(c => String(c.id) === String(companyFilter))?.name || 'Company';

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Company Stock Summary</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding:15px; font-size:9pt; }
        table { width:100%; border-collapse:collapse; font-size:7pt; }
        th, td { border:1px solid #aaa; padding:5px 3px; }
        th { background:#E6F1FB; color:#0C447C; text-align:center; }
        td { text-align:right; }
        .product-cell { text-align:left !important; }
        .totals-row { background:#E6F1FB; font-weight:bold; }
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
      Product: r.productName, Variation: r.variationName,
      'Stock In': r.stockIn, 'Transfer Out': r.transferOut, 'Return': r.returns, 'Damage': r.damage,
      'Cancelled Returns': r.cancelledReturns, 'Delivered': r.delivered, 'Total Sales': r.totalSales,
      'Pending Delivery': r.pendingDelivery, 'Pending Sale': r.pendingSale,
      'Total Stock': r.totalStock, 'Available': r.available,
    }));
    rows.push({ Product: 'TOTAL', Variation: '', ...totals });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Company Stock Summary');
    XLSX.writeFile(wb, `Company_Stock_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    ['Stock In', 'stockIn'], ['Transfer Out', 'transferOut'], ['Return', 'returns'], ['Damage', 'damage'],
    ['Cancelled Returns', 'cancelledReturns'], ['Delivered', 'delivered'], ['Total Sales', 'totalSales'],
    ['Pending Delivery', 'pendingDelivery'], ['Pending Sale', 'pendingSale'],
    ['Total Stock', 'totalStock'], ['Available', 'available'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-h-[95vh] flex flex-col" style={{ width: '1400px', maxWidth: '98vw' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
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
          <div style={{ marginBottom: 15, borderBottom: '2px solid #185FA5', paddingBottom: 10 }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#185FA5' }}>WiseCart Merchants Corp</div>
            <div style={{ fontSize: '10pt', color: '#555' }}>{scopeLabel}</div>
            <div style={{ fontSize: '8pt', color: '#666', marginTop: 4 }}>
              Period: {fmt(filters.dateFrom)} – {fmt(filters.dateTo)} · Generated: {today}
            </div>
          </div>

          {aggregated.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No data for the selected filters.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="product-cell">Product</th>
                  {columns.map(([label]) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => (
                  <tr key={i}>
                    <td className="product-cell">
                      {row.productName}
                      {row.variationName && <span style={{ color: '#666', marginLeft: 6, fontSize: '6.5pt' }}>({row.variationName})</span>}
                    </td>
                    {columns.map(([label, key]) => (
                      <td key={key}>{(row[key] || 0).toLocaleString()}</td>
                    ))}
                  </tr>
                ))}
                <tr className="totals-row">
                  <td className="product-cell">TOTAL</td>
                  {columns.map(([label, key]) => (
                    <td key={key}>{(totals[key] || 0).toLocaleString()}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchSummaryReportModal;