import React, { useState, useEffect, useRef } from 'react';
import './invoice-print.css';
import { api } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Eye, FileText, Check, X, Printer, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './sales-memo-print.css';
import { LoadingOverlay } from './LoadingOverlay';


const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0.00';
  return Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


const formatDate = (dateString) => {
  if (!dateString) return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

// Searchable Dropdown Component
const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

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



const VariationSearchableDropdown = ({ options, value, onChange, placeholder, required = false, formData, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

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
    option.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.upc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div>
              <div className="text-gray-900 font-medium truncate">{selectedOption.name}</div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by UPC, product name, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No products found</div>
            ) : (
              filteredOptions.map((option) => {
                const isAlreadySelected = formData?.items?.some(
                  (item, idx) => item.productId === option.id && idx !== index
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (!isAlreadySelected) {
                        onChange(option.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }
                    }}
                    disabled={isAlreadySelected}
                    className={`w-full px-4 py-3 text-left border-b border-gray-100 transition ${isAlreadySelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : value === option.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-blue-50'
                      }`}
                  >
                    <div className="font-medium text-sm">{option.name}</div>
                    {isAlreadySelected && (
                      <span className="text-xs text-red-500 mt-1 block">Already selected</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedOption && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs space-y-2">
            {/* Main Product Info */}
            <div className="text-gray-700 space-y-2">
              <div>
                <span className="text-gray-500 font-medium">Product Name:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedOption.fullName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 font-medium">UPC:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedOption.upc || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">SKU:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedOption.sku || 'N/A'}</span>
                </div>
              </div>

              {/* Variation Info - Only show if has variations */}
              {selectedOption.isVariation && selectedOption.hasVariations && (
                <div>
                  <span className="text-gray-500 font-medium">Variations:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {selectedOption.variationLabel || 'Has variations'}
                  </span>
                </div>
              )}

              {/* Price Info */}
              <div>
                <span className="text-gray-500 font-medium">Price:</span>
                <span className="ml-2">
                  {selectedOption.price && selectedOption.price > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ₱{selectedOption.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-gray-500">Not set</span>
                  )}
                </span>
              </div>
            </div>

            {/* Variation Badge - Only show if product has variations */}
            {selectedOption.hasVariations && (
              <div className="pt-2 border-t border-gray-300">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${selectedOption.isVariation ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {selectedOption.isVariation ? 'Product with Variations' : 'Main Product'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const SalesManagement = () => {
  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [invoiceReport, setInvoiceReport] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [productPrices, setProductPrices] = useState({});
  const [branchStocks, setBranchStocks] = useState({});
  const [inventories, setInventories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showSalesMemoModal, setShowSalesMemoModal] = useState(false);
  const [salesMemo, setSalesMemo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingStocks, setLoadingStocks] = useState({});
  const [stockErrors, setStockErrors] = useState({});

  const [formData, setFormData] = useState({
    branchId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: []
  });

  const [filterData, setFilterData] = useState({
    companyId: '',
    branchId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setLoadingMessage('Loading sales data...');
    try {
      const [
        invRes,
        prodRes,
        warehousesRes,
        branchesRes,
        warehouseStocksRes,
        branchStocksRes,
        salesRes,
        companiesRes
      ] = await Promise.all([
        api.get('/inventories'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/branches'),
        api.get('/stocks/warehouses'),
        api.get('/stocks/branches'),
        api.get('/sales'),
        api.get('/companies')
      ]);

      if (invRes.success) setInventories(invRes.data || []);
      if (prodRes.success) setProducts(prodRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (warehouseStocksRes.success) setWarehouseStocks(warehouseStocksRes.data || []);
      if (branchStocksRes.success) setBranchStocks(branchStocksRes.data || []);
      if (salesRes.success) setSales(salesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);

      try {
        const summaryRes = await api.get('/inventories/products/summary');
        if (summaryRes.success) {
          setProductSummaries(summaryRes.data || []);
        }
      } catch (summaryErr) {
        console.warn('Could not load product summaries:', summaryErr);
        setProductSummaries([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const getProductPriceForCompany = async (productId, companyId, variationId = 0) => {
    try {
      // Check if product has variations
      const product = products.find(p => p.id === productId);
      const hasVariations = product?.variations && product.variations.length > 0;

      // If product has variations but no variationId is provided, throw error
      if (hasVariations && !variationId) {
        throw new Error('This product requires selecting a variation');
      }

      // If product doesn't have variations, pass 0 as variationId
      const effectiveVariationId = hasVariations ? variationId : 0;

      const response = await api.get(
        `/sales/product-price?productId=${productId}&companyId=${companyId}&variationId=${effectiveVariationId}`
      );

      if (response.success) {
        return response.data?.price || 0;
      }

      // Fallback to product base price
      return product?.basePrice || 0;
    } catch (error) {
      console.error('Failed to get price:', error);

      if (error.message.includes('requires selecting a variation')) {
        toast.error('This product requires selecting a variation. Please choose a variation from the dropdown.');
      } else if (error.response?.data?.includes('Variation ID is required')) {
        toast.error('This product has variations. Please select a specific variation.');
      }

      const product = products.find(p => p.id === productId);
      return product?.basePrice || 0;
    }
  };

  const loadProductPricesForCompany = async (companyId) => {
    if (!companyId) {
      setProductPrices({});
      return;
    }

    const priceMap = {};
    for (const product of products) {
      try {
        // For products with variations, we need to check each variation
        if (product.variations && product.variations.length > 0) {
          for (const variation of product.variations) {
            const price = await getProductPriceForCompany(product.id, companyId, variation.id);
            priceMap[variation.id] = price;
          }
        } else {
          // For products without variations, use productId with variationId=0
          const price = await getProductPriceForCompany(product.id, companyId, 0);
          priceMap[product.id] = price;
        }
      } catch (error) {
        // Set default prices
        if (product.variations && product.variations.length > 0) {
          for (const variation of product.variations) {
            priceMap[variation.id] = variation.price || product.price;
          }
        } else {
          priceMap[product.id] = product.price;
        }
      }
    }
    setProductPrices(priceMap);
  };

  const handleOpenModal = async (mode, sale = null) => {
    setModalMode(mode);
    setLoadingStocks({});
    setStockErrors({});

    if (mode === 'edit' && sale && sale.status === 'INVOICED') {
      alert('Cannot edit sale that has already been INVOICED. Please revert status first.');
      return;
    }

    if (mode === 'create') {
      setSelectedSale(null);
      setFormData({ branchId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), items: [] });
      setBranchInfo(null);
      setBranchStocks({});
    } else if (mode === 'edit' && sale) {
      setSelectedSale(sale);
      setFormData({
        branchId: sale.branch.id,
        month: sale.month,
        year: sale.year,
        items: sale.items.map(item => ({
          productId: item.product.id,
          variationId: item.variation?.id || item.product.id,
          quantity: item.quantity || 1
        }))
      });


      const loadingToast = toast.loading('Loading sale data and stock information...');

      try {
        const info = await api.get(`/sales/branch-info/${sale.branch.id}`);
        if (info.success) {
          setBranchInfo(info.data);
          await loadProductPricesForCompany(info.data?.companyId);

          // Load stock for all products in the sale
          const stockMap = {};
          const errors = {};

          for (const item of sale.items) {
            try {
              const stock = await api.get(`/stocks/branches/${sale.branch.id}/products/${item.product.id}`);
              if (stock.success) {
                stockMap[item.product.id] = stock.data;
              }
            } catch (error) {
              stockMap[item.product.id] = { quantity: 0, availableQuantity: 0 };
              errors[item.product.id] = 'Failed to load stock';
            }
          }

          setBranchStocks(stockMap);
          setStockErrors(errors);
          toast.success('Sale data loaded successfully!', { id: loadingToast });
        }
      } catch (error) {
        console.error('Failed to load branch info');
        toast.error('Failed to load sale data', { id: loadingToast });
      }
    } else if (mode === 'view' && sale) {
      try {
        const freshSale = await api.get(`/sales/${sale.id}`);
        if (freshSale.success) {
          setSelectedSale(freshSale.data);
        }
      } catch (error) {
        console.error('Failed to load fresh sale data:', error);
        setSelectedSale(sale);
      }
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
    setBranchInfo(null);
  };

  const handleBranchChange = async (branchId) => {
    setFormData({ ...formData, branchId });
    if (branchId) {
      // Show loading toast
      const loadingToast = toast.loading('Loading branch information and stock data...');

      try {
        const info = await api.get(`/sales/branch-info/${branchId}`);
        if (info.success) {
          setBranchInfo(info.data);
          await loadProductPricesForCompany(info.data?.companyId);

          // Load branch stock information for all products
          const stockMap = {};
          const errors = {};

          for (const product of products) {
            try {
              const stock = await api.get(`/stocks/branches/${branchId}/products/${product.id}`);
              if (stock.success) {
                stockMap[product.id] = stock.data;
              }
            } catch (error) {
              stockMap[product.id] = { quantity: 0, availableQuantity: 0 };
              errors[product.id] = 'Failed to load stock';
            }
          }
          setBranchStocks(stockMap);
          setStockErrors(errors);

          toast.success('Branch information loaded successfully!', { id: loadingToast });
        }
      } catch (error) {
        console.error('Failed to load branch info');
        setBranchInfo(null);
        setProductPrices({});
        setBranchStocks({});
        toast.error('Failed to load branch information', { id: loadingToast });
      }
    }
  };

  const loadProductStock = async (productId, branchId) => {
    if (!branchId) return;

    setLoadingStocks(prev => ({ ...prev, [productId]: true }));
    setStockErrors(prev => ({ ...prev, [productId]: null }));

    try {
      const stock = await api.get(`/stocks/branches/${branchId}/products/${productId}`);
      if (stock.success) {
        setBranchStocks(prev => ({
          ...prev,
          [productId]: stock.data
        }));
      }
    } catch (error) {
      console.error('Failed to load stock for product:', productId);
      setBranchStocks(prev => ({
        ...prev,
        [productId]: { quantity: 0, availableQuantity: 0 }
      }));
      setStockErrors(prev => ({
        ...prev,
        [productId]: 'Failed to load stock'
      }));
    } finally {
      setLoadingStocks(prev => ({ ...prev, [productId]: false }));
    }
  };




  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, { productId: '', variationId: '', quantity: 1 }] });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    const oldProductId = newItems[index].productId;

    newItems[index][field] = field === 'quantity' ? parseInt(value) || 0 : value;

    if (field === 'productId' && value) {
      const selectedProduct = productOptions.find(p => p.id === value);

      if (selectedProduct) {
        if (selectedProduct.hasVariations && selectedProduct.isVariation) {
          newItems[index].variationId = value;
          newItems[index].actualProductId = selectedProduct.parentProductId;
        } else {
          newItems[index].variationId = value;
          newItems[index].actualProductId = value;
        }
        console.log('Set variationId to:', newItems[index].variationId,
          'actualProductId:', newItems[index].actualProductId,
          'for product:', selectedProduct.fullName,
          'isVariation:', selectedProduct.isVariation);
      }
    }

    setFormData({ ...formData, items: newItems });

    if (field === 'productId' && value && value !== oldProductId && formData.branchId) {
      await loadProductStock(value, formData.branchId);
    }
  };



  const handleGenerateSalesMemo = async () => {
    if (!filterData.companyId) {
      toast.error('Please select a company first', { duration: 4000 });
      return;
    }

    toast.loading('Generating Sales Memo...', { id: 'sales-memo-loading' });

    try {

      const response = await api.post('/sales/sales-memo/generate', filterData);

      toast.dismiss('sales-memo-loading');

      if (response.success) {
        const memoData = response.data?.data || response.data;

        if (!memoData.products || memoData.products.length === 0) {
          toast.error(
            'No sales data found for the selected criteria.\n\n' +
            'Please ensure:\n' +
            '• Sales exist for the selected company\n' +
            '• Sales are CONFIRMED or INVOICED\n' +
            '• Date range includes sales data',
            { duration: 6000 }
          );
          return;
        }

        memoData.adjustments = memoData.adjustments || [];

        setSalesMemo(memoData);
        setShowSalesMemoModal(false);

        toast.success(
          `Sales Memo generated successfully!\n\n` +
          `Products: ${memoData.products.length}\n` +
          `Date: ${formatDate(memoData.generatedAt)}`,
          { duration: 4000 }
        );

        console.log('Sales memo set successfully:', memoData);
      } else {
        toast.error(response.message || 'Failed to generate sales memo', { duration: 5000 });
      }
    } catch (error) {
      toast.dismiss('sales-memo-loading');

      console.error('Sales memo generation error:', error);

      let errorMessage = 'Failed to generate sales memo';

      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.branchId) {
      toast.error('Please select a branch');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    for (const item of formData.items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        toast.error('All items must have a product and quantity greater than 0');
        return;
      }
    }

    setActionLoading(true);
    setLoadingMessage(modalMode === 'create' ? 'Creating sale...' : 'Updating sale...');

    try {
      if (modalMode === 'create') {
        const response = await api.post('/sales', formData);
        if (response.success) {
          toast.success('Sale created successfully!');
          handleCloseModal();
          loadData();
        } else {
          toast.error(response.message || 'Failed to create sale');
        }
      } else if (modalMode === 'edit') {
        const response = await api.put(`/sales/${selectedSale.id}`, formData);
        if (response.success) {
          toast.success('Sale updated successfully!');
          handleCloseModal();
          loadData();
        } else {
          toast.error(response.message || 'Failed to update sale');
        }
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save sale';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFilterSales = async () => {
    try {
      setActionLoading(true);
      setLoadingMessage('Filtering sales...');

      // Build query params
      const params = new URLSearchParams();
      if (filterData.companyId) params.append('companyId', filterData.companyId);
      if (filterData.branchId) params.append('branchId', filterData.branchId);
      if (filterData.status) params.append('status', filterData.status);
      if (filterData.startDate) params.append('startDate', filterData.startDate);
      if (filterData.endDate) params.append('endDate', filterData.endDate);

      const response = await api.get(`/sales?${params.toString()}`);
      if (response.success) {
        setSales(response.data || []);
        toast.success(`Found ${response.data.length} sales`);
        setCurrentPage(1);
      } else {
        toast.error('Failed to filter sales');
      }
    } catch (error) {
      console.error('Error filtering sales:', error);
      const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to filter sales';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };



  const handleGenerateInvoice = async () => {
    if (!filterData.companyId) {
      toast.error('Please select a company first', { duration: 4000 });
      return;
    }

    toast.loading('Generating Invoice...', { id: 'invoice-loading' });

    try {
      const response = await api.post('/sales/invoice/generate', filterData);

      toast.dismiss('invoice-loading');

      if (response.success || response.data) {
        const invoiceData = response.data || response;

        if (!invoiceData.products || invoiceData.products.length === 0) {
          toast.error(
            'No sales data found for invoice generation.\n\n' +
            'Please ensure:\n' +
            '• Sales exist for the selected company\n' +
            '• Sales are CONFIRMED or INVOICED\n' +
            '• Date range includes sales data',
            { duration: 6000 }
          );
          return;
        }

        // Initialize adjustments array if not present
        invoiceData.adjustments = invoiceData.adjustments || [];

        setInvoiceReport(invoiceData);
        setShowInvoiceModal(false);

        toast.success(
          `Invoice generated successfully!\n\n` +
          `Products: ${invoiceData.products.length}\n` +
          `Total: ₱${formatCurrency(invoiceData.totalSalesVatInclusive)}\n` +
          `Date: ${formatDate(invoiceData.generatedAt)}`,
          { duration: 4000 }
        );

        // Reload sales data to reflect any status changes
        loadData();
      } else {
        toast.error('Failed to generate invoice', { duration: 5000 });
      }
    } catch (error) {
      toast.dismiss('invoice-loading');
      console.error('Invoice generation error:', error);

      const errorMessage = error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Failed to generate invoice';

      toast.error(errorMessage, { duration: 5000 });
    }
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    const statusLabels = {
      'CONFIRMED': 'confirm',
      'INVOICED': 'invoice'
    };

    const action = statusLabels[newStatus] || newStatus.toLowerCase();

    if (!window.confirm(`Are you sure you want to ${action} this sale?`)) {
      return;
    }

    setActionLoading(true);
    setLoadingMessage(`${action.charAt(0).toUpperCase() + action.slice(1)}ing sale...`);

    try {
      const response = await api.put(`/sales/${saleId}/status?status=${newStatus}`);

      if (response.success || response.data) {
        toast.success(`Sale ${action}ed successfully!`);
        loadData();
      } else {
        toast.error(`Failed to ${action} sale`);
      }
    } catch (error) {
      console.error(`Error updating sale status:`, error);
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        `Failed to ${action} sale`;
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };



  const handleDelete = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    setLoadingMessage('Deleting sale...');

    try {
      const response = await api.delete(`/sales/${saleId}`);

      if (response.success || response.data?.message) {
        toast.success('Sale deleted successfully!');
        loadData();

        try {
          const branchStocksRes = await api.get('/stocks/branches');
          if (branchStocksRes.success) {
            setBranchStocks(branchStocksRes.data || []);
          }
        } catch (refreshErr) {
          console.warn('Could not refresh branch stocks:', refreshErr);
        }
      } else {
        toast.error('Failed to delete sale');
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Failed to delete sale';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };


  const handleResetFilter = () => {
    setFilterData({
      companyId: '',
      branchId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setStatusFilter('ALL');
    setSearchTerm('');
    loadData();
    setCurrentPage(1);
  };


  const handleCompanyFilterChange = (value) => {
    setFilterData({ ...filterData, companyId: value });


    if (value && filterData.branchId) {
      const selectedBranch = branches.find(b => b.id === filterData.branchId);
      if (selectedBranch && selectedBranch.company?.id !== value) {
        setFilterData(prev => ({ ...prev, branchId: '' }));
      }
    }
  };

  const sortByStatus = (sales) => {
    const statusOrder = {
      'PENDING': 1,
      'CONFIRMED': 2,
      'INVOICED': 3
    };

    return [...sales].sort((a, b) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  const filteredSales = sortByStatus(sales.filter(sale => {

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      sale.branch?.branchName?.toLowerCase().includes(searchLower) ||
      sale.company?.companyName?.toLowerCase().includes(searchLower) ||
      sale.branch?.branchCode?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;


    if (filterData.companyId && sale.company?.id !== filterData.companyId) {
      return false;
    }

    if (filterData.branchId && sale.branch?.id !== filterData.branchId) {
      return false;
    }


    if (statusFilter !== 'ALL' && sale.status !== statusFilter) {
      return false;
    }


    if (filterData.startDate || filterData.endDate) {

      const saleDate = new Date(sale.year, sale.month - 1, 15);

      if (filterData.startDate) {
        const startDate = new Date(filterData.startDate);
        if (saleDate < startDate) return false;
      }

      if (filterData.endDate) {
        const endDate = new Date(filterData.endDate);
        if (saleDate > endDate) return false;
      }
    }

    return true;
  }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

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

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const companyOptions = companies.map(c => ({
    id: c.id,
    name: c.companyName || c.companyName || c.name
  }));

  const filteredBranchOptions = filterData.companyId
    ? branches
      .filter(b => b.company?.id === filterData.companyId)
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;

  const productOptions = products.flatMap(p => {
    const hasVariations = p.variations && p.variations.length > 0;

    if (hasVariations) {
      // Products WITH variations
      return p.variations.map(v => {
        const companyPrice = v.companyPrices?.find(cp => cp.company?.id === branchInfo?.companyId)?.price || 0;

        const truncatedName = p.productName.length > 12
          ? p.productName.substring(0, 12) + '...'
          : p.productName;

        const variationLabel = v.combinationDisplay ||
          (v.variationType && v.variationValue ? `${v.variationType}: ${v.variationValue}` : 'Variation');

        return {
          id: v.id,
          parentProductId: p.id,
          name: `${v.upc || 'N/A'} - ${truncatedName} - ${v.sku || 'N/A'}`,
          fullName: p.productName,
          upc: v.upc,
          sku: v.sku,
          price: companyPrice,
          variationLabel: variationLabel,
          isVariation: true,
          hasVariations: true
        };
      });
    } else {
      // Products WITHOUT variations - use company base price
      const companyBasePrice = p.companyBasePrices?.find(
        cbp => cbp.company?.id === branchInfo?.companyId
      )?.basePrice || productPrices[p.id] || 0;

      const truncatedName = p.productName.length > 12
        ? p.productName.substring(0, 12) + '...'
        : p.productName;

      return [{
        id: p.id,
        parentProductId: p.id,
        name: `${p.upc || 'N/A'} - ${truncatedName} - ${p.sku || 'N/A'}`,
        fullName: p.productName,
        upc: p.upc,
        sku: p.sku,
        price: companyBasePrice,
        isVariation: false,
        hasVariations: false
      }];
    }
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingOverlay show={true} message="Loading sales data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Management</h1>
          <p className="text-gray-600">Manage sales orders, generate invoices, and track revenue</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* First Row: Action Buttons and Search */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleOpenModal('create')}
                  className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <Plus size={20} />
                  <span>New Sale</span>
                </button>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md"
                >
                  <FileText size={20} />
                  <span>Generate Invoice</span>
                </button>
                <button
                  onClick={() => setShowSalesMemoModal(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md"
                >
                  <FileText size={20} />
                  <span>Generate Sales Memo</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search branch/company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Second Row: Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <SearchableDropdown
                  options={companyOptions}
                  value={filterData.companyId}
                  onChange={handleCompanyFilterChange}
                  placeholder="All Companies"
                  displayKey="name"
                  valueKey="id"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                <SearchableDropdown
                  options={filteredBranchOptions}
                  value={filterData.branchId}
                  onChange={(value) => setFilterData({ ...filterData, branchId: value })}
                  placeholder="All Branches"
                  displayKey="name"
                  valueKey="id"
                />
                {filterData.companyId && filteredBranchOptions.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No branches for selected company</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="INVOICED">Invoiced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filterData.startDate}
                  onChange={(e) => setFilterData({ ...filterData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filterData.endDate}
                  onChange={(e) => setFilterData({ ...filterData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            {(filterData.companyId || filterData.branchId || filterData.startDate || filterData.endDate || searchTerm || statusFilter !== 'ALL') && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleResetFilter}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={16} />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSales.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      {filteredSales.length === 0 ? 'No sales found' : 'No sales on this page'}
                    </td>
                  </tr>
                ) : (
                  currentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{sale.branch.branchName}</div>
                          <div className="text-sm text-gray-500">{sale.branch.branchCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.company.companyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {months[sale.month - 1]} {sale.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === 'INVOICED'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'CONFIRMED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenModal('view', sale)}
                            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>

                          {/* Show different buttons based on status */}
                          {sale.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleOpenModal('edit', sale)}
                                className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'CONFIRMED')}
                                className="flex items-center gap-2 px-3 py-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition"
                                title="Confirm Sale (Deducts Stock)"
                              >
                                <Check size={18} />
                                <span className="text-xs">Confirm</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'INVOICED')}
                                className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition font-medium"
                                title="Mark as Invoiced (Deducts Stock)"
                              >
                                <FileText size={18} />
                                <span className="text-xs">Invoice</span>
                              </button>
                              {/* ONLY ONE DELETE BUTTON */}
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                                title="Delete (Releases Reserved Stock)"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}

                          {sale.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'INVOICED')}
                                className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition font-medium"
                                title="Mark as Invoiced (No Stock Change)"
                              >
                                <FileText size={18} />
                                <span className="text-xs">Invoice</span>
                              </button>
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                                title="Delete (Returns Stock)"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}

                          {sale.status === 'INVOICED' && (
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                              title="Delete (Returns Stock)"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSales.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results count */}
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSales.length)} of {filteredSales.length} results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
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

        {/* Create/Edit Modal */}
        {showModal && (modalMode === 'create' || modalMode === 'edit') && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Create New Sale' : 'Edit Sale'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Branch *</label>
                    <SearchableDropdown
                      options={branchOptions}
                      value={formData.branchId}
                      onChange={handleBranchChange}
                      placeholder="Select Branch"
                      displayKey="name"
                      valueKey="id"
                      required
                    />
                  </div>

                  {branchInfo && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-1"><strong>Company:</strong> {branchInfo.companyName}</p>
                      <p className="text-sm text-blue-800 mb-1"><strong>TIN:</strong> {branchInfo.tin}</p>
                      <p className="text-sm text-blue-800"><strong>Address:</strong> {branchInfo.fullAddress}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Month *</label>
                      <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        required
                      >
                        {months.map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Year *</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">Items *</label>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition font-medium"
                      >
                        <Plus size={16} />
                        Add Product
                      </button>
                    </div>
                    {formData.items.length === 0 && (
                      <p className="text-sm text-gray-500 italic mb-4 text-center py-4 bg-gray-50 rounded-lg">
                        No products added yet. Click "Add Product" to start.
                      </p>
                    )}
                    {formData.items.map((item, i) => {
                      const stockInfo = branchStocks[item.productId];
                      const availableStock = stockInfo ? stockInfo.availableQuantity : 0;
                      const hasEnoughStock = availableStock >= item.quantity;
                      const isLoadingStock = loadingStocks[item.productId];
                      const stockError = stockErrors[item.productId];

                      return (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                          <div className="flex gap-3 mb-3 items-start">
                            <div className="flex-1">
                              <VariationSearchableDropdown
                                options={productOptions}
                                value={item.productId}
                                onChange={(value) => handleItemChange(i, 'productId', value)}
                                placeholder="Select Product Variation"
                                required
                                formData={formData}
                                index={i}
                              />
                            </div>
                            <div className="w-32">
                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                                placeholder="Quantity"
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition ${!hasEnoughStock && !isLoadingStock && item.quantity > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                  }`}
                                min="0"
                                required
                                disabled={isLoadingStock}
                              />
                              {item.productId && (
                                <div className="text-xs mt-2">
                                  {isLoadingStock ? (
                                    <span className="text-blue-600 flex items-center gap-1">
                                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Loading...
                                    </span>
                                  ) : stockError ? (
                                    <span className="text-orange-600">{stockError}</span>
                                  ) : stockInfo ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className={hasEnoughStock ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        Available Stock: {availableStock}
                                      </div>
                                      {!hasEnoughStock && item.quantity > 0 && (
                                        <div className="text-red-500 font-medium">⚠ Insufficient stock!</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">No stock info</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(i)}
                              className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                              disabled={isLoadingStock}
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
                  >
                    {modalMode === 'create' ? 'Create Sale' : 'Update Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal - Same as before */}
        {showModal && modalMode === 'view' && selectedSale && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900">Sale Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Branch</h3>
                    <p className="text-gray-900 text-lg">{selectedSale.branch.branchName}</p>
                    <p className="text-gray-500">{selectedSale.branch.branchCode}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Company</h3>
                    <p className="text-gray-900 text-lg">{selectedSale.company.companyName}</p>
                    <p className="text-gray-500">TIN: {selectedSale.tin || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Period</h3>
                    <p className="text-gray-900 text-lg">{months[selectedSale.month - 1]} {selectedSale.year}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
                    <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${selectedSale.status === 'INVOICED'
                      ? 'bg-green-100 text-green-800'
                      : selectedSale.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {selectedSale.status}
                    </span>
                    {selectedSale.status === 'INVOICED' && selectedSale.generatedBy && (
                      <p className="text-sm text-gray-600 mt-2">
                        Invoiced by: <span className="font-medium">{selectedSale.generatedBy}</span>
                      </p>
                    )}
                    {selectedSale.status === 'INVOICED' && selectedSale.invoicedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedSale.invoicedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4 text-lg">Items</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Product</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">SKU</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Quantity</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Unit Price</th>
                          <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSale?.items && selectedSale.items.length > 0 ? (
                          selectedSale.items.map((item, i) => (
                            <tr key={item.id || i} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {item.product.productName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {item.product.sku || '—'}
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                                {item.quantity.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-900">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                                {formatCurrency(item.amount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                              No items in this sale
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    Total: {formatCurrency(selectedSale.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Invoice Generation Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Generate Invoice Report</h2>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Company *</label>
                  <SearchableDropdown
                    options={companyOptions}
                    value={filterData.companyId}
                    onChange={(value) => setFilterData({ ...filterData, companyId: value })}
                    placeholder="Select Company"
                    displayKey="name"
                    valueKey="id"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Start Month</label>
                    <select
                      value={filterData.startMonth}
                      onChange={(e) => setFilterData({ ...filterData, startMonth: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    >
                      {monthsFull.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">End Month</label>
                    <select
                      value={filterData.endMonth}
                      onChange={(e) => setFilterData({ ...filterData, endMonth: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    >
                      {monthsFull.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Start Year</label>
                    <input
                      type="number"
                      value={filterData.startYear}
                      onChange={(e) => setFilterData({ ...filterData, startYear: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">End Year</label>
                    <input
                      type="number"
                      value={filterData.endYear}
                      onChange={(e) => setFilterData({ ...filterData, endYear: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Status Filter</label>
                  <select
                    value={filterData.status}
                    onChange={(e) => setFilterData({ ...filterData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  >
                    <option value="">Both (Confirmed & Invoiced)</option>
                    <option value="CONFIRMED">Confirmed Only</option>
                    <option value="INVOICED">Invoiced Only</option>
                  </select>
                </div>
              </div>
              <div className="p-8 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Report Modal */}
        {invoiceReport && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center print:hidden sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-2xl font-bold text-gray-900">Invoice Report</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const newAdjustments = [...(invoiceReport.adjustments || []), { description: '', quantity: 1, unitCost: 0, amount: 0 }];
                      setInvoiceReport({ ...invoiceReport, adjustments: newAdjustments });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <Plus size={18} />
                    Add Adjustment
                  </button>
                  <button
                    onClick={() => setInvoiceReport(null)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div id="invoice-report" className="p-8">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-5 pb-4 border-gray-900">
                  <div className="text-left leading-none space-y-0">
                    {/* Company Name – big and bold */}
                    <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight">
                      WISECART MERCHANTS CORP.
                    </div>

                    {/* Address lines – ultra-tight spacing */}
                    <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
                      <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                      <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                      <div>VAT REG. TIN 010-751-561-00000</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block text-left leading-none">
                      <div className="text-3xl font-bold text-gray-900 tracking-widest">
                        SALES
                      </div>
                      <div className="text-3xl font-bold text-gray-900 tracking-widest -mt-2">
                        INVOICE
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      NO. _____________
                    </div>
                  </div>
                </div>

                {/* Checkboxes and Date Section */}
                <div className="flex justify-between items-center mb-2 mt-11">
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" className="w-6 h-6 border-2 border-gray-900" />
                      {' '}
                      CASH SALES
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" className="w-6 h-6 border-2 border-gray-900" />
                      {' '}
                      CHARGE SALES
                    </label>
                  </div>
                  <div className="text-right">
                    <div className="text-black-900">
                      <span className="print-hidden">DATE: </span>
                      <span className="print-visible">{formatDate(invoiceReport.generatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-1 border-gray-900 p-3 mb-1.5" style={{ height: '165px' }}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center mb-1.5">
                      <span className="font-bold text-gray-900 w-48">SOLD TO:</span>
                      <span className="text-black-900 flex-1 print-visible">
                        {invoiceReport.soldTo || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center mb-1.5">
                      <span className="font-bold text-gray-900 w-48">REGISTERED NAME:</span>
                      <span className="text-black-900 flex-1 print-visible">
                        {invoiceReport.registeredName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center mb-1.5">
                      <span className="font-bold text-gray-900 w-48">TIN:</span>
                      <span className="text-black-900 flex-1 print-visible">
                        {invoiceReport.tin || 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                      <div className="font-bold text-black-900 pt-1 self-start">
                        BUSINESS ADDRESS:
                      </div>

                      <div className="text-black-900 -mt-1 leading-[1.1] tracking-tight print-visible">
                        {invoiceReport.businessAddress || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-1 border-b-0 border-gray-900">
                  <table className="w-full" style={{ minHeight: '150mm' }}>
                    <thead>
                      <tr className="border-b border-gray-900">
                        <th
                          className="text-left px-4 font-bold text-gray-900 text-sm leading-tight"
                          style={{ width: '60%' }}
                        >
                          ITEM DESCRIPTION / NATURE OF SERVICE
                        </th>
                        <th
                          className="text-right px-4 font-bold text-gray-900 text-sm leading-tight"
                          style={{ width: '12%' }}
                        >
                          QTY.
                        </th>
                        <th
                          className="text-right px-4 text-gray-900 text-xs text-[11px] leading-tight"
                          style={{ width: '12%' }}
                        >
                          UNIT COST / PRICE
                        </th>
                        <th
                          className="text-right px-4 font-bold text-gray-900 text-sm leading-tight"
                          style={{ width: '15%' }}
                        >
                          AMOUNT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceReport.products.map((product, i) => (
                        <tr key={i} className="align-top">
                          <td className="py-2 px-4 text-sm text-gray-900">{product.productName}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-900">{product.totalQuantity.toLocaleString()}</td>
                          <td className="py-2 px-4 text-right  text-sm text-gray-900">
                            {formatCurrency(product.totalAmount / product.totalQuantity)}
                          </td>
                          <td className="py-2 px-4 text-right text-sm text-gray-900">
                            {formatCurrency(product.totalAmount)}
                          </td>
                        </tr>
                      ))}

                      {/* Adjustments Section */}
                      {invoiceReport.adjustments && invoiceReport.adjustments.length > 0 && (
                        <>
                          {invoiceReport.adjustments.map((adj, i) => (
                            <tr key={`adj-${i}`} className="align-top print:break-inside-avoid">
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={adj.description}
                                  onChange={(e) => {
                                    const newAdj = [...invoiceReport.adjustments];
                                    newAdj[i].description = e.target.value;
                                    setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                                  }}
                                  placeholder="Adjustment description..."
                                  className="w-full text-sm text-gray-900 border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 print:border-0 print:p-0"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={adj.quantity}
                                  onChange={(e) => {
                                    const newAdj = [...invoiceReport.adjustments];
                                    newAdj[i].quantity = parseFloat(e.target.value) || 0;
                                    newAdj[i].amount = newAdj[i].quantity * newAdj[i].unitCost;
                                    setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                                  }}
                                  className="w-full text-sm text-gray-900 text-right border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 print:border-0 print:p-0"
                                />
                              </td>
                              <td className="py-1 px-2 ">
                                <input
                                  type="number"
                                  value={adj.unitCost}
                                  onChange={(e) => {
                                    const newAdj = [...invoiceReport.adjustments];
                                    newAdj[i].unitCost = parseFloat(e.target.value) || 0;
                                    newAdj[i].amount = newAdj[i].quantity * newAdj[i].unitCost;
                                    setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                                  }}
                                  className="w-full text-sm text-gray-900 text-right border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 mx-4 print:border-0 print:p-0"
                                />
                              </td>
                              <td className="py-2 px-4 text-right relative">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-gray-900 flex-1 text-right">
                                    {formatCurrency(adj.amount)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const newAdj = invoiceReport.adjustments.filter((_, idx) => idx !== i);
                                      setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                                    }}
                                    className="print:hidden p-1 text-red-600 hover:bg-red-50 rounded transition"
                                    title="Remove adjustment"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {/* This pushes content to top and lets table expand downward */}
                      <tr className="h-full">
                        <td colSpan={4} className="p-0"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-6 border-1 border-gray-900 text-sm">
                  <div className="col-span-2 grid grid-cols-2">
                    <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[13px]">
                      <div className="mb-2">Vatable Sales:</div>
                      <div className="mb-2">VAT:</div>
                      <div className="mb-2">Zero-Rated Sales:</div>
                      <div className="">VAT-Exempt Sales:</div>
                    </div>
                    <div className="border-r-1 border-gray-900 px-4 py-3 flex flex-col justify-start text-[15px]">
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          return ((invoiceReport.vatableSales || 0) + adjustmentTotal);
                        })()
                      )} className="w-full text-right pb-0 mb-2" />
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          const vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
                          return vatableSales * 0.12;
                        })()
                      )} className="w-full text-right pb-0 mb-2" />
                      <input readOnly value={formatCurrency(invoiceReport.zeroRatedSales || 0)} className="w-full text-right pb-0 mb-2" />
                      <input readOnly value={formatCurrency(invoiceReport.vatExemptSales || 0)} className="w-full text-right pb-0" />
                    </div>
                  </div>
                  {/* BOX 3 — SC/PWD Labels */}
                  <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[11px]">
                    <div className="font-medium leading-tight">
                      SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:
                    </div>
                    <div className="font-medium leading-tight mt-9">
                      SC/PWD/NAAC/MOV/<br />Signature:
                    </div>
                  </div>
                  {/* BOX 4 — SC/PWD Input Fields */}
                  <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[13px]">
                    <input type="text" className="w-full pb-0 text-sm -mt-1" />
                    <input type="text" className="w-full pb-0 text-sm mt-5" />
                  </div>

                  <div className="col-span-2 grid grid-cols-2">
                    {/* Labels */}
                    <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                      <div className="mb-2 text-[9px]">TOTAL SALES (VAT Inclusive)</div>
                      <div className="mb-2">Less: VAT</div>
                      <div className="mb-2">Amount: Net of VAT</div>
                      <div className="">Less: Discount<br /><span className="text-[10px]">(SC/PWD/NAAC/MOV/SP)</span></div>
                    </div>
                    {/* Calculated Amounts */}
                    <div className="px-4 border-1 flex flex-col justify-start border-t-0 border-l-0 border-r-0 pt-2">
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          return (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
                        })()
                      )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          const vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
                          return vatableSales * 0.12;
                        })()
                      )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          return (invoiceReport.netOfVat || 0) + adjustmentTotal;
                        })()
                      )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                      <input readOnly value={formatCurrency(invoiceReport.discount || 0)} className="w-full text-right pb-0 text-[15px]" />
                    </div>
                  </div>
                </div>


                {/* New Box Below - Spans 6 columns - UPDATED WITH REAL CALCULATIONS */}
                <div className="grid grid-cols-6  border-t-0 border-gray-900 text-sm">
                  {/* Left section with checkbox - spans 4 columns */}
                  <div className="col-span-4 border-r-1 border-gray-900 px-4  ">
                    <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" className="w-6 h-6  mt-8" />
                      <div>
                        <div className="mb-8 mt-8">Received the amount of</div>
                        <div className="border-b border-gray-900 mt-1 w-full"></div>
                      </div>
                    </label>
                  </div>

                  {/* Right section with labels and amounts - spans 2 columns */}
                  <div className="col-span-2 grid grid-cols-2">
                    {/* Labels */}
                    <div className=" border-l-0 border-1 border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                      <div className="mb-2">Add: VAT</div>
                      <div className="mb-2">Less: Withholding Tax</div>
                      <div className="" >Total Amount Due:</div>
                    </div>
                    {/* Calculated Amounts */}
                    <div className="px-4 border-1 flex flex-col justify-start border-t-0 border-l-0 pt-2">
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          const vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
                          return vatableSales * 0.12;
                        })()
                      )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          const netOfVat = (invoiceReport.netOfVat || 0) + adjustmentTotal;
                          return netOfVat * 0.01;
                        })()
                      )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                      <input readOnly value={formatCurrency(
                        (() => {
                          const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                          const totalSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
                          const netOfVat = (invoiceReport.netOfVat || 0) + adjustmentTotal;
                          const withholdingTax = netOfVat * 0.01;
                          return totalSales - withholdingTax;
                        })()
                      )} className="w-full text-right font-bold pb-0 text-[16px]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-1 border-t-1 border-gray-900 text-sm mt-6">
                  {/* Left section - Permit Info */}
                  <div className="border-gray-900 px-4 py-2">
                    <div className="font-medium  text-m text-[16px]">PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002</div>
                    <div className="font-medium text-m text-[16px]" >DATE ISSUED: OCT. 11, 2024</div>
                  </div>

                  {/* Right section - BIR Authority Info */}
                  <div className="px-4 py-2 pb-4">
                    <div className="font-medium  text-[16px] text-m ">BIR AUTHORITY TO PRINT No. 080AU20240000016398</div>
                    <div className="font-medium  text-[16px] text-m">DATE ISSUED: OCT. 23, 2024</div>
                    <div className="font-medium  text-[16px] text-m">APPROVED SERIES: 0501-1500 • 20PADS (2X)</div>
                  </div>
                </div>

              </div>

              <div className="p-8 border-t border-gray-200 flex justify-end gap-4 print:hidden sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
                >
                  <Printer size={20} />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setInvoiceReport(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Sales Memo Modal */}
        {salesMemo && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center print:hidden">
                <h2 className="text-2xl font-bold text-gray-900">Sales Memo</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const newAdj = [...(salesMemo.adjustments || []), { description: '', quantity: 1, unitCost: 0, amount: 0 }];
                      setSalesMemo({ ...salesMemo, adjustments: newAdj });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <Plus size={18} />
                    Add Adjustment
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setSalesMemo(null)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div id="sales-memo" className="p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold">SALES MEMO</h1>
                  <p className="text-sm text-gray-600">
                    {formatDate(salesMemo.generatedAt)}
                  </p>
                </div>

                {/* Customer Info */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold">Customer:</label>
                      <p>{salesMemo.soldTo}</p>
                    </div>
                    <div>
                      <label className="font-bold">Address:</label>
                      <p>{salesMemo.businessAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <table className="w-full border-collapse border border-gray-300 mb-6">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Price</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Unit Cost</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Cost of Sales</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesMemo.products.map((product, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-4 py-2">{product.description}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{product.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₱{formatCurrency(product.price)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₱{formatCurrency(product.unitCost)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₱{formatCurrency(product.costOfSales)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">₱{formatCurrency(product.sales)}</td>
                      </tr>
                    ))}

                    {/* Adjustments */}
                    {salesMemo.adjustments && salesMemo.adjustments.map((adj, i) => (
                      <tr key={`adj-${i}`}>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="text"
                            value={adj.description}
                            onChange={(e) => {
                              const newAdj = [...salesMemo.adjustments];
                              newAdj[i].description = e.target.value;
                              setSalesMemo({ ...salesMemo, adjustments: newAdj });
                            }}
                            className="w-full print:border-0"
                            placeholder="Adjustment..."
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            value={adj.quantity}
                            onChange={(e) => {
                              const newAdj = [...salesMemo.adjustments];
                              newAdj[i].quantity = parseFloat(e.target.value) || 0;
                              newAdj[i].costOfSales = newAdj[i].quantity * newAdj[i].unitCost;
                              newAdj[i].sales = newAdj[i].quantity * newAdj[i].price;
                              setSalesMemo({ ...salesMemo, adjustments: newAdj });
                            }}
                            className="w-full text-right print:border-0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            value={adj.price || 0}
                            onChange={(e) => {
                              const newAdj = [...salesMemo.adjustments];
                              newAdj[i].price = parseFloat(e.target.value) || 0;
                              newAdj[i].sales = newAdj[i].quantity * newAdj[i].price;
                              setSalesMemo({ ...salesMemo, adjustments: newAdj });
                            }}
                            className="w-full text-right print:border-0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            value={adj.unitCost || 0}
                            onChange={(e) => {
                              const newAdj = [...salesMemo.adjustments];
                              newAdj[i].unitCost = parseFloat(e.target.value) || 0;
                              newAdj[i].costOfSales = newAdj[i].quantity * newAdj[i].unitCost;
                              setSalesMemo({ ...salesMemo, adjustments: newAdj });
                            }}
                            className="w-full text-right print:border-0"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ₱{formatCurrency(adj.costOfSales || 0)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ₱{formatCurrency(adj.sales || 0)}
                          <button
                            onClick={() => {
                              const newAdj = salesMemo.adjustments.filter((_, idx) => idx !== i);
                              setSalesMemo({ ...salesMemo, adjustments: newAdj });
                            }}
                            className="print:hidden ml-2 text-red-600"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan="4" className="border border-gray-300 px-4 py-2 text-right">SUBTOTAL:</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        ₱{formatCurrency(
                          salesMemo.products.reduce((sum, p) => sum + p.costOfSales, 0) +
                          (salesMemo.adjustments || []).reduce((sum, a) => sum + (a.costOfSales || 0), 0)
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        ₱{formatCurrency(
                          salesMemo.products.reduce((sum, p) => sum + p.sales, 0) +
                          (salesMemo.adjustments || []).reduce((sum, a) => sum + (a.sales || 0), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Tax Calculations */}
                <div className="grid grid-cols-2 gap-8">
                  <div></div>
                  <div className="space-y-2">
                    {(() => {
                      const subtotal = salesMemo.products.reduce((sum, p) => sum + p.sales, 0) +
                        (salesMemo.adjustments || []).reduce((sum, a) => sum + (a.sales || 0), 0);
                      const vatableSales = subtotal / 1.12;
                      const vat = vatableSales * 0.12;
                      const withholdingTax = vatableSales * 0.01;
                      const total = subtotal - withholdingTax;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Vatable Sales:</span>
                            <span>₱{formatCurrency(vatableSales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Value Added Tax:</span>
                            <span>₱{formatCurrency(vat)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Creditable Withholding Tax:</span>
                            <span>₱{formatCurrency(withholdingTax)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                            <span>TOTAL:</span>
                            <span>₱{formatCurrency(total)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showSalesMemoModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="p-8 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Generate Sales Memo</h2>
              <button
                onClick={() => setShowSalesMemoModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Company *</label>
                <select
                  value={filterData.companyId}
                  onChange={(e) => setFilterData({ ...filterData, companyId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Start Month</label>
                  <select
                    value={filterData.startMonth}
                    onChange={(e) => setFilterData({ ...filterData, startMonth: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  >
                    {monthsFull.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">End Month</label>
                  <select
                    value={filterData.endMonth}
                    onChange={(e) => setFilterData({ ...filterData, endMonth: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  >
                    {monthsFull.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Start Year</label>
                  <input
                    type="number"
                    value={filterData.startYear}
                    onChange={(e) => setFilterData({ ...filterData, startYear: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">End Year</label>
                  <input
                    type="number"
                    value={filterData.endYear}
                    onChange={(e) => setFilterData({ ...filterData, endYear: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => setShowSalesMemoModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSalesMemo}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium shadow-md"
              >
                Generate Sales Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;
