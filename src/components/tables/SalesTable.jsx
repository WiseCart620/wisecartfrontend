import React from 'react';
import { Edit2, Trash2, Check } from 'lucide-react';
import RowActions from '../../components/common/RowActions';
import Pagination from '../../components/common/Pagination';
import { formatCurrency } from '../../utils/salesUtils';
import { months } from '../../constants/salesConstants';

const PAGE_SIZE = 50;

const STATUS_DOT = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-orange-500',
  INVOICED: 'bg-green-500',
};

const SalesTable = ({
  sales, loading,
  currentPage, totalPages, totalElements,
  canCreate, canEdit, canDelete,
  onView, onEdit, onUpdateStatus, onDelete,
  onPageChange,
  loadingAction,
  productFilters = [],
}) => {
  const currentSales = Array.isArray(sales) ? sales : [];

  const getRowTotals = (sale) => {
    const items = sale.items || [];
    if (!productFilters || productFilters.length === 0) {
      const qty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
      return { qty, amount: sale.totalAmount || 0 };
    }
    const matchingItems = items.filter(item =>
      productFilters.some(pf =>
        pf.productId === item.product?.id && (pf.variationId ?? null) === (item.variation?.id ?? null)
      )
    );
    const qty = matchingItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const amount = matchingItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    return { qty, amount };
  };

  return (
    <div className="bg-white overflow-hidden table-panel flex-1 min-h-0 flex flex-col">
      <div className="overflow-auto flex-1 min-h-0 table-fit">
        <table className="w-full min-w-[680px] sales-print-table table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_#d1d5db]">
            <tr>
              <th className="px-3 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Sale No.</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate">Company</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate">Encoded By</th>
              <th className="pl-3 pr-10 py-3 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="pl-6 pr-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-6 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-10" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-10 ml-auto" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-3 py-3"><div className="h-6 bg-gray-100 rounded-full w-16" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                </tr>
              ))
            ) : currentSales.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-6 py-12 text-center text-gray-500">No sales found</td>
              </tr>
            ) : (
              currentSales.map((sale, idx) => (
                <tr key={sale.id} className="hover:bg-white transition">
                  <td className="px-3 py-3 whitespace-nowrap text-center text-xs text-gray-400 font-medium">
                    {((currentPage - 1) * PAGE_SIZE) + idx + 1}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">{sale.id}</td>
                  <td className="px-3 py-3">
                    <div className="text-xs font-medium text-gray-900 truncate" title={sale.branch.branchName}>{sale.branch.branchName}</div>
                    <div className="text-xs text-gray-500">{sale.branch.branchCode}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 truncate" title={sale.company.companyName}>{sale.company.companyName}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">{months[sale.month - 1]} {sale.year}</td>
                  <td className="px-3 py-3 truncate text-xs text-gray-900">{sale.createdBy || sale.generatedBy || '-'}</td>
                  <td className="pl-3 pr-10 py-3 whitespace-nowrap text-xs text-gray-700 text-right">{getRowTotals(sale).qty.toLocaleString()}</td>
                  <td className="pl-6 pr-3 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(getRowTotals(sale).amount)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-800 capitalize">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[sale.status] || 'bg-gray-400'}`} />
                      {String(sale.status).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap no-print">
                    <RowActions
                      loading={loadingAction?.id === sale.id}
                      onView={() => onView(sale)}
                      items={[
                        sale.status === 'PENDING' && canCreate && canEdit && { label: 'Edit sale', icon: Edit2, onClick: () => onEdit(sale) },
                        sale.status === 'PENDING' && canCreate && { label: 'Confirm sale', icon: Check, onClick: () => onUpdateStatus(sale.id, 'CONFIRMED') },
                        (((sale.status === 'PENDING' || sale.status === 'CONFIRMED') && canCreate) || sale.status === 'INVOICED') && canDelete && { label: 'Delete sale', icon: Trash2, danger: true, onClick: () => onDelete(sale.id) },
                      ].filter(Boolean)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalElements > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          onPageChange={onPageChange}
          onNextPage={() => onPageChange(currentPage + 1)}
          onPrevPage={() => onPageChange(currentPage - 1)}
          showingStart={((currentPage - 1) * PAGE_SIZE) + 1}
          showingEnd={Math.min(currentPage * PAGE_SIZE, totalElements)}
          totalItems={totalElements}
        />
      )}
    </div>
  );
};

export default SalesTable;
