import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import '../styles/invoice-print.css';
import { api } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Eye, FileText, Check, X, Printer, ChevronDown, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import InvoicingProfile from './InvoicingProfile';
import '../styles/sales-memo-print.css';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import VariationSearchableDropdown from '../components/common/VariationSearchableDropdown';
import Pagination from '../components/common/Pagination';



const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0.00';
  return Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPHDateTime = (dateString) => {
  if (!dateString) return '';
  const normalized = dateString.includes('+') || dateString.endsWith('Z')
    ? dateString
    : dateString + '+08:00';
  return new Date(normalized).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
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


const makeStockKey = (productId, variationId, branchId) =>
  `${productId}_${variationId ?? 'base'}_${branchId}`;

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.data && Array.isArray(res.data.content)) return res.data.content;
  if (res && Array.isArray(res.content)) return res.content;
  // If we got here, return empty array
  return [];
};

let salesCache = null;
let salesCacheTime = 0;
const SALES_CACHE_TTL = 300_000;
let sseRefreshTimer = null;



const invalidateSalesCache = () => {
  salesCache = null;
  salesCacheTime = 0;
};

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


const SalesManagement = () => {
  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [showInvoicingProfile, setShowInvoicingProfile] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceSubmitted, setInvoiceSubmitted] = useState(false);
  const [taxType, setTaxType] = useState('VAT');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingStocks, setLoadingStocks] = useState({});
  const [stockErrors, setStockErrors] = useState({});
  const [originalSaleItems, setOriginalSaleItems] = useState([]);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [formData, setFormData] = useState({
    branchId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: [],
    createdBy: ''
  });




  const [filterData, setFilterData] = useState({
    companyId: '',
    branchId: '',
    status: '',
    startMonth: new Date().getMonth() + 1,
    endMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    productId: '',
    variationId: '',
    productName: '',
    productFilters: []
  });

  const fetchSales = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page,
        size: 10,
        ...(filterData.companyId && { companyId: filterData.companyId }),
        ...(filterData.branchId && { branchId: filterData.branchId }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(searchTerm && { searchTerm: searchTerm }),
      });
      if (filterData.productFilters && filterData.productFilters.length > 0) {
        filterData.productFilters.forEach(pf => {
          if (pf.productId) params.append('productIds', pf.productId);
          if (pf.variationId) params.append('variationIds', pf.variationId);
        });
      }

      const response = await api.get(`/sales/all?${params}`);
      setSales(response.data.content);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage + 1);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [filterData.companyId, filterData.branchId, statusFilter, searchTerm, filterData.productFilters]);

  const staticDataLoaded = useRef(false);


  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);

    await fetchSales(currentPage - 1);

    if (!staticDataLoaded.current) {
      staticDataLoaded.current = true;

      try {
        const results = await Promise.all([
          api.get('/branches').catch(() => ({ success: false, data: [] })),
          api.get('/companies').catch(() => ({ success: false, data: [] })),
          api.get('/products').catch(() => ({ success: false, data: [] })),
          api.get('/inventories').catch(() => ({ success: false, data: [] })),
          api.get('/warehouse').catch(() => ({ success: false, data: [] })),
          api.get('/stocks/warehouses').catch(() => ({ success: false, data: [] })),
          api.get('/inventories/products/summary').catch(() => ({ success: false, data: [] }))
        ]);

        // Extract data, ensuring we always get arrays
        const branchesData = extractArray(results[0]);
        const companiesData = extractArray(results[1]);
        const productsData = extractArray(results[2]);
        console.log('Products data:', productsData);
        const inventoriesData = extractArray(results[3]);
        const warehousesData = extractArray(results[4]);
        const warehouseStocksData = extractArray(results[5]);
        const productSummariesData = extractArray(results[6]);

        // Always set to arrays, never undefined
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setInventories(Array.isArray(inventoriesData) ? inventoriesData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setWarehouseStocks(Array.isArray(warehouseStocksData) ? warehouseStocksData : []);
        setProductSummaries(Array.isArray(productSummariesData) ? productSummariesData : []);

      } catch (error) {
        console.error('Error loading static data:', error);
        // Set empty arrays on error to prevent crashes
        setBranches([]);
        setCompanies([]);
        setProducts([]);
        setInventories([]);
        setWarehouses([]);
        setWarehouseStocks([]);
        setProductSummaries([]);
      }
    }

    setLoading(false);
  }, [currentPage, filterData, statusFilter, searchTerm]);


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchSales(0);
    setCurrentPage(1);
  }, [filterData.companyId, filterData.branchId, statusFilter, searchTerm, JSON.stringify(filterData.productFilters)]);

  useEffect(() => {
    fetchSales(currentPage - 1);
  }, [currentPage]);

  useEffect(() => {
    let es;
    let retryDelay = 5000;
    let retryTimeout;

    const connect = () => {
      es = new EventSource('https://backend.wisecart.ph/api/sales/stream');

      es.addEventListener('connected', () => {
        retryDelay = 3000;
      });

      es.addEventListener('sales-update', () => {
        invalidateSalesCache();
        if (sseRefreshTimer) clearTimeout(sseRefreshTimer);
        sseRefreshTimer = setTimeout(() => {
          fetchSales(currentPage - 1);
        }, 800);
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 60000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      if (es) es.close();
    };
  }, [loadData]);


  const loadProductPricesForCompany = async (companyId) => {
    if (!companyId) {
      setProductPrices({});
      return;
    }
    try {
      const response = await api.get(`/sales/product-prices?companyId=${companyId}`);
      if (response.success) {
        setProductPrices(response.data || {});
      }
    } catch (error) {
      console.warn('Could not load product prices:', error);
      setProductPrices({});
    }
  };

  const handleOpenModal = async (mode, sale = null) => {
    setModalMode(mode);
    setLoadingStocks({});
    setStockErrors({});

    if (mode === 'edit' && sale) {
      if (sale.status !== 'PENDING') {
        alert(`Cannot edit sale that is ${sale.status}. Only PENDING sales can be edited.`);
        return;
      }
    }

    if (mode === 'create') {
      setSelectedSale(null);
      setFormData({
        branchId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        items: [],
        createdBy: ''
      });
      setBranchInfo(null);
      setBranchStocks({});
      setSelectedProductForAdd('');
    } else if (mode === 'edit' && sale) {
      setSelectedSale(sale);
      setFormData({
        branchId: sale.branch.id,
        month: sale.month,
        year: sale.year,
        items: [...sale.items]
          .sort((a, b) => a.id - b.id)
          .map(item => ({
            productId: item.product.id,
            variationId: item.variation?.id || null,
            quantity: item.quantity || 1
          })),
        createdBy: sale.createdBy || ''
      });

      setOriginalSaleItems([...sale.items]
        .sort((a, b) => a.id - b.id)
        .map(item => ({
          productId: item.product.id,
          variationId: item.variation?.id || null,
          quantity: item.quantity || 1
        })));

      const loadingToast = toast.loading('Loading sale data and stock information...');

      try {
        const info = await api.get(`/sales/branch-info/${sale.branch.id}`);
        if (info.success) {
          setBranchInfo(info.data);

          const stockMap = {};
          const errors = {};

          // Run product prices + all stock fetches in parallel
          const [stockResults] = await Promise.all([
            Promise.all(
              sale.items.map(async (item) => {
                const variationId = item.variation?.id || null;
                const stockKey = makeStockKey(item.product.id, variationId, sale.branch.id);
                const endpoint = variationId
                  ? `/stocks/branches/${sale.branch.id}/products/${item.product.id}/variations/${variationId}`
                  : `/stocks/branches/${sale.branch.id}/products/${item.product.id}`;
                try {
                  const stock = await api.get(endpoint);
                  return { stockKey, data: stock.success ? stock.data : { quantity: 0, availableQuantity: 0 }, error: null };
                } catch {
                  return { stockKey, data: { quantity: 0, availableQuantity: 0 }, error: 'Failed to load stock' };
                }
              })
            ),
            loadProductPricesForCompany(info.data?.companyId),
          ]);

          stockResults.forEach(({ stockKey, data, error }) => {
            stockMap[stockKey] = data;
            if (error) errors[stockKey] = error;
          });


          setBranchStocks(stockMap);
          setStockErrors(errors);
          toast.success('Sale data loaded successfully!', { id: loadingToast });
        }
      } catch (error) {
        console.error('Failed to load branch info');
        toast.error('Failed to load sale data', { id: loadingToast });
      }
    } else if (mode === 'view' && sale) {
      setSelectedSale(sale);
      setShowModal(true);
    }
    setShowModal(true);
  };


  const getMaxAllowedQuantity = (item, stockInfo, oldItem) => {
    if (!stockInfo) return undefined;
    const currentAvailable = stockInfo.availableQuantity || 0;
    const originalReserved = oldItem ? oldItem.quantity : 0;
    return currentAvailable + originalReserved;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
    setBranchInfo(null);
  };

  const handleBranchChange = async (branchId) => {
    setFormData({ ...formData, branchId, items: [] });
    if (branchId) {
      const loadingToast = toast.loading('Loading branch information...');

      try {
        const info = await api.get(`/sales/branch-info/${branchId}`);
        if (info.success) {
          setBranchInfo(info.data);
          await loadProductPricesForCompany(info.data?.companyId);
          setBranchStocks({});
          setStockErrors({});
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


  const loadProductStock = async (productId, branchId, variationId) => {
    if (!branchId || !productId) return;

    const stockKey = makeStockKey(productId, variationId, branchId);

    setLoadingStocks(prev => ({ ...prev, [stockKey]: true }));
    setStockErrors(prev => ({ ...prev, [stockKey]: null }));

    try {
      const endpoint = variationId
        ? `/stocks/branches/${branchId}/products/${productId}/variations/${variationId}`
        : `/stocks/branches/${branchId}/products/${productId}`;

      const stock = await api.get(endpoint);
      const stockData = stock.success ? stock.data : stock;

      setBranchStocks(prev => ({
        ...prev,
        [stockKey]: stockData || { quantity: 0, availableQuantity: 0 },
      }));
    } catch (error) {
      console.error('Failed to load stock for product:', productId, 'variation:', variationId);
      setBranchStocks(prev => ({
        ...prev,
        [stockKey]: { quantity: 0, availableQuantity: 0 },
      }));
      setStockErrors(prev => ({
        ...prev,
        [stockKey]: 'Failed to load stock',
      }));
    } finally {
      setLoadingStocks(prev => ({ ...prev, [stockKey]: false }));
    }
  };

  const handleAddProductToTable = async () => {
    if (!selectedProductForAdd) {
      toast.error('Please select a product first');
      return;
    }

    if (!formData.branchId) {
      toast.error('Please select a branch first');
      return;
    }

    const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
    if (!selectedOption) {
      toast.error('Selected product not found');
      return;
    }

    const exists = formData.items.some(item =>
      item.productId === selectedOption.parentProductId &&
      item.variationId === (selectedOption.variationId || null)
    );

    if (exists) {
      toast.error('This product is already in the list');
      return;
    }

    const newItem = {
      productId: selectedOption.parentProductId,
      variationId: selectedOption.variationId || null,
      quantity: 1
    };

    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    await loadProductStock(
      selectedOption.parentProductId,
      formData.branchId,
      selectedOption.variationId || null,
    );

    setSelectedProductForAdd('');
    toast.success('Product added to list');
  };


  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];

    if (field === 'quantity') {
      newItems[index][field] = parseInt(value) || 0;
    } else if (field === 'productId' && value) {
      const selectedProduct = productOptions.find(p => p.id === value);

      if (selectedProduct) {
        const productId = selectedProduct.parentProductId;
        const variationId = selectedProduct.variationId || null;

        newItems[index].productId = productId;
        newItems[index].variationId = variationId;

        setFormData({ ...formData, items: newItems });

        if (formData.branchId) {
          await loadProductStock(productId, formData.branchId, variationId);
        }
        return;
      }
    } else {
      newItems[index][field] = value;
    }

    setFormData({ ...formData, items: newItems });
  };


  const handleGenerateToProfile = async () => {
    if (!invoiceReport) return;
    const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);

    let vatableSales, vat, wht, totalAmountDue;

    if (taxType === 'VAT') {
      vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
      vat = vatableSales * 0.12;
      const totalVatIncl = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      wht = vatableSales * 0.01;
      totalAmountDue = totalVatIncl - wht;
    } else {
      // PT mode
      const grossSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      vatableSales = grossSales;
      vat = grossSales * 0.03;
      wht = (grossSales / 1.12) * 0.01;
      totalAmountDue = grossSales - wht;
    }

    const productItems = (invoiceReport.products || []).map(product => ({
      productName: product.productName,
      variationDisplay: product.variation
        ? (product.variation.combinationDisplay ||
          `${product.variation.variationType}: ${product.variation.variationValue}`)
        : null,
      upc: product.variation ? (product.variation.upc || null) : null,
      totalQuantity: product.totalQuantity,
      unitCost: product.totalAmount / product.totalQuantity,
      totalAmount: product.totalAmount,
    }));

    const adjustmentItems = (invoiceReport.adjustments || [])
      .filter(adj => adj.description && adj.amount)
      .map(adj => ({
        productName: adj.description,
        variationDisplay: 'Adjustment',
        upc: null,
        totalQuantity: adj.quantity || 1,
        unitCost: adj.unitCost || 0,
        totalAmount: adj.amount || 0,
      }));

    const payload = {
      companyId: filterData.companyId || null,
      branchId: filterData.branchId || null,
      startMonth: filterData.startMonth || null,
      endMonth: filterData.endMonth || null,
      startYear: filterData.startYear || null,
      endYear: filterData.endYear || null,
      soldTo: invoiceReport.soldTo || '',
      registeredName: invoiceReport.registeredName || invoiceReport.soldTo || '',
      tin: invoiceReport.tin || '',
      businessAddress: invoiceReport.businessAddress || '',
      vatableSales, vat, withholdingTax: wht, totalAmountDue,
      transactionType: taxType === 'PT' ? 'Sales Invoice (PT)' : 'Sales Invoice',
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      items: [...productItems, ...adjustmentItems],
    };
    try {
      const res = await api.post('/invoice-profiles', payload);
      if (res.success) {
        toast.success('Invoice saved to Sales Journal!');
        setInvoiceReport(null);
        setShowInvoicingProfile(true);
      } else {
        toast.error(res.error || 'Failed to save to Sales Journal');
      }
    } catch (e) {
      toast.error('Failed to save to Sales Journal');
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

    handleCloseModal();

    const toastId = toast.loading(modalMode === 'create' ? 'Creating sale...' : 'Updating sale...');

    try {
      if (modalMode === 'create') {
        const response = await api.post('/sales', formData);
        if (response.success) {
          toast.success('Sale created successfully!', { id: toastId });
          invalidateSalesCache();
          setCurrentPage(1);
          await fetchSales(0);
        } else {
          toast.error(response.message || 'Failed to create sale', { id: toastId });
        }
      } else if (modalMode === 'edit') {
        const response = await api.put(`/sales/${selectedSale.id}`, formData);
        if (response.success) {
          toast.success('Sale updated successfully!', { id: toastId });
          invalidateSalesCache();
          // Stay on same page, just refresh
          fetchSales(currentPage - 1);
        } else {
          toast.error(response.message || 'Failed to update sale', { id: toastId });
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save sale';
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleFilterSales = async () => {
    try {
      setActionLoading(true);
      setLoadingMessage('Filtering sales...');

      const params = new URLSearchParams();
      if (filterData.companyId) params.append('companyId', filterData.companyId);
      if (filterData.branchId) params.append('branchId', filterData.branchId);
      if (filterData.status) params.append('status', filterData.status);
      if (filterData.startDate) params.append('startDate', filterData.startDate);
      if (filterData.endDate) params.append('endDate', filterData.endDate);

      const response = await api.get('/sales/all?page=0&size=50&sort=createdAt,desc');
      const allData = extractArray(response);
      setSales(allData);
      toast.success(`Loaded ${allData.length} sales`);
      setCurrentPage(1);
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
          const selectedCompany = companies.find(c => c.id === filterData.companyId);
          const selectedBranch = filterData.branchId ? branches.find(b => b.id === filterData.branchId) : null;

          toast.error(
            `No sales data found for invoice generation!\n\n` +
            `Company: ${selectedCompany?.companyName || 'Unknown'}\n` +
            `${selectedBranch ? `Branch: ${selectedBranch.branchName}\n` : 'All Branches\n'}` +
            `Period: ${monthsFull[filterData.startMonth - 1]} ${filterData.startYear} - ${monthsFull[filterData.endMonth - 1]} ${filterData.endYear}\n\n` +
            `Please ensure:\n` +
            `• Sales exist for the selected company\n` +
            `• Sales are CONFIRMED or INVOICED\n` +
            `• Date range includes sales data`,
            { duration: 8000 }
          );
          return;
        }

        invoiceData.adjustments = invoiceData.adjustments || [];

        const company = companies.find(c => c.id === filterData.companyId);
        if (filterData.branchId) {
          const branch = branches.find(b => b.id === filterData.branchId);
          if (branch) {
            invoiceData.soldTo = branch.branchName;
            invoiceData.registeredName = company?.companyName || branch.branchName;
            invoiceData.tin = branch.tin || invoiceData.tin || 'N/A';
            invoiceData.businessAddress =
              branch.fullAddress ||
              [branch.address, branch.city, branch.province].filter(Boolean).join(', ') ||
              invoiceData.businessAddress ||
              'N/A';
          }
        } else {
          if (company) {
            invoiceData.soldTo = company.companyName;
            invoiceData.registeredName = company.companyName;
            invoiceData.tin = company.tin || invoiceData.tin || 'N/A';
            invoiceData.businessAddress =
              company.fullAddress ||
              [company.address, company.city, company.province]
                .filter(Boolean)
                .join(', ') ||
              company.businessAddress ||
              invoiceData.businessAddress ||
              'N/A';
          }
        }

        setInvoiceReport(invoiceData);
        setShowInvoiceModal(false);

        toast.success(
          `Invoice generated successfully!\n\n` +
          `Products: ${invoiceData.products.length}\n` +
          `Total: ₱${formatCurrency(invoiceData.totalSalesVatInclusive)}\n` +
          `Date: ${formatDate(invoiceData.generatedAt)}`,
          { duration: 4000 }
        );


      } else {
        toast.error('Failed to generate invoice', { duration: 5000 });
      }
    } catch (error) {
      toast.dismiss('invoice-loading');
      console.error('Invoice generation error:', error);

      let errorMessage = 'Failed to generate invoice';

      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;

          if (errorMessage.includes('No CONFIRMED or INVOICED sales found') ||
            errorMessage.includes('No sales found')) {
            const selectedCompany = companies.find(c => c.id === filterData.companyId);
            const selectedBranch = filterData.branchId ? branches.find(b => b.id === filterData.branchId) : null;

            toast.error(
              `No CONFIRMED or INVOICED sales found!\n\n` +
              `Company: ${selectedCompany?.companyName || 'Unknown'}\n` +
              `${selectedBranch ? `Branch: ${selectedBranch.branchName}\n` : 'All Branches\n'}` +
              `Period: ${monthsFull[filterData.startMonth - 1]} ${filterData.startYear} - ${monthsFull[filterData.endMonth - 1]} ${filterData.endYear}\n\n` +
              `Please ensure sales are CONFIRMED or INVOICED before generating the invoice.`,
              { duration: 8000 }
            );
            return;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

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
        invalidateSalesCache();
        await fetchSales(currentPage - 1);
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
        invalidateSalesCache();
        await fetchSales(currentPage - 1);
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
      startMonth: new Date().getMonth() + 1,
      endMonth: new Date().getMonth() + 1,
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      productId: '',
      variationId: '',
      productName: '',
      productFilters: []
    });
    setStatusFilter('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };


  const handleCompanyFilterChange = (value) => {
    setFilterData({ ...filterData, companyId: value });
    setCurrentPage(1);
    if (value && filterData.branchId) {
      const selectedBranch = branches.find(b => b.id === filterData.branchId);
      if (selectedBranch && selectedBranch.company?.id !== value) {
        setFilterData(prev => ({ ...prev, branchId: '' }));
      }
    }
  };


  const currentSales = Array.isArray(sales) ? sales : [];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const branchOptions = Array.isArray(branches) ? branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` })) : [];
  const companyOptions = Array.isArray(companies) ? companies.map(c => ({
    id: c.id,
    name: c.companyName || c.name
  })) : [];

  const filteredBranchOptions = filterData.companyId && Array.isArray(branches)
    ? branches
      .filter(b => b.company?.id === filterData.companyId)
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;



  const allProductOptions = useMemo(() => {
    try {
      // Ultimate safety check - ensure products is an array
      if (!products || !Array.isArray(products) || products.length === undefined) {
        console.warn('allProductOptions: products is not a valid array', products);
        return [];
      }

      return products.flatMap(p => {
        if (!p) return [];
        if (p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
          return p.variations.filter(Boolean).map(v => {
            const companySkus = {};
            if (v.companyPrices && Array.isArray(v.companyPrices)) {
              v.companyPrices.filter(Boolean).forEach(cp => {
                if (cp?.company?.id != null) {
                  companySkus[cp.company.id] = cp.companySku ?? '';
                }
              });
            }
            return {
              id: `${p.id}_${v.id}`,
              parentProductId: p.id,
              variationId: v.id,
              name: p.productName || '',
              fullName: p.productName || '',
              subLabel: v.combinationDisplay || 'Variation',
              upc: v.upc || '',
              sku: v.sku || '',
              isVariation: true,
              companySkus,
            };
          });
        }
        const companySkus = {};
        if (p.companyBasePrices && Array.isArray(p.companyBasePrices)) {
          p.companyBasePrices.filter(Boolean).forEach(cbp => {
            if (cbp?.company?.id != null) {
              companySkus[cbp.company.id] = cbp.companySku ?? '';
            }
          });
        }
        return [{
          id: `prod_${p.id}`,
          parentProductId: p.id,
          variationId: null,
          name: p.productName || '',
          fullName: p.productName || '',
          subLabel: 'No variations',
          upc: p.upc || '',
          sku: p.sku || '',
          isVariation: false,
          companySkus,
        }];
      });
    } catch (e) {
      console.error('allProductOptions error:', e);
      return [];
    }
  }, [products]);

  const productOptions = useMemo(() => {
    // Ultimate safety check at the beginning
    if (!products || !Array.isArray(products) || products.length === undefined) {
      console.warn('productOptions: products is not a valid array', products);
      return [];
    }

    return products.flatMap(p => {
      if (!p) return [];
      const hasVariations = p.variations && Array.isArray(p.variations) && p.variations.length > 0;

      if (hasVariations) {
        return p.variations.filter(Boolean).map(v => {
          const companyMatch = v.companyPrices?.find(cp => cp?.company?.id === branchInfo?.companyId);
          const companyPrice = companyMatch?.price ?? 0;
          const companySku = companyMatch?.companySku ?? null;

          const variationLabel = v.combinationDisplay ||
            (v.variationType && v.variationValue ? `${v.variationType}: ${v.variationValue}` : 'Variation');

          const companySkusMap = {};
          if (v.companyPrices && Array.isArray(v.companyPrices)) {
            v.companyPrices.forEach(cp => {
              if (cp?.company?.id != null) {
                companySkusMap[cp.company.id] = cp.companySku ?? '';
              }
            });
          }

          return {
            id: `${p.id}_${v.id}`,
            parentProductId: p.id,
            variationId: v.id,
            name: p.productName || '',
            subLabel: variationLabel,
            fullName: p.productName || '',
            upc: v.upc || '',
            sku: v.sku || '',
            price: companyPrice,
            companySku: companySku,
            companySkus: companySkusMap,
            variationLabel: variationLabel,
            isVariation: true,
            hasVariations: true
          };
        });
      } else {
        const companyBaseMatch = p.companyBasePrices?.find(
          cbp => cbp?.company?.id === branchInfo?.companyId
        );
        const companyBasePrice =
          companyBaseMatch?.basePrice ??
          productPrices?.[String(p.id)] ??
          productPrices?.[p.id] ??
          0;
        const companySku = companyBaseMatch?.companySku ?? null;

        const companySkusMap = {};
        if (p.companyBasePrices && Array.isArray(p.companyBasePrices)) {
          p.companyBasePrices.forEach(cbp => {
            if (cbp?.company?.id != null) {
              companySkusMap[cbp.company.id] = cbp.companySku ?? '';
            }
          });
        }

        return [{
          id: `prod_${p.id}`,
          parentProductId: p.id,
          variationId: null,
          name: p.productName || '',
          subLabel: 'No variations',
          fullName: p.productName || '',
          upc: p.upc || '',
          sku: p.sku || '',
          price: companyBasePrice,
          companySku: companySku,
          companySkus: companySkusMap,
          isVariation: false,
          hasVariations: false
        }];
      }
    });
  }, [products, branchInfo, productPrices]);

  const [showEncodedByDropdown, setShowEncodedByDropdown] = useState(false);

  const encodedByOptions = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    const names = sales
      .map(s => s.createdBy || s.generatedBy)
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [sales]);


  if (showInvoicingProfile) {
    return <InvoicingProfile onBack={() => setShowInvoicingProfile(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <LoadingOverlay show={actionLoading && !!loadingMessage} message={loadingMessage} />
      <div className="max-w-full mx-auto">
        <div className="mb-4">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Sales Management</h1>
          <p className="text-sm text-gray-600">Manage sales orders, generate invoices, and track revenue</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-3 lg:p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenModal('create')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                  <Plus size={16} />
                  <span>New Sale</span>
                </button>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm"
                >
                  <FileText size={16} />
                  <span>Generate Invoice / COS</span>
                </button>
                <button
                  onClick={() => setShowInvoicingProfile(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md text-sm font-medium"
                >
                  Sales Journal
                </button>
              </div>

              <div className="relative w-full sm:w-56 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search branch/company..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Second Row: Advanced Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Company</label>
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
                  onChange={(value) => { setFilterData({ ...filterData, branchId: value }); setCurrentPage(1); }}
                  placeholder="All Branches"
                  displayKey="name"
                  valueKey="id"
                />
                {filterData.companyId && Array.isArray(filteredBranchOptions) && filteredBranchOptions.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No branches for selected company</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                  onChange={(e) => { setFilterData({ ...filterData, startDate: e.target.value }); setCurrentPage(1); }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filterData.endDate}
                  onChange={(e) => { setFilterData({ ...filterData, endDate: e.target.value }); setCurrentPage(1); }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Third Row: Product Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Product / UPC / SKU
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <VariationSearchableDropdown
                      options={Array.isArray(allProductOptions) ? allProductOptions.filter(o =>
                        !filterData.productFilters.some(pf =>
                          pf.productId === o.parentProductId &&
                          (pf.variationId ?? null) === (o.variationId ?? null)
                        )
                      ) : []}
                      value=""
                      onChange={(value) => {
                        if (!value) return;
                        const option = allProductOptions.find(o => o.id === value);
                        if (!option) return;
                        const alreadyAdded = filterData.productFilters.some(pf =>
                          pf.productId === option.parentProductId &&
                          (pf.variationId ?? '') === (option.variationId ?? '')
                        );
                        if (alreadyAdded) return;
                        const label = option.subLabel !== 'No variations'
                          ? `${option.fullName} — ${option.subLabel}`
                          : option.fullName;
                        setFilterData(prev => ({
                          ...prev,
                          productFilters: [...prev.productFilters, {
                            productId: option.parentProductId,
                            variationId: option.variationId ?? null,
                            label
                          }]
                        }));
                        setCurrentPage(1);
                      }}
                      placeholder="Add product filter..."
                      hideLocationHint={true}
                    />
                  </div>
                </div>
                {filterData.productFilters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {filterData.productFilters.map((pf, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        <span className="leading-none">{pf.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterData(prev => ({
                              ...prev,
                              productFilters: prev.productFilters.filter((_, i) => i !== idx)
                            }));
                            setCurrentPage(1);
                          }}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-red-200 hover:text-red-700 transition-colors flex-shrink-0"
                        >
                          <X size={9} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter Actions */}
            {(filterData.companyId || filterData.branchId || filterData.startDate || filterData.endDate || filterData.productFilters.length > 0 || searchTerm || statusFilter !== 'ALL') && (
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Encoded By</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-6 mx-auto" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        <td className="px-3 py-3"><div className="h-6 bg-gray-100 rounded-full w-16" /></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                      </tr>
                    ))}
                  </>
                ) : currentSales.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      {'No sales found'}
                    </td>
                  </tr>
                ) : (
                  currentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3 whitespace-nowrap text-center text-xs text-gray-400 font-medium">
                        {((currentPage - 1) * 10) + currentSales.indexOf(sale) + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{sale.branch.branchName}</div>
                          <div className="text-xs text-gray-500">{sale.branch.branchCode}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                        {sale.company.companyName}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                        {months[sale.month - 1]} {sale.year}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                        {sale.createdBy || sale.generatedBy || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-[11px] leading-5 font-semibold rounded-full ${sale.status === 'INVOICED'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'CONFIRMED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-0.5 flex-nowrap">
                          <button
                            onClick={() => handleOpenModal('view', sale)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>

                          {sale.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleOpenModal('edit', sale)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'CONFIRMED')}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-green-600 hover:bg-green-50 transition"
                                title="Confirm Sale (Deducts Stock)"
                              >
                                <Check size={15} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'INVOICED')}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                                title="Mark as Invoiced (Deducts Stock)"
                              >
                                <FileText size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition"
                                title="Delete (Releases Reserved Stock)"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {sale.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(sale.id, 'INVOICED')}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                                title="Mark as Invoiced (No Stock Change)"
                              >
                                <FileText size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition"
                                title="Delete (Returns Stock)"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}

                          {sale.status === 'INVOICED' && (
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition"
                              title="Delete (Returns Stock)"
                            >
                              <Trash2 size={15} />
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
          {totalElements !== undefined && totalElements > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
              onNextPage={() => {
                if (currentPage < (totalPages || 1)) {
                  const newPage = currentPage + 1;
                  setCurrentPage(newPage);
                }
              }}
              onPrevPage={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1;
                  setCurrentPage(newPage);
                }
              }}
              showingStart={((currentPage - 1) * 10) + 1}
              showingEnd={Math.min(currentPage * 10, totalElements || 0)}
              totalItems={totalElements || 0}
            />
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (modalMode === 'create' || modalMode === 'edit') && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-4 sm:p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl sm:rounded-t-2xl z-10">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Create New Sale' : 'Edit Sale'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-8">
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
                      <p className="text-sm text-blue-800 mb-1"><strong>Branch:</strong> {branchInfo.branchName}</p>
                      <p className="text-sm text-blue-800 mb-1"><strong>Branch Code:</strong> {branchInfo.branchCode}</p>
                      <p className="text-sm text-blue-800 mb-1"><strong>TIN:</strong> {branchInfo.tin}</p>
                      <p className="text-sm text-blue-800"><strong>Address:</strong> {branchInfo.fullAddress}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  <div className="mt-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Encoded By <span className="text-xs text-gray-500">(Optional - defaults to current user)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.createdBy}
                      onChange={(e) => {
                        setFormData({ ...formData, createdBy: e.target.value });
                      }}
                      onFocus={() => setShowEncodedByDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEncodedByDropdown(false), 150)}
                      placeholder="Select existing or type a custom name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    {showEncodedByDropdown && Array.isArray(encodedByOptions) && encodedByOptions.filter(name =>
                      name.toLowerCase().includes(formData.createdBy.toLowerCase())
                    ).length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {encodedByOptions
                            .filter(name => name.toLowerCase().includes(formData.createdBy.toLowerCase()))
                            .map((name) => (
                              <button
                                key={name}
                                type="button"
                                onMouseDown={() => {
                                  setFormData({ ...formData, createdBy: name });
                                  setShowEncodedByDropdown(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition ${formData.createdBy === name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                              >
                                {name}
                              </button>
                            ))}
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Add Products *</label>

                    {/* Product Selector */}
                    <div className="mb-6">
                      <VariationSearchableDropdown
                        options={Array.isArray(productOptions) ? productOptions : []}
                        value={selectedProductForAdd}
                        onChange={(value) => setSelectedProductForAdd(value)}
                        placeholder="Select Product to Add..."
                        required={false}
                        formData={{
                          ...formData,
                          fromBranchId: formData.branchId,
                          items: formData.items
                        }}
                        index={-1}
                        warehouseStocks={{}}
                        branchStocks={branchStocks}
                        loadingStocks={loadingStocks}
                        onAddProduct={formData.branchId ? handleAddProductToTable : undefined}
                        activeCompanyId={branchInfo?.companyId ?? null}
                      />
                    </div>

                    {/* Products Table */}
                    {formData.items.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="font-medium text-gray-500">No products added yet</p>
                        <p className="text-sm text-gray-400">Select a product above and click "Add Product" to start</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-10">#</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variation</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UPC</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company SKU</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {formData.items.map((item, i) => {

                              const selectedOption = Array.isArray(productOptions) ? productOptions.find(opt =>
                                opt.parentProductId === item.productId &&
                                (item.variationId !== null
                                  ? opt.variationId === item.variationId
                                  : opt.variationId === null)
                              ) : null;

                              const stockKey = makeStockKey(item.productId, item.variationId, formData.branchId);
                              const stockInfo = branchStocks[stockKey];
                              const isLoadingStock = loadingStocks[stockKey];

                              const oldItem = modalMode === 'edit' && originalSaleItems
                                ? originalSaleItems.find(oi =>
                                  oi.productId === item.productId &&
                                  oi.variationId === item.variationId
                                )
                                : null;

                              const maxAllowed = getMaxAllowedQuantity(item, stockInfo, oldItem);
                              const hasEnoughStock = maxAllowed === undefined || maxAllowed >= item.quantity;

                              return (
                                <tr key={`${item.productId}_${item.variationId ?? 'base'}`} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-center text-sm text-gray-400 font-medium">{i + 1}</td>
                                  {/* Product Name */}
                                  <td className="px-4 py-3">
                                    {selectedOption ? (
                                      <div className="font-semibold text-gray-900 text-sm">
                                        {selectedOption.fullName}
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 italic text-sm">Product not found</div>
                                    )}
                                  </td>

                                  {/* Variation */}
                                  <td className="px-4 py-3">
                                    {selectedOption?.variationLabel && selectedOption.variationLabel !== 'No variations' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {selectedOption.variationLabel}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-500">None</span>
                                    )}
                                  </td>

                                  {/* SKU */}
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-900">{selectedOption?.sku || 'N/A'}</span>
                                  </td>

                                  {/* UPC */}
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-900">{selectedOption?.upc || 'N/A'}</span>
                                  </td>

                                  {/* Company SKU */}
                                  <td className="px-4 py-3">
                                    {selectedOption?.companySku
                                      ? <span className="text-sm font-medium text-gray-900">{selectedOption.companySku}</span>
                                      : <span className="text-xs text-gray-400 italic">—</span>
                                    }
                                  </td>

                                  {/* Unit Price */}
                                  <td className="px-4 py-3 text-right">
                                    {(() => {
                                      const price = selectedOption?.price ?? 0;
                                      return price > 0
                                        ? <span className="text-sm font-semibold text-green-700">
                                          ₱{Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        : <span className="text-xs text-gray-400 italic">No price</span>;
                                    })()}
                                  </td>

                                  {/* Stock */}
                                  <td className="px-4 py-3">
                                    {isLoadingStock ? (
                                      <div className="flex items-center gap-2 text-blue-600 text-xs">
                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Loading...
                                      </div>
                                    ) : stockInfo ? (
                                      <div className="text-sm space-y-1">
                                        <div className={`font-bold ${hasEnoughStock ? 'text-green-600' : 'text-red-600'}`}>
                                          Avail: {stockInfo.availableQuantity ?? 0}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Total: {stockInfo.quantity ?? 0}
                                        </div>
                                        {stockInfo.reservedQuantity > 0 && (
                                          <div className="text-xs text-orange-600">
                                            Reserved: {stockInfo.reservedQuantity}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs">
                                        <button
                                          type="button"
                                          onClick={() => loadProductStock(item.productId, formData.branchId, item.variationId)}
                                          className="text-blue-600 hover:underline font-medium"
                                        >
                                          Load stock
                                        </button>
                                        {stockErrors[stockKey] && (
                                          <div className="text-red-500 mt-0.5">Retry failed</div>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Quantity */}
                                  <td className="px-4 py-3">
                                    <input
                                      type="text"
                                      value={item.quantity && item.quantity !== 0 ? Number(item.quantity).toLocaleString('en-US') : ''}
                                      onChange={(e) => handleItemChange(i, 'quantity', e.target.value.replace(/,/g, ''))}
                                      placeholder="Qty"
                                      className={`w-24 px-3 py-2 border rounded-lg text-sm font-medium ${!hasEnoughStock && !isLoadingStock && item.quantity > 0
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-300'
                                        }`}
                                      min="1"
                                      max={maxAllowed}
                                      required
                                      disabled={isLoadingStock}
                                    />
                                    {!hasEnoughStock && !isLoadingStock && item.quantity > 0 && (
                                      <div className="text-xs text-red-600 mt-1">Exceeds max: {maxAllowed}</div>
                                    )}
                                  </td>


                                  {/* Amount */}
                                  <td className="px-4 py-3 text-right">
                                    {(() => {
                                      const price = selectedOption?.price ?? 0;
                                      const qty = item.quantity || 0;
                                      const amount = price * qty;
                                      return amount > 0
                                        ? <span className="text-sm font-bold text-blue-700">
                                          ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        : <span className="text-xs text-gray-400">—</span>;
                                    })()}
                                  </td>

                                  {/* Action */}
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(i)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                      disabled={isLoadingStock}
                                      title="Remove item"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                            <tr>
                              <td colSpan={8} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                Grand Total:
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                                {formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString('en-US')}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
                                ₱{formData.items.reduce((sum, item) => {
                                  if (!Array.isArray(productOptions)) return 0;
                                  const opt = productOptions.find(o =>
                                    o.parentProductId === item.productId &&
                                    (item.variationId !== null
                                      ? o.variationId === item.variationId
                                      : o.variationId === null)
                                  );
                                  return sum + ((opt?.price ?? 0) * (item.quantity || 0));
                                }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
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

        {/* View Modal */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
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
                        {formatPHDateTime(selectedSale.invoicedAt)}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Encoded By</h3>
                    <p className="text-gray-900 text-lg">{selectedSale.createdBy || selectedSale.generatedBy || 'System'}</p>
                    <p className="text-xs text-gray-500 mt-1">Created: {formatPHDateTime(selectedSale.createdAt)} <span className="text-[10px] text-gray-400">({selectedSale.createdAt})</span></p>                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4 text-lg">Items</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 w-10">Number</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">SKU</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">UPC</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Unit Price</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale?.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item, i) => (
                          <tr key={item.id || i} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-center text-sm text-gray-400 font-medium">{i + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {item.product.productName}
                              {item.variation && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.variation.combinationDisplay ||
                                    (item.variation.variationType && item.variation.variationValue
                                      ? `${item.variation.variationType}: ${item.variation.variationValue}`
                                      : 'Variation')}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {item.variation ? (item.variation.sku || '—') : (item.product.sku || '—')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {item.variation ? (item.variation.upc || '—') : (item.product.upc || '—')}
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
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
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
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full shadow-2xl max-h-[98vh] overflow-y-auto">
              <div className="p-4 sm:p-8 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Generate Invoice Report</h2>
                <button
                  onClick={() => { setShowInvoiceModal(false); setInvoiceSubmitted(false); }}
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
                    onChange={(value) => setFilterData({ ...filterData, companyId: value, branchId: '' })}
                    placeholder="Select Company"
                    displayKey="name"
                    valueKey="id"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Branch (Optional - Leave empty for all branches)
                  </label>
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

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Start Month</label>
                    <select
                      value={filterData.startMonth}
                      onChange={(e) => setFilterData({ ...filterData, startMonth: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tax Computation Type *</label>
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setTaxType('VAT')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition ${taxType === 'VAT'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                    >
                      <div className="font-semibold">VAT</div>
                      <div className="text-xs mt-0.5 font-normal opacity-75">Standard VAT computation</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxType('PT')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition ${taxType === 'PT'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                    >
                      <div className="font-semibold">Percentage Tax (PT)</div>
                      <div className="text-xs mt-0.5 font-normal opacity-75">Gross sales × 3%, EWT</div>
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Invoice details
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Invoice Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="e.g. SI-2025-0001"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${invoiceSubmitted && !invoiceNumber.trim()
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300'
                          }`}
                      />
                      {invoiceSubmitted && !invoiceNumber.trim() && (
                        <p className="text-xs text-red-500 mt-1">
                          Invoice number is required before previewing.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) { setInvoiceDate(''); return; }
                          const parts = val.split('-');
                          if (parts[0] && parts[0].length > 4) {
                            parts[0] = parts[0].slice(0, 4);
                            setInvoiceDate(parts.join('-'));
                          } else {
                            setInvoiceDate(val);
                          }
                        }}
                        max="9999-12-31"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={() => { setShowInvoiceModal(false); setInvoiceSubmitted(false); }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setInvoiceSubmitted(true);
                    if (!invoiceNumber.trim()) return;
                    handleGenerateInvoice();
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
                >
                  Preview Invoice
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                    <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight">
                      WISECART MERCHANTS CORP.
                    </div>
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
                    <div className="text-lg font-semibold flex items-center gap-1">
                      NO.
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="_____________"
                        className="border-b border-gray-500 w-36 text-center focus:outline-none bg-transparent print:border-0"
                      />
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
                    <div className="flex items-center gap-2 justify-end text-black-900">
                      <span className="font-medium">DATE:</span>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="border-b border-gray-500 text-sm focus:outline-none bg-transparent print:border-0"
                      />
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
                        {invoiceReport.tin || invoiceReport.branchTin || 'N/A'}
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
                        <th className="text-left px-4 font-bold text-gray-900 text-sm leading-tight" style={{ width: '60%' }}>
                          ITEM DESCRIPTION / NATURE OF SERVICE
                        </th>
                        <th className="text-right px-4 font-bold text-gray-900 text-sm leading-tight" style={{ width: '12%' }}>
                          QTY.
                        </th>
                        <th className="text-right px-4 text-gray-900 text-xs text-[11px] leading-tight" style={{ width: '12%' }}>
                          UNIT COST / PRICE
                        </th>
                        <th className="text-right px-4 font-bold text-gray-900 text-sm leading-tight" style={{ width: '15%' }}>
                          AMOUNT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceReport.products.map((product, i) => (
                        <tr key={i} className="align-top">
                          <td className="py-2 px-4 text-sm text-gray-900">
                            {product.productName}
                            {product.variation &&
                              `  ${product.variation.combinationDisplay ||
                              (product.variation.variationType && product.variation.variationValue
                                ? `${product.variation.variationType}: ${product.variation.variationValue}`
                                : 'Variation')} - ${product.variation.upc || 'N/A'}`
                            }
                          </td>
                          <td className="py-2 px-4 text-right text-sm text-gray-900">
                            {product.totalQuantity.toLocaleString()}
                          </td>
                          <td className="py-2 px-4 text-right text-sm text-gray-900">
                            {formatCurrency(product.totalAmount / product.totalQuantity)}
                          </td>
                          <td className="py-2 px-4 text-right text-sm text-gray-900">
                            {formatCurrency(product.totalAmount)}
                          </td>
                        </tr>
                      ))}
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
                      <tr className="h-full">
                        <td colSpan={4} className="p-0"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {taxType === 'VAT' ? (
                  <div className="grid grid-cols-6 border-1 border-gray-900 text-sm">
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[13px]">
                        <div className="mb-2">Total Sales:</div>
                        <div className="mb-2">VAT/PT:</div>
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
                    <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[11px]">
                      <div className="font-medium leading-tight">
                        SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:
                      </div>
                      <div className="font-medium leading-tight mt-9">
                        SC/PWD/NAAC/MOV/<br />Signature:
                      </div>
                    </div>
                    <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[13px]">
                      <input type="text" className="w-full pb-0 text-sm -mt-1" />
                      <input type="text" className="w-full pb-0 text-sm mt-5" />
                    </div>
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                        <div className="mb-2 text-[9px]">TOTAL SALES (VAT Inclusive)</div>
                        <div className="mb-2">Less: VAT</div>
                        <div className="mb-2">Amount: Net of VAT</div>
                        <div className="">Less: Discount<br /><span className="text-[10px]">(SC/PWD/NAAC/MOV/SP)</span></div>
                      </div>
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
                ) : (
                  <div className="grid grid-cols-6 border-1 border-gray-900 text-sm">
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[13px]">
                        <div style={{ fontSize: '11px' }}>Vatable Sales:</div>
                        <div style={{ fontSize: '11px' }}>Gross Sales (PT):</div>
                        <div className="mb-2" style={{ fontSize: '11px' }}>&nbsp;</div>
                        <div className="mb-2">VAT/PT:</div>
                        <div className="mb-2">Zero-Rated Sales:</div>
                        <div className="">VAT-Exempt Sales:</div>
                      </div>
                      <div className="border-r-1 border-gray-900 px-4 py-3 flex flex-col justify-start text-[15px]">
                        <input readOnly value={formatCurrency(
                          (() => {
                            const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                            return (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
                          })()
                        )} className="w-full text-right pb-0 mb-2" />
                        <input readOnly value="" className="w-full text-right pb-0 mb-2" />
                        <input readOnly value="" className="w-full text-right pb-0 mb-2" />
                        <input readOnly value="" className="w-full text-right pb-0" />
                      </div>
                    </div>
                    <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[11px]">
                      <div className="font-medium leading-tight">
                        SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:
                      </div>
                      <div className="font-medium leading-tight mt-9">
                        SC/PWD/NAAC/MOV/<br />Signature:
                      </div>
                    </div>
                    <div className="border-r-1 border-gray-900 px-3 py-3 flex flex-col justify-center text-[13px]">
                      <input type="text" className="w-full pb-0 text-sm -mt-1" />
                      <input type="text" className="w-full pb-0 text-sm mt-5" />
                    </div>
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1  border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                        <div className="mb-2 text-[9px]">TOTAL SALES (Gross Sales)</div>
                        <div className="mb-2">Less: VAT</div>
                        <div className="mb-2">Amount: Net of VAT</div>
                        <div className="">Less: Discount<br /><span className="text-[10px]">(SC/PWD/NAAC/MOV/SP)</span></div>
                      </div>
                      <div className="px-4 border-1 flex flex-col justify-start border-t-0 border-l-0 border-r-0 pt-2">
                        <input readOnly value={formatCurrency(
                          (() => {
                            const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                            return (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
                          })()
                        )} className="w-full text-right pb-0 mb-2 text-[15px]" />
                        <input readOnly value="" className="w-full text-right pb-0 mb-2 text-[15px]" />
                        <input readOnly value="" className="w-full text-right pb-0 mb-2 text-[15px]" />
                        <input readOnly value="" className="w-full text-right pb-0 text-[15px]" />
                      </div>
                    </div>
                  </div>
                )}


                <div className="grid grid-cols-6  border-t-0 border-gray-900 text-sm">
                  <div className="col-span-4 border-r-1 border-gray-900 px-4  ">
                    <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" className="w-6 h-6  mt-8" />
                      <div>
                        <div className="mb-8 mt-8">Received the amount of</div>
                        <div className="border-b border-gray-900 mt-1 w-full"></div>
                      </div>
                    </label>
                  </div>

                  {taxType === 'VAT' ? (
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1 border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                        <div className="mb-2">Add: VAT</div>
                        <div className="mb-2">Less: Withholding Tax</div>
                        <div className="" >Total Amount Due:</div>
                      </div>
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
                  ) : (
                    <div className="col-span-2 grid grid-cols-2">
                      <div className=" border-l-0 border-1 border-t-0 border-gray-900 px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                        <div className="mb-2">VAT/PT (3%)</div>
                        <div className="mb-2">Less: EWT</div>
                        <div className="">Total Amount Due:</div>
                      </div>
                      <div className="px-4 border-1 flex flex-col justify-start border-t-0 border-l-0 pt-2">
                        <input readOnly value="" className="w-full text-right pb-0 mb-2 text-[15px]" />
                        <input readOnly value="" className="w-full text-right pb-0 mb-2 text-[15px]" />
                        <input readOnly value={formatCurrency(
                          (() => {
                            const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
                            return (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
                          })()
                        )} className="w-full text-right font-bold pb-0 text-[16px]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 border-1 border-t-1 border-gray-900 text-sm mt-6">
                  <div className="border-gray-900 px-4 py-2">
                    <div className="font-medium  text-m text-[16px]">PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002</div>
                    <div className="font-medium text-m text-[16px]" >DATE ISSUED: OCT. 11, 2024</div>
                  </div>
                  <div className="px-4 py-2 pb-4">
                    <div className="font-medium  text-[16px] text-m ">BIR AUTHORITY TO PRINT No. 080AU20240000016398</div>
                    <div className="font-medium  text-[16px] text-m">DATE ISSUED: OCT. 23, 2024</div>
                    <div className="font-medium  text-[16px] text-m">APPROVED SERIES: 0501-1500 • 20PADS (2X)</div>
                  </div>
                </div>

              </div>

              <div className="p-8 border-t border-gray-200 flex justify-end gap-3 print:hidden sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => {
                    if (!invoiceNumber.trim()) {
                      toast.error('Please enter an invoice number before saving.');
                      return;
                    }
                    handleGenerateToProfile();
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-lg transition font-medium shadow-md ${!invoiceNumber.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  <span>Generate</span>
                </button>
                <button
                  onClick={() => {
                    if (!invoiceNumber.trim()) {
                      toast.error('Please enter an invoice number before printing.');
                      return;
                    }
                    window.print();
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-medium shadow-md ${!invoiceNumber.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
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

      </div>
    </div>

  );
};

export default SalesManagement;
