import React from 'react';
import { Store, CheckCircle, ShoppingCart, Truck, Clock, Eye } from 'lucide-react';
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
  setStockCurrentPage
}) => {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Store size={20} />
          Branch Stock Levels
        </h2>
      </div>

      <div className="overflow-x-auto">
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
            {currentBranchStocks.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
                  No branch stock records found
                </td>
              </tr>
            ) : (
              currentBranchStocks.map((stock) => (
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
                      {(stock.availableQuantity || 0).toLocaleString('en-US')}
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
                      onClick={() => handleViewStockTransactions(stock, 'branch')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
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