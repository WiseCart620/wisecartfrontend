import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Check, X, ChevronDown, ChevronLeft, ChevronRight, Package, Calendar, User, MessageSquare, Warehouse, Store } from 'lucide-react';
import { api } from '../services/api';

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
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition text-sm ${
                    value === option[valueKey] ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
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

// Grouped Location Dropdown
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
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${
                    opt.isGroup
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    inventoryType: 'STOCK_IN',
    fromWarehouseId: '',
    toWarehouseId: '',
    fromBranchId: '',
    toBranchId: '',
    verificationDate: new Date().toISOString().split('T')[0],
    verifiedBy: '',
    remarks: '',
    status: 'PENDING',
    items: []
  });

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
      const [inventoriesData, productsData, warehousesData, branchesData] = await Promise.all([
        api.get('/inventories'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/branches')
      ]);
      
      // Filter only actual inventory records (exclude deliveries and sales)
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
    }
  };

  const loadWarehouseStock = async (warehouseId, productId, itemIndex) => {
    try {
      if (warehouseId && productId) {
        const stock = await api.get(`/stocks/warehouses/${warehouseId}/products/${productId}`);
        setWarehouseStocks(prev => ({
          ...prev,
          [`${itemIndex}_${productId}_${warehouseId}`]: stock
        }));
      }
    } catch (error) {
      console.error('Failed to load stock:', error);
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
        verificationDate: new Date().toISOString().split('T')[0],
        verifiedBy: localStorage.getItem('fullName') || localStorage.getItem('username') || '',
        remarks: '',
        status: 'PENDING',
        items: []
      });
      setWarehouseStocks({});
    } else if (mode === 'edit' && inventory) {
      if (inventory.status === 'CONFIRMED') {
        alert('Cannot edit a confirmed inventory record.');
        return;
      }
      
      try {
        const fullInventory = await api.get(`/inventories/${inventory.id}`);
        
        if (fullInventory.status === 'CONFIRMED') {
          alert('Cannot edit a confirmed inventory record.');
          return;
        }
        
        setSelectedInventory(fullInventory);
        setFormData({
          inventoryType: fullInventory.inventoryType,
          fromWarehouseId: fullInventory.fromWarehouse?.id || '',
          toWarehouseId: fullInventory.toWarehouse?.id || '',
          fromBranchId: fullInventory.fromBranch?.id || '',
          toBranchId: fullInventory.toBranch?.id || '',
          verificationDate: fullInventory.verificationDate,
          verifiedBy: fullInventory.verifiedBy,
          remarks: fullInventory.remarks || '',
          status: fullInventory.status || 'PENDING',
          items: fullInventory.items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
        });
        
        fullInventory.items.forEach(async (item, index) => {
          const warehouseId = fullInventory.fromWarehouse?.id || fullInventory.toWarehouse?.id;
          if (warehouseId && item.product?.id) {
            await loadWarehouseStock(warehouseId, item.product.id, index);
          }
        });
      } catch (error) {
        console.error('Failed to load inventory details');
        alert('Failed to load inventory details: ' + error.message);
      }
    } else if (mode === 'view' && inventory) {
      try {
        const fullInventory = await api.get(`/inventories/${inventory.id}`);
        setSelectedInventory(fullInventory);
      } catch (error) {
        console.error('Failed to load inventory details:', error);
      }
    }
    setShowModal(true);
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInventory(null);
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setFormData({ ...formData, items: newItems });

    if (field === 'productId') {
      const warehouseId = formData.fromWarehouseId || formData.toWarehouseId;
      if (warehouseId && value) {
        await loadWarehouseStock(warehouseId, value, index);
      }
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.verifiedBy) {
    alert('Please enter verified by name');
    return;
  }
  
  if (formData.items.length === 0) {
    alert('Please add at least one item');
    return;
  }

  // ✅ Log the data being sent
  console.log('=== SUBMITTING INVENTORY ===');
  console.log('Form Data:', formData);
  console.log('Inventory Type:', formData.inventoryType);
  console.log('From Warehouse ID:', formData.fromWarehouseId);
  console.log('To Warehouse ID:', formData.toWarehouseId);
  console.log('From Branch ID:', formData.fromBranchId);
  console.log('To Branch ID:', formData.toBranchId);
  console.log('Items:', formData.items);

  try {
    if (modalMode === 'create') {
      const payload = {
        ...formData,
        status: 'PENDING'
      };
      
      console.log('Payload being sent:', payload);
      
      const response = await api.post('/inventories', payload);
      
      console.log('Response received:', response);
      
      alert('Inventory record created successfully as PENDING!');
    } else {
      await api.put(`/inventories/${selectedInventory.id}`, formData);
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
  }
};


const handleConfirmInventory = async (inventory) => {
  // Build detailed confirmation message
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
  
  try {
    // Show loading state
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    loadingToast.textContent = '⏳ Confirming inventory...';
    document.body.appendChild(loadingToast);
    
    await api.patch(`/inventories/${inventory.id}/confirm`);
    
    // Remove loading toast
    document.body.removeChild(loadingToast);
    
    // Show success message
    alert(`✅ Inventory confirmed successfully!\n\n${inventory.inventoryType} record has been processed and stock levels have been updated.`);
    
    await loadData();
    
  } catch (error) {
    console.error('Failed to confirm inventory:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
    alert(`❌ Failed to confirm inventory:\n\n${errorMsg}\n\nPlease check stock availability and try again.`);
  }
};



  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inventory record?')) return;
    
    try {
      await api.delete(`/inventories/${id}`);
      alert('Inventory deleted successfully');
      loadData();
      if (filteredInventories.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      alert('Failed to delete: ' + error.message);
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

 const handleLocationChange = (type, val) => {
    console.log('=== LOCATION CHANGE ===');
    console.log('Type:', type);
    console.log('Value:', val);
    
    const [locationType, locationId] = val ? val.split('|') : [null, null];
    
    console.log('Parsed Location Type:', locationType);
    console.log('Parsed Location ID:', locationId);
    
    // ✅ FIX: Convert string to number or null
    const warehouseId = locationType === 'warehouse' ? (locationId ? parseInt(locationId, 10) : null) : null;
    const branchId = locationType === 'branch' ? (locationId ? parseInt(locationId, 10) : null) : null;
    
    const newFormData = {
      ...formData,
      [`${type}WarehouseId`]: warehouseId,
      [`${type}BranchId`]: branchId
    };
    
    console.log('New Form Data:', newFormData);
    console.log('Warehouse ID type:', typeof warehouseId, 'value:', warehouseId);
    console.log('Branch ID type:', typeof branchId, 'value:', branchId);
    
    setFormData(newFormData);
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
      inventory.verifiedBy?.toLowerCase().includes(searchLower) ||
      inventory.remarks?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'ALL' || inventory.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInventories = filteredInventories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventories.length / itemsPerPage);

  const productOptions = products.map(p => ({ 
    id: p.id, 
    name: `${p.productName} (${p.sku || p.upc})` 
  }));

  const needsFromLocation = ['TRANSFER', 'RETURN'].includes(formData.inventoryType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading Inventory Records...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Records Management</h1>
          <p className="text-gray-600">Track and manage inventory movements</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
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
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inventory.status)}`}>
                              {inventory.status || 'PENDING'}
                            </span>
                            {inventory.status === 'CONFIRMED' && (
                              <Check size={16} className="text-green-600" />
                            )}
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {/* FROM Location */}
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
                          
                          {/* TO Location */}
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
                          
                          {/* Special labels */}
                          {inventory.inventoryType === 'STOCK_IN' && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Stock In</span>
                          )}
                          {inventory.inventoryType === 'DAMAGE' && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Damaged</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(inventory.verificationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{inventory.items?.length || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inventory.status)}`}>
                          {inventory.status || 'PENDING'}
                        </span>
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
                            disabled={inventory.status === 'CONFIRMED'}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                                inventory.status === 'CONFIRMED'
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'
                            }`}
                            title={inventory.status === 'CONFIRMED' ? 'Cannot edit confirmed records' : 'Edit'}
                            >
                            <Edit2 size={18} />
                            </button>
                            
                            {/* ✅ CONFIRM BUTTON - Only show for PENDING records */}
                            {inventory.status === 'PENDING' && (
                              <button 
                                onClick={() => handleConfirmInventory(inventory)}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition shadow-sm group"
                                title="Confirm & Update Stock"
                              >
                                <Check size={18} />
                                <span className="text-sm font-medium">Confirm</span>
                                {/* Tooltip on hover */}
                                <div className="hidden group-hover:block absolute bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                                  This will update warehouse/branch stock levels
                                </div>
                              </button>
                            )}
                            
                            {/* DELETE BUTTON - Only show for PENDING records */}
                            {inventory.status === 'PENDING' && (
                            <button 
                                onClick={() => handleDelete(inventory.id)} 
                                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
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
          {filteredInventories.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInventories.length)} of {filteredInventories.length} results
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${
                    currentPage === 1 
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
                      className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${
                        currentPage === number
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
                  className={`p-2 rounded-lg border ${
                    currentPage === totalPages
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
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            inventoryType: t.value,
                            fromWarehouseId: (t.value === 'STOCK_IN' || t.value === 'DAMAGE') ? '' : prev.fromWarehouseId,
                            fromBranchId: (t.value === 'STOCK_IN' || t.value === 'DAMAGE') ? '' : prev.fromBranchId
                          }))}
                          className={`p-4 rounded-lg border-2 text-left transition ${
                            formData.inventoryType === t.value 
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
                    <div className={`p-5 rounded-lg border ${
                      needsFromLocation ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-200 col-span-2'
                    }`}>
                      <label className="block font-medium mb-2 text-blue-800">To Location *</label>
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
                        <Calendar className="inline mr-2" size={18}/>
                        Verification Date *
                      </label>
                      <input 
                        type="date" 
                        value={formData.verificationDate} 
                        onChange={e => setFormData(prev => ({...prev, verificationDate: e.target.value}))} 
                        required 
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-2">
                        <User className="inline mr-2" size={18}/>
                        Verified By *
                      </label>
                      <input 
                        type="text" 
                        value={formData.verifiedBy} 
                        onChange={e => setFormData(prev => ({...prev, verifiedBy: e.target.value}))} 
                        required 
                        placeholder="Name" 
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-medium mb-2">
                        <MessageSquare className="inline mr-2" size={18}/>
                        Remarks
                      </label>
                      <textarea 
                        rows={3} 
                        value={formData.remarks} 
                        onChange={e => setFormData(prev => ({...prev, remarks: e.target.value}))} 
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-lg font-semibold">
                        <Package className="inline mr-2" size={20}/>
                        Items *
                      </label>
                      <button 
                        type="button" 
                        onClick={handleAddItem} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus size={16}/> Add Item
                      </button>
                    </div>
                    {formData.items.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500">
                        No items yet. Click "Add Item" to start.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.items.map((item, i) => {
                          const stockKey = `${i}_${item.productId}_${formData.fromWarehouseId || formData.toWarehouseId}`;
                          const stockInfo = warehouseStocks[stockKey];
                          
                          return (
                            <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-8">
                                  <label className="block text-xs font-medium text-gray-700 mb-2">Product *</label>
                                  <SearchableDropdown
                                    options={productOptions}
                                    value={item.productId}
                                    onChange={(value) => handleItemChange(i, 'productId', value)}
                                    placeholder="Select Product"
                                    displayKey="name"
                                    valueKey="id"
                                    required
                                  />
                                  {stockInfo && (
                                    <div className="mt-2 text-xs text-blue-600">
                                      Available: {stockInfo.availableQuantity} units
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
                                    className="w-full px-4 py-3 border rounded-lg"
                                  />
                                </div>
                                <div className="md:col-span-1 flex items-end">
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveItem(i)} 
                                    className="p-3 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 size={18}/>
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
                    {modalMode === 'create' ? 'Create Record' : 'Update Record'}
                  </button>
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
                      <strong>Date:</strong> {new Date(selectedInventory.verificationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Verified By:</strong> {selectedInventory.verifiedBy}
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
                    <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(selectedInventory.status)}`}>
                      {selectedInventory.status || 'PENDING'}
                    </span>
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
                <p className="text-xs text-green-600 mt-2">
                  Confirmed on: {new Date(selectedInventory.confirmedAt).toLocaleString()}
                </p>
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
      </div>
    </div>
  );
};

export default InventoryRecordsManagement;