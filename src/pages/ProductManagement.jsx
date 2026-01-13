import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Search, X, Package, DollarSign, Tag, Globe, User, Box,
  Weight, Ruler, Palette, ChevronDown, ChevronLeft, ChevronRight, Calendar,
  Check, AlertCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import { LoadingOverlay } from './LoadingOverlay';



const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt[valueKey] === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption[displayKey] : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition text-gray-500 italic text-sm"
              >
                -- None --
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option[valueKey]}
                  type="button"
                  onClick={() => {
                    onChange(option[valueKey]);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition text-sm ${value === option[valueKey] ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                >
                  {option[displayKey]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const productCategories = [
  'Electronics',
  'Clothing',
  'Food & Beverages',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Toys & Games',
  'Books & Media',
  'Office Supplies',
  'Automotive',
  'Pet Supplies',
  'Other'
];



// COMPLETE UPDATED ProductManagement.jsx
// Replace the entire CategoryInput component with this:

const CategoryInput = ({ value, onChange, categories, existingCategories = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combine predefined categories with existing categories from products
  const allCategories = [...new Set([...categories, ...existingCategories])].sort();

  // Filter categories based on search term
  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCategory = (category) => {
    setInputValue(category);
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm(inputValue);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={isOpen ? searchTerm : inputValue}
        onChange={handleSearchChange}
        onFocus={handleInputFocus}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Search or enter category"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No matching categories</p>
              {searchTerm && (
                <p className="text-xs text-blue-600 mt-2">
                  Press Enter or click outside to use "{searchTerm}"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto max-h-48">
              {filteredCategories.map((category, index) => {
                const isPredefined = categories.includes(category);
                const isExisting = existingCategories.includes(category);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition text-sm flex items-center justify-between ${value === category ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                      }`}
                  >
                    <span>{category}</span>
                    {!isPredefined && isExisting && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        used in products
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {inputValue && !allCategories.includes(inputValue) && !isOpen && (
        <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
          <Check size={12} />
          New category: "{inputValue}"
        </p>
      )}
    </div>
  );
};






const MultiCompanyPriceSelector = ({ companies, selectedPrices, onChange, assignToRemaining, remainingPrice }) => {
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const handleCompanySelect = (companyId) => {
    const newPrices = { ...selectedPrices };
    if (newPrices[companyId]) {
      delete newPrices[companyId];
    } else {
      newPrices[companyId] = '';
    }
    onChange(newPrices, assignToRemaining, remainingPrice);
  };

  const handlePriceChange = (companyId, price) => {
    const newPrices = { ...selectedPrices, [companyId]: price };
    onChange(newPrices, assignToRemaining, remainingPrice);
  };

  const handleSelectAll = () => {
    const allSelected = companies.every(c => selectedPrices[c.id] !== undefined);
    if (allSelected) {
      onChange({}, assignToRemaining, remainingPrice);
    } else {
      const newPrices = {};
      companies.forEach(c => {
        newPrices[c.id] = selectedPrices[c.id] || '';
      });
      onChange(newPrices, assignToRemaining, remainingPrice);
    }
  };

  const handleRemainingToggle = (checked) => {
    onChange(selectedPrices, checked, remainingPrice);
  };

  const handleRemainingPriceChange = (price) => {
    onChange(selectedPrices, assignToRemaining, price);
  };

  const selectedCount = Object.keys(selectedPrices).length;
  const allSelected = selectedCount === companies.length;
  const unassignedCount = companies.length - selectedCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Company Prices</h4>
          <p className="text-xs text-gray-500 mt-1">
            {selectedCount === 0
              ? 'No companies selected'
              : `${selectedCount} company${selectedCount > 1 ? 's' : ''} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={() => setShowAllCompanies(!showAllCompanies)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            {showAllCompanies ? 'Show Less' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Company Selection */}
      <div className={`space-y-2 ${!showAllCompanies ? 'max-h-60 overflow-y-auto' : ''}`}>
        {companies.map((company) => {
          const isSelected = selectedPrices[company.id] !== undefined;
          return (
            <div
              key={company.id}
              className={`p-3 border rounded-lg transition ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCompanySelect(company.id)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label
                      onClick={() => handleCompanySelect(company.id)}
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      {company.companyName}
                    </label>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">₱</span>
                        <input
                          type="number"
                          value={selectedPrices[company.id] || ''}
                          onChange={(e) => handlePriceChange(company.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign to Remaining Companies */}
      {unassignedCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="assign-remaining"
              checked={assignToRemaining}
              onChange={(e) => handleRemainingToggle(e.target.checked)}
              className="mt-1 h-4 w-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex-1">
              <label
                htmlFor="assign-remaining"
                className="text-sm font-medium text-amber-900 cursor-pointer"
              >
                Set default price for {unassignedCount} unassigned company{unassignedCount > 1 ? 's' : ''}
              </label>
              <p className="text-xs text-amber-700 mt-1">
                All companies without specific prices will receive this default price
              </p>
              {assignToRemaining && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-amber-700">Default Price (₱):</span>
                  <input
                    type="number"
                    value={remainingPrice}
                    onChange={(e) => handleRemainingPriceChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-32 px-3 py-1.5 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(selectedCount > 0 || (assignToRemaining && remainingPrice)) && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 space-y-1">
            {selectedCount > 0 && (
              <div>✓ {selectedCount} company{selectedCount > 1 ? 's' : ''} with specific prices</div>
            )}
            {assignToRemaining && remainingPrice && (
              <div>✓ {unassignedCount} company{unassignedCount > 1 ? 's' : ''} with default price of ₱{remainingPrice}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const SupplierInput = ({ value, onChange, suppliers }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuppliers = suppliers.filter(sup =>
    sup.toLowerCase().includes(inputValue.toLowerCase())
  );


  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectSupplier = (supplier) => {
    setInputValue(supplier);
    onChange(supplier);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter or select supplier"
      />

      {isOpen && filteredSuppliers.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuppliers.map((supplier, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSupplier(supplier)}
              className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition text-sm ${value === supplier ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                }`}
            >
              {supplier}
            </button>
          ))}
        </div>
      )}

      {inputValue && !suppliers.includes(inputValue) && (
        <p className="mt-1 text-xs text-blue-600">
          ✓ New supplier: "{inputValue}"
        </p>
      )}
    </div>
  );
};



const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    upc: '',
    sku: '',
    supplier: '',
    countryOfOrigin: '',
    companyPrices: {},
    companyBasePrices: {},
    assignToRemainingBase: false,
    remainingBasePriceValue: '',
    assignToRemaining: false,
    remainingCompaniesPrice: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    materials: '',
    brand: '',
    shelfLife: '',
    unitCost: '',
    variations: []
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [variationTypes, setVariationTypes] = useState([]);
  const [variationCombinations, setVariationCombinations] = useState([]);
  const variationInputRefs = useRef({});




  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedProducts = (products) => {
    if (!sortConfig.key) return products;

    return [...products].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === 'createdAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  useEffect(() => {
    loadData();
  }, []);



  useEffect(() => {
    if (variationTypes.length > 0 && variationTypes.every(vt => vt.values.length > 0)) {
      generateVariationCombinations();
    } else if (variationTypes.length === 0) {
      setVariationCombinations([]);
    }
  }, [variationTypes]);



  const loadData = async () => {
    setLoading(true);
    setLoadingMessage('Loading products...');
    try {
      const productsResponse = await api.get('/products');
      const companiesResponse = await api.get('/companies');
      const suppliersResponse = await api.get('/products/suppliers');

      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      } else {
        toast.error(productsResponse.error || 'Failed to load products');
        setProducts([]);
      }

      if (companiesResponse.success) {
        setCompanies(companiesResponse.data || []);
      } else {
        toast.error(companiesResponse.error || 'Failed to load companies');
        setCompanies([]);
      }

      // Add this
      if (suppliersResponse.success) {
        setSuppliers(suppliersResponse.data || []);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
      setProducts([]);
      setCompanies([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const handleCompanyPricesChange = useCallback((prices, assignRemaining, remainingPrice) => {
    setFormData(prev => ({
      ...prev,
      companyPrices: prices,
      assignToRemaining: assignRemaining,
      remainingCompaniesPrice: remainingPrice
    }));
  }, []);



  const generateVariationCombinations = useCallback(() => {
    if (variationTypes.length === 0 || !variationTypes.every(vt => vt.values.length > 0)) {
      return;
    }

    const generateCombos = (types, index = 0, current = {}) => {
      if (index === types.length) {
        const comboKey = Object.values(current).join('-');
        return [{
          combination: comboKey,
          attributes: { ...current },
          sku: '',
          upc: '',
          weight: '',
          length: '',
          width: '',
          height: '',
          companyPrices: {}
        }];
      }

      const results = [];
      const currentType = types[index];
      const typeKey = currentType.type === 'OTHER' ? currentType.customType : currentType.type;

      for (const value of currentType.values) {
        results.push(...generateCombos(types, index + 1, { ...current, [typeKey]: value }));
      }

      return results;
    };

    setVariationCombinations(prevCombos => {
      console.log('🔍 Previous combinations:', prevCombos);
      const preservedDataMap = new Map();

      prevCombos.forEach(combo => {
        const clonedPrices = {};
        if (combo.companyPrices) {
          Object.keys(combo.companyPrices).forEach(key => {
            clonedPrices[key] = combo.companyPrices[key];
          });
        }

        preservedDataMap.set(combo.combination, {
          sku: combo.sku || '',
          upc: combo.upc || '',
          weight: combo.weight !== undefined && combo.weight !== null && combo.weight !== '' ? combo.weight : '',
          length: combo.length || '',
          width: combo.width || '',
          height: combo.height || '',
          companyPrices: clonedPrices,
          attributes: combo.attributes
        });

        console.log(`📦 Preserved: ${combo.combination}`, preservedDataMap.get(combo.combination));
      });

      const newCombinations = generateCombos(variationTypes);
      console.log('🆕 Generated combinations:', newCombinations.length);

      const result = newCombinations.map(newCombo => {
        let preserved = preservedDataMap.get(newCombo.combination);

        if (!preserved) {
          const newAttrValues = new Set(Object.values(newCombo.attributes));

          for (const [key, data] of preservedDataMap.entries()) {
            const preservedAttrValues = new Set(Object.values(data.attributes));

            const hasOverlap = [...preservedAttrValues].every(val => newAttrValues.has(val));

            if (hasOverlap) {
              preserved = data;
              console.log(`✅ Partial match for ${newCombo.combination} from ${key}`);
              break;
            }
          }
        }

        if (preserved) {
          console.log(`✅ Restoring data for: ${newCombo.combination}`);
          return {
            combination: newCombo.combination,
            attributes: newCombo.attributes,
            sku: preserved.sku,
            upc: preserved.upc,
            weight: preserved.weight,
            length: preserved.length,
            width: preserved.width,
            height: preserved.height,
            companyPrices: { ...preserved.companyPrices }
          };
        }

        let inheritedData = null;
        const newAttrEntries = Object.entries(newCombo.attributes);

        for (const [key, data] of preservedDataMap.entries()) {
          const oldAttrEntries = Object.entries(data.attributes);

          const matchingAttrs = newAttrEntries.filter(([newKey, newVal]) =>
            oldAttrEntries.some(([oldKey, oldVal]) => oldVal === newVal)
          );

          if (matchingAttrs.length > 0) {
            inheritedData = data;
            console.log(`🔄 Inheriting data for ${newCombo.combination} from ${key}`);
            break;
          }
        }

        if (inheritedData) {
          return {
            combination: newCombo.combination,
            attributes: newCombo.attributes,
            sku: inheritedData.sku,
            upc: inheritedData.upc,
            weight: inheritedData.weight,
            length: inheritedData.length,
            width: inheritedData.width,
            height: inheritedData.height,
            companyPrices: { ...inheritedData.companyPrices }
          };
        }

        console.log(`🆕 New empty combination: ${newCombo.combination}`);
        return {
          combination: newCombo.combination,
          attributes: newCombo.attributes,
          sku: '',
          upc: '',
          weight: '',
          length: '',
          width: '',
          height: '',
          companyPrices: {}
        };
      });

      console.log('📊 Final combinations:', result);
      return result;
    });
  }, [variationTypes]);


  const updateVariationCombination = (index, field, value) => {
    const newCombinations = [...variationCombinations];
    newCombinations[index][field] = value;
    setVariationCombinations(newCombinations);
  };

  const updateVariationCompanyPrice = (comboIndex, companyId, price) => {
    const newCombinations = [...variationCombinations];
    newCombinations[comboIndex].companyPrices[companyId] = price;
    setVariationCombinations(newCombinations);
  };





  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productName) {
      toast.error('Please fill in product name');
      return;
    }



    setActionLoading(true);
    setLoadingMessage(editingProduct ? 'Updating product...' : 'Creating product...');

    try {
      const normalizedVariations = [];

      if (variationCombinations.length > 0) {
        variationCombinations.forEach(combo => {
          const variationData = {
            attributes: combo.attributes,
            sku: combo.sku || null,
            upc: combo.upc || null,
            weight: combo.weight ? parseFloat(combo.weight) : null,
            dimensions: null,
            companyPrices: []
          };

          // Build dimensions string
          if (combo.length || combo.width || combo.height) {
            const l = combo.length || '0';
            const w = combo.width || '0';
            const h = combo.height || '0';
            variationData.dimensions = `${l}×${w}×${h}`;
          }

          // Build company prices for this variation
          Object.entries(combo.companyPrices).forEach(([companyId, price]) => {
            if (price && parseFloat(price) > 0) {
              variationData.companyPrices.push({
                companyId: parseInt(companyId),
                price: parseFloat(price)
              });
            }
          });

          normalizedVariations.push(variationData);
        });
      }


      const companyPricesArray = [];

      Object.keys(formData.companyPrices).forEach(companyId => {
        const price = parseFloat(formData.companyPrices[companyId]);
        if (price > 0) {
          companyPricesArray.push({
            companyId: parseInt(companyId),
            price: price
          });
        }
      });

      if (formData.assignToRemaining && formData.remainingCompaniesPrice) {
        const assignedCompanyIds = new Set(Object.keys(formData.companyPrices).map(id => parseInt(id)));
        companies.forEach(company => {
          if (!assignedCompanyIds.has(company.id)) {
            companyPricesArray.push({
              companyId: company.id,
              price: parseFloat(formData.remainingCompaniesPrice)
            });
          }
        });
      }


      const companyBasePricesArray = [];

      if (variationCombinations.length === 0) {
        Object.keys(formData.companyBasePrices).forEach(companyId => {
          const basePrice = parseFloat(formData.companyBasePrices[companyId]);
          if (basePrice > 0) {
            companyBasePricesArray.push({
              companyId: parseInt(companyId),
              basePrice: basePrice
            });
          }
        });


        if (formData.assignToRemainingBase && formData.remainingBasePriceValue) {
          const assignedCompanyIds = new Set(Object.keys(formData.companyBasePrices).map(id => parseInt(id)));
          companies.forEach(company => {
            if (!assignedCompanyIds.has(company.id)) {
              companyBasePricesArray.push({
                companyId: company.id,
                basePrice: parseFloat(formData.remainingBasePriceValue)
              });
            }
          });
        }
      }


      let dimensionsString = null;
      if (variationCombinations.length === 0) {
        if (formData.length || formData.width || formData.height) {
          const l = formData.length || '0';
          const w = formData.width || '0';
          const h = formData.height || '0';
          dimensionsString = `${l}×${w}×${h}`;
        }
      }

      const payload = {
        productName: formData.productName,
        category: formData.category || null,
        upc: variationCombinations.length === 0 ? formData.upc : null,
        sku: variationCombinations.length === 0 ? formData.sku : null,
        supplier: formData.supplier || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        weight: variationCombinations.length === 0 && formData.weight ? parseFloat(formData.weight) : null,
        dimensions: dimensionsString,
        materials: formData.materials || null,
        brand: formData.brand || null,
        shelfLife: formData.shelfLife || null,
        variations: normalizedVariations,
        companyPrices: companyPricesArray,
        companyBasePrices: companyBasePricesArray
      };

      let response;
      if (editingProduct) {
        response = await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        response = await api.post('/products', payload);
      }

      if (!response.success) {
        const errorMessage = response.error || 'Failed to save product';

        if (errorMessage.toLowerCase().includes('upc') ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('already exists')) {
          toast.error(`Product with UPC "${formData.upc}" already exists`);
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');

      setShowModal(false);
      resetForm();
      await loadData();
      setCurrentPage(1);

    } catch (error) {
      console.error('Error saving product:', error);

      const errorMessage = error.message || 'Failed to save product';

      if (errorMessage.toLowerCase().includes('upc') ||
        errorMessage.toLowerCase().includes('duplicate') ||
        errorMessage.toLowerCase().includes('already exists')) {
        toast.error(`Product with UPC "${formData.upc}" already exists`);
      } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        toast.error('Invalid data. Please check all fields and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        toast.error('Session expired. Please login again.');
      } else if (errorMessage.includes('500') || errorMessage.includes('Server Error')) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };


  const checkUPCAvailability = (upc) => {
    if (!upc || upc.trim() === '') return { available: true, message: '' };

    const existingProduct = products.find(p =>
      p.upc && p.upc.toLowerCase() === upc.toLowerCase() &&
      (!editingProduct || p.id !== editingProduct.id)
    );

    return {
      available: !existingProduct,
      message: existingProduct ? `UPC "${upc}" already exists` : ''
    };
  };

  const checkSKUAvailability = (sku) => {
    if (!sku || sku.trim() === '') return { available: true, message: '' };

    const existingProduct = products.find(p =>
      p.sku && p.sku.toLowerCase() === sku.toLowerCase() &&
      (!editingProduct || p.id !== editingProduct.id)
    );

    return {
      available: !existingProduct,
      message: existingProduct ? `SKU "${sku}" already exists` : ''
    };
  };

  const handleEdit = (product) => {
    setEditingProduct(product);

    const companyPricesObj = {};
    if (product.companyPrices) {
      product.companyPrices.forEach(cp => {
        if (cp.company?.id) {
          companyPricesObj[cp.company.id] = cp.price;
        }
      });
    }

    // ✅ FIX: Load company base prices correctly
    const companyBasePricesObj = {};
    if (product.companyBasePrices && product.companyBasePrices.length > 0) {
      product.companyBasePrices.forEach(cbp => {
        if (cbp.company?.id) {
          companyBasePricesObj[cbp.company.id] = cbp.basePrice;
        }
      });
    }

    const dims = product.dimensions ? product.dimensions.split('×') : ['', '', ''];

    setFormData({
      productName: product.productName || '',
      category: product.category || '',
      upc: product.upc || '',
      sku: product.sku || '',
      supplier: product.supplier || '',
      countryOfOrigin: product.countryOfOrigin || '',
      companyPrices: companyPricesObj,
      companyBasePrices: companyBasePricesObj,
      assignToRemainingBase: false,
      remainingBasePriceValue: '',
      assignToRemaining: false,
      remainingCompanyPrice: '',
      length: dims[0] || '',
      width: dims[1] || '',
      height: dims[2] || '',
      weight: product.weight || '',
      materials: product.materials || '',
      brand: product.brand || '',
      shelfLife: product.shelfLife || '',
      unitCost: product.unitCost || '',
      variations: []
    });

    setShowModal(true);

    // Rest of variation loading code remains the same...
    if (product.variations && product.variations.length > 0) {
      const typeMap = new Map();

      product.variations.forEach(v => {
        let attrs = {};
        if (v.attributesJson) {
          try {
            attrs = JSON.parse(v.attributesJson);
          } catch (e) {
            attrs = { [v.variationType]: v.variationValue };
          }
        } else {
          attrs = { [v.variationType]: v.variationValue };
        }

        Object.entries(attrs).forEach(([type, value]) => {
          if (!typeMap.has(type)) {
            const isCustomType = !variationTypes.includes(type);
            typeMap.set(type, {
              type: isCustomType ? 'OTHER' : type,
              values: [],
              customType: isCustomType ? type : ''
            });
          }

          if (!typeMap.get(type).values.includes(value)) {
            typeMap.get(type).values.push(value);
          }
        });
      });

      const types = Array.from(typeMap.values());
      setVariationTypes(types);

      setTimeout(() => {
        const combos = product.variations.map(v => {
          let attrs = {};
          if (v.attributesJson) {
            try {
              attrs = JSON.parse(v.attributesJson);
            } catch (e) {
              attrs = { [v.variationType]: v.variationValue };
            }
          } else {
            attrs = { [v.variationType]: v.variationValue };
          }

          const comboKey = Object.values(attrs).join('-');
          const dims = v.dimensions ? v.dimensions.split('×') : ['', '', ''];

          const companyPricesMap = {};
          if (v.companyPrices) {
            v.companyPrices.forEach(cp => {
              if (cp.company?.id) {
                companyPricesMap[cp.company.id] = cp.price;
              }
            });
          }

          return {
            combination: comboKey,
            attributes: attrs,
            sku: v.sku || '',
            upc: v.upc || '',
            weight: v.weight !== null && v.weight !== undefined ? v.weight : '',
            length: dims[0] || '',
            width: dims[1] || '',
            height: dims[2] || '',
            companyPrices: companyPricesMap
          };
        });

        setVariationCombinations(combos);
      }, 100);
    }
  };



  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This will also delete any associated alerts.')) return;

    setActionLoading(true);
    setLoadingMessage('Deleting product...');

    try {
      const response = await api.delete(`/products/${id}`);

      if (!response.success) {
        return;
      }

      toast.success('Product and associated alerts deleted successfully');
      await loadData();

      if (filteredProducts.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };




  const resetForm = () => {
    setFormData({
      productName: '',
      category: '',
      upc: '',
      sku: '',
      supplier: '',
      countryOfOrigin: '',
      companyPrices: {},
      companyBasePrices: {},
      assignToRemainingBase: false,
      remainingBasePriceValue: '',
      assignToRemaining: false,
      remainingCompanyPrice: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      materials: '',
      brand: '',
      unitCost: '',
      shelfLife: '',
      variations: []
    });
    setVariationTypes([]);
    setVariationCombinations([]);
    setEditingProduct(null);
  };


  const filteredProducts = getSortedProducts(
    products.filter(product =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.upc?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );


  const existingCategories = React.useMemo(() => {
    return [...new Set(
      products
        .map(p => p.category)
        .filter(cat => cat && cat.trim() !== '')
    )].sort();
  }, [products]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingOverlay show={true} message="Loading products..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <p className="text-gray-600 mt-1">Manage your product catalog</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, SKU, or UPC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created Date
                    {sortConfig.key === 'createdAt' && (
                      <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {filteredProducts.length === 0 ? 'No products found' : 'No products on this page'}
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => {
                  // Helper function to format date
                  const formatDate = (dateString) => {
                    if (!dateString) return '-';
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                  };


                  const getDaysSinceCreation = (dateString) => {
                    if (!dateString) return null;
                    const created = new Date(dateString);
                    const now = new Date();
                    const diffTime = Math.abs(now - created);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays;
                  };

                  const daysSinceCreation = getDaysSinceCreation(product.createdAt);

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Package size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{product.productName}</div>
                            {product.brand && <div className="text-sm text-gray-500">{product.brand}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.variations && product.variations.length > 0 ? (
                          <div className="space-y-1">
                            {product.variations.slice(0, 2).map((v, idx) => (
                              <div key={idx} className="text-xs text-gray-600">{v.sku || '-'}</div>
                            ))}
                            {product.variations.length > 2 && (
                              <div className="text-xs text-gray-500">+{product.variations.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-900">{product.sku || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.variations && product.variations.length > 0 ? (
                          <div className="space-y-1">
                            {product.variations.slice(0, 2).map((v, idx) => (
                              <div key={idx} className="text-xs text-gray-600">{v.upc || '-'}</div>
                            ))}
                            {product.variations.length > 2 && (
                              <div className="text-xs text-gray-500">+{product.variations.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-900">{product.upc || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        {product.unitCost != null
                          ? `₱${Number(product.unitCost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {product.variations && product.variations.length > 0 ? (
                          <div className="space-y-1">
                            {product.variations[0].companyPrices && product.variations[0].companyPrices.length > 0 ? (
                              <>
                                {product.variations[0].companyPrices.slice(0, 2).map((cp, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium text-blue-600">
                                      ₱{Number(cp.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-gray-500 ml-1">({cp.company?.companyName})</span>
                                  </div>
                                ))}
                                {product.variations[0].companyPrices.length > 2 && (
                                  <div className="text-xs text-gray-500">+{product.variations[0].companyPrices.length - 2} more</div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {product.companyBasePrices && product.companyBasePrices.length > 0 ? (
                              <>
                                {product.companyBasePrices.slice(0, 2).map((cbp, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium text-blue-600">
                                      ₱{Number(cbp.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-gray-500 ml-1">({cbp.company?.companyName})</span>
                                  </div>
                                ))}
                                {product.companyBasePrices.length > 2 && (
                                  <div className="text-xs text-gray-500">+{product.companyBasePrices.length - 2} more</div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">No base prices set</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.supplier || '-'}</td>

                      {/* NEW CREATION DATE COLUMN */}
                      <td className="px-6 py-4">
                        {product.createdAt ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Calendar size={14} className="text-gray-400" />
                              <span>{formatDate(product.createdAt)}</span>
                            </div>
                            {daysSinceCreation !== null && (
                              <span className="text-xs text-gray-500 mt-1">
                                {daysSinceCreation === 0
                                  ? 'Today'
                                  : daysSinceCreation === 1
                                    ? '1 day ago'
                                    : `${daysSinceCreation} days ago`}
                              </span>
                            )}
                            {/* Optional: Show shelf life expiry warning */}
                            {product.shelfLife && product.createdAt && (
                              (() => {
                                const shelfLife = product.shelfLife.toLowerCase().trim();
                                const parts = shelfLife.split(/\s+/);
                                if (parts.length >= 2) {
                                  const amount = parseInt(parts[0]);
                                  const unit = parts[1];

                                  let expiryDate = new Date(product.createdAt);
                                  if (unit.startsWith('month')) {
                                    expiryDate.setMonth(expiryDate.getMonth() + amount);
                                  } else if (unit.startsWith('year')) {
                                    expiryDate.setFullYear(expiryDate.getFullYear() + amount);
                                  } else if (unit.startsWith('day')) {
                                    expiryDate.setDate(expiryDate.getDate() + amount);
                                  }

                                  const now = new Date();
                                  const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

                                  if (daysUntilExpiry < 0) {
                                    return (
                                      <span className="text-xs text-red-600 font-medium mt-1">
                                        ⚠️ Expired
                                      </span>
                                    );
                                  } else if (daysUntilExpiry <= 30) {
                                    return (
                                      <span className="text-xs text-amber-600 font-medium mt-1">
                                        ⚠️ Expires in {daysUntilExpiry} days
                                      </span>
                                    );
                                  }
                                }
                                return null;
                              })()
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed border-gray-200'
                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${currentPage === number
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                      }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed border-gray-200'
                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Rest of your modal code remains exactly the same */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package size={20} />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="productName"
                      value={formData.productName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <CategoryInput
                      value={formData.category}
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      categories={productCategories}
                      existingCategories={existingCategories}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter brand"
                    />
                  </div>
                </div>
              </div>


              {/* Supplier & Origin */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe size={20} />
                  Supplier & Origin
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <SupplierInput
                      value={formData.supplier}
                      onChange={(value) => setFormData({ ...formData, supplier: value })}
                      suppliers={suppliers}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                    <input
                      type="text"
                      name="countryOfOrigin"
                      value={formData.countryOfOrigin}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shelf Life
                    </label>
                    <input
                      type="text"
                      name="shelfLife"
                      value={formData.shelfLife}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Example: 12 months, 2 years"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Creation Date
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.createdAt ? new Date(editingProduct.createdAt).toLocaleDateString() : 'Auto-generated on save'}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingProduct?.createdAt
                        ? 'Product created on this date'
                        : 'Will be set automatically when product is created'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Physical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Box size={20} />
                  Physical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SKU - Only show if no variations */}
                  {variationCombinations.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        required={variationCombinations.length === 0}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter SKU"
                      />
                    </div>
                  )}

                  {/* UPC - Only show if no variations */}
                  {variationCombinations.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UPC <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="upc"
                        value={formData.upc}
                        onChange={handleInputChange}
                        required={variationCombinations.length === 0}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter UPC"
                      />
                    </div>
                  )}

                  {/* Weight - Only show if no variations */}
                  {variationCombinations.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        required={variationCombinations.length === 0}
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  )}


                  {variationCombinations.length === 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dimensions (L×W×H cm) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="length"
                          value={formData.length}
                          onChange={handleInputChange}
                          placeholder="Length"
                          step="0.01"
                          min="0"
                          required={variationCombinations.length === 0}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <X size={16} className="text-gray-400" />
                        <input
                          type="number"
                          name="width"
                          value={formData.width}
                          onChange={handleInputChange}
                          placeholder="Width"
                          step="0.01"
                          min="0"
                          required={variationCombinations.length === 0}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <X size={16} className="text-gray-400" />
                        <input
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={handleInputChange}
                          placeholder="Height"
                          step="0.01"
                          min="0"
                          required={variationCombinations.length === 0}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                  {/* Materials */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Materials</label>
                    <input
                      type="text"
                      name="materials"
                      value={formData.materials}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter materials"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost (₱)
                    </label>
                    <input
                      type="number"
                      value={formData.unitCost || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      placeholder="Calculated from supplier orders"
                    />
                    <p className="text-xs text-gray-500 mt-1">Automatically calculated when supplier order status is OK</p>
                  </div>
                </div>

                {/* Show disabled message when variations exist */}
                {variationCombinations.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle size={18} />
                      <div>
                        <p className="text-sm font-medium">SKU, UPC, Weight & Dimensions Disabled</p>
                        <p className="text-xs mt-1">
                          This product has variations. Please set these values for each variation in the table below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {variationCombinations.length === 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span style={{ fontSize: '20px' }}>₱</span>
                    Company Base Prices
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (For products without variations)
                    </span>
                  </h3>
                  <MultiCompanyPriceSelector
                    companies={companies}
                    selectedPrices={formData.companyBasePrices}
                    onChange={(prices, assignRemaining, remainingPrice) => {
                      setFormData(prev => ({
                        ...prev,
                        companyBasePrices: prices,
                        assignToRemainingBase: assignRemaining,
                        remainingBasePriceValue: remainingPrice
                      }));
                    }}
                    assignToRemaining={formData.assignToRemainingBase || false}
                    remainingPrice={formData.remainingBasePriceValue || ''}
                  />
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <AlertCircle size={14} />
                    Note: Company base prices are only available for products without variations.
                    If you add variations below, variation-specific pricing will be used instead.
                  </p>
                </div>
              )}

              {/* Show disabled message when variations exist */}
              {variationCombinations.length > 0 && (
                <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600">
                    <AlertCircle size={18} />
                    <div>
                      <p className="text-sm font-medium">Company Base Prices Disabled</p>
                      <p className="text-xs mt-1">
                        This product has variations. Please set company prices for each variation in the table below.
                      </p>
                    </div>
                  </div>
                </div>
              )}


              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Tag size={20} />
                    Product Variations
                  </h3>
                </div>


                <div className="space-y-4">
                  {variationCombinations.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700">
                        <AlertCircle size={18} />
                        <div>
                          <p className="text-sm font-medium">Variations Active</p>
                          <p className="text-xs mt-1">
                            Company base prices and base product fields (SKU, UPC, Weight, Dimensions) are disabled.
                            Set these values for each variation in the table below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {variationTypes.map((varType, typeIndex) => (
                    <div key={typeIndex} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      {/* Variation Type Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <select
                            value={varType.type}
                            onChange={(e) => {
                              const newTypes = [...variationTypes];
                              newTypes[typeIndex].type = e.target.value;
                              newTypes[typeIndex].customType = '';
                              setVariationTypes(newTypes);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                          >
                            {['SIZE', 'COLOR', 'PACK', 'FLAVOR', 'MATERIAL', 'STYLE', 'VOLUME', 'OTHER'].map(type => (
                              <option key={type} value={type}>
                                {type.charAt(0) + type.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>

                          {varType.type === 'OTHER' && (
                            <input
                              type="text"
                              placeholder="Custom type name (e.g., Pattern, Scent)"
                              value={varType.customType || ''}
                              onChange={(e) => {
                                const newTypes = [...variationTypes];
                                newTypes[typeIndex].customType = e.target.value;
                                setVariationTypes(newTypes);
                              }}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setVariationTypes(variationTypes.filter((_, i) => i !== typeIndex));
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Add Value Input */}
                      <div className="mb-4">
                        {varType.type === 'SIZE' ? (
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value && e.target.value !== 'CUSTOM') {
                                  const newTypes = [...variationTypes];
                                  if (!newTypes[typeIndex].values.includes(e.target.value)) {
                                    newTypes[typeIndex].values.push(e.target.value);
                                    setVariationTypes(newTypes);
                                  }
                                  e.target.value = '';
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Quick add size...</option>
                              {['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'SMALL', 'MEDIUM', 'LARGE'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <input
                              ref={(el) => variationInputRefs.current[`size-input-${typeIndex}`] = el}
                              type="text"
                              placeholder="Or type custom size"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = e.target.value.trim();
                                  if (value && !variationTypes[typeIndex].values.includes(value)) {
                                    const newTypes = [...variationTypes];
                                    newTypes[typeIndex].values.push(value);
                                    setVariationTypes(newTypes);
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : varType.type === 'COLOR' ? (
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  const newTypes = [...variationTypes];
                                  if (!newTypes[typeIndex].values.includes(e.target.value)) {
                                    newTypes[typeIndex].values.push(e.target.value);
                                    setVariationTypes(newTypes);
                                  }
                                  e.target.value = '';
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Quick add color...</option>
                              {['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE', 'GRAY', 'BROWN', 'ORANGE', 'PURPLE', 'PINK', 'BEIGE', 'NAVY'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <input
                              ref={(el) => variationInputRefs.current[`color-input-${typeIndex}`] = el}
                              type="text"
                              placeholder="Or type custom color"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = e.target.value.trim();
                                  if (value && !variationTypes[typeIndex].values.includes(value)) {
                                    const newTypes = [...variationTypes];
                                    newTypes[typeIndex].values.push(value);
                                    setVariationTypes(newTypes);
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              ref={(el) => variationInputRefs.current[`input-${typeIndex}`] = el}
                              type="text"
                              placeholder={`Add ${varType.type === 'OTHER' ? (varType.customType || 'variation') : varType.type.toLowerCase()} value`}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = e.target.value.trim();
                                  if (value && !variationTypes[typeIndex].values.includes(value)) {
                                    const newTypes = [...variationTypes];
                                    newTypes[typeIndex].values.push(value);
                                    setVariationTypes(newTypes);
                                    e.target.value = '';
                                  }
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = variationInputRefs.current[`input-${typeIndex}`];
                                if (input && input.value) {
                                  const value = input.value.trim();
                                  if (value && !variationTypes[typeIndex].values.includes(value)) {
                                    const newTypes = [...variationTypes];
                                    newTypes[typeIndex].values.push(value);
                                    setVariationTypes(newTypes);
                                    input.value = '';
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Values List */}
                      {varType.values.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            {varType.values.length} value{varType.values.length > 1 ? 's' : ''}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {varType.values.map((value, valueIndex) => (
                              <div
                                key={valueIndex}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm"
                              >
                                <span>{value}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTypes = [...variationTypes];
                                    newTypes[typeIndex].values = newTypes[typeIndex].values.filter((_, i) => i !== valueIndex);
                                    setVariationTypes(newTypes);
                                  }}
                                  className="hover:bg-blue-200 rounded p-0.5 transition"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setVariationTypes([...variationTypes, { type: 'SIZE', values: [], customType: '' }]);
                    }}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    {variationTypes.length === 0 ? 'Add Variation Type' : 'Add Another Variation Type'}
                  </button>


                  {/* Variation Combinations Table */}
                  {variationCombinations.length > 0 && (
                    <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          <Package size={18} />
                          Variation Combinations ({variationCombinations.length})
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-48">Variation</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-40">SKU</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-40">UPC</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-32">Weight (kg)</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-64">Dimensions (L×W×H cm)</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase min-w-[400px]">Company Prices</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {variationCombinations.map((combo, comboIndex) => (
                              <tr key={comboIndex} className="hover:bg-gray-50">

                                <td className="px-4 py-3 w-48">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(combo.attributes).map(([type, value]) => (
                                      <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                                        {type}: {value}
                                      </span>
                                    ))}
                                  </div>
                                </td>


                                <td className="px-4 py-3 w-40">
                                  <input
                                    type="text"
                                    value={combo.sku}
                                    onChange={(e) => updateVariationCombination(comboIndex, 'sku', e.target.value)}
                                    placeholder="Enter SKU *"
                                    required
                                    className="w-full min-w-[150px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>


                                <td className="px-4 py-3 w-40">
                                  <input
                                    type="text"
                                    value={combo.upc}
                                    onChange={(e) => updateVariationCombination(comboIndex, 'upc', e.target.value)}
                                    placeholder="Enter UPC *"
                                    required
                                    className="w-full min-w-[150px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>


                                <td className="px-4 py-3 w-32">
                                  <input
                                    type="number"
                                    value={combo.weight || ''}
                                    onChange={(e) => updateVariationCombination(comboIndex, 'weight', e.target.value)}
                                    placeholder="0.00 *"
                                    step="0.01"
                                    min="0"
                                    required
                                    className="w-full min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>


                                <td className="px-4 py-3 w-64">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={combo.length}
                                      onChange={(e) => updateVariationCombination(comboIndex, 'length', e.target.value)}
                                      placeholder="L *"
                                      step="0.01"
                                      required
                                      className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <X size={12} className="text-gray-400 flex-shrink-0" />
                                    <input
                                      type="number"
                                      value={combo.width}
                                      onChange={(e) => updateVariationCombination(comboIndex, 'width', e.target.value)}
                                      placeholder="W *"
                                      step="0.01"
                                      required
                                      className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <X size={12} className="text-gray-400 flex-shrink-0" />
                                    <input
                                      type="number"
                                      value={combo.height}
                                      onChange={(e) => updateVariationCombination(comboIndex, 'height', e.target.value)}
                                      placeholder="H *"
                                      step="0.01"
                                      required
                                      className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </td>


                                <td className="px-4 py-3 min-w-[400px]">
                                  <div className="space-y-2">
                                    {companies.map((company) => (
                                      <div key={company.id} className="flex items-center gap-3">
                                        <label className="text-xs text-gray-700 font-medium min-w-[140px] truncate" title={company.companyName}>
                                          {company.companyName}
                                        </label>
                                        <div className="flex items-center gap-2 flex-1">
                                          <span className="text-sm text-gray-500">₱</span>
                                          <input
                                            type="number"
                                            value={combo.companyPrices[company.id] || ''}
                                            onChange={(e) => updateVariationCompanyPrice(comboIndex, company.id, e.target.value)}
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Bulk Actions */}
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Clear all variation data?')) {
                                setVariationCombinations(variationCombinations.map(combo => ({
                                  ...combo,
                                  sku: '',
                                  upc: '',
                                  weight: '',
                                  length: '',
                                  width: '',
                                  height: '',
                                  companyPrices: {}
                                })));
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Clear All Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;