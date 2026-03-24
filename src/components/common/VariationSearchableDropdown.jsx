// src/components/common/VariationSearchableDropdown.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Package } from 'lucide-react';

const VariationSearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  required = false,
  formData,
  index,
  warehouseStocks = {},
  branchStocks = {},
  loadingStocks = {},
  onAddProduct,
  hideLocationHint = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    return (
      option.name?.toLowerCase().includes(searchLower) ||
      option.subLabel?.toLowerCase().includes(searchLower) ||
      option.fullName?.toLowerCase().includes(searchLower) ||
      option.upc?.toLowerCase().includes(searchLower) ||
      option.sku?.toLowerCase().includes(searchLower) ||
      (option.upc && option.upc.toLowerCase().includes(searchLower)) ||
      (option.sku && option.sku.toLowerCase().includes(searchLower))
    );
  });

  const selectedOption = options.find(opt => {
    const currentItem = formData?.items?.[index];
    if (currentItem) {
      const productMatch = currentItem.productId === opt.parentProductId;
      const variationMatch = currentItem.variationId === opt.variationId;
      return productMatch && variationMatch;
    }
    return opt.id === value;
  });

  const getStockInfo = (option) => {
    if (!option) return null;

    let locationId = null;
    let locationType = null;

    if (formData?.fromWarehouseId) {
      locationId = formData.fromWarehouseId;
      locationType = 'warehouse';
    } else if (formData?.fromBranchId) {
      locationId = formData.fromBranchId;
      locationType = 'branch';
    } else if (formData?.toWarehouseId) {
      locationId = formData.toWarehouseId;
      locationType = 'warehouse';
    } else if (formData?.toBranchId) {
      locationId = formData.toBranchId;
      locationType = 'branch';
    }

    if (!locationId) return null;

    const stockKey = option.variationId
      ? `${index}_${option.parentProductId}_${option.variationId}_${locationId}`
      : `${index}_${option.parentProductId}_${locationId}`;

    if (locationType === 'warehouse') return warehouseStocks[stockKey];
    if (locationType === 'branch') return branchStocks[stockKey];
    return null;
  };

  const stockInfo = selectedOption ? getStockInfo(selectedOption) : null;

  let locationId = null;
  if (formData?.fromWarehouseId) locationId = formData.fromWarehouseId;
  else if (formData?.fromBranchId) locationId = formData.fromBranchId;
  else if (formData?.toWarehouseId) locationId = formData.toWarehouseId;
  else if (formData?.toBranchId) locationId = formData.toBranchId;

  const isLoading = selectedOption
    ? loadingStocks[`${index}_${selectedOption.parentProductId}_${selectedOption.variationId || ''}_${locationId || ''}`]
    : false;

  const getLocationName = () => {
    if (formData?.fromWarehouseId) return 'Source Warehouse';
    if (formData?.fromBranchId) return 'Source Branch';
    if (formData?.toWarehouseId) return 'Destination Warehouse';
    if (formData?.toBranchId) return 'Destination Branch';
    return 'Location';
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div className="text-gray-900 font-medium truncate">
              {selectedOption.upc || 'N/A'} - {selectedOption.fullName} - {selectedOption.sku || 'N/A'}
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIndex(prev => {
                      const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
                      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                      return next;
                    });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIndex(prev => {
                      const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
                      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                      return next;
                    });
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const option = filteredOptions[highlightedIndex];
                    const isAlreadySelected = formData?.items?.some((item, idx) => {
                      if (idx === index) return false;
                      return item.productId === option?.parentProductId && item.variationId === option?.variationId;
                    });
                    if (option && !isAlreadySelected) {
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                      setHighlightedIndex(-1);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                  }
                }}
                type="text"
                placeholder="Search by name, UPC, SKU, or variation..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto max-h-80">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-500 text-sm mb-2">No products found</div>
                <div className="text-xs text-gray-400">Try searching by ID, UPC, SKU, or product name</div>
              </div>
            ) : (
              filteredOptions.map((option, optionIndex) => {
                const isAlreadySelected = formData?.items?.some((item, idx) => {
                  if (idx === index) return false;
                  return item.productId === option.parentProductId && item.variationId === option.variationId;
                });

                return (
                  <button
                    key={`${option.id}-${optionIndex}`}
                    type="button"
                    onClick={() => {
                      if (!isAlreadySelected) {
                        onChange(option.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }
                    }}
                    disabled={isAlreadySelected}
                    className={`w-full px-4 py-3 text-left border-b border-gray-100 transition text-sm ${isAlreadySelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : optionIndex === highlightedIndex
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : value === option.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-900 hover:bg-blue-50'
                      }`}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {option.upc || 'N/A'} - {option.name} - {option.sku || 'N/A'}
                      </div>
                      {option.subLabel && option.subLabel !== 'No variations' && (
                        <div className="text-xs text-gray-600 mt-0.5">Variation: {option.subLabel}</div>
                      )}
                      {isAlreadySelected && (
                        <div className="text-xs text-red-500 mt-1">Already selected</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected product info card */}
      {selectedOption && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs space-y-2">

            {/* ── Top row: product details (left) + Add to List button (right) ── */}
            <div className="flex items-start justify-between gap-3">
              {/* Product details grid */}
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 flex-1">
                <div className="flex items-center">
                  <span className="text-gray-500 w-16 flex-shrink-0">Product:</span>
                  <span className="font-medium truncate ml-1">{selectedOption.fullName}</span>
                </div>

                {selectedOption.subLabel && selectedOption.subLabel !== 'No variations' && (
                  <div className="flex items-center">
                    <span className="text-gray-500 w-16 flex-shrink-0">Variant:</span>
                    <span className="font-medium text-blue-600 truncate ml-1">{selectedOption.subLabel}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <span className="text-gray-500 w-16 flex-shrink-0">SKU:</span>
                  <span className="font-medium truncate ml-1">{selectedOption.sku || 'N/A'}</span>
                </div>

                <div className="flex items-center">
                  <span className="text-gray-500 w-16 flex-shrink-0">UPC:</span>
                  <span className="font-medium truncate ml-1">{selectedOption.upc || 'N/A'}</span>
                </div>

                {/* Product type badge sits in the grid area */}
                <div className="col-span-2 pt-1">
                  {selectedOption.isVariation ? (
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      Product with Variations
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      Product (No Variations)
                    </span>
                  )}
                </div>
              </div>

              {/* Add to List button — right side, aligned to top */}
              {onAddProduct && (
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="flex-shrink-0 self-start py-5 px-7 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"                >
                  <Package size={13} />
                  Add to List
                </button>
              )}
            </div>

            {/* All Company Prices */}
            {selectedOption.allCompanyPrices && selectedOption.allCompanyPrices.length > 0 && (
              <div className="pt-2 border-t border-blue-200">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div className="text-gray-700 font-medium">All Company Prices ({selectedOption.allCompanyPrices.length})</div>
                    <ChevronDown size={14} className="text-gray-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-1 max-h-24 overflow-y-auto mt-2">
                    {selectedOption.allCompanyPrices.map((companyPrice, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-gray-200">
                        <span className="font-medium text-gray-700 truncate flex-1">
                          {companyPrice.companyName}
                        </span>
                        <span className="font-bold text-green-700 ml-2">
                          ₱{companyPrice.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Stock Information */}
            {(formData?.fromWarehouseId || formData?.fromBranchId || formData?.toWarehouseId || formData?.toBranchId) && (stockInfo || isLoading) && (
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center gap-1 mb-2">
                  <Package size={12} className="text-gray-500" />
                  <span className="text-gray-700 font-medium">{getLocationName()} Stock</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-600 text-xs">Available:</span>
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-blue-600 text-xs">
                        <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : stockInfo ? (
                      <span className="font-semibold text-green-600">
                        {(stockInfo.availableQuantity ?? stockInfo.quantity ?? 0).toLocaleString('en-US')}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No data</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-600 text-xs">Total:</span>
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-blue-600 text-xs">
                        <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : stockInfo ? (
                      <span className="font-semibold text-gray-700">
                        {(stockInfo.quantity || 0).toLocaleString('en-US')}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No data</span>
                    )}
                  </div>
                </div>

                {stockInfo?.reservedQuantity > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-orange-200">
                      <span className="text-gray-600 text-xs">Reserved:</span>
                      <span className="font-semibold text-orange-600">
                        {stockInfo.reservedQuantity.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Select a location hint */}
            {!hideLocationHint && !(formData?.fromWarehouseId || formData?.fromBranchId || formData?.toWarehouseId || formData?.toBranchId) && (
              <div className="pt-2 border-t border-blue-200">
                <div className="text-xs text-yellow-600 italic">
                  Select a location to see stock information
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default VariationSearchableDropdown;