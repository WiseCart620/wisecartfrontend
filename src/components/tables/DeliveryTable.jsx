// src/components/tables/DeliveryTable.jsx
import React from 'react';
import { Eye, Edit2, Trash2, Printer, Package, Truck, XCircle } from 'lucide-react';
import Pagination from '../common/Pagination';

const DeliveryTable = ({
  deliveries = [],
  onView,
  onEdit,
  onDelete,
  onCancel,
  onPrint,
  onPageChange,
  currentPage = 1,
  itemsPerPage = 10,
  totalItems = 0,
  isLoading = false
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-gray-100 text-gray-700',
      PREPARING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusGroup = (status) => {
    const groups = {
      PREPARING: 1,
      IN_TRANSIT: 2,
      DELIVERED: 3,
      PENDING: 4,
      RETURNED: 5,
      CANCELLED: 999,
    };
    return groups[status] || 99;
  };

  const sortedDeliveries = [...deliveries].sort((a, b) => {
    const groupA = getStatusGroup(a.status);
    const groupB = getStatusGroup(b.status);
    if (groupA !== groupB) return groupA - groupB;
    const dateA = a.createdAt || a.datePrepared || a.date || a.id;
    const dateB = b.createdAt || b.datePrepared || b.date || b.id;
    if (dateA && dateB) return new Date(dateB) - new Date(dateA);
    return (b.id || 0) - (a.id || 0);
  });

  const grandTotalPrepared = sortedDeliveries.reduce((s, d) => s + (d.totalPreparedQty || 0), 0);
  const grandTotalSKU = sortedDeliveries.reduce((s, d) => s + (d.itemCount || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full table-panel">
      <div className="overflow-x-auto w-full table-fit">
        <table className="table-fixed min-w-[860px] w-full">
          <colgroup>
            <col className="w-[50px]" />
            <col className="w-[100px]" />
            <col className="w-[160px]" />
            <col className="w-[200px]" />
            <col className="w-[110px]" />
            <col className="w-[110px]" />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[100px]" />
            <col className="w-[130px]" />
          </colgroup>

          {/* ── HEAD ── */}
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200">No.</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky left-[50px] bg-gray-50 z-20 border-r border-gray-200">DR #</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Warehouse</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prepared</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivered</th>
              <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-2 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>

          {/* ── BODY ── */}
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              /* ── Loading skeleton rows — matches column structure exactly ── */
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {/* No. */}
                  <td className="px-2 py-3 sticky left-0 bg-white border-r border-gray-200">
                    <div className="h-4 bg-gray-100 rounded w-5 mx-auto" />
                  </td>
                  {/* DR # */}
                  <td className="px-2 py-3 sticky left-[50px] bg-white border-r border-gray-200">
                    <div className="h-4 bg-gray-100 rounded w-16" />
                  </td>
                  {/* Warehouse */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-28 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-16" />
                  </td>
                  {/* Branch */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-36" />
                  </td>
                  {/* Prepared */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-20" />
                  </td>
                  {/* Delivered */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-20" />
                  </td>
                  {/* SKU */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-8 mx-auto" />
                  </td>
                  {/* Qty */}
                  <td className="px-2 py-3">
                    <div className="h-4 bg-gray-100 rounded w-10 ml-auto" />
                  </td>
                  {/* Status */}
                  <td className="px-1 py-3">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                  </td>
                  {/* Actions */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                      <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                      <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : sortedDeliveries.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-6 py-16 text-center text-gray-500">
                  No deliveries found
                </td>
              </tr>
            ) : (
              sortedDeliveries.map((delivery, index) => {
                const drTotalPrepared = delivery.totalPreparedQty || 0;

                const isDelivered = delivery.status === 'DELIVERED';
                const isPending = delivery.status === 'PENDING';
                const isPreparing = delivery.status === 'PREPARING';
                const isCancelled = delivery.status === 'CANCELLED';
                const isReturned = delivery.status === 'RETURNED';

                const canDelete = isPending || isPreparing;
                const canEdit = !isDelivered && !isCancelled && !isReturned;

                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr key={delivery.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-2 py-2.5 text-center sticky left-0 bg-white z-10 border-r border-gray-200">
                      <span className="text-xs font-medium text-gray-500">{rowNumber}</span>
                    </td>
                    <td className="px-2 py-2.5 sticky left-[50px] bg-white z-10 border-r border-gray-200">
                      <div className="text-xs font-bold text-gray-900 truncate">{delivery.deliveryReceiptNumber}</div>
                    </td>

                    {/* From Warehouse */}
                    <td className="px-2 py-3">
                      {delivery.warehouses && delivery.warehouses.length > 0 ? (
                        <div className="space-y-0.5">
                          {delivery.warehouses.slice(0, 1).map((wh, idx) => (
                            <div key={idx} className="flex items-center gap-1 truncate">
                              <Package size={12} className="text-blue-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-800 truncate">{wh.warehouseName}</span>
                            </div>
                          ))}
                          {delivery.warehouses.length > 1 && (
                            <div className="text-xs text-gray-400 truncate">+{delivery.warehouses.length - 1} more</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No warehouse</span>
                      )}
                    </td>

                    {/* To Branch */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1 whitespace-normal break-words">
                        <Truck size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-gray-800">{delivery.branchName}</span>
                      </div>
                    </td>

                    {/* Date Prepared */}
                    <td className="px-2 py-2.5 text-xs text-gray-600">
                      {delivery.datePrepared
                        ? new Date(delivery.datePrepared).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                        : '—'}
                    </td>

                    {/* Date Delivered */}
                    <td className="px-2 py-2.5 text-xs text-gray-600">
                      {delivery.dateDelivered
                        ? new Date(delivery.dateDelivered).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                        : '—'}
                    </td>

                    {/* SKU */}
                    <td className="px-2 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Package size={13} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-800">{delivery.itemCount}</span>
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2.5 text-right">
                      {drTotalPrepared > 0 ? (
                        <span className="text-sm font-bold text-blue-700">
                          {drTotalPrepared.toLocaleString('en-US')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-1 py-2.5">
                      <span className={`px-1.5 py-0.5 inline-flex text-[11px] font-bold rounded-full ${getStatusColor(delivery.status)}`}>
                        {delivery.customStatus || delivery.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="pl-0 pr-1 py-2.5">
                      <div className="flex items-center gap-0">
                        <button
                          onClick={() => onView(delivery)}
                          title="View details"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={15} />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => onEdit(delivery)}
                            title="Edit delivery"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => onDelete(delivery.id)}
                            title="Delete delivery"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        {isDelivered && (
                          <button
                            onClick={() => onCancel(delivery)}
                            title="Cancel delivery"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        )}

                        <button
                          onClick={() => onPrint(delivery)}
                          title="Print receipt"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* ── FOOTER totals — only shown when not loading and data exists ── */}
          {!isLoading && sortedDeliveries.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td colSpan={2} className="px-2 py-2 sticky left-0 bg-gray-100 z-10 border-r border-gray-300">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Page Totals ({sortedDeliveries.length})
                  </span>
                </td>
                <td colSpan={4} className="px-2 py-2 text-right" />
                <td className="px-2 py-2 text-center">
                  <span className="text-sm font-bold text-gray-800">{grandTotalSKU.toLocaleString('en-US')}</span>
                </td>
                <td className="px-2 py-2 text-right">
                  <span className="text-sm font-bold text-blue-800">{grandTotalPrepared.toLocaleString('en-US')}</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!isLoading && totalItems > 0 && (
        <div className="border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onNextPage={() => onPageChange(currentPage + 1)}
            onPrevPage={() => onPageChange(currentPage - 1)}
            showingStart={indexOfFirstItem}
            showingEnd={indexOfLastItem}
            totalItems={totalItems}
          />
        </div>
      )}
    </div>
  );
};

export default DeliveryTable;