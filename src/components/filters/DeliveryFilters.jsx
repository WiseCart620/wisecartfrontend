// src/components/filters/DeliveryFilters.jsx
import React from 'react';
import { X } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';

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
  const companyOptions   = companies.map(c => ({ id: c.id, name: c.companyName }));
  const branchOptions    = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const warehouseOptions = warehouses.map(w => ({ id: w.id, name: `${w.warehouseName} (${w.warehouseCode})` }));

  // ── Product options ──────────────────────────────────────────────────────────
  // Uses the same composite-id shape as prepareProductOptions() in useDeliveries
  // so productId / variationId resolution stays consistent with the rest of the app.
  const productOptions = products.flatMap(product => {
    if (product.variations && product.variations.length > 0) {
      return product.variations.map(variation => {
        const upc = variation.upc || product.upc || '';
        const sku = variation.sku || product.sku || '';
        return {
          id:          `${product.id}_${variation.id}`,   // mirrors prepareProductOptions
          productId:   product.id,
          variationId: variation.id,
          name:        product.productName,               // shown in closed/selected state
          subLabel: [                                     // shown as second line in open list
            variation.combinationDisplay || 'Variation',
            upc ? `UPC: ${upc}` : null,
            sku ? `SKU: ${sku}` : null,
          ].filter(Boolean).join(' · '),
          // Single string searched against when the user types
          searchIndex: `${product.productName} ${variation.combinationDisplay || ''} ${upc} ${sku}`.toLowerCase(),
          upc,
          sku,
        };
      });
    }

    const upc = product.upc || '';
    const sku = product.sku || '';
    return [{
      id:          `prod_${product.id}`,
      productId:   product.id,
      variationId: null,
      name:        product.productName,
      subLabel: [
        upc ? `UPC: ${upc}` : null,
        sku ? `SKU: ${sku}` : null,
      ].filter(Boolean).join(' · ') || 'No variations',
      searchIndex: `${product.productName} ${upc} ${sku}`.toLowerCase(),
      upc,
      sku,
    }];
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const filteredBranchOptions = filterData.companyId
    ? branches
        .filter(b => b.company?.id === filterData.companyId)
        .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const hasActiveFilters = Object.values(filterData).some(
    v => v !== '' && v !== null && v !== undefined
  );

  // Map filterData back to the composite option id so the dropdown shows the
  // correct selected value
  const selectedProductOptionId = filterData.variationId
    ? productOptions.find(o => String(o.variationId) === String(filterData.variationId))?.id ?? ''
    : filterData.productId
    ? productOptions.find(o => !o.variationId && String(o.productId) === String(filterData.productId))?.id ?? ''
    : '';

  // ── Custom renderer — two-line option row ────────────────────────────────────
  const renderProductOption = (option) => (
    <div className="flex flex-col py-0.5 gap-0.5">
      <span className="text-sm text-gray-900 leading-snug">{option.name}</span>
      {option.subLabel && (
        <span className="text-xs text-gray-400 font-mono leading-tight">{option.subLabel}</span>
      )}
    </div>
  );

  // ── Custom filter — searches name + UPC + SKU ────────────────────────────────
  const filterProductOptions = (options, query) => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.searchIndex.includes(q));
  };

  // ── onChange ─────────────────────────────────────────────────────────────────
  const handleProductChange = (value) => {
    if (!value) {
      onFilterChange({ productId: '', variationId: '', productName: '' });
      return;
    }
    const option = productOptions.find(o => o.id === value);
    if (option) {
      onFilterChange({
        productId:   option.productId,
        variationId: option.variationId,
        productName: option.name,
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filter Deliveries</h3>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2 — Product (UPC / SKU) + Date range */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Product / UPC / SKU
            </label>
            <SearchableDropdown
              options={productOptions}
              value={selectedProductOptionId}
              onChange={handleProductChange}
              placeholder="Search by name, UPC, or SKU..."
              displayKey="name"
              valueKey="id"
              searchable={true}
              renderOption={renderProductOption}
              filterOptions={filterProductOptions}
            />
            {filterData.productName && (
              <p className="text-xs text-blue-600 mt-1">
                Filtering by: {filterData.productName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filterData.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filterData.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 3 — Receipt number search */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Search by Receipt Number
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter receipt number..."
              value={filterData.receiptNumber || ''}
              onChange={(e) => onFilterChange({ receiptNumber: e.target.value })}
              className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      </div>
    </div>
  );
};

export default DeliveryFilters;