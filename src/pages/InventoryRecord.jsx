
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Check, X, ChevronDown, ChevronLeft, ChevronRight, Package, Calendar, User, MessageSquare, Warehouse, Store, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { LoadingOverlay } from './LoadingOverlay';

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
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
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
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No results found</div>
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
    option.subLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    className={`w-full px-4 py-3 text-left border-b border-gray-100 transition text-sm ${isAlreadySelected
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : value === option.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-900 hover:bg-blue-50'
                      }`}
                  >
                    {option.name}
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
            {/* Product Name Row */}
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

            {/* SKU and UPC Row */}
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

            {/* Variation Row (if exists) */}
            {selectedOption.subLabel && selectedOption.subLabel !== 'No variations' && (
              <div>
                <span className="text-gray-500">Variation:</span>
                <span className="ml-2 font-medium text-blue-600">{selectedOption.subLabel}</span>
              </div>
            )}

            {/* Badge Row */}
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


const GroupedLocationDropdown = ({ locations, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = locations.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selected = locations.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No results</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!opt.isGroup) {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }
                  }}
                  disabled={opt.isGroup}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${opt.isGroup
                    ? 'font-bold text-gray-700 bg-gray-100 cursor-default'
                    : value === opt.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-900'
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};




const SearchableLocationDropdown = ({ locations, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = locations.filter(loc =>
    loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selected = locations.find(loc => loc.id === parseInt(value));

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white text-sm"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 italic'}`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-xs">No results found</div>
            ) : (
              filtered.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    onChange(loc.id.toString());
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition ${value === loc.id.toString() ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                >
                  <div className="text-sm font-medium">{loc.name}</div>
                  {loc.code && <div className="text-xs text-gray-500">{loc.code}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};




const InventoryRecordsManagement = () => {
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseStocks, setWarehouseStocks] = useState({});
  const [branchStocks, setBranchStocks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [canModifyStatus, setCanModifyStatus] = useState({});
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState('');
  const [toWarehouseFilter, setToWarehouseFilter] = useState('');
  const [fromBranchFilter, setFromBranchFilter] = useState('');
  const [toBranchFilter, setToBranchFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [formData, setFormData] = useState({
    inventoryType: 'STOCK_IN',
    fromWarehouseId: '',
    toWarehouseId: '',
    fromBranchId: '',
    toBranchId: '',
    dateProcessed: new Date().toISOString().split('T')[0],
    processedBy: '',
    remarks: '',
    status: 'PENDING',
    items: []
  });




  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        localStorage.getItem('authUser');

      if (userStr) {
        const user = JSON.parse(userStr);
        return user.fullName || user.full_name || user.name || user.username || '';
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    return localStorage.getItem('fullName') ||
      localStorage.getItem('userName') ||
      localStorage.getItem('username') ||
      'System';
  };

  const inventoryTypes = [
    { value: 'STOCK_IN', label: 'Stock In', color: 'green' },
    { value: 'TRANSFER', label: 'Transfer', color: 'blue' },
    { value: 'RETURN', label: 'Return', color: 'yellow' },
    { value: 'DAMAGE', label: 'Damage', color: 'red' }
  ];

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading inventory records...');
      const [inventoriesRes, productsRes, warehousesRes, branchesRes] = await Promise.all([
        api.get('/inventories'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/branches')
      ]);

      const inventoriesData = inventoriesRes.success ? inventoriesRes.data || [] : [];
      const productsData = productsRes.success ? productsRes.data || [] : [];
      const warehousesData = warehousesRes.success ? warehousesRes.data || [] : [];
      const branchesData = branchesRes.success ? branchesRes.data || [] : [];

      const actualInventories = inventoriesData.filter(inv =>
        inv.inventoryType &&
        ['STOCK_IN', 'TRANSFER', 'RETURN', 'DAMAGE'].includes(inv.inventoryType)
      );

      setInventories(actualInventories);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Failed to load data', error);
      alert('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const loadLocationStock = async (productId, itemIndex) => {
    try {
      let locationId = null;
      let locationType = null;

      if (formData.fromWarehouseId) {
        locationId = formData.fromWarehouseId;
        locationType = 'warehouse';
      } else if (formData.fromBranchId) {
        locationId = formData.fromBranchId;
        locationType = 'branch';
      } else if (formData.toWarehouseId) {
        locationId = formData.toWarehouseId;
        locationType = 'warehouse';
      } else if (formData.toBranchId) {
        locationId = formData.toBranchId;
        locationType = 'branch';
      }

      if (locationId && productId && locationType) {
        let stockRes = null;

        if (locationType === 'warehouse') {
          stockRes = await api.get(`/stocks/warehouses/${locationId}/products/${productId}`);
          if (stockRes.success) {
            setWarehouseStocks(prev => ({
              ...prev,
              [`${itemIndex}_${productId}_${locationId}`]: stockRes.data
            }));
          }
        } else if (locationType === 'branch') {
          try {
            stockRes = await api.get(`/stocks/branches/${locationId}/products/${productId}`);
            if (stockRes.success) {
              setBranchStocks(prev => ({
                ...prev,
                [`${itemIndex}_${productId}_${locationId}`]: stockRes.data
              }));
            }
          } catch (error) {
            const defaultStock = { availableQuantity: 0, quantity: 0, reservedQuantity: 0 };
            setBranchStocks(prev => ({
              ...prev,
              [`${itemIndex}_${productId}_${locationId}`]: defaultStock
            }));
          }
        }

        return stockRes?.success ? stockRes.data : { availableQuantity: 0, quantity: 0, reservedQuantity: 0 };
      }
    } catch (error) {
      console.error('Failed to load stock:', error);
      return { availableQuantity: 0, quantity: 0, reservedQuantity: 0 };
    }
    return null;
  };

  const getItemStockInfo = (itemIndex, productId) => {
    let locationId = null;

    if (formData.fromWarehouseId) {
      locationId = formData.fromWarehouseId;
      const warehouseKey = `${itemIndex}_${productId}_${locationId}`;
      return warehouseStocks[warehouseKey];
    } else if (formData.fromBranchId) {
      locationId = formData.fromBranchId;
      const branchKey = `${itemIndex}_${productId}_${locationId}`;
      return branchStocks[branchKey];
    } else if (formData.toWarehouseId) {
      locationId = formData.toWarehouseId;
      const warehouseKey = `${itemIndex}_${productId}_${locationId}`;
      return warehouseStocks[warehouseKey];
    } else if (formData.toBranchId) {
      locationId = formData.toBranchId;
      const branchKey = `${itemIndex}_${productId}_${locationId}`;
      return branchStocks[branchKey];
    }

    return null;
  };


  const checkCanModify = async (inventoryId) => {
    try {
      const response = await api.get(`/inventories/${inventoryId}/can-modify`);

      const responseData = response.data?.data || response.data;


      if (response.success && responseData) {
        const canModify = responseData.canModify ?? false;
        const hasBeenUsed = responseData.hasBeenUsed ?? true;

        setCanModifyStatus(prev => ({
          ...prev,
          [inventoryId]: canModify
        }));
        return canModify;
      }
      return false;
    } catch (error) {
      console.error('Failed to check if inventory can be modified:', error);
      return false;
    }
  };


  const handleOpenModal = async (mode, inventory = null) => {
    setModalMode(mode);

    if (mode === 'create') {
      setSelectedInventory(null);
      setFormData({
        inventoryType: 'STOCK_IN',
        fromWarehouseId: '',
        toWarehouseId: '',
        fromBranchId: '',
        toBranchId: '',
        dateProcessed: new Date().toISOString().split('T')[0],
        processedBy: getCurrentUser(),
        remarks: '',
        status: 'PENDING',
        confirmedBy: '',
        items: []
      });
      setWarehouseStocks({});
      setBranchStocks({});
    } else if (mode === 'edit' && inventory) {
      // ✅ CHECK IF CONFIRMED INVENTORY CAN BE MODIFIED
      if (inventory.status === 'CONFIRMED') {
        const canModify = await checkCanModify(inventory.id);
        if (!canModify) {
          alert('❌ Cannot edit this inventory record\n\nThe stock from this inventory has already been used in deliveries or sales.\n\nTo modify this record, you would need to:\n1. Revert any deliveries/sales that used this stock\n2. Then edit the inventory record\n\nContact your administrator for assistance.');
          return;
        }

        // Show warning that editing will revert stock
        const confirmEdit = window.confirm(
          '⚠️ Warning: Editing CONFIRMED Inventory\n\n' +
          'This inventory has been confirmed but the stock hasn\'t been used yet.\n\n' +
          'Editing will:\n' +
          '• Revert this inventory to PENDING status\n' +
          '• Reverse the stock changes that were applied\n' +
          '• Require re-confirmation after editing\n\n' +
          'Do you want to continue?'
        );

        if (!confirmEdit) {
          return;
        }
      }

      try {
        const fullInventoryRes = await api.get(`/inventories/${inventory.id}`);

        if (!fullInventoryRes.success) {
          throw new Error(fullInventoryRes.error || 'Failed to load inventory');
        }

        const fullInventory = fullInventoryRes.data;

        setSelectedInventory(fullInventory);
        setFormData({
          inventoryType: fullInventory.inventoryType,
          fromWarehouseId: fullInventory.fromWarehouse?.id || '',
          toWarehouseId: fullInventory.toWarehouse?.id || '',
          fromBranchId: fullInventory.fromBranch?.id || '',
          toBranchId: fullInventory.toBranch?.id || '',
          dateProcessed: fullInventory.dateProcessed,
          processedBy: fullInventory.processedBy,
          remarks: fullInventory.remarks || '',
          status: 'PENDING',
          confirmedBy: fullInventory.confirmedBy || '',
          items: fullInventory.items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
        });

        setWarehouseStocks({});
        setBranchStocks({});

        for (let i = 0; i < fullInventory.items.length; i++) {
          const item = fullInventory.items[i];
          if (item.product?.id) {
            await loadLocationStock(item.product.id, i);
          }
        }
      } catch (error) {
        console.error('Failed to load inventory details');
        alert('Failed to load inventory details: ' + error.message);
      }
    } else if (mode === 'view' && inventory) {
      try {
        const fullInventoryRes = await api.get(`/inventories/${inventory.id}`);
        if (fullInventoryRes.success) {
          setSelectedInventory(fullInventoryRes.data);
        }
      } catch (error) {
        console.error('Failed to load inventory details:', error);
      }
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInventory(null);
    setWarehouseStocks({});
    setBranchStocks({});
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setFormData({ ...formData, items: newItems });

    if (field === 'productId' && value) {
      await loadLocationStock(value, index);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });

    const newWarehouseStocks = { ...warehouseStocks };
    const newBranchStocks = { ...branchStocks };

    Object.keys(warehouseStocks).forEach(key => {
      if (key.startsWith(`${index}_`)) {
        delete newWarehouseStocks[key];
      }
    });

    Object.keys(branchStocks).forEach(key => {
      if (key.startsWith(`${index}_`)) {
        delete newBranchStocks[key];
      }
    });

    setWarehouseStocks(newWarehouseStocks);
    setBranchStocks(newBranchStocks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.processedBy) {
      alert('Please enter processed by name');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    try {
      setActionLoading(true);
      setLoadingMessage(modalMode === 'create' ? 'Creating inventory record...' : 'Updating inventory record...');
      const payload = {
        ...formData,
        status: 'PENDING'
      };

      if (modalMode === 'create') {
        const response = await api.post('/inventories', payload);
        alert('Inventory record created successfully as PENDING!');
      } else {
        await api.put(`/inventories/${selectedInventory.id}`, payload);
        alert('Inventory record updated successfully!');
      }

      handleCloseModal();
      loadData();
      setCurrentPage(1);
    } catch (error) {
      console.error('=== ERROR SUBMITTING ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      alert('Failed to save inventory: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };



  const handleConfirmInventory = async (inventory, confirmedByUser = null) => {
    let locationInfo = '';
    if (inventory.inventoryType === 'STOCK_IN') {
      locationInfo = `\n📦 Adding stock to: ${inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName}`;
    } else if (inventory.inventoryType === 'TRANSFER') {
      const from = inventory.fromWarehouse?.warehouseName || inventory.fromBranch?.branchName;
      const to = inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName;
      locationInfo = `\n📦 Transfer from: ${from}\n📍 Transfer to: ${to}`;
    } else if (inventory.inventoryType === 'RETURN') {
      const from = inventory.fromBranch?.branchName;
      const to = inventory.toWarehouse?.warehouseName;
      locationInfo = `\n📦 Return from: ${from}\n📍 Return to: ${to}`;
    } else if (inventory.inventoryType === 'DAMAGE') {
      locationInfo = `\n📦 Mark damaged at: ${inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName}`;
    }

    const itemCount = inventory.items?.length || 0;
    const totalQty = inventory.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    const confirmMessage = `Are you sure you want to confirm this ${inventory.inventoryType} record?${locationInfo}\n\n📊 Items: ${itemCount}\n📦 Total Quantity: ${totalQty}\n\n⚠️ This will update stock levels and cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const currentUser = confirmedByUser || getCurrentUser() || 'System';

    try {
      setActionLoading(true);
      setLoadingMessage('Confirming inventory...');
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      loadingToast.textContent = '⏳ Confirming inventory...';
      document.body.appendChild(loadingToast);

      const response = await api.patch(`/inventories/${inventory.id}/confirm`, {
        confirmedBy: currentUser
      });

      document.body.removeChild(loadingToast);

      if (response.success) {
        alert(`✅ Inventory confirmed successfully!\n\n${inventory.inventoryType} record has been processed and stock levels have been updated.`);
        await loadData();
      } else {
        alert(response.error || 'Failed to confirm inventory');
      }

    } catch (error) {
      console.error('Failed to confirm inventory:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`❌ Failed to confirm inventory:\n\n${errorMsg}\n\nPlease check stock availability and try again.`);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = async (id) => {
    const inventory = inventories.find(inv => inv.id === id);

    if (inventory && inventory.status === 'CONFIRMED') {

      const canModify = await checkCanModify(id);

      if (!canModify) {
        alert('❌ Cannot delete this inventory record\n\nThe stock from this inventory has already been used in deliveries or sales.\n\nDeleting this would create stock inconsistencies.\n\nContact your administrator if you need to adjust this record.');
        return;
      }

      // Show warning about deleting confirmed inventory
      const confirmDelete = window.confirm(
        '⚠️ Warning: Deleting CONFIRMED Inventory\n\n' +
        'This inventory has been confirmed but the stock hasn\'t been used yet.\n\n' +
        'Deleting will:\n' +
        '• Permanently remove this inventory record\n' +
        '• Reverse all stock changes that were applied\n' +
        '• Cannot be undone\n\n' +
        'Are you absolutely sure you want to delete this record?'
      );

      if (!confirmDelete) {
        return;
      }
    } else {
      if (!window.confirm('Are you sure you want to delete this inventory record?')) {
        return;
      }
    }

    try {
      setActionLoading(true);
      setLoadingMessage('Deleting inventory record...');

      const response = await api.delete(`/inventories/${id}`);

      if (response.success) {
        alert('✅ Inventory deleted successfully');
        loadData();
        if (filteredInventories.length % itemsPerPage === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        alert(response.error || 'Failed to delete inventory');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('❌ Failed to delete: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const getLocationOptions = (inventoryType, locationType = 'to') => {
    const opts = [];

    if (inventoryType === 'STOCK_IN' && locationType === 'to') {
      opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
      warehouses.forEach(wh => {
        opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
      });
      return opts;
    }

    if (inventoryType === 'RETURN') {
      if (locationType === 'from') {
        opts.push({ value: '', label: 'BRANCHES', isGroup: true });
        branches.forEach(branch => {
          opts.push({ value: `branch|${branch.id}`, label: `${branch.branchName} (${branch.branchCode})` });
        });
        opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
        warehouses.forEach(wh => {
          opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
        });
        return opts;
      } else {
        opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
        warehouses.forEach(wh => {
          opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
        });
        return opts;
      }
    }

    if (inventoryType === 'DAMAGE' && locationType === 'to') {
      opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
      warehouses.forEach(wh => {
        opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
      });
      return opts;
    }

    if (inventoryType === 'TRANSFER') {
      if (locationType === 'from') {
        opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
        warehouses.forEach(wh => {
          opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
        });
        return opts;
      } else {
        opts.push({ value: '', label: 'WAREHOUSES', isGroup: true });
        warehouses.forEach(wh => {
          opts.push({ value: `warehouse|${wh.id}`, label: `${wh.warehouseName} (${wh.warehouseCode})` });
        });
        opts.push({ value: '', label: 'BRANCHES', isGroup: true });
        branches.forEach(branch => {
          opts.push({ value: `branch|${branch.id}`, label: `${branch.branchName} (${branch.branchCode})` });
        });
        return opts;
      }
    }

    return opts;
  };

  const handleLocationChange = async (type, val) => {
    const [locationType, locationId] = val ? val.split('|') : [null, null];
    const warehouseId = locationType === 'warehouse' ? (locationId ? parseInt(locationId, 10) : null) : null;
    const branchId = locationType === 'branch' ? (locationId ? parseInt(locationId, 10) : null) : null;

    const newFormData = {
      ...formData,
      [`${type}WarehouseId`]: warehouseId,
      [`${type}BranchId`]: branchId
    };

    setFormData(newFormData);

    setWarehouseStocks({});
    setBranchStocks({});

    if (newFormData.items.length > 0) {
      for (let i = 0; i < newFormData.items.length; i++) {
        const item = newFormData.items[i];
        if (item.productId) {
          await loadLocationStock(item.productId, i);
        }
      }
    }
  };

  const handleInventoryTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      inventoryType: type,
      fromWarehouseId: (type === 'STOCK_IN' || type === 'DAMAGE') ? '' : prev.fromWarehouseId,
      fromBranchId: (type === 'STOCK_IN' || type === 'DAMAGE') ? '' : prev.fromBranchId,
      items: []
    }));
    setWarehouseStocks({});
    setBranchStocks({});
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type) => {
    const colors = {
      STOCK_IN: 'bg-green-100 text-green-800',
      TRANSFER: 'bg-blue-100 text-blue-800',
      RETURN: 'bg-yellow-100 text-yellow-800',
      DAMAGE: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const sortByStatus = (inventories) => {
    return [...inventories].sort((a, b) => {
      const isAConfirmed = a.status === 'CONFIRMED' ? 1 : 0;
      const isBConfirmed = b.status === 'CONFIRMED' ? 1 : 0;

      if (isAConfirmed !== isBConfirmed) {
        return isAConfirmed - isBConfirmed;
      }

      return 0;
    });
  };

  const filteredInventories = sortByStatus(inventories.filter(inventory => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      inventory.processedBy?.toLowerCase().includes(searchLower) ||
      inventory.remarks?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'ALL' || inventory.status === statusFilter;

    const matchesType = typeFilter === 'ALL' || inventory.inventoryType === typeFilter;

    const matchesFromWarehouse = !fromWarehouseFilter || inventory.fromWarehouse?.id === parseInt(fromWarehouseFilter);

    const matchesToWarehouse = !toWarehouseFilter || inventory.toWarehouse?.id === parseInt(toWarehouseFilter);

    const matchesFromBranch = !fromBranchFilter || inventory.fromBranch?.id === parseInt(fromBranchFilter);

    const matchesToBranch = !toBranchFilter || inventory.toBranch?.id === parseInt(toBranchFilter);

    const inventoryDate = new Date(inventory.dateProcessed);
    const matchesStartDate = !startDateFilter || inventoryDate >= new Date(startDateFilter);
    const matchesEndDate = !endDateFilter || inventoryDate <= new Date(endDateFilter + 'T23:59:59');

    return matchesSearch && matchesStatus && matchesType &&
      matchesFromWarehouse && matchesToWarehouse &&
      matchesFromBranch && matchesToBranch &&
      matchesStartDate && matchesEndDate;
  }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInventories = filteredInventories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventories.length / itemsPerPage);

  const productOptions = products.flatMap(p => {
    if (p.variations && p.variations.length > 0) {
      return p.variations.map(v => {
        const dropdownName = `${v.upc || 'N/A'} - ${p.productName} - ${v.sku || 'N/A'}`;

        const variationLabel = v.combinationDisplay ||
          (v.attributes ? Object.entries(v.attributes || {})
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ') : 'Variation');

        return {
          id: v.id,
          parentProductId: p.id,
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
        id: p.id,
        parentProductId: p.id,
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

  const needsFromLocation = ['TRANSFER', 'RETURN'].includes(formData.inventoryType);


  return (
    <>
      <LoadingOverlay show={loading || actionLoading} message={loadingMessage || ''} />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Records Management</h1>
            <p className="text-gray-600">Track and manage inventory movements</p>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
              <button
                onClick={() => handleOpenModal('create')}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
              >
                <Plus size={20} />
                <span>New Inventory Record</span>
              </button>

              <div className="flex gap-3 items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Inventory Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ALL">All Types</option>
                  <option value="STOCK_IN">Stock In</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="RETURN">Return</option>
                  <option value="DAMAGE">Damage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">From Warehouse</label>
                <SearchableLocationDropdown
                  locations={warehouses.map(wh => ({ id: wh.id, name: wh.warehouseName, code: wh.warehouseCode }))}
                  value={fromWarehouseFilter}
                  onChange={setFromWarehouseFilter}
                  placeholder="All Warehouses"
                  label="warehouses"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">To Warehouse</label>
                <SearchableLocationDropdown
                  locations={warehouses.map(wh => ({ id: wh.id, name: wh.warehouseName, code: wh.warehouseCode }))}
                  value={toWarehouseFilter}
                  onChange={setToWarehouseFilter}
                  placeholder="All Warehouses"
                  label="warehouses"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">From Branch</label>
                <SearchableLocationDropdown
                  locations={branches.map(br => ({ id: br.id, name: br.branchName, code: br.branchCode }))}
                  value={fromBranchFilter}
                  onChange={setFromBranchFilter}
                  placeholder="All Branches"
                  label="branches"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">To Branch</label>
                <SearchableLocationDropdown
                  locations={branches.map(br => ({ id: br.id, name: br.branchName, code: br.branchCode }))}
                  value={toBranchFilter}
                  onChange={setToBranchFilter}
                  placeholder="All Branches"
                  label="branches"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={() => {
                    setTypeFilter('ALL');
                    setFromWarehouseFilter('');
                    setToWarehouseFilter('');
                    setFromBranchFilter('');
                    setToBranchFilter('');
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setSearchTerm('');
                    setStatusFilter('ALL');
                  }}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Inventories Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentInventories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        {filteredInventories.length === 0 ? 'No inventory records found' : 'No records on this page'}
                      </td>
                    </tr>
                  ) : (
                    currentInventories.map((inventory) => (
                      <tr key={inventory.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(inventory.inventoryType)}`}>
                            {inventory.inventoryType?.replace('_', ' ') || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {(inventory.fromWarehouse || inventory.fromBranch) && (
                              <>
                                {inventory.fromWarehouse && (
                                  <div className="flex items-center gap-1">
                                    <Warehouse size={14} className="text-blue-600" />
                                    <span className="font-medium">{inventory.fromWarehouse.warehouseName}</span>
                                  </div>
                                )}
                                {inventory.fromBranch && (
                                  <div className="flex items-center gap-1">
                                    <Store size={14} className="text-green-600" />
                                    <span className="font-medium">{inventory.fromBranch.branchName}</span>
                                  </div>
                                )}
                                <span className="text-gray-400">→</span>
                              </>
                            )}

                            {inventory.toWarehouse && (
                              <div className="flex items-center gap-1">
                                <Warehouse size={14} className="text-blue-600" />
                                <span className="font-medium">{inventory.toWarehouse.warehouseName}</span>
                              </div>
                            )}
                            {inventory.toBranch && (
                              <div className="flex items-center gap-1">
                                <Store size={14} className="text-green-600" />
                                <span className="font-medium">{inventory.toBranch.branchName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(inventory.dateProcessed).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">{inventory.items?.length || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inventory.status)}`}>
                                {inventory.status || 'PENDING'}
                              </span>
                              {inventory.status === 'CONFIRMED' && (
                                <Check size={16} className="text-green-600" />
                              )}
                            </div>
                            {inventory.status === 'CONFIRMED' && inventory.confirmedBy && (
                              <span className="text-xs text-gray-500">
                                by {inventory.confirmedBy}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenModal('view', inventory)}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenModal('edit', inventory)}
                              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition"
                              title={inventory.status === 'CONFIRMED' ? 'Edit (will check if modifiable)' : 'Edit'}
                            >
                              <Edit2 size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(inventory.id)}
                              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                              title={inventory.status === 'CONFIRMED' ? 'Delete (will check if modifiable)' : 'Delete'}
                            >
                              <Trash2 size={18} />
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
            {filteredInventories.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInventories.length)} of {filteredInventories.length} results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border ${currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed border-gray-200'
                      : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                      }`}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => setCurrentPage(number)}
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === 'create' ? 'Create New Inventory Record' : 'Edit Inventory Record'}
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
                    {/* Inventory Type */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Inventory Type</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {inventoryTypes.map(t => (
                          <button
                            type="button"
                            key={t.value}
                            onClick={() => handleInventoryTypeChange(t.value)}
                            className={`p-4 rounded-lg border-2 text-left transition ${formData.inventoryType === t.value
                              ? `border-${t.color}-500 bg-${t.color}-50 text-${t.color}-700`
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="font-semibold">{t.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {needsFromLocation && (
                        <div className="p-5 bg-red-50 rounded-lg border border-red-200">
                          <label className="block font-medium mb-2 text-red-800">From Location *</label>
                          <GroupedLocationDropdown
                            locations={getLocationOptions(formData.inventoryType, 'from')}
                            value={formData.fromWarehouseId ? `warehouse|${formData.fromWarehouseId}` : formData.fromBranchId ? `branch|${formData.fromBranchId}` : ''}
                            onChange={val => handleLocationChange('from', val)}
                            placeholder="Select source location..."
                          />
                        </div>
                      )}
                      <div className={`p-5 rounded-lg border ${formData.inventoryType === 'DAMAGE'
                        ? 'bg-red-50 border-red-200 col-span-2'
                        : needsFromLocation
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-blue-50 border-blue-200 col-span-2'
                        }`}>
                        <label className={`block font-medium mb-2 ${formData.inventoryType === 'DAMAGE' ? 'text-red-800' : 'text-blue-800'}`}>
                          To Location *
                        </label>
                        <GroupedLocationDropdown
                          locations={getLocationOptions(formData.inventoryType, 'to')}
                          value={formData.toWarehouseId ? `warehouse|${formData.toWarehouseId}` : formData.toBranchId ? `branch|${formData.toBranchId}` : ''}
                          onChange={val => handleLocationChange('to', val)}
                          placeholder="Select destination..."
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block font-medium mb-2">
                          <Calendar className="inline mr-2" size={18} />
                          Date Processed*
                        </label>
                        <input
                          type="date"
                          value={formData.dateProcessed}
                          onChange={e => setFormData(prev => ({ ...prev, dateProcessed: e.target.value }))}
                          required
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-2">
                          <User className="inline mr-2" size={18} />
                          Processed By *
                        </label>
                        <input
                          type="text"
                          value={formData.processedBy}
                          onChange={e => setFormData(prev => ({ ...prev, processedBy: e.target.value }))}
                          required
                          placeholder="Name"
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {(modalMode === 'edit' && selectedInventory?.status === 'PENDING') && (
                        <div className="md:col-span-2">
                          <label className="block font-medium mb-2">
                            <User className="inline mr-2" size={18} />
                            Confirmed By (Optional - defaults to current user)
                          </label>
                          <input
                            type="text"
                            value={formData.confirmedBy || ''}
                            onChange={e => setFormData(prev => ({ ...prev, confirmedBy: e.target.value }))}
                            placeholder={getCurrentUser() || 'Current User'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use current user: {getCurrentUser() || 'Current User'}
                          </p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="block font-medium mb-2">
                          <MessageSquare className="inline mr-2" size={18} />
                          Remarks
                        </label>
                        <textarea
                          rows={3}
                          value={formData.remarks}
                          onChange={e => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-lg font-semibold">
                          <Package className="inline mr-2" size={20} />
                          Items *
                          {(formData.toWarehouseId || formData.toBranchId || formData.fromWarehouseId || formData.fromBranchId) && (
                            <span className="ml-2 text-sm font-normal text-blue-600">
                              (
                              {formData.fromWarehouseId && `From: ${warehouses.find(w => w.id === formData.fromWarehouseId)?.warehouseName}`}
                              {formData.fromBranchId && `From: ${branches.find(b => b.id === formData.fromBranchId)?.branchName}`}
                              {formData.toWarehouseId && `To: ${warehouses.find(w => w.id === formData.toWarehouseId)?.warehouseName}`}
                              {formData.toBranchId && `To: ${branches.find(b => b.id === formData.toBranchId)?.branchName}`}
                              )
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus size={16} /> Add Product
                        </button>
                      </div>

                      {/* Location Required Warning */}
                      {!formData.toWarehouseId && !formData.toBranchId && !(formData.fromWarehouseId || formData.fromBranchId) && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
                            <div>
                              <p className="text-sm text-yellow-800 font-medium">Select a location first</p>
                              <p className="text-xs text-yellow-700">Please select a source or destination location to see available stock levels</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.items.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500">
                          No products yet. Click "Add Product" to start.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.items.map((item, i) => {
                            const stockInfo = getItemStockInfo(i, item.productId);
                            const selectedLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;

                            return (
                              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                  <div className="md:col-span-8">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Product *</label>
                                    <VariationSearchableDropdown
                                      options={productOptions}
                                      value={item.productId}
                                      onChange={(value) => handleItemChange(i, 'productId', value)}
                                      placeholder="Select Product Variation"
                                      required
                                      formData={formData}
                                      index={i}
                                    />

                                    {/* Stock Information Display */}
                                    {selectedLocation && item.productId && stockInfo && (
                                      <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                                        <div className="text-xs text-gray-700">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium">Available Stock:</span>
                                            <span className={`font-bold ${item.quantity > stockInfo.availableQuantity ? 'text-red-600' : 'text-green-600'}`}>
                                              {stockInfo.availableQuantity || 0} units
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Total:</span>
                                            <span>{stockInfo.quantity || 0}</span>
                                          </div>
                                          {stockInfo.reservedQuantity > 0 && (
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                              <span>Reserved:</span>
                                              <span>{stockInfo.reservedQuantity || 0}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Warning if quantity exceeds available */}
                                        {item.quantity > stockInfo.availableQuantity && formData.inventoryType !== 'STOCK_IN' && (
                                          <div className="mt-1 flex items-center gap-1 text-red-600 text-xs font-medium">
                                            <AlertCircle size={12} />
                                            Quantity exceeds available stock!
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Stock not loaded yet */}
                                    {selectedLocation && item.productId && !stockInfo && (
                                      <div className="mt-2">
                                        <div className="text-xs text-gray-500 italic">Loading stock information...</div>
                                      </div>
                                    )}

                                    {/* No location selected */}
                                    {!selectedLocation && item.productId && (
                                      <div className="mt-2">
                                        <div className="text-xs text-yellow-600 italic">
                                          Select a location to see stock availability
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Quantity *</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity || ''}
                                      onChange={e => handleItemChange(i, 'quantity', e.target.value)}
                                      required
                                      className={`w-full px-4 py-3 border rounded-lg ${stockInfo && item.quantity > stockInfo.availableQuantity && formData.inventoryType !== 'STOCK_IN'
                                        ? 'border-red-300 bg-red-50'
                                        : ''
                                        }`}
                                    />
                                    {stockInfo && item.quantity > stockInfo.availableQuantity && formData.inventoryType !== 'STOCK_IN' && (
                                      <div className="text-xs text-red-500 mt-1">
                                        Max available: {stockInfo.availableQuantity}
                                      </div>
                                    )}
                                  </div>

                                  <div className="md:col-span-1 flex items-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(i)}
                                      className="p-3 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                    <div>
                      {modalMode === 'edit' && selectedInventory && selectedInventory.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmedByUser = formData.confirmedBy || getCurrentUser() || 'System';
                            handleCloseModal();
                            await handleConfirmInventory(selectedInventory, confirmedByUser);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg transition shadow-sm font-medium"
                        >
                          <Check size={18} />
                          <span>Confirm Inventory</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4">
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
                        {modalMode === 'create' ? 'Create Record' : 'Update Record'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Modal */}
          {showModal && modalMode === 'view' && selectedInventory && (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
                  <h2 className="text-2xl font-bold text-gray-900">Inventory Record Details</h2>
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
                      <h3 className="font-semibold text-gray-700 mb-2">Record Information</h3>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Type:</strong>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getTypeColor(selectedInventory.inventoryType)}`}>
                          {selectedInventory.inventoryType?.replace('_', ' ')}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Date:</strong> {new Date(selectedInventory.dateProcessed).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Processed By:</strong> {selectedInventory.processedBy}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Locations</h3>
                      {selectedInventory.fromWarehouse && (
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>From Warehouse:</strong> {selectedInventory.fromWarehouse.warehouseName}
                        </p>
                      )}
                      {selectedInventory.fromBranch && (
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>From Branch:</strong> {selectedInventory.fromBranch.branchName}
                        </p>
                      )}
                      {selectedInventory.toWarehouse && (
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>To Warehouse:</strong> {selectedInventory.toWarehouse.warehouseName}
                        </p>
                      )}
                      {selectedInventory.toBranch && (
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>To Branch:</strong> {selectedInventory.toBranch.branchName}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
                      <div className="space-y-2">
                        <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(selectedInventory.status)}`}>
                          {selectedInventory.status || 'PENDING'}
                        </span>

                        {selectedInventory.status === 'CONFIRMED' && selectedInventory.confirmedBy && (
                          <div className="text-sm text-gray-600 space-y-1 mt-2">
                            <p>
                              <strong>Confirmed By:</strong> {selectedInventory.confirmedBy}
                            </p>
                            {selectedInventory.confirmedAt && (
                              <p>
                                <strong>Confirmed At:</strong> {new Date(selectedInventory.confirmedAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedInventory.status === 'CONFIRMED' && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <Check size={18} />
                          Stock Update Applied
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-green-700 font-medium">Total Items Updated:</p>
                            <p className="text-green-900 text-lg font-bold">
                              {selectedInventory.items?.length || 0} products
                            </p>
                          </div>
                          <div>
                            <p className="text-green-700 font-medium">Total Quantity:</p>
                            <p className="text-green-900 text-lg font-bold">
                              {selectedInventory.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} units
                            </p>
                          </div>
                        </div>
                        {selectedInventory.confirmedAt && (
                          <div className="mt-2 text-xs text-green-600 space-y-0.5">
                            <p>Confirmed on: {new Date(selectedInventory.confirmedAt).toLocaleString()}</p>
                            {selectedInventory.confirmedBy && (
                              <p>Confirmed by: {selectedInventory.confirmedBy}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedInventory.remarks && (
                    <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-gray-700 mb-2">Remarks</h3>
                      <p className="text-sm text-gray-600">{selectedInventory.remarks}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-4 text-lg">Items</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Product</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedInventory.items && selectedInventory.items.length > 0 ? (
                            selectedInventory.items.map((item, i) => (
                              <tr key={i} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  <div>{item.product.productName}</div>
                                  <div className="text-xs text-gray-500">{item.product.sku || item.product.upc}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {item.quantity.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="px-6 py-12 text-center text-gray-500 italic">
                                No items in this record
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-gray-200 flex justify-between items-center">
                  <div>
                    {selectedInventory.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          handleCloseModal();
                          handleConfirmInventory(selectedInventory);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg transition shadow-sm font-medium"
                      >
                        <Check size={18} />
                        <span>Confirm Inventory</span>
                      </button>
                    )}
                  </div>
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
        </div>
      </div>
    </>
  );
};

export default InventoryRecordsManagement;