import React, { useState, useEffect } from 'react';
import { Plus, FileText, ChevronDown } from 'lucide-react';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import ProductMultiSelectDropdown from '../../components/common/ProductMultiSelectDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const SalesFilters = ({
  user,
  filterData, setFilterData,
  statusFilter, setStatusFilter,
  searchTerm, setSearchTerm,
  saleNoTerm, setSaleNoTerm,
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
  const [summaryPos, setSummaryPos] = useState(null);
  const showSummary = !!summaryPos;

  useEffect(() => {
    if (!summaryPos) return;
    const close = () => setSummaryPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [summaryPos]);

  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName || c.name }));
  const branchOptions = branches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }));

  const filteredBranchOptions = (filterData.companyIds && filterData.companyIds.length > 0)
    ? branches.filter(b => filterData.companyIds.includes(b.company?.id)).map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }))
    : branchOptions;

  const selectedProductOptionIds = allProductOptions
    .filter(o => filterData.productFilters.some(pf =>
      pf.productId === o.parentProductId &&
      (pf.variationId ?? null) === (o.variationId ?? null)
    ))
    .map(o => o.id);

  const handleProductIdsChange = (ids) => {
    const next = ids
      .map(id => allProductOptions.find(o => o.id === id))
      .filter(Boolean)
      .map(o => ({
        productId: o.parentProductId,
        variationId: o.variationId ?? null,
        label: o.subLabel && o.subLabel !== 'No variations'
          ? `${o.fullName} — ${o.subLabel}`
          : o.fullName,
      }));
    setFilterData(prev => ({ ...prev, productFilters: next }));
    setCurrentPage(1);
  };

  const hasActiveFilters = (filterData.companyIds?.length > 0) || (filterData.branchIds?.length > 0) || filterData.startDate ||
    filterData.endDate || filterData.productFilters.length > 0 || searchTerm || saleNoTerm || statusFilter !== 'ALL';

  const pendingAmt = allFilteredSales.pendingAmount || 0;
  const confirmedAmt = allFilteredSales.confirmedAmount || 0;
  const invoicedAmt = allFilteredSales.invoicedAmount || 0;
  const grandTotal = pendingAmt + confirmedAmt + invoicedAmt;

  const pendingQty = allFilteredSales.pendingQty || 0;
  const confirmedQty = allFilteredSales.confirmedQty || 0;
  const invoicedQty = allFilteredSales.invoicedQty || 0;

  const fmt = (n) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dropdownFix = '[&>div>button]:!h-8 [&>div>button]:!min-h-0 [&>div>button]:!py-0 [&>div>button]:!text-sm [&>div>button>span]:!truncate [&>div>button>span]:!whitespace-nowrap';

  return (
    <div className="py-1 mb-1 flex-shrink-0">
      <div className="flex flex-col gap-1.5">

        {/* Top row: action buttons + search */}
        <div className="flex flex-row gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button onClick={onNewSale} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 transition-all duration-150 text-xs font-medium whitespace-nowrap">
                <Plus size={16} /> New Sale
              </button>
            )}
            {canInvoice && (
              <button onClick={onOpenInvoice} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50 transition-all duration-150 text-xs font-medium whitespace-nowrap">
                <FileText size={16} /> Generate Invoice / COS
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-1.5">
          {canSeeFilter(user, 'sales', 'company') && (
            <div className={`min-w-[140px] max-w-[200px] flex-shrink-0 ${dropdownFix}`}>
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
              className="h-8 px-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-32 flex-shrink-0"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="INVOICED">Invoiced</option>
            </select>
          )}

          {canSeeFilter(user, 'sales', 'date') && (
            <div className="h-8 flex items-center gap-1 border border-gray-300 rounded px-2 flex-shrink-0">
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
            <div className="min-w-[140px] max-w-[260px] flex-shrink-0">
              <ProductMultiSelectDropdown
                options={allProductOptions}
                selectedIds={selectedProductOptionIds}
                onChange={handleProductIdsChange}
                placeholder="All Products"
                disabled={dataLoading}
              />
            </div>
          )}

          {canSeeFilter(user, 'sales', 'search') && (
            <input
              type="text"
              value={saleNoTerm || ''}
              onChange={(e) => { setSaleNoTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Sale No. (e.g. 3258, 7753)"
              className="h-8 px-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-44 flex-shrink-0"
            />
          )}

          {hasActiveFilters && (
            <button onClick={onResetFilter} className="text-sm text-orange-600 hover:text-orange-800 font-medium ml-auto whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>

        {(filterData.companyIds?.length > 0) && filteredBranchOptions.length === 0 && (
          <p className="text-xs text-orange-600">No branches for selected company(ies)</p>
        )}


        {canSummary && (
          <div className="pt-0.5">
            <button
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setSummaryPos(summaryPos ? null : { top: r.bottom + 6, left: r.left });
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:shadow-sm text-xs transition-all duration-150"
            >
              <FileText size={13} /> View Summary
              <ChevronDown size={14} className={`transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`} />
            </button>

            {summaryPos && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setSummaryPos(null)} />
                <div
                  className="fixed z-[70] w-80 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                  style={{ top: summaryPos.top, left: summaryPos.left }}
                >
                  {[
                    { status: 'PENDING', label: 'Pending', amt: pendingAmt, count: allFilteredSales.pendingCount ?? 0, qty: pendingQty, dot: 'bg-yellow-500' },
                    { status: 'CONFIRMED', label: 'Confirmed', amt: confirmedAmt, count: allFilteredSales.confirmedCount ?? 0, qty: confirmedQty, dot: 'bg-orange-500' },
                    { status: 'INVOICED', label: 'Invoiced', amt: invoicedAmt, count: allFilteredSales.invoicedCount ?? 0, qty: invoicedQty, dot: 'bg-green-500' },
                  ].map(({ status, label, amt, count, qty, dot }) => (
                    <button
                      key={status}
                      onClick={() => { setSummaryPos(null); onOpenStatusModal(status); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-xs text-gray-800 w-16">{label}</span>
                      <span className="text-xs text-gray-900 font-medium flex-1 text-right">₱{fmt(amt)}</span>
                      <span className="text-[11px] text-gray-500 w-20 text-right">{count} · Qty {qty.toLocaleString()}</span>
                    </button>
                  ))}

                  <div className="border-t border-gray-100 my-1" />

                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs text-gray-600">Total Qty</span>
                    <span className="text-xs text-gray-900 font-medium">{(pendingQty + confirmedQty + invoicedQty).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs text-gray-600">Grand Total</span>
                    <span className="text-sm text-gray-900 font-semibold">₱{fmt(grandTotal)}</span>
                  </div>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => { setSummaryPos(null); onOpenSummary(); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Open Summary <ChevronDown size={12} className="-rotate-90" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesFilters;