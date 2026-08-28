import React from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date) ? '' : date.toLocaleString();
};

const buildRows = (data) => data.map(s => {
  const sku = s.variationSku || s.productSku || s.sku || 'N/A';
  const upc = s.variationUpc || s.productUpc || s.upc || 'N/A';
  const available = s.availableQuantity != null
    ? s.availableQuantity
    : Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0));
  return {
    branch: s.branchName || '', branchCode: s.branchCode || '',
    product: s.fullProductName || s.productName || '',
    variation: s.combinationDisplay || s.variationName || '',
    sku, upc,
    totalStock: s.quantity || 0,
    delivered: s.deliveredQuantity || 0,
    totalSales: s.totalSales || 0,
    pendingDelivery: s.pendingDeliveries || 0,
    pendingSale: s.pendingSales || 0,
    available,
    lastUpdated: fmtDate(s.lastUpdated),
  };
});

const sumCol = (rows, key) => rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);

const BranchStockExportButton = ({ data = [] }) => {
  const rows = buildRows(data);
  const totals = {
    totalStock: sumCol(rows, 'totalStock'),
    delivered: sumCol(rows, 'delivered'),
    totalSales: sumCol(rows, 'totalSales'),
    pendingDelivery: sumCol(rows, 'pendingDelivery'),
    pendingSale: sumCol(rows, 'pendingSale'),
    available: sumCol(rows, 'available'),
  };

  const handleExportCSV = () => {
    const headers = ['Branch', 'Branch Code', 'Product', 'Variation', 'SKU', 'UPC',
      'Total Stock', 'Delivered', 'Total Sales', 'Pending Delivery', 'Pending Sale', 'Available', 'Last Updated'];
    const lines = rows.map(r => [
      r.branch, r.branchCode, r.product, r.variation, r.sku, r.upc,
      r.totalStock, r.delivered, r.totalSales, r.pendingDelivery, r.pendingSale, r.available, r.lastUpdated
    ]);
    lines.push(['TOTAL', '', '', '', '', '',
      totals.totalStock, totals.delivered, totals.totalSales,
      totals.pendingDelivery, totals.pendingSale, totals.available, '']);

    const csv = [headers, ...lines]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Company_Stock_Levels_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const tableRows = rows.map(r => `
      <tr>
        <td class="left">${r.branch}<br/><span class="sub">${r.branchCode}</span></td>
        <td class="left">${r.product}${r.variation ? `<br/><span class="sub">${r.variation}</span>` : ''}</td>
        <td class="left">${r.sku}<br/><span class="sub">${r.upc}</span></td>
        <td>${r.totalStock.toLocaleString()}</td>
        <td>${r.delivered.toLocaleString()}</td>
        <td>${r.totalSales.toLocaleString()}</td>
        <td>${r.pendingDelivery.toLocaleString()}</td>
        <td>${r.pendingSale.toLocaleString()}</td>
        <td>${r.available.toLocaleString()}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html><html><head><title>Company Stock Levels</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding:15px; font-size:9pt; }
        h1 { font-size:13pt; color:#0C447C; margin-bottom:4px; }
        .meta { font-size:8pt; color:#666; margin-bottom:12px; }
        table { width:100%; border-collapse:collapse; font-size:7.5pt; }
        th, td { border:1px solid #aaa; padding:5px 4px; text-align:right; }
        th { background:#E6F1FB; color:#0C447C; }
        td.left { text-align:left; }
        .sub { color:#888; font-size:6.5pt; }
        tfoot td { background:#E6F1FB; color:#0C447C; font-weight:bold; }
        @media print { @page { size: landscape; margin:10mm; } }
      </style></head>
      <body>
        <h1>Company Stock Levels</h1>
        <div class="meta">Generated: ${today} &middot; ${rows.length} record(s)</div>
        <table>
          <thead><tr>
            <th class="left">Branch</th><th class="left">Product</th><th class="left">SKU/UPC</th>
            <th>Total Stock</th><th>Delivered</th><th>Total Sales</th>
            <th>Pending Delivery</th><th>Pending Sale</th><th>Available</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr>
            <td class="left" colspan="3">TOTAL</td>
            <td>${totals.totalStock.toLocaleString()}</td>
            <td>${totals.delivered.toLocaleString()}</td>
            <td>${totals.totalSales.toLocaleString()}</td>
            <td>${totals.pendingDelivery.toLocaleString()}</td>
            <td>${totals.pendingSale.toLocaleString()}</td>
            <td>${totals.available.toLocaleString()}</td>
          </tr></tfoot>
        </table>
      </body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportCSV}
        disabled={rows.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <FileSpreadsheet size={16} />
        <span>Export CSV</span>
      </button>
      <button
        onClick={handleExportPDF}
        disabled={rows.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        <Printer size={16} />
        <span>Print / PDF</span>
      </button>
    </div>
  );
};

export default BranchStockExportButton;