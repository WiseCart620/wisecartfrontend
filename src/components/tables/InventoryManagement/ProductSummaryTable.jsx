import React from 'react';
import { BarChart3, CheckCircle, ShoppingCart, Truck, Clock, Eye } from 'lucide-react';
import Pagination from '../../common/Pagination';

const ProductSummaryTable = ({
  currentProductSummaries,
  filteredProductSummaries,
  productIndexOfFirstItem,
  productIndexOfLastItem,
  handleViewTransactions,
  productCurrentPage,
  productTotalPages,
  setProductCurrentPage
}) => {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 size={20} />
          Product Inventory Summary
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock In</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transfer Out</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Return</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Damage</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  Delivered
                </div>
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <ShoppingCart size={14} />
                  Sales
                </div>
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Truck size={14} />
                  Pending Delivery
                </div>
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <div className="flex items-center justify-center gap-1">
                  <Clock size={14} />
                  Pending Sale
                </div>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentProductSummaries.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
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

                return (
                  <tr key={uniqueKey} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-gray-900 text-sm break-words whitespace-normal leading-tight">
                          {product.productName}
                          {isVariation && product.variationName && (
                            <span className="ml-2 text-blue-600 font-semibold">
                              ({product.variationName})
                            </span>
                          )}
                        </div>
                        {isVariation && product.combinationDisplay && (
                          <div className="text-xs text-gray-600 mt-1">
                            {product.combinationDisplay}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-medium">SKU: {displaySku || 'N/A'}</div>
                        {displayUpc && displayUpc !== 'N/A' && (
                          <div className="text-gray-500">UPC: {displayUpc}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        +{(product.totalStockIn || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        -{(product.totalTransferOut || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        +{(product.totalReturn || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        -{(product.totalDamage || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        <CheckCircle size={12} />
                        {(product.totalDelivered || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        <ShoppingCart size={12} />
                        {(product.totalSales || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Truck size={12} />
                        {(product.warehousePendingDelivery || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Clock size={12} />
                        {(product.branchPendingDelivery || 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => {
                          const targetProduct = {
                            ...product,
                            productId: product.productId,
                            variationId: product.variationId,
                            productName: product.productName,
                            sku: displaySku,
                            upc: displayUpc,
                            isVariation: isVariation,
                            variationName: product.variationName,
                            variationSku: product.variationSku
                          };
                          handleViewTransactions(targetProduct, true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Eye size={14} />
                        View History
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