import React from 'react';
import { Building, CheckCircle, Truck, Eye, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, AlertTriangle, RotateCcw } from 'lucide-react';
import Pagination from '../../common/Pagination';
import { parseDate } from '../../../utils/dateUtils';

const WarehouseStockTable = ({
  currentWarehouseStocks,
  filteredWarehouseStocks,
  stockIndexOfFirstItem,
  stockIndexOfLastItem,
  handleViewStockTransactions,
  stockCurrentPage,
  warehouseStockTotalPages,
  setStockCurrentPage,
  isLoading,
  productSummaries = [],   // ADD THIS PROP
}) => {

  // Helper: find matching product summary for movement totals
  const getMovements = (stock) => {
    const match = productSummaries.find(s =>
      s.productId === stock.productId &&
      (stock.variationId ? s.variationId === stock.variationId : !s.variationId)
    );
    return match || {};
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building size={20} />
          Warehouse Stock Levels
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">SKU/UPC</th>

              {/* Stock levels */}
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total Stock</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={13} className="text-teal-500" />
                  Delivered
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <Truck size={13} className="text-orange-500" />
                  Pending
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Available</th>

              {/* Movement totals — NEW */}
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-blue-50">
                <div className="flex items-center justify-center gap-1">
                  <ArrowDownCircle size={13} className="text-blue-600" />
                  Stock In
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-purple-50">
                <div className="flex items-center justify-center gap-1">
                  <ArrowLeftRight size={13} className="text-purple-600" />
                  Transfer In
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-indigo-50">
                <div className="flex items-center justify-center gap-1">
                  <ArrowUpCircle size={13} className="text-indigo-600" />
                  Transfer Out
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-green-50">
                <div className="flex items-center justify-center gap-1">
                  <RotateCcw size={13} className="text-green-600" />
                  Return
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap bg-red-50">
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle size={13} className="text-red-500" />
                  Damage
                </div>
              </th>

              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Last Updated</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="14" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading warehouse stocks...</span>
                  </div>
                </td>
              </tr>
            ) : currentWarehouseStocks.length === 0 ? (
              <tr>
                <td colSpan="14" className="px-6 py-8 text-center text-gray-500">
                  No warehouse stock records found
                </td>
              </tr>
            ) : (
              currentWarehouseStocks.map((stock) => {
                const mv = getMovements(stock);
                return (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    {/* Warehouse */}
                    <td className="px-4 py-3">
                      <div className="max-w-[160px]">
                        <div className="font-medium text-gray-900 text-sm truncate" title={stock.warehouseName}>
                          {stock.warehouseName}
                        </div>
                        <div className="text-xs text-gray-400">{stock.warehouseCode}</div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="max-w-[180px]">
                        <div className="font-medium text-gray-900 text-sm">
                          {stock.fullProductName || stock.productName}
                        </div>
                        {stock.combinationDisplay && (
                          <div className="text-xs text-gray-500 mt-0.5">{stock.combinationDisplay}</div>
                        )}
                      </div>
                    </td>

                    {/* SKU/UPC */}
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-medium">
                          SKU: {stock.variationSku || stock.productSku || stock.sku || 'N/A'}
                        </div>
                        {(stock.variationUpc || stock.productUpc || stock.upc) &&
                          (stock.variationUpc || stock.productUpc || stock.upc) !== 'N/A' && (
                            <div className="text-gray-400">
                              UPC: {stock.variationUpc || stock.productUpc || stock.upc}
                            </div>
                          )}
                      </div>
                    </td>

                    {/* Total Stock */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        stock.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(stock.quantity || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Delivered */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        <CheckCircle size={11} />
                        {(stock.deliveredQuantity || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Pending Delivery */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Truck size={11} />
                        {(stock.pendingDeliveries || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Available */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {Math.max(0, (stock.quantity || 0) - (stock.reservedQuantity || 0)).toLocaleString()}
                      </span>
                    </td>

                    {/* Stock In — NEW */}
                    <td className="px-3 py-3 text-center bg-blue-50/40">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <ArrowDownCircle size={11} />
                        {(mv.totalStockIn || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Transfer In — NEW */}
                    <td className="px-3 py-3 text-center bg-purple-50/40">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <ArrowLeftRight size={11} />
                        {(mv.warehouseQuantity != null
                          ? (mv.totalStockIn != null ? mv.warehouseQuantity - mv.totalStockIn : 0)
                          : 0
                        ).toLocaleString()}
                      </span>
                    </td>

                    {/* Transfer Out — NEW */}
                    <td className="px-3 py-3 text-center bg-indigo-50/40">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <ArrowUpCircle size={11} />
                        {(mv.totalTransferOut || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Return — NEW */}
                    <td className="px-3 py-3 text-center bg-green-50/40">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <RotateCcw size={11} />
                        {(mv.totalReturn || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Damage — NEW */}
                    <td className="px-3 py-3 text-center bg-red-50/40">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle size={11} />
                        {(mv.totalDamage || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {(() => {
                        const date = parseDate(stock.lastUpdated);
                        if (!date) return 'N/A';
                        return (
                          <>
                            {date.toLocaleDateString()}<br />
                            <span className="text-gray-400">{date.toLocaleTimeString()}</span>
                          </>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewStockTransactions(stock, 'warehouse')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredWarehouseStocks.length > 0 && (
        <Pagination
          currentPage={stockCurrentPage}
          totalPages={warehouseStockTotalPages}
          onPageChange={setStockCurrentPage}
          onNextPage={() => setStockCurrentPage(prev => Math.min(prev + 1, warehouseStockTotalPages))}
          onPrevPage={() => setStockCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={stockIndexOfFirstItem + 1}
          showingEnd={Math.min(stockIndexOfLastItem, filteredWarehouseStocks.length)}
          totalItems={filteredWarehouseStocks.length}
        />
      )}
    </div>
  );
};

export default WarehouseStockTable;