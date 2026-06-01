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
      return product.variations.map(variation => ({
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
    <div className="bg-white rounded-xl shadow-sm p-3 lg:p-4 mb-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Filter Deliveries</h3>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={16} />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Row 1 — Company / Branch / Warehouse / Status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Company</label>
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
            <SearchableDropdown
              options={filteredBranchOptions}
              value={filterData.branchId}
              onChange={(value) => onFilterChange({ branchId: value })}
              placeholder="All Branches"
              displayKey="name"
              valueKey="id"
              searchable={true}
            />
            {filterData.companyId && filteredBranchOptions.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No branches available for this company</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warehouse</label>
            <SearchableDropdown
              options={warehouseOptions}
              value={filterData.warehouseId}
              onChange={(value) => onFilterChange({ warehouseId: value })}
              placeholder="All Warehouses"
              displayKey="name"
              valueKey="id"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterData.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Product / UPC / SKU
            </label>
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
              placeholder="Add product filter..."
              hideLocationHint={true}
            />
            {(filterData.productFilters || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filterData.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filterData.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        {/* Row 3 — Receipt number + PO number search */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search by Receipt Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter receipt number..."
                value={filterData.receiptNumber || ''}
                onChange={(e) => onFilterChange({ receiptNumber: e.target.value })}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filterData.receiptNumber && (
                <button
                  onClick={() => onFilterChange({ receiptNumber: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search by PO Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter PO number..."
                value={filterData.poNumber || ''}
                onChange={(e) => onFilterChange({ poNumber: e.target.value })}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filterData.poNumber && (
                <button
                  onClick={() => onFilterChange({ poNumber: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DeliveryFilters;