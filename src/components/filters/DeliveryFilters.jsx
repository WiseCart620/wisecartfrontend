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
  products = [], // Add products prop
  statusOptions = ['PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'PENDING', 'RETURNED']
}) => {
  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName }));
  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const warehouseOptions = warehouses.map(w => ({ id: w.id, name: `${w.warehouseName} (${w.warehouseCode})` }));

  // Create product options with variation support
  const productOptions = products.flatMap(product => {
    if (product.variations && product.variations.length > 0) {
      return product.variations.map(variation => ({
        id: variation.id,
        name: `${product.productName} - ${variation.combinationDisplay || 'Variation'}`,
        productId: product.id,
        variationId: variation.id,
        sku: variation.sku || product.sku
      }));
    }
    return [{
      id: product.id,
      name: product.productName,
      productId: product.id,
      variationId: null,
      sku: product.sku
    }];
  });

  const filteredBranchOptions = filterData.companyId
    ? branches
      .filter(b => b.company?.id === filterData.companyId)
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const availableBranchOptions = filteredBranchOptions;

  const hasActiveFilters = Object.values(filterData).some(value =>
    value !== '' && value !== null && value !== undefined
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col gap-4">
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
              options={availableBranchOptions}
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

        {/* Second row - Product and Date filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Product / SKU</label>
            <SearchableDropdown
              options={productOptions}
              value={
                filterData.variationId
                  ? productOptions.find(o => o.variationId == filterData.variationId)?.id
                  : filterData.productId
                    ? productOptions.find(o => !o.variationId && o.productId == filterData.productId)?.id
                    : ''
              }
              onChange={(value) => {
                if (!value) {
                  onFilterChange({ productId: '', variationId: '', productName: '' });
                  return;
                }
                // eslint-disable-next-line eqeqeq
                const option = productOptions.find(o => o.id == value);
                if (option) {
                  onFilterChange({
                    productId: option.productId,
                    variationId: option.variationId,
                    productName: option.name
                  });
                }
              }}
              placeholder="Search by product name or SKU..."
              displayKey="name"
              valueKey="id"
              searchable={true}
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

        {/* Search by receipt number */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search by Receipt Number</label>
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