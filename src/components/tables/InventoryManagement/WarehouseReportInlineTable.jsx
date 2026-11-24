import React from 'react';
import {
  Package, Barcode, Layers, ArrowDownCircle, ArrowDownToLine, ArrowUpFromLine,
  Undo2, AlertTriangle, SlidersHorizontal, Truck, FileText, Clock, CheckCircle2, PackageCheck,
} from 'lucide-react';
import HeaderIcon from '../../common/HeaderIcon';

const WarehouseReportInlineTable = ({ rows = [], loading }) => {
  const cols = [
    ['Beg. Stock', 'begStock', Layers],
    ['Stock In', 'stockIn', ArrowDownCircle],
    ['Transfer In', 'transferIn', ArrowDownToLine],
    ['Transfer Out', 'transferOut', ArrowUpFromLine],
    ['Returns', 'returns', Undo2],
    ['Damage', 'damage', AlertTriangle],
    ['Adjustment', 'adjustment', SlidersHorizontal],
    ['Delivery Qty', 'qtyDelivered', Truck],
    ['No. of DR', 'drCount', FileText],
    ['Pending Delivery', 'pendingDelivery', Clock],
    ['Total Stock', 'stockOnHand', CheckCircle2, 'font-semibold'],
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
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + 2} className="px-6 py-8 text-center text-gray-500">No data for the selected filters</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="bg-white hover:bg-white">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 text-sm">{row.productName}</div>
                    {row.variationName && <div className="table-sub text-gray-500">{row.variationName}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>{row.sku}</div>
                    {row.upc && row.upc !== 'N/A' && <div className="text-gray-500">{row.upc}</div>}
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

export default WarehouseReportInlineTable;