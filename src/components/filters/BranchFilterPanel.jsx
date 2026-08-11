import React, { useEffect, useMemo } from 'react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import ProductMultiSelectDropdown from '../common/ProductMultiSelectDropdown';

const BranchFilterPanel = ({
  showBranchFilter,
  branches,
  companies = [],
  productSummaries = [],
  filters,
  updateFilter,
  clearFilters
}) => {
  const selectedCompanyIds = filters.companyIds || [];

  const availableBranches = useMemo(() => {
    if (selectedCompanyIds.length === 0) return branches;
    return branches.filter(b => {
      const branchCompanyId = b.companyId ?? b.company?.id ?? null;
      return selectedCompanyIds.includes(branchCompanyId);
    });
  }, [branches, selectedCompanyIds]);

  useEffect(() => {
    if (selectedCompanyIds.length === 0) return;
    const availableIds = new Set(availableBranches.map(b => b.id));
    const currentBranchIds = filters.branchIds || [];
    const stillValid = currentBranchIds.filter(id => availableIds.has(id));
    if (stillValid.length !== currentBranchIds.length) {
      updateFilter('branchIds', stillValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyIds.join(',')]);

  const productOptions = useMemo(() => {
    return productSummaries.map(p => {
      const isVariation = p.isVariation === true || !!p.variationId;
      const sku = p.variationSku || p.sku || 'N/A';
      const upc = p.variationUpc || p.upc || 'N/A';
      const variationLabel = p.combinationDisplay || p.variationName || null;
      return {
        id: `${p.productId ?? p.id}_${p.variationId ?? 'base'}`,
        name: isVariation && variationLabel
          ? `${p.productName} (${variationLabel})`
          : p.productName,
        sku,
        upc,
        subLabel: isVariation ? variationLabel : null,
      };
    });
  }, [productSummaries]);

  if (!showBranchFilter) return null;

  const hasActiveFilters = (filters.companyIds?.length > 0) || (filters.branchIds?.length > 0) ||
    (filters.productKeys?.length > 0) || filters.minQty || filters.maxQty || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <MultiSelectDropdown
            options={companies.map(c => ({ id: c.id, name: c.companyName }))}
            selectedIds={filters.companyIds || []}
            onChange={(ids) => updateFilter('companyIds', ids)}
            placeholder="All Companies"
            searchPlaceholder="Search companies..."
          />
        </div>

        <div className="w-44">
          <MultiSelectDropdown
            options={availableBranches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }))}
            selectedIds={filters.branchIds || []}
            onChange={(ids) => updateFilter('branchIds', ids)}
            placeholder="All Branches"
            searchPlaceholder="Search name or code..."
          />
        </div>

        <div className="w-52">
          <ProductMultiSelectDropdown
            options={productOptions}
            selectedIds={filters.productKeys || []}
            onChange={(ids) => updateFilter('productKeys', ids)}
            placeholder="All Products"
            searchPlaceholder="Search by name, SKU, or UPC..."
          />
        </div>

        {/* Stock range group */}
        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1">
          <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Stock</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.minQty}
            onChange={(e) => updateFilter('minQty', e.target.value)}
            className="w-16 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
          />
          <span className="text-gray-300">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxQty}
            onChange={(e) => updateFilter('maxQty', e.target.value)}
            className="w-16 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Date range group */}
        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1">
          <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className="w-32 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
          />
          <span className="text-gray-300">–</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className="w-32 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default BranchFilterPanel;