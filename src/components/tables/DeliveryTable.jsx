import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Printer, Package, Truck, XCircle } from 'lucide-react';
import Pagination from '../common/Pagination';
const STATUS_DOT = {
  PENDING: 'bg-gray-400',
  PREPARING: 'bg-yellow-500',
  IN_TRANSIT: 'bg-purple-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
  RETURNED: 'bg-orange-500',
};

const RowActions = ({ onView, items }) => {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onView}
        className="px-2.5 h-7 text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-50"
      >
        View
      </button>

      {items.length > 0 && (
        <>
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu(menu ? null : { top: r.bottom + 4, right: window.innerWidth - r.right });
            }}
            className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
          >
            <MoreVertical size={16} />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} />
              <div
                className="fixed z-[70] w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                style={{ top: menu.top, right: menu.right }}
              >
                {items.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => { setMenu(null); it.onClick(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${it.danger ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    <it.icon size={15} />
                    {it.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

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
  isLoading = false,
  productFilters = [],
  statusFilter = '',
  grandTotals = { totalPrepared: 0, totalDelivered: 0 },
  canEdit = true,
  canDelete = true,
  canCancel = true,
  canPrint = true,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  const totalPrepared = grandTotals?.totalPrepared || 0;
  const totalDelivered = grandTotals?.totalDelivered || 0;
  // Variance only makes sense when every row is DELIVERED; otherwise undelivered
  // rows (PENDING/PREPARING/IN_TRANSIT) have no delivered qty and would inflate it.
  const variance = totalPrepared - totalDelivered;
  const showVariance = statusFilter === 'DELIVERED' && variance !== 0;

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

  const getRowTotals = (delivery) => {
    const items = delivery.items || [];
    if (!productFilters || productFilters.length === 0) {
      return { sku: delivery.itemCount || 0, qty: delivery.totalPreparedQty || 0 };
    }
    const matchingItems = items.filter(item => {
      const itemProductId = item.product?.id ?? item.productId;
      const itemVariationId = item.variation?.id ?? item.variationId ?? null;
      return productFilters.some(pf =>
        Number(pf.productId) === Number(itemProductId) &&
        (pf.variationId == null ? null : Number(pf.variationId)) === (itemVariationId == null ? null : Number(itemVariationId))
      );
    });
    const qty = matchingItems.reduce((sum, it) => sum + (it.preparedQty || it.quantity || 0), 0);
    return { sku: matchingItems.length, qty };
  };


  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full table-panel flex flex-col flex-1 min-h-0">
      <div className="overflow-auto w-full table-fit flex-1 min-h-0">
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
            <col className="w-[120px]" /><col className="w-[130px]" />
          </colgroup>

          {/* ── HEAD ── */}
          <thead className="bg-white border-b-2 border-gray-200">
            <tr>
              <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-40 border-r border-gray-200">No.</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky left-[50px] bg-white z-40 border-r border-gray-200">DR #</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Warehouse</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prepared</th>
              <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivered</th>
              <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="pl-2 pr-6 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
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
                      <div className="h-7 w-7 bg-gray-100 rounded" />
                      <div className="h-7 w-7 bg-gray-100 rounded" />
                      <div className="h-7 w-7 bg-gray-100 rounded" />
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
                const rowTotals = getRowTotals(delivery);

                const isDelivered = delivery.status === 'DELIVERED';
                const isPending = delivery.status === 'PENDING';
                const isPreparing = delivery.status === 'PREPARING';
                const isCancelled = delivery.status === 'CANCELLED';
                const isReturned = delivery.status === 'RETURNED';

                const rowCanDelete = canDelete && (isPending || isPreparing);
                const rowCanEdit = canEdit && !isDelivered && !isCancelled && !isReturned;

                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr key={delivery.id} className="hover:bg-orange-50/30 transition-colors">
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
                              <Package size={12} className="text-orange-400 flex-shrink-0" />
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
                        <span className="text-sm font-bold text-gray-800">{rowTotals.sku}</span>
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="pl-2 pr-6 py-2.5 text-right">{rowTotals.qty > 0 ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {rowTotals.qty.toLocaleString('en-US')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-800 whitespace-nowrap capitalize">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[delivery.status] || 'bg-gray-400'}`} />
                        {String(delivery.customStatus || delivery.status).replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-1.5">
                      <RowActions
                        onView={() => onView(delivery)}
                        items={[
                          rowCanEdit && { label: 'Edit delivery', icon: Edit2, onClick: () => onEdit(delivery) },
                          canPrint && { label: 'Print receipt', icon: Printer, onClick: () => onPrint(delivery) },
                          isDelivered && canCancel && { label: 'Cancel delivery', icon: XCircle, danger: true, onClick: () => onCancel(delivery) },
                          rowCanDelete && { label: 'Delete delivery', icon: Trash2, danger: true, onClick: () => onDelete(delivery.id) },
                        ].filter(Boolean)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* ── FOOTER totals — only shown when not loading and data exists ── */}
          {!isLoading && sortedDeliveries.length > 0 && (
            <tfoot>
              <tr className="bg-orange-50 border-t-2 border-orange-300">
                <td colSpan={2} className="px-2 py-2 sticky left-0 bg-orange-50 z-10 border-r border-orange-200">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Grand Total
                  </span>
                  <div className="text-[10px] text-gray-500 leading-tight">
                    All pages, excl. cancelled
                  </div>
                </td>

                {/* Warehouse → SKU columns: breakdown of the totals */}
                <td colSpan={5} className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-3 flex-wrap text-xs text-gray-600">
                    <span>
                      Prepared:{' '}
                      <span className="font-semibold text-gray-900">
                        {totalPrepared.toLocaleString('en-US')}
                      </span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      Delivered:{' '}
                      <span className="font-bold text-green-700">
                        {totalDelivered.toLocaleString('en-US')}
                      </span>
                    </span>
                    {showVariance && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span
                          title="Prepared minus delivered, from deliveries where the delivered qty differs from the prepared qty"
                          className="font-semibold text-amber-700"
                        >
                          {variance > 0
                            ? `Short: ${variance.toLocaleString('en-US')}`
                            : `Over: ${Math.abs(variance).toLocaleString('en-US')}`}
                        </span>
                      </>
                    )}
                  </div>
                </td>

                {/* Qty column: prepared total, to line up with the per-row Qty (prepared) */}
                <td className="pl-2 pr-6 py-2 text-right"><div className="text-[10px] uppercase tracking-wide text-gray-500 leading-tight">Prepared</div>
                  <span className="text-sm font-semibold text-gray-900">
                    {totalPrepared.toLocaleString('en-US')}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!isLoading && totalItems > 0 && (
        <div className="border-t border-gray-200 flex-shrink-0">
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







