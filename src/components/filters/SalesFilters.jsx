import React from 'react';
import { Search, Plus, FileText, X } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';

const SalesFilters = ({
  filterData, setFilterData,
  statusFilter, setStatusFilter,
  searchTerm, setSearchTerm,
  companies, branches,
  allFilteredSales,
  productsByStatus,
  allProductOptions,
  dataLoading = false,
  canCreate, canFinance, isEncoder,
  onNewSale,
  onOpenInvoice,
  onOpenJournal,
  onOpenReport,
  onOpenSummary,
  onOpenStatusModal,
  onResetFilter,
  setCurrentPage,
}) => {
  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName || c.name }));
  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

  const filteredBranchOptions = filterData.companyId
    ? branches.filter(b => b.company?.id === filterData.companyId).map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const hasActiveFilters = filterData.companyId || (filterData.branchIds?.length > 0) || filterData.startDate ||
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
              <button onClick={onNewSale} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm">
                <Plus size={16} /> New Sale
              </button>
            )}
            {canFinance && (
              <button onClick={onOpenInvoice} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm">
                <FileText size={16} /> Generate Invoice / COS
              </button>
            )}
            {canFinance && (
              <button onClick={onOpenJournal} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm font-medium">
                <FileText size={16} /> Sales Journal
              </button>
            )}
            {canFinance && (
              <button onClick={onOpenReport} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium">
                <span className="text-sm font-bold leading-none">₱</span> Sales Report
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

        {/* Filter row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Company</label>
            <SearchableDropdown
              options={companyOptions}
              value={filterData.companyId}
              onChange={(value) => {
                setFilterData(prev => {
                  const update = { ...prev, companyId: value };
                  if (value && prev.branchIds?.length) {
                    const validIds = branches.filter(b => b.company?.id === value).map(b => b.id);
                    update.branchIds = prev.branchIds.filter(id => validIds.includes(id));
                  }
                  return update;
                });
                setCurrentPage(1);
              }}
              placeholder="All Companies" displayKey="name" valueKey="id"
              loading={dataLoading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
            <MultiSelectDropdown
              options={filteredBranchOptions}
              selectedIds={filterData.branchIds || []}
              onChange={(ids) => { setFilterData(prev => ({ ...prev, branchIds: ids })); setCurrentPage(1); }}
              placeholder="All Branches"
              searchPlaceholder="Search branches..."
              loading={dataLoading}
            />
            {filterData.companyId && filteredBranchOptions.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No branches for selected company</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="INVOICED">Invoiced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={filterData.startDate}
              onChange={(e) => { setFilterData(prev => ({ ...prev, startDate: e.target.value })); setCurrentPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={filterData.endDate}
              onChange={(e) => { setFilterData(prev => ({ ...prev, endDate: e.target.value })); setCurrentPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Product filter + summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Product / UPC / SKU</label>
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
              placeholder="Add product filter..."
              hideLocationHint={true}
              loading={dataLoading}
            />
            {filterData.productFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
          </div>

          {!isEncoder && (
            <div className="flex flex-col justify-start">
              <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
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
                    <span className="text-xs font-semibold text-gray-800">₱{fmt(amt)}</span>
                    <span className="text-xs font-bold text-gray-700">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">(Qty: {qty.toLocaleString()})</span>
                  </button>
                ))}

                <div className="flex items-center gap-2 border-2 border-blue-400 rounded-lg px-3 py-1">
                  <span className="text-xs font-bold text-gray-700">Total Qty:</span>
                  <span className="text-sm font-black text-gray-800">{(pendingQty + confirmedQty + invoicedQty).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2 border-2 border-blue-600 rounded-lg px-3 py-1">
                  <span className="text-xs font-bold text-blue-700">Grand Total:</span>
                  <span className="text-sm font-black text-blue-700">₱{fmt(grandTotal)}</span>
                </div>

                <button
                  onClick={onOpenSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors"
                >
                  <FileText size={13} /> View Summary
                </button>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-2">
            <button onClick={onResetFilter} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
              <X size={16} /> Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesFilters;