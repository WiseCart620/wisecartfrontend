// src/components/modals/InventoryViewModal.jsx
import React from 'react';
import { X, Calendar, User, MessageSquare, Package, Check, Warehouse, Store } from 'lucide-react';
import { getStatusColor, getTypeColor } from '../../constants/inventoryTypes';

const InventoryViewModal = ({ selectedInventory, onClose, onConfirm }) => {
  if (!selectedInventory) return null;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Inventory Record Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Record Information</h3>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Type:</strong>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getTypeColor(selectedInventory.inventoryType)}`}>
                  {selectedInventory.inventoryType?.replace('_', ' ')}
                </span>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Date:</strong> {new Date(selectedInventory.dateProcessed).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Processed By:</strong> {selectedInventory.processedBy}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Locations</h3>
              {selectedInventory.fromWarehouse && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>From Warehouse:</strong> {selectedInventory.fromWarehouse.warehouseName}
                </p>
              )}
              {selectedInventory.fromBranch && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>From Branch:</strong> {selectedInventory.fromBranch.branchName}
                </p>
              )}
              {selectedInventory.toWarehouse && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>To Warehouse:</strong> {selectedInventory.toWarehouse.warehouseName}
                </p>
              )}
              {selectedInventory.toBranch && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>To Branch:</strong> {selectedInventory.toBranch.branchName}
                </p>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <div className="space-y-2">
                <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(selectedInventory.status)}`}>
                  {selectedInventory.status || 'PENDING'}
                </span>

                {selectedInventory.status === 'CONFIRMED' && selectedInventory.confirmedBy && (
                  <div className="text-sm text-gray-600 space-y-1 mt-2">
                    <p>
                      <strong>Confirmed By:</strong> {selectedInventory.confirmedBy}
                    </p>
                    {selectedInventory.confirmedAt && (
                      <p>
                        <strong>Confirmed At:</strong> {new Date(selectedInventory.confirmedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedInventory.status === 'CONFIRMED' && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <Check size={18} />
                  Stock Update Applied
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700 font-medium">Total Items Updated:</p>
                    <p className="text-green-900 text-lg font-bold">
                      {selectedInventory.items?.length || 0} products
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Total Quantity:</p>
                    <p className="text-green-900 text-lg font-bold">
                      {selectedInventory.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} units
                    </p>
                  </div>
                </div>
                {selectedInventory.confirmedAt && (
                  <div className="mt-2 text-xs text-green-600 space-y-0.5">
                    <p>Confirmed on: {new Date(selectedInventory.confirmedAt).toLocaleString()}</p>
                    {selectedInventory.confirmedBy && (
                      <p>Confirmed by: {selectedInventory.confirmedBy}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedInventory.remarks && (
            <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-gray-700 mb-2">Remarks</h3>
              <p className="text-sm text-gray-600">{selectedInventory.remarks}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-700 mb-4 text-lg">Items</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-700 w-10">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700">Product</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 w-32">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedInventory.items && selectedInventory.items.length > 0 ? (
                    selectedInventory.items.map((item, i) => {
                      const hasVariation = item.variationId != null;

                      return (
                        <tr key={`view-item-${item.id || i}-${item.product?.id || 'unknown'}`} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium align-top">{i + 1}</td>
                          <td className="px-3 py-2.5 text-xs">
                            <div className="font-medium text-gray-900 mb-1">
                              {item.product.productName}
                            </div>

                            {hasVariation && item.variation && (
                              <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100">
                                  Variation: {item.variation}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                <span className="font-medium">SKU:</span> {item.sku || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">UPC:</span> {item.upc || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-900 font-semibold w-32">
                            {item.quantity.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-500 italic">
                        No items in this record
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            {selectedInventory.status === 'PENDING' && (
              <button
                onClick={() => { onClose(); onConfirm(selectedInventory); }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition shadow-sm font-medium text-sm"
              >
                <Check size={16} />
                <span>Confirm Inventory</span>
              </button>
            )}

            {/* Totals */}
            {selectedInventory.items?.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg font-medium text-gray-700">
                  📦 {selectedInventory.items.length} product{selectedInventory.items.length !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg font-bold text-blue-700">
                  Total Qty: {selectedInventory.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryViewModal;