// src/components/tables/InventoryTable.jsx
import React from 'react';
import { Package, Check, Edit2, Trash2, Eye, Warehouse, Store } from 'lucide-react';
import { getStatusColor, getTypeColor } from '../../constants/inventoryTypes';

const InventoryTable = ({
  inventories,
  onView,
  onEdit,
  onDelete,
  onConfirm,
  actionLoading,
  canModifyStatus,
  indexOfFirstItem,
  indexOfLastItem
}) => {

  const grandTotalItems = inventories.reduce((sum, inv) => sum + (inv.items?.length || 0), 0);
  const grandTotalQty = inventories.reduce((sum, inv) =>
    sum + (inv.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0), 0);


  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total Qty</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventories.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  {indexOfFirstItem === 0 ? 'No inventory records found' : 'No records on this page'}
                </td>
              </tr>
            ) : (
              inventories.map((inventory) => {
                const ts = inventory.createdAt || inventory.updatedAt;
                const tsDate = ts ? new Date(ts) : null;

                return (
                  <tr key={inventory.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {indexOfFirstItem + inventories.indexOf(inventory) + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(inventory.inventoryType)}`}>
                        {inventory.inventoryType?.replace('_', ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {(inventory.fromWarehouse || inventory.fromBranch) && (
                          <>
                            {inventory.fromWarehouse && (
                              <div className="flex items-center gap-1">
                                <Warehouse size={14} className="text-blue-600" />
                                <span className="font-medium">{inventory.fromWarehouse.warehouseName}</span>
                              </div>
                            )}
                            {inventory.fromBranch && (
                              <div className="flex items-center gap-1">
                                <Store size={14} className="text-green-600" />
                                <span className="font-medium">{inventory.fromBranch.branchName}</span>
                              </div>
                            )}
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        {inventory.toWarehouse && (
                          <div className="flex items-center gap-1">
                            <Warehouse size={14} className="text-blue-600" />
                            <span className="font-medium">{inventory.toWarehouse.warehouseName}</span>
                          </div>
                        )}
                        {inventory.toBranch && (
                          <div className="flex items-center gap-1">
                            <Store size={14} className="text-green-600" />
                            <span className="font-medium">{inventory.toBranch.branchName}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(inventory.dateProcessed).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">{(inventory.items?.length || 0).toLocaleString('en-US')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-blue-700">
                        {(inventory.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inventory.status)}`}>
                            {inventory.status || 'PENDING'}
                          </span>
                          {inventory.status === 'CONFIRMED' && (
                            <Check size={16} className="text-green-600" />
                          )}
                        </div>
                        {inventory.status === 'CONFIRMED' && inventory.confirmedBy && (
                          <span className="text-xs text-gray-500">by {inventory.confirmedBy}</span>
                        )}
                      </div>
                    </td>

                    {/* ── Timestamp column ── */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tsDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-gray-700">
                            {tsDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {tsDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onView(inventory)}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="View"
                        >
                          {actionLoading ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => onEdit(inventory)}
                          disabled={actionLoading}
                          className={`flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={inventory.status === 'CONFIRMED' ? 'Edit (will check if modifiable)' : 'Edit'}
                        >
                          {actionLoading ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Edit2 size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => onDelete(inventory.id)}
                          disabled={actionLoading}
                          className={`flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={inventory.status === 'CONFIRMED' ? 'Delete (will check if modifiable)' : 'Delete'}
                        >
                          {actionLoading ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td colSpan={4} className="px-6 py-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Page Totals ({inventories.length} record{inventories.length !== 1 ? 's' : ''})
                </span>
              </td>
              <td className="px-6 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-500" />
                  <span className="text-sm font-bold text-gray-800">{grandTotalItems.toLocaleString('en-US')}</span>
                </div>
              </td>
              <td className="px-6 py-3 whitespace-nowrap">
                <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-700">
                  {grandTotalQty.toLocaleString()}
                </span>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;