import React, { useMemo } from 'react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { canSeeFilter, canSeeFilterAny } from '../../context/AuthContext';
import { ui } from '../../utils/uiAccess';

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
    setShowVariationFilter,
    extra
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
    const dropdownFix = '[&>div>button]:!h-7 [&>div>button]:!min-h-0 [&>div>button]:!py-0 [&>div>button]:!text-xs';

    return (
        <div className="py-1 mb-1">
            <div className="flex flex-nowrap items-end gap-1.5">
                {canSeeFilterAny(user, 'warehouse_inventory', 'date') && (
                    <>
                        <div className="w-[120px] flex-shrink-0">
                            <label className="block text-[10px] text-gray-500 leading-tight">Date From</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                                className="w-full h-7 px-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div className="w-[120px] flex-shrink-0">
                            <label className="block text-[10px] text-gray-500 leading-tight">Date To</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter('dateTo', e.target.value)}
                                className="w-full h-7 px-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </>
                )}

                {canSeeFilterAny(user, 'warehouse_inventory', 'warehouse') && (
                    <div className="w-[140px] flex-shrink-0">
                        <label className="block text-[10px] text-gray-500 leading-tight">Warehouse</label>
                        <select
                            value={filters.warehouseId}
                            onChange={(e) => updateFilter('warehouseId', e.target.value)}
                            disabled={hasCompanyFilter}
                            className={`w-full h-7 px-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 ${hasCompanyFilter ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white'}`}
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={String(w.id)}>{w.warehouseName}</option>
                            ))}
                        </select>
                    </div>
                )}

                {canSeeFilterAny(user, 'warehouse_inventory', 'company') && (
                    <div className={`w-[150px] flex-shrink-0 ${dropdownFix}`}>
                        <label className="block text-[10px] text-gray-500 leading-tight">Company</label>
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
                {canSeeFilterAny(user, 'warehouse_inventory', 'branch') && (
                    <div className={`w-[150px] flex-shrink-0 ${dropdownFix}`}>
                        <label className="block text-[10px] text-gray-500 leading-tight">Branch</label>
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

                {extra}

                <div className="ml-auto flex-shrink-0">
                    <button
                        onClick={onGenerate} style={ui(user, 'inventory_ui', 'ps_generate') ? undefined : { display: 'none' }}
                        disabled={!canGenerate || generating}
                        className="h-7 px-3 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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