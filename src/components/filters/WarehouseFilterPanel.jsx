import React from 'react';
import SearchableWarehouseDropdown from '../common/SearchableWarehouseDropdown';

const WarehouseFilterPanel = ({
  showWarehouseFilter,
  warehouses,
  filters,
  updateFilter,
  clearFilters
}) => {
  if (!showWarehouseFilter) return null;

  const hasActiveFilters = filters.warehouse || filters.minQty || filters.maxQty || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <div className="w-52 h-9 [&>div]:h-9 [&>button]:h-9">
          <SearchableWarehouseDropdown
            warehouses={warehouses}
            value={filters.warehouse}
            onChange={(value) => updateFilter('warehouse', value)}
            placeholder="All Warehouses"
          />
        </div>

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
            className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default WarehouseFilterPanel;