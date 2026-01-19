import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Check, X, ChevronDown, ChevronLeft, ChevronRight, Truck, Package, Printer } from 'lucide-react';
import { api } from '../services/api';
import './deliveryReceipt.css';
import { LoadingOverlay } from './LoadingOverlay';


const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, required = false, disabled = false }) => {
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'
          }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption[displayKey] : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
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

  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    return (
      option.name?.toLowerCase().includes(searchLower) ||
      option.subLabel?.toLowerCase().includes(searchLower) ||
      option.fullName?.toLowerCase().includes(searchLower) ||
      option.upc?.toLowerCase().includes(searchLower) ||
      option.sku?.toLowerCase().includes(searchLower)
    );
  });



  const selectedOption = options.find(opt => {
    if (opt.id === value) {
      return true;
    }


    const currentItem = formData?.items?.[index];
    if (currentItem) {
      const productMatch = currentItem.productId === opt.parentProductId;
      const variationMatch = currentItem.variationId === opt.variationId;
      return productMatch && variationMatch;
    }

    return false;
  });



  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div className="text-gray-900 font-medium truncate">
              {selectedOption.name}
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
                placeholder="Search by name, UPC, SKU, or variation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-500 text-sm mb-2">No products found</div>
                <div className="text-xs text-gray-400">Try searching by ID, UPC, SKU, or product name</div>
              </div>
            ) : (
              filteredOptions.map((option, optionIndex) => {
                const isAlreadySelected = formData?.items?.some(
                  (item, idx) => {
                    if (idx === index) return false;
                    return item.productId === option.parentProductId &&
                      item.variationId === option.variationId;
                  }
                );

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
                      : value === option.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-900 hover:bg-blue-50'
                      }`}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium">{option.name}</div>
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

      {selectedOption && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-gray-500">Product:</span>
                <span className="ml-2 font-medium">{selectedOption.fullName}</span>
              </div>
              {selectedOption.price && selectedOption.price > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ₱{selectedOption.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">SKU:</span>
                <span className="ml-2 font-medium">{selectedOption.sku || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">UPC:</span>
                <span className="ml-2 font-medium">{selectedOption.upc || 'N/A'}</span>
              </div>
            </div>

            {selectedOption.subLabel && selectedOption.subLabel !== 'No variations' && (
              <div>
                <span className="text-gray-500">Variation:</span>
                <span className="ml-2 font-medium text-blue-600">{selectedOption.subLabel}</span>
              </div>
            )}

            <div className="pt-1">
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
        </div>
      )}
    </div>
  );
};




const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchInfo, setBranchInfo] = useState(null);
  const [warehouseStocks, setWarehouseStocks] = useState({});
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loadingStocks, setLoadingStocks] = useState({});
  const [stockErrors, setStockErrors] = useState({});
  const [showCompanyDetails, setShowCompanyDetails] = useState(true);
  const [showBranchDetails, setShowBranchDetails] = useState(true);
  const [formData, setFormData] = useState({
    branchId: '',
    date: '',
    deliveryReceiptNumber: '',
    purchaseOrderNumber: '',
    transmittal: '',
    preparedBy: '',
    status: 'PREPARING',
    customStatus: '',
    remarks: '',
    items: [],
    selectedWarehouseId: '',
    datePrepared: '',
    dateDelivered: ''
  });

  const [filterData, setFilterData] = useState({
    companyId: '',
    branchId: '',
    status: '',
    startDate: '',
    endDate: '',
    receiptNumber: ''
  });



  const handleGenerateReceiptFull = async (delivery) => {
    try {
      const fullDeliveryRes = await api.get(`/deliveries/${delivery.id}`);

      if (!fullDeliveryRes.success) {
        throw new Error(fullDeliveryRes.error || 'Failed to load delivery');
      }

      const fullDelivery = fullDeliveryRes.data;

      const receipt = {
        id: fullDelivery.id,
        deliveryReceiptNumber: fullDelivery.deliveryReceiptNumber || '',
        deliveryReceiptNumberDisplay: '',
        date: new Date(fullDelivery.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        branchName: fullDelivery.branch?.branchName || delivery.branchName,
        companyName: fullDelivery.company?.companyName || delivery.companyName,
        companyTin: fullDelivery.branch?.tin || fullDelivery.company?.tin || 'N/A',
        branchAddress: `${fullDelivery.branch?.address || ''}, ${fullDelivery.branch?.city || ''}, ${fullDelivery.branch?.province || ''}`.trim(),
        preparedBy: fullDelivery.preparedBy || localStorage.getItem('fullName') || '',
        purchaseOrderNumber: fullDelivery.purchaseOrderNumber || '',
        termsOfPayment: fullDelivery.termsOfPayment || '',
        businessStyle: fullDelivery.businessStyle || '',
        remarks: fullDelivery.remarks || '',
        items: fullDelivery.items || [],
        extraHeader: fullDelivery.extraHeader || 'EXTRA',
        generatedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
      };

      setReceiptData(receipt);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt: ' + error.message);
    }
  };


  const loadWarehouseStock = async (warehouseId, productId, variationId, itemIndex) => {
    if (!warehouseId || !productId) return;
    const stockKey = variationId
      ? `${itemIndex}_${productId}_${variationId}_${warehouseId}`
      : `${itemIndex}_${productId}_${warehouseId}`;

    setLoadingStocks(prev => ({ ...prev, [stockKey]: true }));
    setStockErrors(prev => ({ ...prev, [stockKey]: null }));

    try {
      const endpoint = variationId
        ? `/stocks/warehouses/${warehouseId}/products/${productId}/variations/${variationId}`
        : `/stocks/warehouses/${warehouseId}/products/${productId}`;


      const stock = await api.get(endpoint);

      const stockData = stock.success ? stock.data : stock;

      if (stockData) {
        setWarehouseStocks(prev => ({
          ...prev,
          [stockKey]: stockData
        }));
      } else {
        console.warn('⚠️ No stock data received');
        setWarehouseStocks(prev => ({
          ...prev,
          [stockKey]: { quantity: 0, availableQuantity: 0 }
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load stock information:', error);
      setWarehouseStocks(prev => ({
        ...prev,
        [stockKey]: { quantity: 0, availableQuantity: 0 }
      }));
      setStockErrors(prev => ({
        ...prev,
        [stockKey]: 'Failed to load stock'
      }));
    } finally {
      setLoadingStocks(prev => ({ ...prev, [stockKey]: false }));
    }
  };


  const validateDeliveryForm = () => {
    if (!formData.branchId) {
      alert('Please select a branch');
      return false;
    }

    if (!formData.deliveryReceiptNumber?.trim()) {
      alert('Please enter a delivery receipt number');
      return false;
    }

    if (!formData.datePrepared) {
      alert('Date prepared is required');
      return false;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item to the delivery');
      return false;
    }

    const itemsWithoutWarehouse = formData.items.filter(item => !item.warehouseId);
    if (itemsWithoutWarehouse.length > 0) {
      alert('Please select a warehouse for all items');
      return false;
    }

    const itemsWithoutProduct = formData.items.filter(item => !item.productId);
    if (itemsWithoutProduct.length > 0) {
      alert('Please select a product for all items');
      return false;
    }

    const invalidPreparedQty = formData.items.filter(item =>
      item.preparedQty === '' || item.preparedQty === 0 || item.preparedQty < 1
    );
    if (invalidPreparedQty.length > 0) {
      alert('Please enter valid prepared quantities (minimum 1) for all items');
      return false;
    }

    if (formData.status === 'DELIVERED') {
      if (!formData.dateDelivered) {
        alert('Date delivered is required for DELIVERED status');
        return false;
      }

      const invalidDeliveredQty = formData.items.filter(item =>
        item.deliveredQty === '' || item.deliveredQty === 0 || item.deliveredQty < 1
      );
      if (invalidDeliveredQty.length > 0) {
        alert('Please enter valid delivered quantities (minimum 1) for all items when status is DELIVERED');
        return false;
      }

    } else {
      if (formData.dateDelivered) {
        setFormData({ ...formData, dateDelivered: '' });
      }
    }

    return true;
  };





  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    const oldWarehouseId = newItems[index].warehouseId;
    const oldProductId = newItems[index].productId;

    if (field === 'preparedQty' || field === 'deliveredQty') {
      newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
    } else if (field === 'productId') {
      const selectedOption = productOptions.find(opt => opt.id === value);

      if (selectedOption) {
        newItems[index] = {
          ...newItems[index],
          productId: selectedOption.parentProductId,
          variationId: selectedOption.variationId || null
        };


        setFormData({ ...formData, items: newItems });
        if (newItems[index].warehouseId) {
          setTimeout(() => {
            loadWarehouseStock(
              newItems[index].warehouseId,
              selectedOption.parentProductId,
              selectedOption.variationId,
              index
            );
          }, 0);
        }
        return;
      }
    } else {
      newItems[index][field] = value;
    }

    setFormData({ ...formData, items: newItems });

    if (field === 'warehouseId' && value !== oldWarehouseId) {
      const item = newItems[index];
      setFormData({ ...formData, items: newItems });

      if (item.productId && value) {
        setTimeout(() => {
          loadWarehouseStock(value, item.productId, item.variationId, index);
        }, 100);
      }

      newItems[index].preparedQty = '';
      newItems[index].deliveredQty = '';
      newItems[index].uom = '';
      setFormData({ ...formData, items: newItems });
    }
  };

  useEffect(() => {
    loadData();
  }, [filterData.status])




  useEffect(() => {
    if (formData.selectedWarehouseId && formData.items.length > 0) {
      formData.items.forEach((item, index) => {
        if (item.productId) {
          loadWarehouseStock(
            formData.selectedWarehouseId,
            item.productId,
            item.variationId,
            index
          );
        }
      });
    }
  }, [formData.selectedWarehouseId]);




  const loadData = async () => {
    try {
      setActionLoading(true);
      const [deliveriesRes, branchesRes, productsRes, warehousesRes, companiesRes] = await Promise.all([
        api.get('/deliveries/list'),
        api.get('/branches'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/companies')
      ]);

      if (deliveriesRes.success) setDeliveries(deliveriesRes.data || []);
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('Failed to load data', error);
      alert('Failed to load data: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenModal = async (mode, delivery = null) => {
    setModalMode(mode);
    setLoadingStocks({});
    setStockErrors({});

    if (mode === 'create') {
      setSelectedDelivery(null);
      setShowCompanyDetails(true);
      setShowBranchDetails(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      setFormData({
        branchId: '',
        date: localISOString,
        deliveryReceiptNumber: '',
        purchaseOrderNumber: '',
        transmittal: '',
        preparedBy: localStorage.getItem('fullName') || localStorage.getItem('username') || '',
        status: 'PREPARING',
        customStatus: '',
        remarks: '',
        items: [],
        selectedWarehouseId: '',
        datePrepared: localISOString,
        dateDelivered: ''
      });
      setBranchInfo(null);
      setWarehouseStocks({});
    } else if (mode === 'edit' && delivery) {
      if (delivery.status === 'DELIVERED') {
        alert('Cannot edit a delivery that has already been DELIVERED.');
        return;
      }

      try {
        setActionLoading(true);
        setLoadingMessage('Loading delivery details and stock information...');

        const fullDeliveryRes = await api.get(`/deliveries/${delivery.id}`);

        if (!fullDeliveryRes.success) {
          throw new Error(fullDeliveryRes.error || 'Failed to load delivery');
        }

        const fullDelivery = fullDeliveryRes.data;

        if (fullDelivery.status === 'DELIVERED') {
          alert('Cannot edit a delivery that has already been DELIVERED.');
          return;
        }

        setSelectedDelivery(fullDelivery);

        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          let cleanDate = dateString.replace('Z', '').split('.')[0].split('+')[0];
          if (cleanDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)) {
            if (!cleanDate.includes(':', cleanDate.lastIndexOf(':'))) {
              cleanDate += ':00';
            }
            return cleanDate;
          }
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        };

        setFormData({
          branchId: fullDelivery.branch.id,
          date: fullDelivery.date ? formatDateForInput(fullDelivery.date) : formatDateForInput(new Date()),
          deliveryReceiptNumber: fullDelivery.deliveryReceiptNumber,
          purchaseOrderNumber: fullDelivery.purchaseOrderNumber || '',
          transmittal: fullDelivery.transmittal || '',
          preparedBy: fullDelivery.preparedBy,
          status: fullDelivery.status,
          customStatus: fullDelivery.customStatus || '',
          remarks: fullDelivery.remarks || '',
          selectedWarehouseId: fullDelivery.items[0]?.warehouse?.id || '',
          datePrepared: fullDelivery.datePrepared ? formatDateForInput(fullDelivery.datePrepared) : formatDateForInput(fullDelivery.date || new Date()),
          dateDelivered: fullDelivery.dateDelivered ? formatDateForInput(fullDelivery.dateDelivered) : '',
          items: fullDelivery.items.map(item => {
            let productId = item.product?.id || item.productId;
            let variationId = null;

            if (item.variationId) {
              variationId = item.variationId;
            } else if (item.productVariationId) {
              variationId = item.productVariationId;
            } else if (item.variation?.id) {
              variationId = item.variation.id;
            } else if (item.productVariation?.id) {
              variationId = item.productVariation.id;
            }

            return {
              productId: productId,
              variationId: variationId,
              quantity: item.quantity,
              preparedQty: item.preparedQty || '',
              deliveredQty: item.deliveredQty || '',
              uom: item.uom || '',
              warehouseId: item.warehouse?.id || '',
              originalPreparedQty: item.preparedQty || 0
            };
          })
        });

        setBranchInfo({
          companyName: fullDelivery.company.companyName,
          tin: fullDelivery.company.tin,
          fullAddress: `${fullDelivery.company.address || ''}, ${fullDelivery.company.city || ''}, ${fullDelivery.company.province || ''}`.trim(),
          branchName: fullDelivery.branch.branchName,
          branchCode: fullDelivery.branch.branchCode,
          branchAddress: `${fullDelivery.branch.address || ''}, ${fullDelivery.branch.city || ''}, ${fullDelivery.branch.province || ''}`.trim(),
          branchTin: fullDelivery.branch.tin || '',
          branchContactNumber: fullDelivery.branch.contactNumber || ''
        });


        const stockLoadPromises = fullDelivery.items.map((item, index) => {
          if (item.warehouse?.id && item.product?.id) {
            let variationId = item.variationId || item.productVariationId || item.variation?.id || null;


            return loadWarehouseStock(
              item.warehouse.id,
              item.product.id,
              variationId,
              index
            );
          }
          return Promise.resolve();
        });

        await Promise.all(stockLoadPromises);

      } catch (error) {
        console.error('Failed to load delivery details');
        alert('Failed to load delivery details: ' + error.message);
      } finally {
        setActionLoading(false);
        setLoadingMessage('');
      }
    } else if (mode === 'view' && delivery) {
      try {
        const fullDeliveryRes = await api.get(`/deliveries/${delivery.id}`);
        if (fullDeliveryRes.success) {
          setSelectedDelivery(fullDeliveryRes.data);
        }
      } catch (error) {
        console.error('Failed to load delivery details:', error);
      }
    }

    setShowModal(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setActionLoading(true);
      setLoadingMessage(`Updating status to ${status}...`);
      const response = await api.patch(`/deliveries/${id}/status`, null, {
        params: { status: status }
      });

      if (response.success) {
        if (selectedDelivery && selectedDelivery.id === id) {
          const updatedDeliveryRes = await api.get(`/deliveries/${id}`);
          if (updatedDeliveryRes.success) {
            setSelectedDelivery(updatedDeliveryRes.data);
          }
        }

        await loadData();
        alert(`Status updated to ${status} successfully`);
      } else {
        alert(response.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };



  const handleCompanyFilterChange = (value) => {
    setFilterData({
      ...filterData,
      companyId: value,
      branchId: ''
    });
  };



  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDelivery(null);
    setBranchInfo(null);
    setShowCompanyDetails(true);
    setShowBranchDetails(true);
  };


  const handleBranchChange = async (branchId) => {
    setFormData({ ...formData, branchId });
    if (branchId) {
      try {
        const branch = branches.find(b => b.id === branchId);
        if (branch && branch.company) {
          setBranchInfo({
            companyName: branch.company.companyName,
            tin: branch.company.tin,
            fullAddress: `${branch.company.address || ''}, ${branch.company.city || ''}, ${branch.company.province || ''}`.trim(),
            branchName: branch.branchName,
            branchCode: branch.branchCode,
            branchAddress: `${branch.address || ''}, ${branch.city || ''}, ${branch.province || ''}`.trim(),
            branchTin: branch.tin || '',
            branchContactNumber: branch.contactNumber || ''
          });
        }
      } catch (error) {
        console.error('Failed to load branch info');
        setBranchInfo(null);
      }
    } else {
      setBranchInfo(null);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: '',
        preparedQty: '',
        deliveredQty: '',
        uom: '',
        warehouseId: formData.selectedWarehouseId || '',
        originalPreparedQty: 0
      }]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateDeliveryForm()) {
      return;
    }

    const deliveryData = {
      ...formData,
      date: formData.datePrepared || null,
      datePrepared: formData.datePrepared || null,
      dateDelivered: formData.status === 'DELIVERED' && formData.dateDelivered
        ? formData.dateDelivered
        : null
    };

    if (formData.status !== 'DELIVERED') {
      delete deliveryData.dateDelivered;
    }

    for (const item of formData.items) {
      if (formData.status === 'DELIVERED') {
        const itemIndex = formData.items.indexOf(item);
        const stockKey = `${itemIndex}_${item.productId}_${item.warehouseId}`;
        const stockInfo = warehouseStocks[stockKey];
        const maxAllowedQty = (item.preparedQty || 0) + (stockInfo?.availableQuantity || 0);

        if (item.deliveredQty > maxAllowedQty) {
          const product = products.find(p => p.id === item.productId);
          const warehouse = warehouses.find(w => w.id === item.warehouseId);

          alert(`⚠️ INSUFFICIENT STOCK\n\n` +
            `Product: ${product?.productName}\n` +
            `Warehouse: ${warehouse?.warehouseName}\n\n` +
            `Delivered Quantity: ${item.deliveredQty}\n` +
            `Maximum Allowed: ${maxAllowedQty}\n` +
            `  (Prepared: ${item.preparedQty || 0} + Available: ${stockInfo?.availableQuantity || 0})\n\n` +
            `Please reduce the delivered quantity or increase warehouse stock.`);
          return;
        }
      }
    }

    try {
      setActionLoading(true);
      setLoadingMessage(modalMode === 'create' ? 'Creating delivery...' : 'Updating delivery...');

      for (const item of formData.items) {
        const endpoint = item.variationId
          ? `/stocks/warehouses/${item.warehouseId}/products/${item.productId}/variations/${item.variationId}`
          : `/stocks/warehouses/${item.warehouseId}/products/${item.productId}`;

        const stockResponse = await api.get(endpoint);

        const quantityNeeded = item.preparedQty || 0;
        const originalReserved = item.originalPreparedQty || 0;
        const effectiveAvailableStock = (stockResponse.data?.availableQuantity || 0) + originalReserved;

        if (!stockResponse.success || effectiveAvailableStock < quantityNeeded) {
          const product = products.find(p => p.id === item.productId);
          const warehouse = warehouses.find(w => w.id === item.warehouseId);

          let productName = product?.productName || 'Unknown Product';
          if (item.variationId && product?.variations) {
            const variation = product.variations.find(v => v.id === item.variationId);
            if (variation) {
              productName = `${productName} (${variation.combinationDisplay || 'Variation'})`;
            }
          }

          alert(`Insufficient stock for product "${productName}" in warehouse "${warehouse?.warehouseName}".\n\nAvailable (including reserved): ${effectiveAvailableStock}\nRequested: ${quantityNeeded}\n\nCurrent stock: ${stockResponse.data?.quantity || 0}\nReserved: ${stockResponse.data?.reservedQuantity || 0}\nAvailable: ${stockResponse.data?.availableQuantity || 0}`);
          return;
        }
      }

      if (modalMode === 'create') {
        await api.post('/deliveries', deliveryData);
        alert('Delivery created successfully!');
      } else {
        await api.put(`/deliveries/${selectedDelivery.id}`, deliveryData);
        alert('Delivery updated successfully!');
      }

      handleCloseModal();
      loadData();
      setCurrentPage(1);
    } catch (error) {
      alert('Failed to save delivery: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = async (id) => {
    const delivery = deliveries.find(d => d.id === id);

    const userRole = localStorage.getItem('userRole') || 'USER';

    let confirmMessage = 'Are you sure you want to delete this delivery?';

    if (delivery?.status === 'DELIVERED') {
      if (userRole !== 'ADMIN') {
        alert('⚠️ PERMISSION DENIED\n\nOnly administrators can delete delivered deliveries.\n\nPlease contact your system administrator.');
        return;
      }
      confirmMessage = '⚠️ ADMIN ACTION REQUIRED\n\nYou are about to delete a DELIVERED delivery.\nThis action will reverse all stock movements.\n\nAre you sure you want to proceed?';
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(true);
      setLoadingMessage('Deleting delivery...');

      const response = await api.delete(`/deliveries/${id}?userRole=${userRole}`);

      if (!response.success) {
        alert(response.error || 'Failed to delete delivery');
        return;
      }

      alert('Delivery deleted successfully');
      loadData();
      if (filteredDeliveries.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete delivery';

      alert(errorMessage);
      console.error('Delete error:', error);
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
      endDate: '',
      receiptNumber: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const sortByStatus = (deliveries) => {
    const statusOrder = {
      'PREPARING': 1,
      'IN_TRANSIT': 2,
      'DELIVERED': 3,
      'CANCELLED': 4
    };

    return [...deliveries].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (dateB - dateA !== 0) {
        return dateB - dateA;
      }

      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  const filteredDeliveries = sortByStatus(deliveries.filter(delivery => {

    if (filterData.receiptNumber &&
      !delivery.deliveryReceiptNumber?.toLowerCase().includes(filterData.receiptNumber.toLowerCase())) {
      return false;
    }


    if (filterData.companyId && delivery.company?.id !== filterData.companyId) {
      const company = companies.find(c => c.id === filterData.companyId);
      if (!company || delivery.companyName !== company.companyName) {
        return false;
      }
    }


    if (filterData.branchId && delivery.branch?.id !== filterData.branchId) {
      const branch = branches.find(b => b.id === filterData.branchId);
      if (!branch || delivery.branchName !== branch.branchName) {
        return false;
      }
    }


    if (filterData.status && delivery.status !== filterData.status) {
      return false;
    }


    if (filterData.startDate || filterData.endDate) {
      const deliveryDate = new Date(delivery.date);

      if (filterData.startDate) {
        const startDate = new Date(filterData.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (deliveryDate < startDate) {
          return false;
        }
      }

      if (filterData.endDate) {
        const endDate = new Date(filterData.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (deliveryDate > endDate) {
          return false;
        }
      }
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      delivery.branchName?.toLowerCase().includes(searchLower) ||
      delivery.companyName?.toLowerCase().includes(searchLower) ||
      delivery.deliveryReceiptNumber?.toLowerCase().includes(searchLower);

    return matchesSearch;
  }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeliveries = filteredDeliveries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);

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

  const handleSaveReceiptDetails = async () => {
    try {
      const itemsToUpdate = receiptData.items.map(item => ({
        itemId: item.id,
        extra: item.extra || ''
      }));

      const receiptNumberToSave = receiptData.deliveryReceiptNumberDisplay?.trim() ||
        receiptData.deliveryReceiptNumber;

      const response = await api.patch(`/deliveries/${receiptData.id}/receipt-details`, {
        deliveryReceiptNumber: receiptNumberToSave,
        termsOfPayment: receiptData.termsOfPayment || '',
        businessStyle: receiptData.businessStyle || '',
        preparedBy: receiptData.preparedBy || '',
        extraHeader: receiptData.extraHeader || 'EXTRA',
        items: itemsToUpdate
      });

      if (response.success) {
        alert('Receipt details saved successfully!');
        await loadData();

        const updatedDeliveryRes = await api.get(`/deliveries/${receiptData.id}`);
        if (updatedDeliveryRes.success) {
          const updatedDelivery = updatedDeliveryRes.data;
          setReceiptData(prev => ({
            ...prev,
            deliveryReceiptNumber: updatedDelivery.deliveryReceiptNumber,
            deliveryReceiptNumberDisplay: receiptNumberToSave,
            termsOfPayment: updatedDelivery.termsOfPayment,
            businessStyle: updatedDelivery.businessStyle,
            extraHeader: updatedDelivery.extraHeader || 'EXTRA'
          }));
        }
      } else {
        alert(response.error || 'Failed to save receipt details');
      }
    } catch (error) {
      console.error('Failed to save receipt details:', error);
      alert('Failed to save receipt details: ' + error.message);
    }
  };

  const deliveryStatuses = [
    'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
  ];

  const getStatusColor = (status) => {
    const colors = {
      PREPARING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      CUSTOM: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };



  const getStatusDropdownBgColor = (status) => {
    const colors = {
      PREPARING: 'bg-yellow-50 border-yellow-200',
      IN_TRANSIT: 'bg-purple-50 border-purple-200',
      DELIVERED: 'bg-green-50 border-green-200',
      CANCELLED: 'bg-red-50 border-red-200'
    };
    return colors[status] || 'bg-gray-50 border-gray-200';
  };

  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const filteredBranchOptions = filterData.companyId
    ? branches
      .filter(b => b.company?.id === filterData.companyId)
      .map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branchOptions;
  const productOptions = products.flatMap(p => {
    if (p.variations && p.variations.length > 0) {
      return p.variations.map(v => {
        const dropdownName = `${v.upc || 'N/A'} - ${p.productName} - ${v.sku || 'N/A'}`;
        const variationLabel = v.combinationDisplay ||
          (v.attributes ? Object.entries(v.attributes || {})
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ') : 'Variation');

        return {
          id: `${p.id}_${v.id}`,
          parentProductId: p.id,
          variationId: v.id,
          name: dropdownName,
          subLabel: variationLabel,
          fullName: p.productName,
          upc: v.upc,
          sku: v.sku,
          price: v.price || p.price,
          isVariation: true
        };
      });
    } else {
      const dropdownName = `${p.upc || 'N/A'} - ${p.productName} - ${p.sku || 'N/A'}`;

      return [{
        id: `prod_${p.id}`,
        parentProductId: p.id,
        variationId: null,
        name: dropdownName,
        subLabel: 'No variations',
        fullName: p.productName,
        upc: p.upc,
        sku: p.sku,
        price: p.price,
        isVariation: false
      }];
    }
  });
  const warehouseOptions = warehouses.map(w => ({ id: w.id, name: `${w.warehouseName} (${w.warehouseCode})` }));



  return (
    <>
      <LoadingOverlay show={actionLoading} message={loadingMessage || 'Loading...'} />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Management</h1>
            <p className="text-gray-600">Track and manage product deliveries to branches</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <button
                  onClick={() => handleOpenModal('create')}
                  className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                  <Plus size={20} />
                  <span>New Delivery</span>
                </button>

                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by receipt number..."
                      value={filterData.receiptNumber}
                      onChange={(e) => setFilterData({ ...filterData, receiptNumber: e.target.value })}
                      className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                  <SearchableDropdown
                    options={companies.map(c => ({ id: c.id, name: c.companyName }))}
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
                    placeholder={filterData.companyId ? "Select Branch" : "Select Company"}
                    displayKey="name"
                    valueKey="id"
                    disabled={!filterData.companyId}
                  />
                  {filterData.companyId && filteredBranchOptions.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">No branches available for this company</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterData.status}
                    onChange={(e) => setFilterData({ ...filterData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    {deliveryStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
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
              {(filterData.companyId || filterData.branchId || filterData.status || filterData.startDate || filterData.endDate || filterData.receiptNumber) && (
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Prepared</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Delivered</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        {filteredDeliveries.length === 0 ? 'No deliveries found' : 'No deliveries on this page'}
                      </td>
                    </tr>
                  ) : (
                    currentDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{delivery.deliveryReceiptNumber}</div>
                          {delivery.preparedBy && <div className="text-sm text-gray-500">By: {delivery.preparedBy}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.branchName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.datePrepared ? new Date(delivery.datePrepared).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Not prepared'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.dateDelivered ? new Date(delivery.dateDelivered).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Not delivered'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">{delivery.itemCount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.status)} w-fit`}>
                              {delivery.customStatus || delivery.status}
                            </span>
                            {delivery.status === 'DELIVERED' && delivery.dateDelivered && (
                              <div className="flex items-center gap-1 text-xs text-green-700">
                                <span className="font-medium">Delivered:</span>
                                <span>
                                  {new Date(delivery.dateDelivered).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(delivery.dateDelivered).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenModal('view', delivery)}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenModal('edit', delivery)}
                              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(delivery.id)}
                              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => handleGenerateReceiptFull(delivery)}
                              className="flex items-center gap-2 px-3 py-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition"
                              title="Print Receipt"
                            >
                              <Printer size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredDeliveries.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDeliveries.length)} of {filteredDeliveries.length} results
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
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === 'create' ? 'Create New Delivery' : 'Edit Delivery'}
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
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Branch *
                        {(formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED') && (
                          <span className="ml-2 text-xs text-orange-600">(Locked - Cannot change in {formData.status} status)</span>
                        )}
                      </label>
                      <SearchableDropdown
                        options={branchOptions}
                        value={formData.branchId}
                        onChange={handleBranchChange}
                        placeholder="Select Branch"
                        displayKey="name"
                        valueKey="id"
                        required
                        disabled={formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED'}
                      />
                    </div>

                    {branchInfo && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`bg-green-50 rounded-lg border border-green-200 transition-all duration-300 ${showBranchDetails ? 'h-auto' : 'h-[60px]'}`}>
                          <button
                            type="button"
                            onClick={() => setShowBranchDetails(!showBranchDetails)}
                            className="w-full p-4 flex items-center justify-between hover:bg-green-100 transition rounded-lg"
                          >
                            <h3 className="text-sm font-bold text-green-900 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Branch Details
                            </h3>
                            <ChevronDown
                              size={20}
                              className={`text-green-600 transition-transform ${showBranchDetails ? 'rotate-180' : ''}`}
                            />
                          </button>

                          <div className={`overflow-hidden transition-all duration-300 ${showBranchDetails ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            {showBranchDetails && (
                              <div className="px-4 pb-4 space-y-2">
                                <div className="flex items-start">
                                  <span className="text-xs text-green-600 font-medium min-w-20">Branch:</span>
                                  <span className="text-sm text-green-900 font-semibold ml-2">{branchInfo.branchName}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-xs text-green-600 font-medium min-w-20">Code:</span>
                                  <span className="text-sm text-green-900 ml-2">{branchInfo.branchCode}</span>
                                </div>
                                {branchInfo.branchTin && (
                                  <div className="flex items-start">
                                    <span className="text-xs text-green-600 font-medium min-w-20">TIN:</span>
                                    <span className="text-sm text-green-900 ml-2">{branchInfo.branchTin}</span>
                                  </div>
                                )}
                                <div className="flex items-start">
                                  <span className="text-xs text-green-600 font-medium min-w-20">Address:</span>
                                  <span className="text-sm text-green-900 ml-2">{branchInfo.branchAddress}</span>
                                </div>
                                {branchInfo.branchContactNumber && (
                                  <div className="flex items-start">
                                    <span className="text-xs text-green-600 font-medium min-w-20">Contact:</span>
                                    <span className="text-sm text-green-900 ml-2">{branchInfo.branchContactNumber}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Receipt # *</label>
                        <input
                          type="text"
                          value={formData.deliveryReceiptNumber}
                          onChange={(e) => setFormData({ ...formData, deliveryReceiptNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Purchase Order #</label>
                        <input
                          type="text"
                          value={formData.purchaseOrderNumber}
                          onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Transmittal</label>
                        <input
                          type="text"
                          value={formData.transmittal}
                          onChange={(e) => setFormData({ ...formData, transmittal: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Prepared By</label>
                        <input
                          type="text"
                          value={formData.preparedBy}
                          onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>
                    {modalMode === 'edit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;

                            if (newStatus === 'PREPARING') {
                              setFormData({
                                ...formData,
                                status: newStatus,
                                dateDelivered: ''
                              });
                            } else if (newStatus === 'IN_TRANSIT') {
                              setFormData({
                                ...formData,
                                status: newStatus,
                                dateDelivered: ''
                              });
                            } else if (newStatus === 'DELIVERED') {
                              const updatedItems = formData.items.map(item => ({
                                ...item,
                                deliveredQty: item.deliveredQty || item.preparedQty
                              }));
                              const getLocalISOString = () => {
                                const now = new Date();
                                const year = now.getFullYear();
                                const month = String(now.getMonth() + 1).padStart(2, '0');
                                const day = String(now.getDate()).padStart(2, '0');
                                const hours = String(now.getHours()).padStart(2, '0');
                                const minutes = String(now.getMinutes()).padStart(2, '0');
                                const seconds = String(now.getSeconds()).padStart(2, '0');
                                return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                              };

                              setFormData({
                                ...formData,
                                status: newStatus,
                                dateDelivered: formData.dateDelivered || getLocalISOString(),
                                items: updatedItems
                              });
                            } else if (newStatus === 'CANCELLED') {
                              setFormData({
                                ...formData,
                                status: newStatus,
                                dateDelivered: ''
                              });
                            } else {
                              const updatedItems = formData.items.map(item => ({
                                ...item,
                                deliveredQty: ''
                              }));
                              setFormData({
                                ...formData,
                                status: newStatus,
                                dateDelivered: '',
                                items: updatedItems
                              });
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${getStatusDropdownBgColor(formData.status)}`}
                        >
                          {selectedDelivery.status === 'PREPARING' && (
                            <>
                              <option value="PREPARING">PREPARING</option>
                              <option value="IN_TRANSIT">IN_TRANSIT</option>
                            </>
                          )}
                          {selectedDelivery.status === 'IN_TRANSIT' && (

                            <>
                              <option value="IN_TRANSIT">IN_TRANSIT</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </>
                          )}
                          {(selectedDelivery.status === 'DELIVERED' || selectedDelivery.status === 'CANCELLED') && (
                            <option value={selectedDelivery.status}>{selectedDelivery.status}</option>
                          )}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Remarks</label>
                      <textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        rows="3"
                      />
                    </div>


                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Date Prepared *
                          {modalMode === 'edit' && formData.status !== 'PREPARING' && (
                            <span className="ml-2 text-xs text-orange-600">(Locked - cannot change after PREPARING status)</span>
                          )}
                          {modalMode === 'edit' && formData.status === 'PREPARING' && (
                            <span className="ml-2 text-xs text-green-600">(Editable in PREPARING status)</span>
                          )}
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            formData.datePrepared
                              ? (() => {
                                let cleanDate = formData.datePrepared.replace('Z', '').split('.')[0].split('+')[0];
                                if (cleanDate.length > 16) {
                                  cleanDate = cleanDate.substring(0, 16);
                                }
                                return cleanDate;
                              })()
                              : ''
                          }
                          onChange={(e) => {
                            if (modalMode === 'create' || (modalMode === 'edit' && formData.status === 'PREPARING')) {
                              const localDateTimeStr = e.target.value;
                              const isoWithoutZ = localDateTimeStr + ':00';

                              setFormData({
                                ...formData,
                                datePrepared: isoWithoutZ
                              });
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 transition ${modalMode === 'edit' && formData.status !== 'PREPARING'
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                            : 'border-gray-300 focus:ring-blue-500 bg-white'
                            }`}
                          disabled={modalMode === 'edit' && formData.status !== 'PREPARING'}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {modalMode === 'create'
                            ? 'Pre-filled with current Philippine time. You can edit if needed before saving.'
                            : formData.status === 'PREPARING'
                              ? 'You can edit this while status is PREPARING. Once changed to IN_TRANSIT or DELIVERED, it becomes locked.'
                              : 'Date when delivery was originally prepared (locked after PREPARING status)'}
                        </p>
                      </div>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Date Delivered
                          {formData.status !== 'DELIVERED' && (
                            <span className="ml-2 text-xs text-orange-600">(Enabled only when status is DELIVERED)</span>
                          )}
                          {formData.status === 'DELIVERED' && (
                            <span className="ml-2 text-xs text-orange-600">(Required for DELIVERED status)</span>
                          )}
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            formData.dateDelivered
                              ? (() => {
                                let cleanDate = formData.dateDelivered.replace('Z', '').split('.')[0].split('+')[0];
                                if (cleanDate.length > 16) {
                                  cleanDate = cleanDate.substring(0, 16);
                                }
                                return cleanDate;
                              })()
                              : formData.status === 'DELIVERED'
                                ? (() => {
                                  const now = new Date();
                                  const year = now.getFullYear();
                                  const month = String(now.getMonth() + 1).padStart(2, '0');
                                  const day = String(now.getDate()).padStart(2, '0');
                                  const hours = String(now.getHours()).padStart(2, '0');
                                  const minutes = String(now.getMinutes()).padStart(2, '0');
                                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                                })()
                                : ''
                          }
                          onChange={(e) => {
                            const localDateTimeStr = e.target.value;
                            const isoWithoutZ = localDateTimeStr + ':00';
                            setFormData({
                              ...formData,
                              dateDelivered: isoWithoutZ
                            });
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 transition ${formData.status === 'DELIVERED'
                            ? 'border-gray-300 focus:ring-blue-500 bg-white'
                            : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                            }`}
                          disabled={formData.status !== 'DELIVERED'}
                          required={formData.status === 'DELIVERED'}
                        />
                        {formData.status !== 'DELIVERED' ? (
                          <p className="text-xs text-gray-500 mt-1">
                            Will be enabled automatically when status changes to DELIVERED
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Required when status is DELIVERED
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Select Warehouse (applies to all items) *
                          {formData.status === 'PREPARING' ? (
                            <span className="ml-2 text-xs text-green-600">(Editable)</span>
                          ) : (
                            <span className="ml-2 text-xs text-orange-600">(Locked in {formData.status} status)</span>
                          )}
                        </label>
                        <SearchableDropdown
                          options={warehouseOptions}
                          value={formData.selectedWarehouseId}
                          onChange={(value) => {
                            const newItems = formData.items.map(item => ({
                              ...item,
                              warehouseId: value
                            }));
                            setFormData({
                              ...formData,
                              selectedWarehouseId: value,
                              items: newItems
                            });
                          }}
                          placeholder="Select Warehouse"
                          displayKey="name"
                          valueKey="id"
                          required
                          disabled={formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED'}
                        />
                        {(formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED') && (
                          <p className="text-xs text-orange-600 mt-2">
                            ⚠️ Warehouse cannot be changed when status is {formData.status}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Items *</label>
                          <p className="text-xs text-gray-500 mt-1">
                            Warehouse selection is required for all items
                          </p>
                        </div>
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
                          No product added yet. Click "Add Product" to start.
                        </p>
                      )}
                      {formData.items.map((item, i) => {
                        const stockKey = item.variationId
                          ? `${i}_${item.productId}_${item.variationId}_${item.warehouseId}`
                          : `${i}_${item.productId}_${item.warehouseId}`;

                        const stockInfo = warehouseStocks[stockKey];
                        const isLoadingStock = loadingStocks[stockKey];

                        const effectiveAvailable = modalMode === 'edit'
                          ? (stockInfo?.availableQuantity || 0) + (item.originalPreparedQty || 0)
                          : (stockInfo?.availableQuantity || 0);

                        const hasInsufficientStock = stockInfo && item.preparedQty > effectiveAvailable;

                        const isDelivered = formData.status === 'DELIVERED';
                        const isInTransit = formData.status === 'IN_TRANSIT';
                        const isPreparing = formData.status === 'PREPARING';

                        return (
                          <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                            {/* Product Selection */}
                            <div className="mb-4">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Product *
                              </label>
                              <VariationSearchableDropdown
                                options={productOptions}
                                value={
                                  item.variationId
                                    ? `${item.productId}_${item.variationId}`
                                    : `prod_${item.productId}`
                                }
                                onChange={(value) => handleItemChange(i, 'productId', value)}
                                placeholder="Select Product Variation"
                                required
                                formData={formData}
                                index={i}
                                disabled={isDelivered || isInTransit}
                              />
                            </div>

                            {/* Warehouse Display */}
                            <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-center gap-2 text-sm">
                                <Package size={16} className="text-blue-600" />
                                <span className="font-medium text-blue-900">Warehouse:</span>
                                <span className="text-blue-700">
                                  {warehouseOptions.find(w => w.id === item.warehouseId)?.name || 'Not selected'}
                                </span>
                              </div>
                            </div>

                            {/* ✅ NEW: Two-Quantity System */}
                            <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  Prepared Qty (For Reservation) *
                                </label>
                                <input
                                  type="number"
                                  value={item.preparedQty || ''}
                                  onChange={(e) => handleItemChange(i, 'preparedQty', e.target.value)}
                                  className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-sm font-medium"
                                  min="0"
                                  disabled={isDelivered}
                                  placeholder="Enter prepared quantity"
                                  required
                                />
                                {(item.preparedQty === '' || item.preparedQty === 0 || item.preparedQty < 1) && (
                                  <p className="text-red-500 text-xs mt-1">Prepared quantity required (min 1)</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  This quantity will be reserved from warehouse stock
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Delivered Qty (Actual Received) *
                                  </label>
                                  <input
                                    type="number"
                                    value={item.deliveredQty || ''}
                                    onChange={(e) => handleItemChange(i, 'deliveredQty', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition text-sm font-medium ${isDelivered
                                      ? 'border-green-300 bg-green-50 focus:ring-green-500'
                                      : 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                      }`}
                                    min="0"
                                    max={(stockInfo?.availableQuantity || 0) + (item.preparedQty || 0)}
                                    disabled={!isDelivered}
                                    placeholder={isDelivered ? "Enter delivered quantity" : "Set when delivered"}
                                    required={isDelivered}
                                  />
                                  {isDelivered && (item.deliveredQty === '' || item.deliveredQty === 0 || item.deliveredQty < 1) && (
                                    <p className="text-red-500 text-xs mt-1">Delivered quantity required (min 1)</p>
                                  )}
                                  {isDelivered && item.deliveredQty > ((stockInfo?.availableQuantity || 0) + (item.preparedQty || 0)) && (
                                    <p className="text-red-500 text-xs mt-1">
                                      Cannot exceed available + prepared quantity ({(stockInfo?.availableQuantity || 0) + (item.preparedQty || 0)})
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {isDelivered
                                      ? `Max: ${(stockInfo?.availableQuantity || 0) + (item.preparedQty || 0)} (Available: ${stockInfo?.availableQuantity || 0} + Prepared: ${item.preparedQty || 0})`
                                      : "Enter this after changing status to DELIVERED"}
                                  </p>
                                </div>

                                {/* UOM */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    UOM (Unit of Measure)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.uom || ''}
                                    onChange={(e) => handleItemChange(i, 'uom', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-sm"
                                    placeholder="pcs, box, kg, etc."
                                    disabled={isDelivered || isInTransit}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Stock Information */}
                            {isLoadingStock && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-600 text-xs">
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span>Loading stock information...</span>
                                </div>
                              </div>
                            )}

                            {!isLoadingStock && stockInfo && (
                              <div className={`mt-2 p-2 rounded border ${hasInsufficientStock ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className={`text-xs ${hasInsufficientStock ? 'text-red-700' : 'text-blue-700'}`}>
                                  <div className="space-y-1">
                                    <div className="font-semibold text-sm">
                                      Available Stock: {stockInfo.availableQuantity || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Total: {stockInfo.quantity || 0} | Reserved: {stockInfo.reservedQuantity || 0}
                                    </div>
                                    {modalMode === 'edit' && item.originalPreparedQty > 0 && (
                                      <div className="text-xs text-blue-600">
                                        Originally Reserved: {item.originalPreparedQty}
                                        <div className="font-semibold text-green-700">
                                          Effective Available: {(stockInfo.availableQuantity || 0) + (item.originalPreparedQty || 0)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {hasInsufficientStock && modalMode === 'edit' && (
                                  <div className="text-orange-600 text-xs mt-1 font-medium">
                                    ℹ️ Note: Your originally reserved {item.originalPreparedQty} units are included in available stock for editing
                                  </div>
                                )}
                                {hasInsufficientStock && modalMode !== 'edit' && (
                                  <div className="text-red-600 text-xs mt-1 font-medium">
                                    ⚠️ Prepared quantity exceeds available stock!
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Remove Button - Only in PREPARING status */}
                            {isPreparing && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(i)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium mt-4"
                              >
                                <Trash2 size={16} />
                                Remove Item
                              </button>
                            )}
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
                      {modalMode === 'create' ? 'Create Delivery' : 'Update Delivery'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Modal */}
          {showModal && modalMode === 'view' && selectedDelivery && (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8">
                  {/* Delivery Information */}
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Delivery Receipt #</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedDelivery.deliveryReceiptNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(selectedDelivery.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>


                    {(selectedDelivery.datePrepared || selectedDelivery.dateDelivered) && (
                      <div className="grid grid-cols-2 gap-6">
                        {selectedDelivery.datePrepared && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Date Prepared</label>
                            <p className="text-base font-semibold text-gray-900">
                              {new Date(selectedDelivery.datePrepared).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        {selectedDelivery.dateDelivered && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Date Delivered</label>
                            <p className="text-base font-semibold text-green-700">
                              {new Date(selectedDelivery.dateDelivered).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Branch and Company Info */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">Delivered To (Branch)</label>
                          <p className="text-base font-semibold text-blue-900">{selectedDelivery.branch?.branchName}</p>
                          <p className="text-sm text-blue-700">Code: {selectedDelivery.branch?.branchCode || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">Company</label>
                          <p className="text-base font-semibold text-blue-900">{selectedDelivery.company?.companyName}</p>
                          <p className="text-sm text-blue-700">TIN: {selectedDelivery.company?.tin || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-blue-700 mb-1">Delivery Address</label>
                        <p className="text-sm text-blue-800">
                          {selectedDelivery.branch?.address &&
                            `${selectedDelivery.branch.address}, ${selectedDelivery.branch.city || ''}, ${selectedDelivery.branch.province || ''}`.trim()}
                          {!selectedDelivery.branch?.address && 'No address specified'}
                        </p>
                      </div>
                      {/* Add contact information if available */}
                      {selectedDelivery.branch?.contactNumber && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-blue-700 mb-1">Contact Number</label>
                          <p className="text-sm text-blue-800">{selectedDelivery.branch.contactNumber}</p>
                        </div>
                      )}
                    </div>

                    {/* Delivery Info */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">Delivery Prepared By</label>
                          <p className="text-base font-semibold text-green-900">{selectedDelivery.preparedBy || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">Transmittal</label>
                          <p className="text-base text-green-900">{selectedDelivery.transmittal || 'Not specified'}</p>
                        </div>
                      </div>
                      {selectedDelivery.remarks && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-green-700 mb-1">Delivery Remarks</label>
                          <p className="text-sm text-green-800 p-2 bg-white rounded">{selectedDelivery.remarks}</p>
                        </div>
                      )}
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-6">
                      {selectedDelivery.purchaseOrderNumber && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Order #</label>
                          <p className="text-base text-gray-900">{selectedDelivery.purchaseOrderNumber}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedDelivery.status)}`}>
                          {selectedDelivery.customStatus || selectedDelivery.status}
                        </span>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Items ({selectedDelivery.items?.length || 0} items)</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU & UPC</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prepared</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivered</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedDelivery.items && selectedDelivery.items.length > 0 ? (
                              selectedDelivery.items.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {item.product?.productName || 'Unknown Product'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="space-y-1">
                                      <div className="text-xs">
                                        <span className="font-medium">SKU:</span> {item.product?.sku || 'N/A'}
                                      </div>
                                      <div className="text-xs">
                                        <span className="font-medium">UPC:</span> {item.product?.upc || 'N/A'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.warehouse?.warehouseName || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                                    {item.preparedQty || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                                    {item.deliveredQty || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.uom || 'pcs'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">
                                  No items found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* If delivered, show delivery completion info */}
                    {selectedDelivery.status === 'DELIVERED' && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="text-green-600" size={20} />
                          <h3 className="text-sm font-medium text-green-800">Delivery Completed</h3>
                        </div>
                        <p className="text-sm text-green-700">
                          This delivery has been marked as delivered. All items have been successfully transferred to the branch.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleGenerateReceiptFull(selectedDelivery)}
                      className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md"
                    >
                      <Printer size={20} />
                      <span>Print Receipt</span>
                    </button>
                    {selectedDelivery.status !== 'DELIVERED' && (
                      <button
                        onClick={() => {
                          handleCloseModal();
                          setTimeout(() => handleOpenModal('edit', selectedDelivery), 100);
                        }}
                        className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
                      >
                        <Edit2 size={20} />
                        <span>Edit Delivery</span>
                      </button>
                    )}
                    <button
                      onClick={handleCloseModal}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}




          {showReceiptModal && receiptData && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none">
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10 print:hidden">
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Receipt</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveReceiptDetails}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Check size={18} />
                      Save Details
                    </button>
                    <button
                      onClick={() => {
                        // Show all elements for printing
                        document.querySelectorAll('.print-hidden').forEach(el => {
                          el.classList.remove('print-hidden');
                        });
                        setTimeout(() => {
                          window.print();
                          // Hide again after printing
                          setTimeout(() => {
                            document.querySelectorAll('.print-hidden').forEach(el => {
                              el.classList.add('print-hidden');
                            });
                          }, 500);
                        }, 100);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Printer size={18} />
                      Print Receipt
                    </button>
                    <button
                      onClick={() => setShowReceiptModal(false)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div id="delivery-receipt" className="p-8 print:p-0">
                  {/* Header Section */}
                  <div className="mb-5 pb-4">
                    <div className="text-left leading-none space-y-0">
                      <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight company-name">
                        WISECART MERCHANTS CORP.
                      </div>
                      <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
                        <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                        <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                        <div>VAT REG. TIN 010-751-561-00000</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline mt-2">
                      <div className="text-3xl font-bold text-gray-900 tracking-widest receipt-title">
                        DELIVERY RECEIPT
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">No.:</span>
                        <div className="text-black-900 text-lg w-48 border-b-2 border-gray-900 print:border-b-2 print:border-gray-900">
                          &nbsp;
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-4 -mt-4">
                    <div>
                      <div className="mb-3">
                        <div className="flex items-start mb-7">
                          <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">DELIVERED TO:</span>
                          <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                            {`${receiptData.branchName} - ${receiptData.companyName}`}
                          </div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-start mb-7">
                          <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">ADDRESS:</span>
                          <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                            {receiptData.branchAddress}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-start mb-3">
                          <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">BUSINESS STYLE:</span>
                          <div className="flex-1">
                            <textarea
                              value={receiptData.businessStyle || ''}
                              onChange={(e) => setReceiptData({
                                ...receiptData,
                                businessStyle: e.target.value
                              })}
                              rows={1}
                              className="text-black-900 text-sm w-full border-b border-gray-300 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden break-words resize-none overflow-hidden"
                              style={{ minHeight: '1.5rem' }}
                              onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                            />
                            <div className="hidden print:block text-black-900 text-sm break-words px-2">{receiptData.businessStyle || ''}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <div className="flex items-start mb-7">
                          <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">DATE:</span>
                          <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                            {receiptData.date}
                          </div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-start mb-7">
                          <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">TIN:</span>
                          <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                            {receiptData.companyTin}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 mb-3">
                        <div className="flex items-start flex-1 min-w-0">
                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2 flex-shrink-0">
                            TERMS OF PAYMENT:
                          </span>
                          <div className="flex-1" style={{ minWidth: '100px' }}>
                            <textarea
                              value={receiptData.termsOfPayment || ''}
                              onChange={(e) => setReceiptData({
                                ...receiptData,
                                termsOfPayment: e.target.value
                              })}
                              rows={1}
                              className="text-black-900 w-full border-b border-gray-300 text-sm px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden resize-none overflow-hidden break-words"
                              style={{ minHeight: '1.5rem', minWidth: '100px' }}
                              onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                            />
                            <div className="hidden print:block text-black-900 text-sm break-words px-2">
                              {receiptData.termsOfPayment || ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start flex-shrink-0">
                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2">
                            P.O. NUMBER:
                          </span>
                          <div className="w-32">
                            <textarea
                              value={receiptData.purchaseOrderNumber || ''}
                              onChange={(e) => setReceiptData({
                                ...receiptData,
                                purchaseOrderNumber: e.target.value
                              })}
                              rows={1}
                              className="text-black-900 w-full border-b border-gray-300 text-sm px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden resize-none overflow-hidden break-words"
                              style={{ minHeight: '1.5rem' }}
                              onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                            />
                            <div className="hidden print:block text-black-900 text-sm break-words px-2">
                              {receiptData.purchaseOrderNumber || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Items Table */}
                  <div className="-mt-3 leading-none">
                    <table className="w-full border-collapse" style={{ minHeight: '175mm' }}>
                      <thead>
                        <tr className="border-b border-gray-900">
                          <th className="text-left px-3 py-1.5 font-bold text-gray-900 text-xs uppercase tracking-wider" style={{ width: '12%' }}>          Quantity
                          </th>
                          <th className="text-left px-2 py-1.5 font-bold text-gray-900 text-xs uppercase tracking-wider" style={{ width: '9%' }}>
                            Unit
                          </th>
                          <th className="text-left px-3 py-1.5 font-bold text-gray-900 text-xs uppercase tracking-wider" style={{ width: '51%' }}>
                            Particulars
                          </th>
                          <th className="text-left px-3 py-1.5 font-bold text-gray-900 text-xs uppercase tracking-wider" style={{ width: '30%' }}>
                            {/* Conditionally show EXTRA header */}
                            {receiptData.items?.some(item => item.extra) && (
                              <input
                                type="text"
                                value={receiptData.extraHeader || 'EXTRA'}
                                onChange={(e) => setReceiptData({
                                  ...receiptData,
                                  extraHeader: e.target.value
                                })}
                                className="w-full bg-transparent font-bold text-xs uppercase px-0 py-0.5 border-none focus:outline-none focus:border-blue-500 print-hidden"
                              />
                            )}
                            {/* Print only version */}
                            <span className="print-only">
                              {receiptData.items?.some(item => item.extra) ? (receiptData.extraHeader || 'EXTRA') : ''}
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {receiptData.items?.length > 0 ? (
                          receiptData.items.map((item, i) => (
                            <tr key={i} className="align-top">
                              <td className="px-6 py-1 text-xs font-medium text-gray-900">
                                <input
                                  type="text"
                                  readOnly
                                  value={item.quantity || 1}
                                  className="w-full border-none bg-transparent p-0"
                                />
                              </td>
                              <td className="px-2 py-1 text-xs font-medium text-gray-900">
                                <input
                                  type="text"
                                  readOnly
                                  value={item.unit || 'pcs'}
                                  className="w-full border-none bg-transparent p-0"
                                />
                              </td>
                              <td className="px-3 py-1 text-xs text-gray-900 leading-tight">
                                <div className="font-semibold">
                                  <input
                                    type="text"
                                    readOnly
                                    value={`${item.product?.productName || 'Product'}${item.product?.upc ? ` - ${item.product.upc}` : ''}`}
                                    className="w-full border-none bg-transparent p-0"
                                  />
                                </div>
                                {item.particular && (
                                  <div className="text-[10px] text-gray-600 -mt-0.5">
                                    <input
                                      type="text"
                                      readOnly
                                      value={item.particular}
                                      className="w-full border-none bg-transparent p-0 text-[10px]"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-1 text-xs">
                                <input
                                  type="text"
                                  value={item.extra || ''}
                                  onChange={(e) => {
                                    const newItems = [...receiptData.items];
                                    newItems[i] = { ...newItems[i], extra: e.target.value };
                                    setReceiptData({
                                      ...receiptData,
                                      items: newItems
                                    });
                                  }}
                                  className="w-full bg-transparent border-b border-gray-300 text-xs px-0 py-0.5 focus:outline-none focus:border-blue-500 print:border-0 print:p-0 print-hidden"
                                />
                                <span className="print-only">{item.extra || ''}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-400 italic text-xs">
                              No items
                            </td>
                          </tr>
                        )}


                        {Array.from({ length: Math.max(0, 16 - (receiptData.items?.length || 0)) }).map((_, i) => (
                          <tr key={`empty-${i}`} className="border-b-0">
                            <td className="px-3 py-0.5 text-xs">&nbsp;</td>
                            <td className="px-2 py-0.5 text-xs">&nbsp;</td>
                            <td className="px-3 py-0.5 text-xs">&nbsp;</td>
                            <td className="px-3 py-0.5 text-xs">&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs text-black-900 text-[11px] mr-29 text-right mt-0 font-bold leading-tight">
                    Receive the above goods in good order and condition
                  </div>


                  <div className="grid grid-cols-2 gap-8 mt-4">
                    <div>
                      <div className="mb-3">
                        <div className="flex items-center mb-0">
                          <span className="font-bold text-gray-900 text-sm w-25 print:text-xs">Prepared by:</span>
                          <div className="relative">
                            <input
                              type="text"
                              value={receiptData.preparedBy || ''}
                              onChange={(e) => setReceiptData({
                                ...receiptData,
                                preparedBy: e.target.value
                              })}
                              className="text-black-900 text-sm w-full border-b border-gray-300 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden"
                            />
                            <div className="hidden print:block text-black-900 text-sm w-full px-2">
                              {receiptData.preparedBy || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <div className="flex items-center mb-0">
                          <span className="font-bold text-gray-900 text-sm w-40 print:text-xs">Received by:</span>
                          <div className="text-black-900 text-sm w-full border-b border-gray-300 print:border-b print:border-black h-5">
                            &nbsp;
                          </div>
                        </div>
                        <div className="text-xs text-black-900 mt-0 ml-32 font-bold print:text-xs print:ml-24 leading-tight">
                          Customer Signature over Printed Name
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center mb-0">
                          <span className="font-bold text-gray-900 text-sm w-40 print:text-xs">Date Received:</span>
                          <div className="text-black-900 text-sm w-full border-b border-gray-300 print:border-b print:border-black h-5">
                            &nbsp;
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="mt-12 pt-4 text-center">
                    <div className="text-gray-900 mb-2 text-[7.5px]">
                      PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002 • DATE ISSUED: OCT. 11, 2024 •
                      BIR AUTHORITY TO PRINT No. 080AU20240000016398 • DATE ISSUED: OCT. 23, 2024 •
                      APPROVED SERIES: 05001-10000 • 100PADS (2X)
                    </div>
                    <div className="text-xs font-bold text-gray-900 italic">
                      *THIS DOCUMENT IS NOT VALID FOR CLAIM INPUT TAX*
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-gray-200 flex justify-end gap-4 print:hidden">
                  <button
                    onClick={handleSaveReceiptDetails}
                    className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md"
                  >
                    <Check size={20} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
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
    </>
  );
};

export default DeliveryManagement;