import React, { useMemo } from 'react';
import ProductMultiSelectDropdown from '../common/ProductMultiSelectDropdown';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

const ProductSummaryReportPanel = ({
  products,
  warehouses,
  companies,
  branches,
  filters,
  updateFilter,
  onGenerate,
  generating
}) => {
  const productOptions = useMemo(() => {
    return products.flatMap(p => {
      if (p.variations && p.variations.length > 0) {
        return p.variations.map(v => ({
          id: `${p.id}_${v.id}`,
          name: `${p.productName} (${v.combinationDisplay || 'Variation'})`,
          sku: v.sku || p.sku || 'N/A',
          upc: v.upc || p.upc || 'N/A',
        }));
      }
      return [{
        id: `${p.id}_base`,
        name: p.productName,
        sku: p.sku || 'N/A',
        upc: p.upc || 'N/A',
      }];
    });
  }, [products]);

  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName }));

  const selectedCompanyIds = filters.companyIds || [];
  const availableBranches = useMemo(() => {
    if (selectedCompanyIds.length === 0) return branches;
    return branches.filter(b => selectedCompanyIds.includes(b.companyId ?? b.company?.id ?? null));
  }, [branches, selectedCompanyIds]);

  const branchOptions = availableBranches.map(b => ({ id: b.id, name: b.branchName, code: b.branchCode }));

  const hasCompanyFilter = selectedCompanyIds.length > 0 || (filters.branchIds || []).length > 0;

  const canGenerate = filters.dateFrom && filters.dateTo &&
    (filters.warehouseId || hasCompanyFilter);

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-3 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
        <div className="lg:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Products</label>
          <ProductMultiSelectDropdown
            options={productOptions}
            selectedIds={filters.productKeys || []}
            onChange={(ids) => updateFilter('productKeys', ids)}
            placeholder="All Products"
            searchPlaceholder="Search by name, SKU, or UPC..."
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
          <select
            value={filters.warehouseId}
            onChange={(e) => updateFilter('warehouseId', e.target.value)}
            disabled={hasCompanyFilter}
            className={`w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${hasCompanyFilter ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white'}`}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={String(w.id)}>{w.warehouseName}</option>
            ))}
          </select>
          {hasCompanyFilter && (
            <p className="text-[10px] text-orange-500 mt-1">Disabled — company/branch selected</p>
          )}
        </div>

        <div>
          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="w-full h-9 px-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Company</label>
          <MultiSelectDropdown
            options={companyOptions}
            selectedIds={selectedCompanyIds}
            onChange={(ids) => {
              updateFilter('companyIds', ids);
              if (ids.length > 0) updateFilter('warehouseId', '');
            }}
            placeholder="All Companies"
            searchPlaceholder="Search companies..."
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Branch</label>
          <MultiSelectDropdown
            options={branchOptions}
            selectedIds={filters.branchIds || []}
            onChange={(ids) => {
              updateFilter('branchIds', ids);
              if (ids.length > 0) updateFilter('warehouseId', '');
            }}
            placeholder="Branches for selected company"
            searchPlaceholder="Search name or code..."
          />
        </div>
      </div>
    </div>
  );
};

export default ProductSummaryReportPanel;