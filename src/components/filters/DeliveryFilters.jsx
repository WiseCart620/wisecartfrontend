// src/components/filters/DeliveryFilters.jsx
import React from 'react';
import ProductMultiSelectDropdown from '../common/ProductMultiSelectDropdown';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const DeliveryFilters = ({
  user,
  filterData,
  onFilterChange,
  onReset,
  companies = [],
  branches = [],
  warehouses = [],
  products = [],
  statusOptions = ['PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'PENDING', 'RETURNED']
}) => {
  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName }));
  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const warehouseOptions = warehouses.map(w => ({ id: w.id, name: `${w.warehouseName} (${w.warehouseCode})` }));

  const productOptions = products.flatMap(product => {
    const selectedCompanyIds = filterData.companyIds || [];
    if (product.variations && product.variations.length > 0) {
      return product.variations
        .filter(variation => {
          if (selectedCompanyIds.length === 0) return true;
          return (variation.companyPrices || []).some(cp => selectedCompanyIds.includes(cp.company?.id));
        })
        .map(variation => ({
          id: `${product.id}_${variation.id}`,
          parentProductId: product.id,
          variationId: variation.id,
          name: product.productName,
          fullName: product.productName,
          subLabel: variation.combinationDisplay || 'Variation',
          upc: variation.upc || product.upc || '',
          sku: variation.sku || product.sku || '',
          isVariation: true,
        }));
    }

    if (selectedCompanyIds.length > 0) {
      const hasCompanyPrice = (product.companyBasePrices || [])
        .some(cbp => selectedCompanyIds.includes(cbp.company?.id));
      if (!hasCompanyPrice) return [];
    }

    return [{
      id: `prod_${product.id}`,
      parentProductId: product.id,
      variationId: null,
      name: product.productName,
      fullName: product.productName,
      subLabel: 'No variations',
      upc: product.upc || '',
      sku: product.sku || '',
      isVariation: false,
    }];
  });

  const selectedProductOptionIds = productOptions
    .filter(o => (filterData.productFilters || []).some(pf =>
      pf.productId === o.parentProductId &&
      (pf.variationId ?? null) === (o.variationId ?? null)
    ))
    .map(o => o.id);

  const handleProductIdsChange = (ids) => {
    const next = ids
      .map(id => productOptions.find(o => o.id === id))
      .filter(Boolean)
      .map(o => ({
        productId: o.parentProductId,
        variationId: o.variationId ?? null,
        label: o.subLabel && o.subLabel !== 'No variations'
          ? `${o.fullName} — ${o.subLabel}`
          : o.fullName,
      }));
    onFilterChange({ productFilters: next });
  };

  const filteredBranchOptions = (filterData.companyIds && filterData.companyIds.length > 0)
    ? branches
      .filter(b => filterData.companyIds.includes(b.company?.id))
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const hasActiveFilters = Object.entries(filterData).some(
    ([k, v]) => {
      if (k === 'status' && v === 'HIDE_CANCELLED') return false;
      if (k === 'productFilters' || k === 'warehouseIds' || k === 'companyIds' || k === 'branchIds') {
        return Array.isArray(v) && v.length > 0;
      }
      return v !== '' && v !== null && v !== undefined;
    }
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        {canSeeFilter(user, 'deliveries', 'company') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0">
            <MultiSelectDropdown
              options={companyOptions}
              selectedIds={filterData.companyIds || []}
              onChange={(ids) => {
                const currentBranchIds = filterData.branchIds || [];
                const stillValidBranchIds = ids.length === 0
                  ? currentBranchIds
                  : currentBranchIds.filter(bId => {
                    const b = branches.find(br => br.id === bId);
                    return b && ids.includes(b.company?.id);
                  });
                onFilterChange({
                  companyIds: ids,
                  branchIds: stillValidBranchIds
                });
              }}
              placeholder="All Companies"
              searchPlaceholder="Search companies..."
            />
          </div>
        )}

        {canSeeFilter(user, 'deliveries', 'branch') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0">
            <MultiSelectDropdown
              options={filteredBranchOptions}
              selectedIds={filterData.branchIds || []}
              onChange={(ids) => onFilterChange({ branchIds: ids })}
              placeholder="All Branches"
              searchPlaceholder="Search branches..."
            />
          </div>
        )}

        {canSeeFilter(user, 'deliveries', 'warehouse') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0">
            <MultiSelectDropdown
              options={warehouseOptions}
              selectedIds={filterData.warehouseIds || []}
              onChange={(ids) => onFilterChange({ warehouseIds: ids })}
              placeholder="All Warehouses"
              searchPlaceholder="Search warehouses..."
            />
          </div>
        )}

        {canSeeFilter(user, 'deliveries', 'status') && (
          <select
            value={filterData.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-36 flex-shrink-0"
          >
            <option value="">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        )}

        {canSeeFilter(user, 'deliveries', 'product') && (
          <div className="min-w-[140px] w-fit max-w-[260px] flex-shrink-0">
            <ProductMultiSelectDropdown
              options={productOptions}
              selectedIds={selectedProductOptionIds}
              onChange={handleProductIdsChange}
              placeholder="All Products"
            />
          </div>
        )}

        {canSeeFilter(user, 'deliveries', 'date') && (
          <div className="h-9 flex items-center gap-1 border border-gray-300 rounded-lg px-2">
            <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
            <input
              type="date"
              value={filterData.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
            <span className="text-gray-300">–</span>
            <input
              type="date"
              value={filterData.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {canSeeFilter(user, 'deliveries', 'receiptNumber') && (
          <input
            type="text"
            placeholder="Receipt #..."
            value={filterData.receiptNumber || ''}
            onChange={(e) => onFilterChange({ receiptNumber: e.target.value })}
            className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
          />
        )}

        {canSeeFilter(user, 'deliveries', 'poNumber') && (
          <input
            type="text"
            placeholder="PO #..."
            value={filterData.poNumber || ''}
            onChange={(e) => onFilterChange({ poNumber: e.target.value })}
            className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-28"
          />
        )}

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>


      {(filterData.companyIds && filterData.companyIds.length > 0) && filteredBranchOptions.length === 0 && (
        <p className="text-xs text-orange-600 mt-2">No branches available for the selected company(ies)</p>
      )}
    </div>
  );
};

export default DeliveryFilters;