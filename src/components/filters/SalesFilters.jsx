import React, { useState } from 'react';
import { Search, Plus, FileText, X, ChevronDown } from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const SalesFilters = ({
  user,
  filterData, setFilterData,
  statusFilter, setStatusFilter,
  searchTerm, setSearchTerm,
  companies, branches,
  allFilteredSales,
  productsByStatus,
  allProductOptions,
  dataLoading = false,
  canCreate, canInvoice, canReport, canSummary,
  onNewSale,
  onOpenInvoice,
  onOpenJournal,
  onOpenReport,
  onOpenSummary,
  onOpenStatusModal,
  onResetFilter,
  setCurrentPage,
}) => {
  const [showSummary, setShowSummary] = useState(false);

  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName || c.name }));
  const branchOptions = branches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }));

  const filteredBranchOptions = (filterData.companyIds && filterData.companyIds.length > 0)
    ? branches.filter(b => filterData.companyIds.includes(b.company?.id)).map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }))
    : branchOptions;

  const hasActiveFilters = (filterData.companyIds?.length > 0) || (filterData.branchIds?.length > 0) || filterData.startDate ||
    filterData.endDate || filterData.productFilters.length > 0 || searchTerm || statusFilter !== 'ALL';

  const pendingAmt = allFilteredSales.pendingAmount || 0;
  const confirmedAmt = allFilteredSales.confirmedAmount || 0;
  const invoicedAmt = allFilteredSales.invoicedAmount || 0;
  const grandTotal = pendingAmt + confirmedAmt + invoicedAmt;

  const pendingQty = productsByStatus.pending.length > 0
    ? productsByStatus.pending.reduce((sum, p) => sum + p.quantity, 0)
    : allFilteredSales.pendingQty || 0;
  const confirmedQty = productsByStatus.confirmed.length > 0
    ? productsByStatus.confirmed.reduce((sum, p) => sum + p.quantity, 0)
    : allFilteredSales.confirmedQty || 0;
  const invoicedQty = productsByStatus.invoiced.length > 0
    ? productsByStatus.invoiced.reduce((sum, p) => sum + p.quantity, 0)
    : allFilteredSales.invoicedQty || 0;

  const fmt = (n) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 lg:p-4 mb-4">
      <div className="flex flex-col gap-3">

        {/* Top row: action buttons + search */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button onClick={onNewSale} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm transition-all duration-150 shadow-sm text-sm font-medium">
                <Plus size={16} /> New Sale
              </button>
            )}
            {canInvoice && (
              <button onClick={onOpenInvoice} className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 hover:shadow-sm transition-all duration-150 text-sm font-medium">
                <FileText size={16} /> Generate Invoice / COS
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-56 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search branch/company..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200">
          {canSeeFilter(user, 'sales', 'company') && (
            <div className="min-w-[140px] max-w-[260px] flex-shrink-0">
              <MultiSelectDropdown
                options={companyOptions}
                selectedIds={filterData.companyIds || []}
                onChange={(ids) => {
                  setFilterData(prev => {
                    const update = { ...prev, companyIds: ids };
                    if (ids.length > 0 && prev.branchIds?.length) {
                      const validIds = branches.filter(b => ids.includes(b.company?.id)).map(b => b.id);
                      update.branchIds = prev.branchIds.filter(id => validIds.includes(id));
                    }
                    return update;
                  });
                  setCurrentPage(1);
                }}
                placeholder="All Companies"
                searchPlaceholder="Search companies..."
                loading={dataLoading}
              />
            </div>
          )}

          {canSeeFilter(user, 'sales', 'branch') && (
            <div className="min-w-[140px] max-w-[260px] flex-shrink-0">
              <MultiSelectDropdown
                options={filteredBranchOptions}
                selectedIds={filterData.branchIds || []}
                onChange={(ids) => { setFilterData(prev => ({ ...prev, branchIds: ids })); setCurrentPage(1); }}
                placeholder="All Branches"
                searchPlaceholder="Search name or code..."
                loading={dataLoading}
              />
            </div>
          )}

          {canSeeFilter(user, 'sales', 'status') && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-36 flex-shrink-0"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="INVOICED">Invoiced</option>
            </select>
          )}

          {canSeeFilter(user, 'sales', 'date') && (
            <div className="h-9 flex items-center gap-1 border border-gray-300 rounded-lg px-2 flex-shrink-0">
              <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
              <input
                type="date"
                value={filterData.startDate}
                onChange={(e) => { setFilterData(prev => ({ ...prev, startDate: e.target.value })); setCurrentPage(1); }}
                className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
              />
              <span className="text-gray-300">–</span>
              <input
                type="date"
                value={filterData.endDate}
                onChange={(e) => { setFilterData(prev => ({ ...prev, endDate: e.target.value })); setCurrentPage(1); }}
                className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
              />
            </div>
          )}

          {canSeeFilter(user, 'sales', 'product') && (
            <div className="inline-block flex-shrink-0">
              <VariationSearchableDropdown
                options={allProductOptions.filter(o =>
                  !filterData.productFilters.some(pf =>
                    pf.productId === o.parentProductId && (pf.variationId ?? null) === (o.variationId ?? null)
                  )
                )}
                value=""
                onChange={(value) => {
                  if (!value) return;
                  const option = allProductOptions.find(o => o.id === value);
                  if (!option) return;
                  const alreadyAdded = filterData.productFilters.some(pf =>
                    pf.productId === option.parentProductId && (pf.variationId ?? '') === (option.variationId ?? '')
                  );
                  if (alreadyAdded) return;
                  const label = option.subLabel !== 'No variations' ? `${option.fullName} — ${option.subLabel}` : option.fullName;
                  setFilterData(prev => ({
                    ...prev,
                    productFilters: [...prev.productFilters, { productId: option.parentProductId, variationId: option.variationId ?? null, label }]
                  }));
                  setCurrentPage(1);
                }}
                placeholder="Product / UPC / SKU"
                hideLocationHint={true}
                loading={dataLoading}
              />
            </div>
          )}

          {hasActiveFilters && (
            <button onClick={onResetFilter} className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>

        {(filterData.companyIds?.length > 0) && filteredBranchOptions.length === 0 && (
          <p className="text-xs text-orange-600">No branches for selected company(ies)</p>
        )}

        {filterData.productFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {filterData.productFilters.map((pf, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {pf.label}
                <button
                  type="button"
                  onClick={() => {
                    setFilterData(prev => ({ ...prev, productFilters: prev.productFilters.filter((_, i) => i !== idx) }));
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-red-200 hover:text-red-700 transition-colors"
                >
                  <X size={9} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}


        {canSummary && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowSummary(prev => !prev)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-sm text-xs transition-all duration-150"
            >
              <FileText size={13} /> View Summary
              <ChevronDown size={14} className={`transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`} />
            </button>

            <div
              className={`grid transition-all duration-300 ease-out ${showSummary ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { status: 'PENDING', label: 'Pending', amt: pendingAmt, count: allFilteredSales.pendingCount ?? 0, qty: pendingQty, hoverClass: 'hover:bg-yellow-50' },
                    { status: 'CONFIRMED', label: 'Confirmed', amt: confirmedAmt, count: allFilteredSales.confirmedCount ?? 0, qty: confirmedQty, hoverClass: 'hover:bg-blue-50' },
                    { status: 'INVOICED', label: 'Invoiced', amt: invoicedAmt, count: allFilteredSales.invoicedCount ?? 0, qty: invoicedQty, hoverClass: 'hover:bg-green-50' },
                  ].map(({ status, label, amt, count, qty, hoverClass }) => (
                    <button
                      key={status}
                      onClick={() => onOpenStatusModal(status)}
                      className={`flex items-center gap-2 border border-blue-400 rounded-lg px-3 py-1 ${hoverClass} transition-colors cursor-pointer`}
                    >
                      <span className="text-xs text-gray-600">{label}:</span>
                      <span className="text-xs text-gray-800">₱{fmt(amt)}</span>
                      <span className="text-xs text-gray-700">{count}</span>
                      <span className="text-xs text-gray-500 ml-1">(Qty: {qty.toLocaleString()})</span>
                    </button>
                  ))}

                  <div className="flex items-center gap-2 border-2 border-orange-400 rounded-lg px-3 py-1">
                    <span className="text-xs text-gray-700">Total Qty:</span>
                    <span className="text-sm text-gray-800">{(pendingQty + confirmedQty + invoicedQty).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2 border-2 border-orange-600 rounded-lg px-3 py-1">
                    <span className="text-xs text-orange-700">Grand Total:</span>
                    <span className="text-sm text-orange-700">₱{fmt(grandTotal)}</span>
                    <button
                      onClick={onOpenSummary}
                      className="flex items-center gap-1 pl-2 ml-1 border-l border-orange-300 text-orange-700 hover:text-orange-900 text-xs transition-colors"
                    >
                      Open Summary <ChevronDown size={12} className="-rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesFilters;