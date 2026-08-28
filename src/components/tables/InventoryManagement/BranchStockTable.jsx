import React, { useState } from 'react';
import { Store, CheckCircle, ShoppingCart, Truck, Clock, Eye, Loader2 } from 'lucide-react';
import Pagination from '../../common/Pagination';
import { parseDate } from '../../../utils/dateUtils';

const BranchStockTable = ({
  currentBranchStocks,
  filteredBranchStocks,
  stockIndexOfFirstItem,
  stockIndexOfLastItem,
  handleViewStockTransactions,
  stockCurrentPage,
  branchStockTotalPages,
  setStockCurrentPage,
  isLoading
}) => {
  const [loadingId, setLoadingId] = useState(null);

  const grandTotals = filteredBranchStocks.reduce((acc, s) => {
    const available = s.availableQuantity != null
      ? s.availableQuantity
      : Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0));
    acc.quantity += s.quantity || 0;
    acc.delivered += s.deliveredQuantity || 0;
    acc.totalSales += s.totalSales || 0;
    acc.pendingDelivery += s.pendingDeliveries || 0;
    acc.pendingSale += s.pendingSales || 0;
    acc.available += available;
    return acc;
  }, { quantity: 0, delivered: 0, totalSales: 0, pendingDelivery: 0, pendingSale: 0, available: 0 });

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
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Store size={20} />
          Company Stock Levels
        </h2>
      </div>

      <div className="overflow-x-auto table-fit">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Stock</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  Delivered
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <ShoppingCart size={14} />
                  Total Sales
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Truck size={14} />
                  Pending Delivery
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Clock size={14} />
                  Pending Sale
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="11" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading branch stocks...</span>
                  </div>
                </td>
              </tr>
            ) : currentBranchStocks.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
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
                        <div className="font-medium text-gray-900 text-sm" title={stock.branchName}>
                          {stock.branchName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stock.branchCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-gray-900 text-sm">
                          {stock.fullProductName || stock.productName}
                        </div>
                        {stock.combinationDisplay && (
                          <div className="text-xs text-gray-500 mt-0.5">
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
                          <div className="text-gray-500">
                            UPC: {stock.variationUpc || stock.productUpc || stock.upc}
                          </div>
                        )}
                        {stock.variationName && (
                          <div className="text-xs text-blue-600 font-medium mt-1">
                            Variation: {stock.variationName}
                            {stock.variationSku && ` (SKU: ${stock.variationSku})`}
                            {stock.variationUpc && stock.variationUpc !== 'N/A' && ` (UPC: ${stock.variationUpc})`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stock.quantity > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {(stock.quantity || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        <CheckCircle size={12} />
                        {(stock.deliveredQuantity || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        <ShoppingCart size={12} />
                        {(stock.totalSales || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Truck size={12} />
                        {(stock.pendingDeliveries || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Clock size={12} />
                        {(stock.pendingSales || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {(stock.availableQuantity != null ? stock.availableQuantity : Math.max(0, (stock.quantity || 0) - (stock.reservedQuantity || 0))).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleView(stock)}
                        disabled={isThisLoading}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition
                          ${isThisLoading
                            ? 'text-blue-400 cursor-wait'
                            : 'text-blue-600 hover:bg-blue-50'
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
          {!isLoading && filteredBranchStocks.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td colSpan={3} className="px-4 py-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Grand Total ({filteredBranchStocks.length.toLocaleString('en-US')} rows)
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-gray-800">{grandTotals.quantity.toLocaleString('en-US')}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-teal-800">{grandTotals.delivered.toLocaleString('en-US')}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-pink-800">{grandTotals.totalSales.toLocaleString('en-US')}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-orange-800">{grandTotals.pendingDelivery.toLocaleString('en-US')}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-purple-800">{grandTotals.pendingSale.toLocaleString('en-US')}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-blue-800">{grandTotals.available.toLocaleString('en-US')}</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {filteredBranchStocks.length > 0 && (
        <Pagination
          currentPage={stockCurrentPage}
          totalPages={branchStockTotalPages}
          onPageChange={setStockCurrentPage}
          onNextPage={() => setStockCurrentPage(prev => Math.min(prev + 1, branchStockTotalPages))}
          onPrevPage={() => setStockCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={stockIndexOfFirstItem + 1}
          showingEnd={Math.min(stockIndexOfLastItem, filteredBranchStocks.length)}
          totalItems={filteredBranchStocks.length}
        />
      )}
    </div>
  );
};

export default BranchStockTable;