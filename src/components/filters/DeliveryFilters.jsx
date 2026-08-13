// src/components/filters/DeliveryFilters.jsx
import React from 'react';
import { X } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';

const DeliveryFilters = ({
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
    if (product.variations && product.variations.length > 0) {
      return product.variations
        .filter(variation => {
          if (!filterData.companyId) return true;
          return (variation.companyPrices || []).some(cp => cp.company?.id === filterData.companyId);
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

    if (filterData.companyId) {
      const hasCompanyPrice = (product.companyBasePrices || [])
        .some(cbp => cbp.company?.id === filterData.companyId);
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

  const filteredBranchOptions = filterData.companyId
    ? branches
      .filter(b => b.company?.id === filterData.companyId)
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const hasActiveFilters = Object.entries(filterData).some(
    ([k, v]) => {
      if (k === 'status' && v === 'HIDE_CANCELLED') return false;
      if (k === 'productFilters') return Array.isArray(v) && v.length > 0;
      return v !== '' && v !== null && v !== undefined;
    }
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <div className="w-44">
          <SearchableDropdown
            options={companyOptions}
            value={filterData.companyId}
            onChange={(value) => {
              const currentBranch = branches.find(b => b.id === filterData.branchId);
              const branchBelongsToCompany = currentBranch?.company?.id === value;
              onFilterChange({
                companyId: value,
                branchId: branchBelongsToCompany ? filterData.branchId : ''
              });
            }}
            placeholder="All Companies"
            displayKey="name"
            valueKey="id"
          />
        </div>

        <div className="w-44">
          <SearchableDropdown
            options={filteredBranchOptions}
            value={filterData.branchId}
            onChange={(value) => onFilterChange({ branchId: value })}
            placeholder="All Branches"
            displayKey="name"
            valueKey="id"
            searchable={true}
          />
        </div>

        <div className="w-44">
          <SearchableDropdown
            options={warehouseOptions}
            value={filterData.warehouseId}
            onChange={(value) => onFilterChange({ warehouseId: value })}
            placeholder="All Warehouses"
            displayKey="name"
            valueKey="id"
          />
        </div>

        <select
          value={filterData.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-36"
        >
          <option value="">All Status</option>
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <div className="w-56">
          <VariationSearchableDropdown
            options={productOptions.filter(o =>
              !(filterData.productFilters || []).some(pf =>
                pf.productId === o.parentProductId &&
                (pf.variationId ?? null) === (o.variationId ?? null)
              )
            )}
            value=""
            onChange={(value) => {
              if (!value) return;
              const option = productOptions.find(o => o.id === value);
              if (!option) return;
              const alreadyAdded = (filterData.productFilters || []).some(pf =>
                pf.productId === option.parentProductId &&
                (pf.variationId ?? '') === (option.variationId ?? '')
              );
              if (alreadyAdded) return;
              const label = option.subLabel !== 'No variations'
                ? `${option.fullName} — ${option.subLabel}`
                : option.fullName;
              onFilterChange({
                productFilters: [...(filterData.productFilters || []), {
                  productId: option.parentProductId,
                  variationId: option.variationId ?? null,
                  label
                }]
              });
            }}
            placeholder="Add product / UPC / SKU..."
            hideLocationHint={true}
          />
        </div>

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

        <input
          type="text"
          placeholder="Receipt #..."
          value={filterData.receiptNumber || ''}
          onChange={(e) => onFilterChange({ receiptNumber: e.target.value })}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
        />

        <input
          type="text"
          placeholder="PO #..."
          value={filterData.poNumber || ''}
          onChange={(e) => onFilterChange({ poNumber: e.target.value })}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-28"
        />

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>

      {(filterData.productFilters || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
          {filterData.productFilters.map((pf, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              <span className="leading-none">{pf.label}</span>
              <button
                type="button"
                onClick={() => onFilterChange({
                  productFilters: filterData.productFilters.filter((_, i) => i !== idx)
                })}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-red-200 hover:text-red-700 transition-colors flex-shrink-0"
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {filterData.companyId && filteredBranchOptions.length === 0 && (
        <p className="text-xs text-orange-600 mt-2">No branches available for this company</p>
      )}
    </div>
  );
};

export default DeliveryFilters;