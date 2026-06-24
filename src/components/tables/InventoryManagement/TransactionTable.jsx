import React, { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import Pagination from '../../common/Pagination';
import { getTransactionDisplayInfo } from '../../../utils/transactionHelpers';

const TransactionTable = ({
  currentInventories,
  filteredInventories,
  indexOfFirstItem,
  indexOfLastItem,
  currentPage,
  totalPages,
  setCurrentPage,
  deletingId,
  handleViewTransaction,
  calculateTotalQuantity,
  isLoading
}) => {
  const [loadingId, setLoadingId] = useState(null);

  const handleView = async (transaction) => {
    setLoadingId(transaction.id);
    try {
      await handleViewTransaction(transaction);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
        <p className="text-sm text-gray-600 mt-1">Showing inventory, transfer in/out, delivery, and sales records</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading transactions...</span>
                  </div>
                </td>
              </tr>
            ) : currentInventories.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  {filteredInventories.length === 0 ? 'No transactions found' : 'No transactions on this page'}
                </td>
              </tr>
            ) : (
              currentInventories.map((transaction) => {
                const displayInfo = getTransactionDisplayInfo(transaction);
                const transactionDate = new Date(transaction.verificationDate || transaction.createdAt);
                const isThisLoading = loadingId === transaction.id;
                const isDeleting = deletingId === transaction.id;

                return (
                  <tr key={`transaction-${transaction.id}-${transaction.inventoryType}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${displayInfo.typeColor}`}>
                          {displayInfo.typeLabel}
                        </span>
                        {transaction.isDeleted && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300 shadow-sm">
                            🗑️ DELETED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-[250px]">
                        <div className="text-gray-900">
                          {transaction.inventoryType === 'DELIVERY' ? (
                            (() => {
                              const isCancelled = transaction.remarks &&
                                transaction.remarks.includes('Delivery cancelled');
                              const isReturnToWarehouse = isCancelled &&
                                transaction.action === 'ADD' &&
                                transaction.toWarehouse;
                              const isRemoveFromBranch = isCancelled &&
                                transaction.action === 'SUBTRACT' &&
                                transaction.fromBranch;

                              if (isReturnToWarehouse) {
                                return (
                                  <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 mb-1">
                                      Delivery Cancelled
                                    </span>
                                    <div className="text-xs text-gray-600">
                                      Returned to: {transaction.toWarehouse.warehouseName}
                                    </div>
                                  </div>
                                );
                              }
                              if (isRemoveFromBranch) {
                                return (
                                  <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 mb-1">
                                      Delivery Cancelled
                                    </span>
                                    <div className="text-xs text-gray-600">
                                      Removed from: {transaction.fromBranch.branchName}
                                    </div>
                                  </div>
                                );
                              }
                              return `${transaction.fromWarehouse?.warehouseName || 'Warehouse'} → ${transaction.toBranch?.branchName || 'Branch'}`;
                            })()
                          ) : transaction.inventoryType === 'SALE' ?
                            `${transaction.fromBranch?.branchName || 'Branch'} → Sale` :
                            transaction.inventoryType === 'STOCK_IN' ?
                              `Stock In → ${transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-'}` :
                              transaction.inventoryType === 'DAMAGE' ?
                                `${transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-'} (Damage)` :
                                `${(transaction.fromWarehouse?.warehouseName || transaction.fromBranch?.branchName || '-')} → ${(transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-')}`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-sm">{(transaction.items?.length || 0).toLocaleString('en-US')}</td>
                    <td className="px-3 py-3 text-center text-sm font-medium text-blue-600">
                      {calculateTotalQuantity(transaction.items).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        if (!transactionDate || isNaN(transactionDate.getTime())) {
                          return (
                            <>
                              <div>N/A</div>
                              <div className="text-xs text-gray-500">--:--</div>
                            </>
                          );
                        }
                        return (
                          <>
                            <div>
                              {transactionDate.toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transactionDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleView(transaction)}
                        disabled={isThisLoading || isDeleting}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition
                          ${isThisLoading || isDeleting
                            ? 'text-blue-400 cursor-wait'
                            : 'text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        {isThisLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Eye size={14} />
                        )}
                        {isThisLoading ? 'Loading...' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredInventories.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          onPrevPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={indexOfFirstItem + 1}
          showingEnd={Math.min(indexOfLastItem, filteredInventories.length)}
          totalItems={filteredInventories.length}
        />
      )}
    </div>
  );
};

export default TransactionTable;