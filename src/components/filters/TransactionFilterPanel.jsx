import React from 'react';

const TransactionFilterPanel = ({
  showTransactionFilter,
  filters,
  updateFilter,
  clearFilters
}) => {
  if (!showTransactionFilter) return null;

  const hasActiveFilters = (filters.type && filters.type !== 'ALL') || filters.verifiedBy ||
    filters.minItems || filters.maxItems || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.type}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-40"
        >
          <option value="ALL">All Types</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="TRANSFER">Transfer</option>
          <option value="RETURN">Return</option>
          <option value="DAMAGE">Damage</option>
          <option value="DELIVERY">Delivery</option>
          <option value="SALE">Sale</option>
        </select>

        <input
          type="text"
          placeholder="Verified by..."
          value={filters.verifiedBy}
          onChange={(e) => updateFilter('verifiedBy', e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-36"
        />

        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1">
          <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Items</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.minItems}
            onChange={(e) => updateFilter('minItems', e.target.value)}
            className="w-14 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
          />
          <span className="text-gray-300">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxItems}
            onChange={(e) => updateFilter('maxItems', e.target.value)}
            className="w-14 px-1.5 py-1 text-sm border-0 focus:outline-none focus:ring-0"
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
            className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default TransactionFilterPanel;