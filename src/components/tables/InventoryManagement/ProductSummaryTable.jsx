import React, { useState } from 'react';
import { BarChart3, CheckCircle, ShoppingCart, Truck, Clock, Eye, Loader2, Undo2 } from 'lucide-react';
import Pagination from '../../common/Pagination';

const ProductSummaryTable = ({
  currentProductSummaries,
  filteredProductSummaries,
  productIndexOfFirstItem,
  productIndexOfLastItem,
  handleViewTransactions,
  productCurrentPage,
  productTotalPages,
  setProductCurrentPage,
  isLoading
}) => {
  const [loadingId, setLoadingId] = useState(null);

  const handleView = async (product, displaySku, displayUpc, isVariation) => {
    const key = isVariation
      ? `variation-${product.variationId}-${product.productId}`
      : `product-${product.productId}`;
    setLoadingId(key);
    try {
      await handleViewTransactions(
        {
          ...product,
          productId: product.productId,
          variationId: product.variationId,
          productName: product.productName,
          sku: displaySku,
          upc: displayUpc,
          isVariation,
          variationName: product.variationName,
          variationSku: product.variationSku,
        },
        true
      );
    } finally {
      setLoadingId(null);
    }
  };

  // Compact badge: icon optional, tighter padding/text than the original
  const Badge = ({ value, prefix = '', className, icon }) => (
    <span
      className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none whitespace-nowrap ${className}`}
    >
      {icon}
      {prefix}
      {(value || 0).toLocaleString('en-US')}
    </span>
  );

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden mb-6 table-panel">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 size={18} />
          Product Inventory Summary
        </h2>
      </div>

      {/* overflow-x-auto stays as a safety net for very narrow screens,
          but table-fixed + trimmed widths below keep it inside a laptop viewport */}
      <div className="overflow-x-auto table-fit">
        <table className="w-full table-fixed text-[11px]">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[11%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">Product</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-tight">SKU/UPC</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">Stock<br />In</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">Trans.<br />In</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">Trans.<br />Out</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">Return</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">Damage</th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">
                <div className="flex flex-col items-center justify-center">
                  <CheckCircle size={11} />
                  Delivered
                </div>
              </th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">
                <div className="flex flex-col items-center justify-center">
                  <Undo2 size={11} />
                  Cancel. Ret.
                </div>
              </th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">
                <div className="flex flex-col items-center justify-center">
                  <ShoppingCart size={11} />
                  Sales
                </div>
              </th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">
                <div className="flex flex-col items-center justify-center">
                  <Truck size={11} />
                  Pend. Deliv.
                </div>
              </th>
              <th className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-tight leading-tight">
                <div className="flex flex-col items-center justify-center">
                  <Clock size={11} />
                  Pend. Sale
                </div>
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-tight">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="13" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading products...</span>
                  </div>
                </td>
              </tr>
            ) : currentProductSummaries.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-6 py-8 text-center text-gray-500">
                  {filteredProductSummaries.length === 0 ? 'No products found' : 'No products on this page'}
                </td>
              </tr>
            ) : (
              currentProductSummaries.map((product) => {
                const isVariation = product.isVariation || product.variationId;
                const uniqueKey = isVariation
                  ? `variation-${product.variationId}-${product.productId}`
                  : `product-${product.productId}`;

                const displaySku = isVariation ? (product.variationSku || product.sku) : product.sku;
                const displayUpc = isVariation ? (product.variationUpc || product.upc) : product.upc;
                const isThisLoading = loadingId === uniqueKey;

                return (
                  <tr key={uniqueKey} className="hover:bg-gray-50">
                    <td className="px-2 py-2 align-top">
                      <div
                        className="font-medium text-gray-900 text-[11px] truncate leading-tight"
                        title={`${product.productName}${isVariation && product.variationName ? ` (${product.variationName})` : ''}`}
                      >
                        {product.productName}
                        {isVariation && product.variationName && (
                          <span className="ml-1 text-blue-600 font-semibold">
                            ({product.variationName})
                          </span>
                        )}
                      </div>
                      {isVariation && product.combinationDisplay && (
                        <div className="text-[10px] text-gray-500 truncate" title={product.combinationDisplay}>
                          {product.combinationDisplay}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-[10px]">
                      <div className="truncate" title={`SKU: ${displaySku || 'N/A'}`}>
                        SKU: {displaySku || 'N/A'}
                      </div>
                      {displayUpc && displayUpc !== 'N/A' && (
                        <div className="text-gray-500 truncate" title={`UPC: ${displayUpc}`}>
                          UPC: {displayUpc}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalStockIn} prefix="+" className="bg-green-100 text-green-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalTransferIn} prefix="+" className="bg-indigo-100 text-indigo-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalTransferOut} prefix="-" className="bg-blue-100 text-blue-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalReturn} prefix="+" className="bg-yellow-100 text-yellow-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalDamage} prefix="-" className="bg-red-100 text-red-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalDelivered} className="bg-teal-100 text-teal-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalCancelledReturns} className="bg-rose-100 text-rose-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalSales} className="bg-pink-100 text-pink-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalPendingDelivery} className="bg-orange-100 text-orange-800" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Badge value={product.totalConfirmedSales} className="bg-purple-100 text-purple-800" />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => handleView(product, displaySku, displayUpc, isVariation)}
                        disabled={isThisLoading}
                        title="View History"
                        className={`inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded transition whitespace-nowrap
                          ${isThisLoading
                            ? 'text-blue-400 cursor-wait'
                            : 'text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        {isThisLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Eye size={12} />
                        )}
                        {isThisLoading ? '...' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {filteredProductSummaries.length > 0 && (
        <Pagination
          currentPage={productCurrentPage}
          totalPages={productTotalPages}
          onPageChange={setProductCurrentPage}
          onNextPage={() => setProductCurrentPage(prev => Math.min(prev + 1, productTotalPages))}
          onPrevPage={() => setProductCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={productIndexOfFirstItem + 1}
          showingEnd={Math.min(productIndexOfLastItem, filteredProductSummaries.length)}
          totalItems={filteredProductSummaries.length}
        />
      )}
    </div>
  );
};


export default ProductSummaryTable;