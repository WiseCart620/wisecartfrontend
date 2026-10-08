import React, { useEffect, useMemo } from 'react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import ProductMultiSelectDropdown from '../common/ProductMultiSelectDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const BranchFilterPanel = ({
  user,
  showBranchFilter,
  branches,
  companies = [],
  productSummaries = [],
  products = [],
  filters,
  updateFilter,
  clearFilters,
  actions
}) => {
  const selectedCompanyIds = filters.companyIds || [];
  const selectedKeys = filters.productKeys || [];

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
  }, [selectedCompanyIds.join(',')]);

  const productOptions = useMemo(() => {
    const make = (productId, variationId, productName, variationLabel, sku, upc) => ({
      id: `${productId}_${variationId ?? 'base'}`,
      parentProductId: productId,
      variationId: variationId ?? null,
      name: productName,
      fullName: variationLabel ? `${productName} - ${variationLabel}` : productName,
      subLabel: variationLabel || null,
      sku: sku || 'N/A',
      upc: upc || 'N/A',
      isVariation: variationId != null,
    });

    if (selectedCompanyIds.length === 0 || !Array.isArray(products) || products.length === 0) {
      const withVariations = new Set(
        productSummaries.filter((s) => s.variationId != null).map((s) => String(s.productId ?? s.id))
      );
      return productSummaries
        .filter((s) => s.variationId != null || !withVariations.has(String(s.productId ?? s.id)))
        .map((s) =>
          make(
            s.productId ?? s.id,
            s.variationId,
            s.productName,
            s.combinationDisplay || s.variationName,
            s.variationSku || s.sku,
            s.variationUpc || s.upc
          )
        );
    }

    return products.flatMap((p) => {
      if (!p) return [];
      if (p.variations && p.variations.length > 0) {
        return p.variations
          .filter((v) => (v.companyPrices || []).some((cp) => selectedCompanyIds.includes(cp.company?.id)))
          .map((v) => make(p.id, v.id, p.productName, v.combinationDisplay || 'Variation', v.sku || p.sku, v.upc || p.upc));
      }
      const hasCompanyPrice = (p.companyBasePrices || []).some((cbp) => selectedCompanyIds.includes(cbp.company?.id));
      return hasCompanyPrice ? [make(p.id, null, p.productName, null, p.sku, p.upc)] : [];
    });
  }, [products, productSummaries, selectedCompanyIds]);

  if (!showBranchFilter) return null;

  const hasActiveFilters = (filters.companyIds?.length > 0) || (filters.branchIds?.length > 0) ||
    (filters.productKeys?.length > 0) || filters.minQty || filters.maxQty || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-1.5 mb-2">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
        {canSeeFilter(user, 'warehouse_inventory', 'company') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0 [&>div>button]:!h-8 [&>div>button]:!py-0 [&>div>button]:!text-sm">
            <MultiSelectDropdown
              options={companies.map(c => ({ id: c.id, name: c.companyName }))}
              selectedIds={filters.companyIds || []}
              onChange={(ids) => updateFilter('companyIds', ids)}
              placeholder="All Companies"
              searchPlaceholder="Search companies..."
            />
          </div>
        )}

        {canSeeFilter(user, 'warehouse_inventory', 'branch') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0 [&>div>button]:!h-8 [&>div>button]:!py-0 [&>div>button]:!text-sm">
            <MultiSelectDropdown
              options={availableBranches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }))}
              selectedIds={filters.branchIds || []}
              onChange={(ids) => updateFilter('branchIds', ids)}
              placeholder="All Branches"
              searchPlaceholder="Search name or code..."
            />
          </div>
        )}



        {canSeeFilter(user, 'warehouse_inventory', 'quantity') && (
          <div className="h-8 flex items-center gap-1 border border-gray-300 rounded-lg px-2 flex-shrink-0">
            <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Stock</span>
            <input
              type="number"
              placeholder="Min"
              value={filters.minQty}
              onChange={(e) => updateFilter('minQty', e.target.value)}
              className="w-16 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
            <span className="text-gray-300">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxQty}
              onChange={(e) => updateFilter('maxQty', e.target.value)}
              className="w-16 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {canSeeFilter(user, 'warehouse_inventory', 'date') && (
          <div className="h-8 flex items-center gap-1 border border-gray-300 rounded-lg px-2 flex-shrink-0">
            <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
            <span className="text-gray-300">–</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
          </div>
        )}
        {canSeeFilter(user, 'warehouse_inventory', 'product') && (
          <div className="w-[300px] max-w-full flex-shrink-0 [&>div>button]:!h-8 [&>div>button]:!py-0 [&>div>button]:!text-sm">
            <ProductMultiSelectDropdown
              options={productOptions}
              selectedIds={selectedKeys}
              onChange={(ids) => updateFilter('productKeys', ids)}
              placeholder="Product / UPC / SKU"
              disabled={productOptions.length === 0}
            />
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="col-span-2 sm:col-span-1 text-sm text-orange-600 hover:text-orange-800 whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}

        {actions && (
          <div className="col-span-2 sm:col-span-1 sm:ml-auto flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchFilterPanel;