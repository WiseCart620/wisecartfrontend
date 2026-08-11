// src/components/filters/InventoryFilters.jsx
import React from 'react';
import { Search, X } from 'lucide-react';
import SearchableLocationDropdown from '../common/SearchableLocationDropdown';

const InventoryFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  fromWarehouseFilter,
  setFromWarehouseFilter,
  toWarehouseFilter,
  setToWarehouseFilter,
  fromBranchFilter,
  setFromBranchFilter,
  toBranchFilter,
  setToBranchFilter,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  warehouses,
  branches,
  onClearFilters
}) => {
  const hasActiveFilters = searchTerm || (statusFilter && statusFilter !== 'ALL') ||
    (typeFilter && typeFilter !== 'ALL') || fromWarehouseFilter || toWarehouseFilter ||
    fromBranchFilter || toBranchFilter || startDateFilter || endDateFilter;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <div className="relative w-56 h-9">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 h-9 text-sm border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-36"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-36"
        >
          <option value="ALL">All Types</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="TRANSFER">Transfer</option>
          <option value="RETURN">Return</option>
          <option value="DAMAGE">Damage</option>
        </select>

        <div className="w-40 h-9 [&>div]:h-9 [&>button]:h-9">
          <SearchableLocationDropdown
            locations={warehouses.map(wh => ({ id: wh.id, name: wh.warehouseName, code: wh.warehouseCode }))}
            value={fromWarehouseFilter}
            onChange={setFromWarehouseFilter}
            placeholder="From Warehouse"
            label="warehouses"
          />
        </div>

        <div className="w-40 h-9 [&>div]:h-9 [&>button]:h-9">
          <SearchableLocationDropdown
            locations={warehouses.map(wh => ({ id: wh.id, name: wh.warehouseName, code: wh.warehouseCode }))}
            value={toWarehouseFilter}
            onChange={setToWarehouseFilter}
            placeholder="To Warehouse"
            label="warehouses"
          />
        </div>

        <div className="w-40 h-9 [&>div]:h-9 [&>button]:h-9">
          <SearchableLocationDropdown
            locations={branches.map(br => ({ id: br.id, name: br.branchName, code: br.branchCode }))}
            value={fromBranchFilter}
            onChange={setFromBranchFilter}
            placeholder="From Branch"
            label="branches"
          />
        </div>

        <div className="w-40 h-9 [&>div]:h-9 [&>button]:h-9">
          <SearchableLocationDropdown
            locations={branches.map(br => ({ id: br.id, name: br.branchName, code: br.branchCode }))}
            value={toBranchFilter}
            onChange={setToBranchFilter}
            placeholder="To Branch"
            label="branches"
          />
        </div>

        <div className="h-9 flex items-center gap-1 border border-gray-300 rounded-lg px-2">
          <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
          />
          <span className="text-gray-300">–</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="w-32 h-full px-1.5 text-sm border-0 focus:outline-none focus:ring-0"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default InventoryFilters;