import React from 'react';
import { Eye, Edit2, Trash2, Check, Loader2 } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import { formatCurrency } from '../../utils/salesUtils';
import { months } from '../../constants/salesConstants';

const SalesTable = ({
  sales, loading,
  currentPage, totalPages, totalElements,
  canCreate, canDelete,
  onView, onEdit, onUpdateStatus, onDelete,
  onPageChange,
  loadingAction,
}) => {
  const currentSales = Array.isArray(sales) ? sales : [];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] sales-print-table">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Encoded By</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-6 mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  <td className="px-3 py-3"><div className="h-6 bg-gray-100 rounded-full w-16" /></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                </tr>
              ))
            ) : currentSales.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">No sales found</td>
              </tr>
            ) : (
              currentSales.map((sale, idx) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-3 whitespace-nowrap text-center text-xs text-gray-400 font-medium">
                    {((currentPage - 1) * 10) + idx + 1}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{sale.branch.branchName}</div>
                    <div className="text-xs text-gray-500">{sale.branch.branchCode}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">{sale.company.companyName}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">{months[sale.month - 1]} {sale.year}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">{sale.createdBy || sale.generatedBy || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(sale.totalAmount)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-[11px] leading-5 font-semibold rounded-full ${sale.status === 'INVOICED' ? 'bg-green-100 text-green-800' :
                      sale.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm font-medium no-print">
                    <div className="flex items-center gap-0.5 flex-nowrap">
                      <button onClick={() => onView(sale)} disabled={loadingAction?.id === sale.id} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-50 transition disabled:opacity-60" title="View">
                        {loadingAction?.id === sale.id && loadingAction?.type === 'view' ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                      </button>

                      {sale.status === 'PENDING' && canCreate && (
                        <>
                          <button onClick={() => onEdit(sale)} disabled={loadingAction?.id === sale.id} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-60" title="Edit">
                            {loadingAction?.id === sale.id && loadingAction?.type === 'edit' ? <Loader2 size={15} className="animate-spin" /> : <Edit2 size={15} />}
                          </button>
                          <button onClick={() => onUpdateStatus(sale.id, 'CONFIRMED')} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-green-600 hover:bg-green-50 transition" title="Confirm Sale">
                            <Check size={15} />
                          </button>
                          {canDelete && (
                            <button onClick={() => onDelete(sale.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      )}

                      {sale.status === 'CONFIRMED' && canCreate && (
                        <>
                          {canDelete && (
                            <button onClick={() => onDelete(sale.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      )}

                      {sale.status === 'INVOICED' && canDelete && (
                        <button onClick={() => onDelete(sale.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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
          showingStart={((currentPage - 1) * 10) + 1}
          showingEnd={Math.min(currentPage * 10, totalElements)}
          totalItems={totalElements}
        />
      )}
    </div>
  );
};

export default SalesTable;