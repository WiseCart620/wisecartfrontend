import React from 'react';
import { Search, X } from 'lucide-react';

const ProductFilterPanel = ({
  productSearchTerm,
  setProductSearchTerm,
  showVariationFilter,
  setShowVariationFilter
}) => {
  const hasActiveFilters = productSearchTerm || showVariationFilter !== 'ALL';

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64 h-9">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search products by name, SKU, or UPC..."
            value={productSearchTerm}
            onChange={(e) => setProductSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 h-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={showVariationFilter}
          onChange={(e) => setShowVariationFilter(e.target.value)}
          className="h-9 px-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white w-48"
        >
          <option value="ALL">All Products</option>
          <option value="BASE_ONLY">Base Products Only</option>
          <option value="VARIATION_ONLY">Variations Only</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setProductSearchTerm('');
              setShowVariationFilter('ALL');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductFilterPanel;