import React, { useMemo } from 'react';

const BranchReportInlineTable = ({ rows = [], loading }) => {
  const aggregated = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
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
  }, [rows]);

  const cols = [
    ['Total Stock', 'totalStock', 'bg-sky-100 font-semibold'],
    ['Delivered', 'delivered', 'bg-teal-50'],
    ['Total Sales', 'totalSales', 'bg-pink-50'],
    ['Pending Delivery', 'pendingDelivery', 'bg-orange-50'],
    ['Pending Sale', 'pendingSale', 'bg-purple-50'],
    ['Available', 'available', 'bg-green-50'],
  ];

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Company Product Summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
              {cols.map(([label, key, colorClass]) => (
                <th key={label} className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase ${colorClass || ''}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              </td></tr>
            ) : aggregated.length === 0 ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-8 text-center text-gray-500">No data for the selected filters</td></tr>
            ) : (
              aggregated.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 text-sm">{row.productName}</div>
                    {row.variationName && <div className="text-xs text-blue-600">{row.variationName}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>SKU: {row.sku}</div>
                    {row.upc !== 'N/A' && <div className="text-gray-500">UPC: {row.upc}</div>}
                  </td>
                  {cols.map(([label, key, colorClass]) => (
                    <td key={key} className={`px-2 py-3 text-center text-sm ${colorClass || ''}`}>{(row[key] || 0).toLocaleString()}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchReportInlineTable;