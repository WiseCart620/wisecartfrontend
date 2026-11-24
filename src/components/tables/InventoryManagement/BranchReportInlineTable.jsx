import React, { useMemo } from 'react';
import {
  Package, Barcode, Layers, ArrowDownToLine, Undo2, CheckCircle2,
  ShoppingCart, Truck, Clock, Boxes, PackageCheck,
} from 'lucide-react';
import HeaderIcon from '../../common/HeaderIcon';

const BranchReportInlineTable = ({ rows = [], loading, hasDateFilter = false }) => {
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
          companySkus: new Set(),
          begStock: 0, transferIn: 0, returns: 0, delivered: 0, totalSales: 0,
          pendingDelivery: 0, pendingSale: 0, stockOnHand: 0, availableStock: 0,
          periodStock: 0, periodAvailableStock: 0,
        });
      }
      const e = map.get(key);
      if (r.companySku) e.companySkus.add(r.companySku);
      e.begStock += Number(r.begStock) || 0;
      e.transferIn += Number(r.transferIn) || 0;
      e.returns += Number(r.returns) || 0;
      e.delivered += Number(r.delivered) || 0;
      e.totalSales += Number(r.totalSales) || 0;
      e.pendingDelivery += Number(r.pendingDelivery) || 0;
      e.pendingSale += Number(r.pendingSale) || 0;
      e.stockOnHand += Number(r.stockOnHand) || 0;
      e.availableStock += Number(r.availableStock) || 0;
      e.periodStock += Number(r.periodStock) || 0;
      e.periodAvailableStock += Number(r.periodAvailableStock) || 0;
    });
    return Array.from(map.values()).filter(row =>
      row.begStock !== 0 || row.transferIn !== 0 || row.returns !== 0 ||
      row.delivered !== 0 || row.totalSales !== 0 ||
      row.pendingDelivery !== 0 || row.pendingSale !== 0 ||
      row.stockOnHand !== 0 || row.availableStock !== 0
    );
  }, [rows]);

  const cols = [
    ['Beg. Stock', 'begStock', Layers],
    ['Transfer In', 'transferIn', ArrowDownToLine],
    ['Return', 'returns', Undo2],
    ['Delivered', 'delivered', CheckCircle2],
    ['Total Sales', 'totalSales', ShoppingCart],
    ['Pending Delivery', 'pendingDelivery', Truck],
    ['Pending Sale', 'pendingSale', Clock],
    ['Total Stock', 'stockOnHand', Boxes, 'font-semibold'],
    ['Available Stock', 'availableStock', PackageCheck, 'font-semibold'],
  ];
  const last = cols.length - 1;

  return (
    <div className="bg-white overflow-hidden inv-table-panel flex-1 min-h-0 flex flex-col">
      <div className="overflow-auto flex-1 min-h-0 table-fit">
        <table className="w-full bg-white">
          <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_#d1d5db]">
            <tr>
              <th className="px-3 py-3 th-left"><HeaderIcon Icon={Package} label="Product" align="left" /></th>
              <th className="px-3 py-3 th-left"><HeaderIcon Icon={Barcode} label="SKU/UPC" align="left" /></th>
              {cols.map(([label, key, Icon], i) => (
                <th key={key} className={`px-2 py-3 text-center th-num ${i === last ? 'pr-24' : ''}`}>
                  <HeaderIcon Icon={Icon} label={label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              </td></tr>
            ) : aggregated.length === 0 ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-8 text-center text-gray-500">No data for the selected filters</td></tr>
            ) : (
              aggregated.map((row, i) => (
                <tr key={i} className="bg-white hover:bg-white">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 text-sm">{row.productName}</div>
                    {row.variationName && <div className="table-sub text-gray-500">{row.variationName}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>{row.sku}</div>
                    {row.companySkus.size > 0 && <div>Co. SKU: {[...row.companySkus].join(', ')}</div>}
                    {row.upc !== 'N/A' && <div className="text-gray-500">{row.upc}</div>}
                  </td>
                  {cols.map(([label, key, Icon, extra], ci) => (
                    <td key={key} className={`px-2 py-3 text-center text-sm bg-white ${ci === last ? 'pr-24' : ''} ${extra || ''}`}>
                      {(row[key] || 0).toLocaleString()}
                    </td>
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