import React from 'react';
import SearchableWarehouseDropdown from '../common/SearchableWarehouseDropdown';
import { canSeeFilter } from '../../context/AuthContext';

import { useEffect } from 'react';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';

const WarehouseFilterPanel = ({
  user,
  showWarehouseFilter,
  warehouses,
  productOptions = [],
  filters,
  updateFilter,
  clearFilters
}) => {
  const selectedKeys = filters.productKeys || [];
  const canProduct = canSeeFilter(user, 'warehouse_inventory', 'product');
  const canWarehouse = canSeeFilter(user, 'warehouse_inventory', 'warehouse');
  const canQuantity = canSeeFilter(user, 'warehouse_inventory', 'quantity');
  const canDate = canSeeFilter(user, 'warehouse_inventory', 'date');

  useEffect(() => {
    if (!canWarehouse && filters.warehouse) updateFilter('warehouse', '');
    if (!canQuantity && (filters.minQty || filters.maxQty)) {
      updateFilter('minQty', '');
      updateFilter('maxQty', '');
    }
    if (!canDate && (filters.startDate || filters.endDate)) {
      updateFilter('startDate', '');
      updateFilter('endDate', '');
    }
  }, [canWarehouse, canQuantity, canDate]);

  if (!showWarehouseFilter) return null;

  const hasActiveFilters =
    (canProduct && selectedKeys.length > 0) ||
    (canWarehouse && filters.warehouse) ||
    (canQuantity && (filters.minQty || filters.maxQty)) ||
    (canDate && (filters.startDate || filters.endDate));

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        {canWarehouse && (
          <div className="w-52 h-9 [&>div]:h-9 [&>button]:h-9">
            <SearchableWarehouseDropdown
              warehouses={warehouses}
              value={filters.warehouse}
              onChange={(value) => updateFilter('warehouse', value)}
              placeholder="All Warehouses"
            />
          </div>
        )}

        {canQuantity && (
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
        )}

        {canDate && (
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
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>

      {canProduct && (
        <div className="mt-2">
          <VariationSearchableDropdown
            options={productOptions}
            value=""
            onChange={(id) => {
              const opt = productOptions.find((o) => o.id === id);
              if (opt && !selectedKeys.includes(opt.id)) {
                updateFilter('productKeys', [...selectedKeys, opt.id]);
              }
            }}
            placeholder="Filter by product / variation (name, SKU, UPC)..."
            formData={{
              items: selectedKeys
                .map((k) => productOptions.find((o) => o.id === k))
                .filter(Boolean)
                .map((o) => ({ productId: o.parentProductId, variationId: o.variationId })),
            }}
            index={-1}
            hideLocationHint
            loading={productOptions.length === 0}
          />
          {selectedKeys.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedKeys.map((k) => {
                const o = productOptions.find((x) => x.id === k);
                return (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {o ? `${o.sku || 'N/A'} - ${o.fullName}` : k}
                    <button type="button" onClick={() => updateFilter('productKeys', selectedKeys.filter((x) => x !== k))}>×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WarehouseFilterPanel;