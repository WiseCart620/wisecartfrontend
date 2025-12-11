import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Check, Filter, X, ChevronDown, ChevronLeft, ChevronRight, Truck, Package, Printer, Warehouse } from 'lucide-react';
import { api } from '../services/api';
import './deliveryReceipt.css';

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

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchInfo, setBranchInfo] = useState(null);
  const [warehouseStocks, setWarehouseStocks] = useState({});
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    branchId: '',
    date: new Date().toISOString().split('T')[0],
    deliveryReceiptNumber: '',
    purchaseOrderNumber: '',
    transmittal: '',
    preparedBy: '',
    status: 'PENDING',
    customStatus: '',
    remarks: '',
    items: []
  });

  const [filterData, setFilterData] = useState({
    clientId: '',
    branchId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const handleGenerateReceipt = (delivery) => {
    try {
      const receipt = {
        id: delivery.id,
        deliveryReceiptNumber: delivery.deliveryReceiptNumber,
        date: new Date(delivery.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        branchName: delivery.branchName,
        clientName: delivery.clientName,
        clientTin: delivery.client?.tin || 'N/A',
        branchAddress: `${delivery.branch?.address || ''}, ${delivery.branch?.city || ''}, ${delivery.branch?.province || ''}`.trim(),
        preparedBy: delivery.preparedBy || 'N/A',
        purchaseOrderNumber: delivery.purchaseOrderNumber || '',
        remarks: delivery.remarks || '',
        items: delivery.items || [],
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
        clientName: fullDelivery.client?.clientName || delivery.clientName,
        clientTin: fullDelivery.client?.tin || 'N/A',
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const loadWarehouseStock = async (warehouseId, productId, itemIndex) => {
    try {
      if (warehouseId && productId) {
        const stock = await api.get(`/stocks/warehouses/${warehouseId}/products/${productId}`);
        
        if (stock.success) {
          setWarehouseStocks(prev => ({
            ...prev,
            [`${itemIndex}_${productId}_${warehouseId}`]: stock.data
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load stock information:', error);
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

    const invalidQuantities = formData.items.filter(item => !item.quantity || item.quantity < 1);
    if (invalidQuantities.length > 0) {
      alert('Please enter valid quantities (minimum 1) for all items');
      return false;
    }

    return true;
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setFormData({ ...formData, items: newItems });

    if (field === 'warehouseId' || field === 'productId') {
      const item = newItems[index];
      if (item.warehouseId && item.productId) {
        await loadWarehouseStock(item.warehouseId, item.productId, index);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deliveriesRes, branchesRes, productsRes, warehousesRes, clientsRes] = await Promise.all([
        api.get('/deliveries/list'),
        api.get('/branches'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/clients')
      ]);

      if (deliveriesRes.success) setDeliveries(deliveriesRes.data || []);
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (clientsRes.success) setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Failed to load data', error);
      alert('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (mode, delivery = null) => {
    setModalMode(mode);
    
    if (mode === 'create') {
      setSelectedDelivery(null);
      setFormData({
        branchId: '',
        date: new Date().toISOString().split('T')[0],
        deliveryReceiptNumber: '',
        purchaseOrderNumber: '',
        transmittal: '',
        preparedBy: localStorage.getItem('fullName') || localStorage.getItem('username') || '',
        status: 'PENDING',
        customStatus: '',
        remarks: '',
        items: []
      });
      setBranchInfo(null);
      setWarehouseStocks({});
    } else if (mode === 'edit' && delivery) {
      if (delivery.status === 'DELIVERED') {
        alert('Cannot edit a delivery that has already been DELIVERED.');
        return;
      }
      
      try {
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
        setFormData({
          branchId: fullDelivery.branch.id,
          date: fullDelivery.date,
          deliveryReceiptNumber: fullDelivery.deliveryReceiptNumber,
          purchaseOrderNumber: fullDelivery.purchaseOrderNumber || '',
          transmittal: fullDelivery.transmittal || '',
          preparedBy: fullDelivery.preparedBy,
          status: fullDelivery.status,
          customStatus: fullDelivery.customStatus || '',
          remarks: fullDelivery.remarks || '',
          items: fullDelivery.items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            unit: item.unit || '',
            warehouseId: item.warehouse?.id || ''
          }))
        });
        setBranchInfo({
          clientName: fullDelivery.client.clientName,
          tin: fullDelivery.client.tin,
          fullAddress: `${fullDelivery.client.address || ''}, ${fullDelivery.client.city || ''}, ${fullDelivery.client.province || ''}`.trim()
        });
        
        fullDelivery.items.forEach(async (item, index) => {
          if (item.warehouse?.id && item.product?.id) {
            await loadWarehouseStock(item.warehouse.id, item.product.id, index);
          }
        });
      } catch (error) {
        console.error('Failed to load delivery details');
        alert('Failed to load delivery details: ' + error.message);
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
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDelivery(null);
    setBranchInfo(null);
  };

  const handleBranchChange = async (branchId) => {
    setFormData({ ...formData, branchId });
    if (branchId) {
      try {
        const branch = branches.find(b => b.id === branchId);
        if (branch && branch.client) {
          setBranchInfo({
            clientName: branch.client.clientName,
            tin: branch.client.tin,
            fullAddress: `${branch.client.address || ''}, ${branch.client.city || ''}, ${branch.client.province || ''}`.trim()
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
      items: [...formData.items, { productId: '', quantity: 1, unit: '', warehouseId: '' }]
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

    try {
      for (const item of formData.items) {
        const stockResponse = await api.get(`/stocks/warehouses/${item.warehouseId}/products/${item.productId}`);
        
        if (!stockResponse.success || stockResponse.data?.availableQuantity < item.quantity) {
          const product = products.find(p => p.id === item.productId);
          const warehouse = warehouses.find(w => w.id === item.warehouseId);
          
          alert(`Insufficient stock for product "${product?.productName}" in warehouse "${warehouse?.warehouseName}". Available: ${stockResponse.data?.availableQuantity || 0}, Requested: ${item.quantity}`);
          return;
        }
      }

      if (modalMode === 'create') {
        await api.post('/deliveries', formData);
        alert('Delivery created successfully!');
      } else {
        await api.put(`/deliveries/${selectedDelivery.id}`, formData);
        alert('Delivery updated successfully!');
      }
      
      handleCloseModal();
      loadData();
      setCurrentPage(1);
    } catch (error) {
      alert('Failed to save delivery: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;
    try {
      await api.delete(`/deliveries/${id}`);
      alert('Delivery deleted successfully');
      loadData();
      if (filteredDeliveries.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleResetFilter = () => {
    setFilterData({
      clientId: '',
      branchId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setStatusFilter('ALL');
    loadData();
    setCurrentPage(1);
  };

  const sortByStatus = (deliveries) => {
    const statusOrder = {
      'PENDING': 1,
      'PREPARING': 2,
      'CONFIRMED': 3,
      'IN_TRANSIT': 4,
      'DELIVERED': 5,
      'RETURNED': 6,
      'CANCELLED': 7
    };
    
    return [...deliveries].sort((a, b) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  const filteredDeliveries = sortByStatus(deliveries.filter(delivery => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      delivery.branchName?.toLowerCase().includes(searchLower) ||
      delivery.clientName?.toLowerCase().includes(searchLower) ||
      delivery.deliveryReceiptNumber?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'ALL' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
    'PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'CONFIRMED', 'RETURNED'
  ];

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PREPARING: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      CONFIRMED: 'bg-teal-100 text-teal-800',
      RETURNED: 'bg-orange-100 text-orange-800',
      CUSTOM: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));
  const clientOptions = clients.map(c => ({ id: c.id, name: c.clientName }));
  const productOptions = products.map(p => ({ id: p.id, name: `${p.productName} (${p.sku || p.upc})` }));
  const warehouseOptions = warehouses.map(w => ({ id: w.id, name: `${w.warehouseName} (${w.warehouseCode})` }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading Deliveries...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Management</h1>
          <p className="text-gray-600">Track and manage product deliveries to branches</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={() => handleOpenModal('create')} 
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
              >
                <Plus size={20} />
                <span>New Delivery</span>
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                {deliveryStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search delivery..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
                        {delivery.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(delivery.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{delivery.itemCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                          {delivery.customStatus || delivery.status}
                        </span>
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
                          {delivery.status === 'PENDING' && (
                                <button 
                                  onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}  // Changed from CONFIRMED to DELIVERED
                                  className="flex items-center gap-2 px-3 py-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition"
                                  title="Mark as Delivered"
                                >
                                  <Check size={18} />
                                </button>
                              )}
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
                  className={`p-2 rounded-lg border ${
                    currentPage === 1 
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
                  onClick={nextPage}
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
              
              {/* Warehouse Requirement Notice */}
              <div className="px-8 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Truck className="text-blue-600 mt-0.5" size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 mb-1">
                        Warehouse Requirement
                      </h3>
                      <p className="text-sm text-blue-700">
                        Warehouse selection is now mandatory for all delivery items. This ensures proper stock tracking and reservation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        required
                      />
                    </div>
                  </div>

                  {branchInfo && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-1"><strong>Client:</strong> {branchInfo.clientName}</p>
                      <p className="text-sm text-blue-800 mb-1"><strong>TIN:</strong> {branchInfo.tin}</p>
                      <p className="text-sm text-blue-800"><strong>Address:</strong> {branchInfo.fullAddress}</p>
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

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        {deliveryStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                        <option value="CUSTOM">CUSTOM</option>
                      </select>
                    </div>
                    {formData.status === 'CUSTOM' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Custom Status</label>
                        <input
                          type="text"
                          value={formData.customStatus}
                          onChange={(e) => setFormData({ ...formData, customStatus: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      rows="3"
                    />
                  </div>

                  <div>
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
                        Add Item
                      </button>
                    </div>
                    {formData.items.length === 0 && (
                      <p className="text-sm text-gray-500 italic mb-4 text-center py-4 bg-gray-50 rounded-lg">
                        No items added yet. Click "Add Item" to start.
                      </p>
                    )}
                    {formData.items.map((item, i) => {
                      const stockKey = `${i}_${item.productId}_${item.warehouseId}`;
                      const stockInfo = warehouseStocks[stockKey];
      
                      return (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
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
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Warehouse *
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <SearchableDropdown
                                options={warehouseOptions}
                                value={item.warehouseId}
                                onChange={(value) => handleItemChange(i, 'warehouseId', value)}
                                placeholder="Select Warehouse"
                                displayKey="name"
                                valueKey="id"
                                required
                              />
                              {!item.warehouseId && (
                                <p className="text-red-500 text-xs mt-1">Warehouse selection is required</p>
                              )}
                              {stockInfo && item.warehouseId && (
                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="text-xs text-blue-700">
                                    <div><strong>Available Stock:</strong> {stockInfo.availableQuantity || 0}</div>
                                    <div><strong>Total Stock:</strong> {stockInfo.quantity || 0}</div>
                                    <div><strong>Reserved:</strong> {stockInfo.reservedQuantity || 0}</div>
                                  </div>
                                  {item.quantity > (stockInfo.availableQuantity || 0) && (
                                    <div className="text-red-500 text-xs mt-1 font-medium">
                                      ⚠️ Quantity exceeds available stock!
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Quantity *</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition text-sm ${
                                stockInfo && item.quantity > (stockInfo.availableQuantity || 0) 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              min="1"
                              required
                            />
                            {stockInfo && item.quantity > (stockInfo.availableQuantity || 0) && (
                              <p className="text-red-500 text-xs mt-1">
                                Max: {stockInfo.availableQuantity || 0}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Unit</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(i, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                              placeholder="pcs, box, etc."
                            />
                          </div>
                        </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(i)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                          >
                            <Trash2 size={16} />
                            Remove Item
                          </button>
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

          {/* Branch and Client Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Delivered To (Branch)</label>
                <p className="text-base font-semibold text-blue-900">{selectedDelivery.branch?.branchName}</p>
                <p className="text-sm text-blue-700">Code: {selectedDelivery.branch?.branchCode || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Client</label>
                <p className="text-base font-semibold text-blue-900">{selectedDelivery.client?.clientName}</p>
                <p className="text-sm text-blue-700">TIN: {selectedDelivery.client?.tin || 'N/A'}</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
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
                          {item.product?.sku || item.product?.upc || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-gray-400" />
                            <span>{item.warehouse?.warehouseName || 'N/A'}</span>
                          </div>
                          {item.warehouse?.warehouseCode && (
                            <span className="text-xs text-gray-500">({item.warehouse.warehouseCode})</span>
                          )}
                          {item.warehouse?.location && (
                            <span className="text-xs text-gray-500 block">{item.warehouse.location}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.unit || 'pcs'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500 italic">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Update Section - Only show if not DELIVERED */}
          {selectedDelivery.status !== 'DELIVERED' && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Update Status</label>
              <div className="flex gap-3 flex-wrap">
                {deliveryStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(selectedDelivery.id, status)}
                    disabled={selectedDelivery.status === status}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedDelivery.status === status
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
          
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
              <div className="flex items-center mb-7">
                <span className="font-bold text-gray-900 text-sm w-32">DELIVERED TO:</span>
                <input 
                  type="text" 
                  readOnly 
                  value={`${receiptData.branchName} - ${receiptData.clientName}`}
                  className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent"
                />
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center mb-7">
                <span className="font-bold text-gray-900 text-sm w-32">ADDRESS:</span>
                <input 
                  type="text" 
                  readOnly 
                  value={receiptData.branchAddress}
                  className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center mb-3">
                <span className="font-bold text-gray-900 text-sm w-32">BUSINESS STYLE:</span>
                <input 
                  type="text" 
                  value={receiptData.businessStyle || ''}
                  onChange={(e) => setReceiptData({
                    ...receiptData,
                    businessStyle: e.target.value
                  })}
                  className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:border-0 print:p-0 print-hidden"
                />
                <span className="print-only">{receiptData.businessStyle || ''}</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="mb-2">
              <div className="flex items-center mb-7">
                <span className="font-bold text-gray-900 text-sm w-32">DATE:</span>
                <input 
                  type="text" 
                  readOnly 
                  value={receiptData.date}
                  className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent"
                />
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center mb-7">
                <span className="font-bold text-gray-900 text-sm w-32">TIN:</span>
                <input 
                  type="text" 
                  readOnly 
                  value={receiptData.clientTin}
                  className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent"
                />
              </div>
            </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2">
                    TERMS OF PAYMENT:
                  </span>
                  <input
                    type="text"
                    value={receiptData.termsOfPayment || ''}
                    onChange={(e) => setReceiptData({
                      ...receiptData,
                      termsOfPayment: e.target.value
                    })}
                    className="flex-1 min-w-0 border-b border-gray-300 text-sm text-gray-900 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:border-0 print:p-0 print-hidden"
                  />
                  <span className="print-only flex-1 min-w-0 text-sm text-gray-900 px-2">
                    {receiptData.termsOfPayment || ''}
                  </span>
                </div>

                <div className="flex items-center flex-shrink-0">
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2">
                    P.O. NUMBER:
                  </span>
                  <input 
                    type="text"
                    value={receiptData.purchaseOrderNumber || ''}
                    onChange={(e) => setReceiptData({
                      ...receiptData,
                      purchaseOrderNumber: e.target.value
                    })}
                    className="w-32 border-b border-gray-300 text-sm text-gray-900 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:border-0 print:p-0 print-hidden"
                  />
                  <span className="print-only w-32 text-sm text-gray-900 px-2">
                    {receiptData.purchaseOrderNumber || ''}
                  </span>
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
  );
};

export default DeliveryManagement;