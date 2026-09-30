import React, { useState } from 'react';
import { Store, CheckCircle, ShoppingCart, Truck, Clock, Eye, Loader2 } from 'lucide-react';
import Pagination from '../../common/Pagination';
import { parseDate } from '../../../utils/dateUtils';

const SKELETON_ROWS = 5;

const BranchStockTable = ({
  currentBranchStocks,
  filteredBranchStocks,
  stockIndexOfFirstItem,
  stockIndexOfLastItem,
  handleViewStockTransactions,
  stockCurrentPage,
  branchStockTotalPages,
  setStockCurrentPage,
  isLoading,
  grandTotals,
  totalElements = 0,
}) => {
  const [loadingId, setLoadingId] = useState(null);

  const totals = grandTotals || {
    quantity: 0, delivered: 0, totalSales: 0, pendingDelivery: 0, pendingSale: 0, available: 0,
  };

  const handleView = async (stock) => {
    setLoadingId(stock.id);
    try {
      await handleViewStockTransactions(stock, 'branch');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden table-panel">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-black flex items-center gap-2">
          <Store size={20} />
          Company Stock Levels
        </h2>
        {!isLoading && totalElements > 0 && (
          <span className="text-xs text-black">
            Grand Total ({totalElements.toLocaleString('en-US')} rows)
          </span>
        )}
      </div>

      <div className="overflow-auto max-h-[65vh] table-fit">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">SKU/UPC</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">Total Stock</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  Delivered
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">
                <div className="flex items-center justify-center gap-1">
                  <ShoppingCart size={14} />
                  Total Sales
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Truck size={14} />
                  Pending Delivery
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Clock size={14} />
                  Pending Sale
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-black uppercase">Available</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Last Updated</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              [...Array(SKELETON_ROWS)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-14 mt-1" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-12 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16 mx-auto" /></td>
                </tr>
              ))
            ) : currentBranchStocks.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-6 py-8 text-center text-black">
                  No branch stock records found
                </td>
              </tr>
            ) : (
              currentBranchStocks.map((stock) => {
                const isThisLoading = loadingId === stock.id;
                return (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="max-w-[180px]">
                        <div className="font-medium text-black text-sm" title={stock.branchName}>
                          {stock.branchName}
                        </div>
                        <div className="text-xs text-black">
                          {stock.branchCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-black text-sm">
                          {stock.fullProductName || stock.productName}
                        </div>
                        {stock.combinationDisplay && (
                          <div className="text-xs text-orange-600 mt-0.5">
                            {stock.combinationDisplay}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-medium">
                          SKU: {stock.variationSku || stock.productSku || stock.sku || 'N/A'}
                        </div>
                        {(stock.variationUpc || stock.productUpc || stock.upc) && (stock.variationUpc || stock.productUpc || stock.upc) !== 'N/A' && (
                          <div className="text-black">
                            UPC: {stock.variationUpc || stock.productUpc || stock.upc}
                          </div>
                        )}
                        {stock.variationName && (
                          <div className="text-xs text-orange-600 font-medium mt-1">
                            Variation: {stock.variationName}
                            {stock.variationSku && ` (SKU: ${stock.variationSku})`}
                            {stock.variationUpc && stock.variationUpc !== 'N/A' && ` (UPC: ${stock.variationUpc})`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-sm font-semibold text-black">
                      {(stock.quantity || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-black">
                      {(stock.deliveredQuantity || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-black">
                      {(stock.totalSales || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-black">
                      {(stock.pendingDeliveries || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-black">
                      {(stock.pendingSales || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-black">
                      {(stock.availableQuantity != null ? stock.availableQuantity : Math.max(0, (stock.quantity || 0) - (stock.reservedQuantity || 0))).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs text-black">
                      {(() => {
                        const date = parseDate(stock.lastUpdated);
                        if (!date) return 'N/A';
                        return (
                          <>
                            {date.toLocaleDateString()}<br />
                            <span className="text-black">{date.toLocaleTimeString()}</span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleView(stock)}
                        disabled={isThisLoading}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition
                          ${isThisLoading
                            ? 'text-black opacity-50 cursor-wait'
                            : 'text-black hover:bg-gray-100'
                          }`}
                      >
                        {isThisLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Eye size={14} />
                        )}
                        {isThisLoading ? 'Loading...' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {!isLoading && totalElements > 0 && (
            <tfoot className="[&_td]:sticky [&_td]:bottom-0 [&_td]:z-10 [&_td]:bg-gray-50 [&_td]:shadow-[0_-2px_0_#e5e7eb]">
              <tr>
                <td className="px-4 py-2 text-xs font-semibold text-black" colSpan={3}>
                  Grand Total ({totalElements.toLocaleString('en-US')} rows)
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.quantity.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.delivered.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.totalSales.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.pendingDelivery.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.pendingSale.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-black">
                  {totals.available.toLocaleString('en-US')}
                </td>
                <td className="px-4 py-2" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {totalElements > 0 && (
        <Pagination
          currentPage={stockCurrentPage}
          totalPages={branchStockTotalPages}
          onPageChange={setStockCurrentPage}
          onNextPage={() => setStockCurrentPage(prev => Math.min(prev + 1, branchStockTotalPages))}
          onPrevPage={() => setStockCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={stockIndexOfFirstItem + 1}
          showingEnd={Math.min(stockIndexOfLastItem, totalElements)}
          totalItems={totalElements}
        />
      )}
    </div>
  );
};

export default BranchStockTable;