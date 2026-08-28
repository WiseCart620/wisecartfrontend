// src/components/modals/DeliveryViewModal.jsx
import React from 'react';
import { X, Printer, Edit2, Package, Check } from 'lucide-react';

const DeliveryViewModal = ({
  delivery,
  onClose,
  onEdit,
  onPrint,
  isLoading = false,
  productFilters = []
}) => {
  const getStatusColor = (status) => {
    const colors = {
      PREPARING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      CUSTOM: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading || !delivery) {
    return (
      <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading delivery details...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Compute totals ───────────────────────────────────────────────────────
  const hasActiveProductFilter = productFilters && productFilters.length > 0;
  const displayItems = hasActiveProductFilter
    ? (delivery.items || []).filter(item => {
      const itemProductId = item.product?.id ?? item.productId;
      const itemVariationId = item.variation?.id ?? item.variationId ?? null;
      return productFilters.some(pf =>
        Number(pf.productId) === Number(itemProductId) &&
        (pf.variationId == null ? null : Number(pf.variationId)) === (itemVariationId == null ? null : Number(itemVariationId))
      );
    })
    : (delivery.items || []);
  const totalPrepared = displayItems.reduce((s, it) => s + (it.preparedQty ?? 0), 0);
  const totalDelivered = displayItems.reduce((s, it) => s + (it.deliveredQty ?? 0), 0);
  const isDelivered = delivery.status === 'DELIVERED';
  const hasVariance = isDelivered && totalPrepared !== totalDelivered;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="p-4 sm:p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Delivery Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-8">
          <div className="space-y-4 sm:space-y-6">

            {/* Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Receipt #</label>
                <p className="text-lg font-semibold text-gray-900">{delivery.deliveryReceiptNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(delivery.date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Prepared and Delivered Dates */}
            {(delivery.datePrepared || delivery.dateDelivered) && (
              <div className="grid grid-cols-2 gap-6">
                {delivery.datePrepared && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Date Prepared</label>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(delivery.datePrepared).toLocaleString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {delivery.dateDelivered && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Date Delivered</label>
                    <p className="text-base font-semibold text-green-700">
                      {new Date(delivery.dateDelivered).toLocaleString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Branch and Company Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">Delivered To (Branch)</label>
                  <p className="text-base font-semibold text-blue-900">{delivery.branch?.branchName}</p>
                  <p className="text-sm text-blue-700">Code: {delivery.branch?.branchCode || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">Company</label>
                  <p className="text-base font-semibold text-blue-900">{delivery.company?.companyName}</p>
                  <p className="text-sm text-blue-700">TIN: {delivery.company?.tin || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-blue-700 mb-1">Delivery Address</label>
                <p className="text-sm text-blue-800">
                  {delivery.branch?.address
                    ? `${delivery.branch.address}, ${delivery.branch.city || ''}, ${delivery.branch.province || ''}`.trim()
                    : 'No address specified'}
                </p>
              </div>
              {delivery.branch?.contactNumber && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-blue-700 mb-1">Contact Number</label>
                  <p className="text-sm text-blue-800">{delivery.branch.contactNumber}</p>
                </div>
              )}
            </div>

            {/* Delivery Info */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">Delivery Prepared By</label>
                  <p className="text-base font-semibold text-green-900">{delivery.preparedBy || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">Transmittal</label>
                  <p className="text-base text-green-900">{delivery.transmittal || 'Not specified'}</p>
                </div>
              </div>
              {delivery.remarks && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-green-700 mb-1">Delivery Remarks</label>
                  <p className="text-sm text-green-800 p-2 bg-white rounded">{delivery.remarks}</p>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-6">
              {delivery.purchaseOrderNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Order #</label>
                  <p className="text-base text-gray-900">{delivery.purchaseOrderNumber}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                  {delivery.customStatus || delivery.status}
                </span>
              </div>
            </div>

            {/* ── Items Table ──────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Items ({displayItems.length}{hasActiveProductFilter ? ` of ${delivery.items?.length || 0}` : ''} items)
                </label>
                {/* Quick totals summary */}
                {displayItems.length > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Prepared:</span>
                      <span className="font-bold text-blue-700">{totalPrepared.toLocaleString('en-US')} pcs</span>
                    </div>
                    {isDelivered && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Delivered:</span>
                          <span className="font-bold text-green-700">{totalDelivered.toLocaleString('en-US')} pcs</span>
                        </div>
                      </>
                    )}
                    {hasVariance && (
                      <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Variance:</span>
                          <span className={`font-bold ${totalDelivered < totalPrepared ? 'text-red-600' : 'text-orange-600'}`}>
                            {totalDelivered - totalPrepared > 0 ? '+' : ''}{totalDelivered - totalPrepared} pcs
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU & UPC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prepared Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivered Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayItems.length > 0 ? (
                      displayItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center text-sm text-gray-400 font-medium">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.product?.productName || 'Unknown Product'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div className="text-xs"><span className="font-medium">SKU:</span> {item.product?.sku || 'N/A'}</div>
                              <div className="text-xs"><span className="font-medium">UPC:</span> {item.product?.upc || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-blue-500 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-gray-900">{item.warehouse?.warehouseName || 'N/A'}</div>
                                {item.warehouse?.warehouseCode && (
                                  <div className="text-xs text-gray-500">Code: {item.warehouse.warehouseCode}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                            {item.preparedQty != null ? item.preparedQty.toLocaleString('en-US') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                            {item.deliveredQty != null ? item.deliveredQty.toLocaleString('en-US') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.uom || 'pcs'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                          {hasActiveProductFilter ? 'No items match the active product filter' : 'No items found'}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* ── Totals footer ─────────────────────────────────────── */}
                  {displayItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-300">
                        <td colSpan={4} className="px-4 py-3 text-right">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Total ({displayItems.length} item{displayItems.length !== 1 ? 's' : ''})
                          </span>
                        </td>
                        {/* Prepared total */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-sm font-bold text-blue-800">{totalPrepared.toLocaleString('en-US')}</span>
                            <span className="text-xs text-blue-500">pcs</span>
                          </div>
                        </td>
                        {/* Delivered total */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isDelivered ? (
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-sm font-bold text-green-800">{totalDelivered.toLocaleString('en-US')}</span>
                              <span className="text-xs text-green-500">pcs</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>

                      {/* Variance row — only when delivered qty ≠ prepared qty */}
                      {hasVariance && (
                        <tr className="bg-amber-50 border-t border-amber-200">
                          <td colSpan={3} className="px-4 py-2 text-right">
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Variance</span>
                          </td>
                          <td colSpan={2} className="px-4 py-2 text-right whitespace-nowrap">
                            <span className={`text-sm font-bold ${totalDelivered < totalPrepared ? 'text-red-600' : 'text-orange-600'}`}>
                              {totalDelivered - totalPrepared > 0 ? '+' : ''}{totalDelivered - totalPrepared} pcs
                            </span>
                            <span className="text-xs text-amber-500 ml-1">
                              ({totalDelivered < totalPrepared ? 'short' : 'over'})
                            </span>
                          </td>
                          <td className="px-4 py-2" />
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Delivery Completion Info */}
            {isDelivered && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="text-green-600" size={20} />
                  <h3 className="text-sm font-medium text-green-800">Delivery Completed</h3>
                </div>
                <p className="text-sm text-green-700">
                  This delivery has been marked as delivered. All items have been successfully transferred to the branch.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-end gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              onClick={() => onPrint(delivery)}
              className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md"
            >
              <Printer size={20} />
              <span>Print Receipt</span>
            </button>
            {!isDelivered && (
              <button
                onClick={() => onEdit(delivery)}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
              >
                <Edit2 size={20} />
                <span>Edit Delivery</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryViewModal;