import React from 'react';
import { X, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const StatusProductsModal = ({ selectedStatus, productsByStatus, loading, onClose }) => {
  const products = productsByStatus[selectedStatus?.toLowerCase()] || [];

  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAmt = products.reduce((sum, p) => sum + p.amount, 0);

  const handleExportCSV = () => {
    const csvRows = [
      ['Product', 'Variation', 'SKU', 'UPC', 'Quantity', 'Unit Price', 'Amount'],
      ...products.map(p => [p.productName, p.variationDisplay, p.sku, p.upc, p.quantity, p.unitPrice, p.amount]),
      [],
      ['TOTAL', '', '', '', totalQty, '', totalAmt],
    ];
    const csv = csvRows.map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStatus}_products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Products exported successfully!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const rows = products.map((p, i) => `
      <tr>
        <td>${i + 1}</td><td>${p.productName}</td><td>${p.variationDisplay}</td>
        <td>${p.sku}</td><td>${p.upc}</td>
        <td style="text-align:right">${p.quantity.toLocaleString()}</td>
        <td style="text-align:right">₱${p.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">₱${p.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${selectedStatus} Products</title>
      <style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style>
    </head><body><h2>${selectedStatus} Sales — All Products</h2>
    <table><thead><tr><th>#</th><th>Product</th><th>Variation</th><th>SKU</th><th>UPC</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const statusLabels = { PENDING: 'Pending', CONFIRMED: 'Confirmed', INVOICED: 'Invoiced' };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{statusLabels[selectedStatus]} Sales — All Products</h2>
            <p className="text-sm text-gray-500 mt-1">
              Total Products: {products.length} | Total Quantity: {totalQty.toLocaleString()} |
              Total Amount: ₱{totalAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                {['#', 'Product', 'Variation', 'SKU', 'UPC', 'Qty', 'Unit Price', 'Amount'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${['Qty', 'Unit Price', 'Amount'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded" /></td>)}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">No products found</td></tr>
              ) : (
                products.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{product.productName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.variationDisplay !== 'No variation' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                        {product.variationDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{product.upc}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{product.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₱{product.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">₱{product.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-700">TOTALS:</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{totalQty.toLocaleString()}</td>
                <td />
                <td className="px-4 py-3 text-right font-bold text-blue-700">₱{totalAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <FileText size={16} className="inline mr-2" /> Export CSV
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Printer size={16} className="inline mr-2" /> Print
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
};

export default StatusProductsModal;