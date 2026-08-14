import React from 'react';

const WarehouseReportInlineTable = ({ rows = [], loading }) => {
  const cols = [
    ['Beg. Stock', 'begStock', 'bg-gray-100'],
    ['Stock In', 'stockIn', 'bg-green-50'],
    ['Transfer In', 'transferIn', 'bg-indigo-50'],
    ['Transfer Out', 'transferOut', 'bg-blue-50'],
    ['Returns', 'returns', 'bg-yellow-50'],
    ['Damage', 'damage', 'bg-red-50'],
    ['Adjustment', 'adjustment', 'bg-orange-50'],
    ['Delivery Qty', 'qtyDelivered', 'bg-teal-50'],
    ['No. of DR', 'drCount', 'bg-teal-50'],
    ['Stock Qty', 'stockOnHand', 'bg-sky-100 font-semibold'],
  ];

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Warehouse Product Summary</h2>
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
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-8 text-center text-gray-500">No data for the selected filters</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="hover:bg-gray-50">
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

export default WarehouseReportInlineTable;