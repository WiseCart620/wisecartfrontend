import React, { useMemo } from 'react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { canSeeFilter } from '../../context/AuthContext';

const ProductSummaryReportPanel = ({
    user,
    products,
    warehouses,
    companies,
    branches,
    filters,
    updateFilter,
    onGenerate,
    generating,
    showVariationFilter,
    setShowVariationFilter
}) => {


    const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName }));

    const selectedCompanyIds = filters.companyIds || [];
    const availableBranches = useMemo(() => {
        if (selectedCompanyIds.length === 0) return branches;
        return branches.filter(b => selectedCompanyIds.includes(b.companyId ?? b.company?.id ?? null));
    }, [branches, selectedCompanyIds]);

    const branchOptions = availableBranches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }));

    const hasCompanyFilter = selectedCompanyIds.length > 0 || (filters.branchIds || []).length > 0;

    const canGenerate = filters.warehouseId || hasCompanyFilter;

    return (
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 mb-2">
            <div className="flex flex-wrap items-end gap-2">
                {canSeeFilter(user, 'warehouse_inventory', 'date') && (
                    <>
                        <div className="w-[150px]">
                            <label className="block text-xs text-gray-500 mb-0.5">Date From</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                                className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div className="w-[150px]">
                            <label className="block text-xs text-gray-500 mb-0.5">Date To</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter('dateTo', e.target.value)}
                                className="w-full h-8 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </>
                )}

                {canSeeFilter(user, 'warehouse_inventory', 'warehouse') && (
                    <div className="w-[180px]">
                        <label className="block text-xs text-gray-500 mb-0.5">Warehouse</label>
                        <select
                            value={filters.warehouseId}
                            onChange={(e) => updateFilter('warehouseId', e.target.value)}
                            disabled={hasCompanyFilter}
                            className={`w-full h-8 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 ${hasCompanyFilter ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white'}`}
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={String(w.id)}>{w.warehouseName}</option>
                            ))}
                        </select>
                    </div>
                )}

                {canSeeFilter(user, 'warehouse_inventory', 'company') && (
                    <div className="w-[170px]">
                        <label className="block text-xs text-gray-500 mb-0.5">Company</label>
                        <MultiSelectDropdown
                            options={companyOptions}
                            selectedIds={selectedCompanyIds}
                            disabled={!!filters.warehouseId}
                            onChange={(ids) => {
                                updateFilter('companyIds', ids);
                                if (ids.length > 0) updateFilter('warehouseId', '');
                            }}
                            placeholder={filters.warehouseId ? 'Disabled (warehouse selected)' : 'All Companies'}
                            searchPlaceholder="Search companies..."
                        />
                    </div>
                )}
                {canSeeFilter(user, 'warehouse_inventory', 'branch') && (
                    <div className="w-[170px]">
                        <label className="block text-xs text-gray-500 mb-0.5">Branch</label>
                        <MultiSelectDropdown
                            options={branchOptions}
                            selectedIds={filters.branchIds || []}
                            disabled={!!filters.warehouseId}
                            onChange={(ids) => {
                                updateFilter('branchIds', ids);
                                if (ids.length > 0) {
                                    updateFilter('warehouseId', '');
                                    const inferredCompanyIds = [...new Set(
                                        ids
                                            .map(id => branches.find(b => String(b.id) === String(id)))
                                            .filter(Boolean)
                                            .map(b => b.companyId ?? b.company?.id)
                                            .filter(Boolean)
                                    )];
                                    if (inferredCompanyIds.length > 0) {
                                        updateFilter(
                                            'companyIds',
                                            [...new Set([...(filters.companyIds || []), ...inferredCompanyIds])]
                                        );
                                    }
                                }
                            }}
                            placeholder={filters.warehouseId ? 'Disabled (warehouse selected)' : 'All Branches'}
                            searchPlaceholder="Search name or code..."
                        />
                    </div>
                )}

                <div className="ml-auto">
                    <button
                        onClick={onGenerate}
                        disabled={!canGenerate || generating}
                        className="h-8 px-4 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {generating ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>
            {hasCompanyFilter && (
                <p className="text-[11px] text-orange-500 mt-1">Warehouse filter disabled — a company/branch is selected.</p>
            )}
        </div>
    );
};

export default ProductSummaryReportPanel;