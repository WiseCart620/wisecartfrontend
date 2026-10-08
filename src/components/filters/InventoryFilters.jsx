// src/components/filters/InventoryFilters.jsx
import React from 'react';
import { Search } from 'lucide-react';
import SearchableWarehouseDropdown from '../common/SearchableWarehouseDropdown';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const InventoryFilters = ({
  user,
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

  const branchOptions = (branches || []).map(br => ({
    id: br.id,
    name: br.branchName,
    code: br.branchCode,
  }));

  // Branch filters hold a single id, MultiSelectDropdown works with a list.
  // Keep only the most recently picked branch so the page logic stays unchanged.
  const toSingle = (value) => (value ? [Number(value)] : []);
  const fromList = (ids, setter) => setter(ids.length ? String(ids[ids.length - 1]) : '');

  const dropdownFix =
    '[&>div>button]:!h-8 [&>div>button]:!py-0 [&>div>button]:!text-sm';

  return (
    <div className="py-1.5 mb-2">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
        {canSeeFilter(user, 'inventory', 'search') && (
          <div className="relative w-56 h-8">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 h-8 text-sm border border-gray-300 rounded w-full bg-white focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}

        {canSeeFilter(user, 'inventory', 'status') && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-orange-500 w-36"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        )}

        {canSeeFilter(user, 'inventory', 'type') && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-orange-500 w-36"
          >
            <option value="ALL">All Types</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="TRANSFER">Transfer</option>
            <option value="RETURN">Return</option>
            <option value="DAMAGE">Damage</option>
          </select>
        )}

        {canSeeFilter(user, 'inventory', 'warehouse') && (
          <>
            <div className="w-52 h-8">
              <SearchableWarehouseDropdown
                warehouses={warehouses}
                value={fromWarehouseFilter}
                onChange={setFromWarehouseFilter}
                placeholder="From Warehouse"
              />
            </div>

            <div className="w-52 h-8">
              <SearchableWarehouseDropdown
                warehouses={warehouses}
                value={toWarehouseFilter}
                onChange={setToWarehouseFilter}
                placeholder="To Warehouse"
              />
            </div>
          </>
        )}

        {canSeeFilter(user, 'inventory', 'branch') && (
          <>
            <div className={`min-w-[140px] w-fit max-w-[260px] flex-shrink-0 ${dropdownFix}`}>
              <MultiSelectDropdown
                options={branchOptions}
                selectedIds={toSingle(fromBranchFilter)}
                onChange={(ids) => fromList(ids, setFromBranchFilter)}
                placeholder="From Branch"
                searchPlaceholder="Search name or code..."
              />
            </div>

            <div className={`min-w-[140px] w-fit max-w-[260px] flex-shrink-0 ${dropdownFix}`}>
              <MultiSelectDropdown
                options={branchOptions}
                selectedIds={toSingle(toBranchFilter)}
                onChange={(ids) => fromList(ids, setToBranchFilter)}
                placeholder="To Branch"
                searchPlaceholder="Search name or code..."
              />
            </div>
          </>
        )}

        {canSeeFilter(user, 'inventory', 'date') && (
          <div className="h-8 flex items-center gap-1 border border-gray-300 rounded px-2 bg-white">
            <span className="text-[11px] text-gray-400 whitespace-nowrap pl-0.5">Date</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-32 h-full px-1.5 text-sm border-0 bg-white focus:outline-none focus:ring-0"
            />
            <span className="text-gray-300">–</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-32 h-full px-1.5 text-sm border-0 bg-white focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="col-span-2 sm:col-span-1 text-sm text-orange-600 hover:text-orange-800 sm:ml-auto whitespace-nowrap text-right sm:text-left"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default InventoryFilters;