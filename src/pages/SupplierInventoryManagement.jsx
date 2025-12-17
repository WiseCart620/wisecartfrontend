import { 
  Plus, Edit2, Trash2, Search, X, Package, DollarSign, Truck, 
  Calendar, FileText, CheckCircle, Clock, ChevronDown, XCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import React, { useState, useEffect, useRef } from 'react';

const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, required = false, disabled = false, formData, index }) => {
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
        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
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
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition text-gray-500 italic"
              >
                -- None --
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No results found</div>
            ) : (
              filteredOptions.map((option) => {
                const isDisabled = option.disabled || false;
                const isAlreadySelected = formData?.orderItems?.some(
                  (item, idx) => item.productId === option.id && idx !== index
                ) || false;
                
                return (
                  <button
                    key={option[valueKey]}
                    type="button"
                    onClick={() => {
                      if (!isDisabled && !isAlreadySelected) {
                        onChange(option[valueKey]);
                        setIsOpen(false);
                        setSearchTerm('');
                      }
                    }}
                    disabled={isDisabled || isAlreadySelected}
                    className={`w-full px-4 py-2 text-left transition ${
                      isDisabled || isAlreadySelected
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : value === option[valueKey]
                        ? 'bg-blue-50 text-blue-700 font-medium hover:bg-blue-100'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    {option[displayKey]}
                    {(isDisabled || isAlreadySelected) && (
                      <span className="ml-2 text-xs">(Already selected)</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SupplierInventoryManagement = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  
  const [formData, setFormData] = useState({
    supplierName: '',
    orderNumber: '',
    modeOfPayment: '',
    orderDate: new Date().toISOString().split('T')[0],
    overallStatus: 'PENDING',
    orderItems: [],
    paymentInstructions: [],
    deliveries: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/supplier-orders'),
        api.get('/products')
      ]);
      
      if (ordersRes.success) setOrders(ordersRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const suppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))];

  const supplierProducts = formData.supplierName 
    ? products.filter(p => p.supplier === formData.supplierName)
    : [];

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      orderItems: [...prev.orderItems, { productId: '', quantity: 1 }]
    }));
  };





const formatDateForInput = (date) => {
  if (!date) return '';
  

  if (Array.isArray(date)) {
    const [year, month, day] = date;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  

  if (typeof date === 'string' && date.includes('-')) {
    return date;
  }
  

  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  return '';
};



  const removeOrderItem = (index) => {
    setFormData(prev => ({
      ...prev,
      orderItems: prev.orderItems.filter((_, i) => i !== index)
    }));
  };

  const updateOrderItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      orderItems: prev.orderItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addPaymentInstruction = () => {
    setFormData(prev => ({
      ...prev,
      paymentInstructions: [...prev.paymentInstructions, {
        instruction: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0]
      }]
    }));
  };

  const removePaymentInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      paymentInstructions: prev.paymentInstructions.filter((_, i) => i !== index)
    }));
  };

  const updatePaymentInstruction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      paymentInstructions: prev.paymentInstructions.map((pi, i) => 
        i === index ? { ...pi, [field]: value } : pi
      )
    }));
  };

  const addDelivery = () => {
    setFormData(prev => ({
      ...prev,
      deliveries: [...prev.deliveries, {
        deliveryStatus: 'SHIPPING',
        deliveryName: '',
        estimatedDeliveryDate: '',
        actualDeliveryDate: '',
        shippingDuration: '',
        modeOfPayment: '',
        paymentInstructions: []
      }]
    }));
  };

  const removeDelivery = (index) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.filter((_, i) => i !== index)
    }));
  };

  const updateDelivery = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.map((d, i) => 
        i === index ? { ...d, [field]: value } : d
      )
    }));
  };

  const addDeliveryPayment = (deliveryIndex) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.map((d, i) => 
        i === deliveryIndex ? {
          ...d,
          paymentInstructions: [...d.paymentInstructions, {
            instruction: '',
            amount: '',
            deliveryDate: new Date().toISOString().split('T')[0]
          }]
        } : d
      )
    }));
  };

  const removeDeliveryPayment = (deliveryIndex, paymentIndex) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.map((d, i) => 
        i === deliveryIndex ? {
          ...d,
          paymentInstructions: d.paymentInstructions.filter((_, pi) => pi !== paymentIndex)
        } : d
      )
    }));
  };

  const updateDeliveryPayment = (deliveryIndex, paymentIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliveries: prev.deliveries.map((d, i) => 
        i === deliveryIndex ? {
          ...d,
          paymentInstructions: d.paymentInstructions.map((p, pi) => 
            pi === paymentIndex ? { ...p, [field]: value } : p
          )
        } : d
      )
    }));
  };

  const calculateTotals = () => {
    const paymentTotal = formData.paymentInstructions.reduce((sum, pi) => 
      sum + (parseFloat(pi.amount) || 0), 0
    );

    const deliveryTotal = formData.deliveries.reduce((sum, d) => 
      sum + d.paymentInstructions.reduce((dSum, dpi) => 
        dSum + (parseFloat(dpi.amount) || 0), 0
      ), 0
    );

    const totalQuantity = formData.orderItems.reduce((sum, item) => 
      sum + (parseInt(item.quantity) || 0), 0
    );

    const overallTotal = paymentTotal + deliveryTotal;
    const unitCost = totalQuantity > 0 ? overallTotal / totalQuantity : 0;

    return { paymentTotal, deliveryTotal, overallTotal, unitCost, totalQuantity };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplierName || !formData.orderNumber) {
      toast.error('Please fill in supplier name and order number');
      return;
    }

    if (formData.orderItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (formData.paymentInstructions.length === 0) {
      toast.error('Please add at least one payment instruction');
      return;
    }

    try {
      const payload = {
        ...formData,
        orderItems: formData.orderItems.map(item => ({
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity)
        })),
        paymentInstructions: formData.paymentInstructions.map(pi => ({
          ...pi,
          amount: parseFloat(pi.amount)
        })),
        deliveries: formData.deliveries.map(d => ({
          ...d,
          shippingDuration: d.shippingDuration ? parseInt(d.shippingDuration) : null,
          paymentInstructions: d.paymentInstructions.map(dpi => ({
            ...dpi,
            amount: parseFloat(dpi.amount)
          }))
        }))
      };

      let response;
      if (editingOrder) {
        response = await api.put(`/supplier-orders/${editingOrder.id}`, payload);
      } else {
        response = await api.post('/supplier-orders', payload);
      }

      if (response.success) {
        toast.success(editingOrder ? 'Order updated successfully' : 'Order created successfully');
        setShowModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      toast.error('Failed to save order');
    }
  };

  const handleEdit = (order) => {
  setEditingOrder(order);
  setFormData({
    supplierName: order.supplierName || '',
    orderNumber: order.orderNumber || '',
    modeOfPayment: order.modeOfPayment || '',
    orderDate: formatDateForInput(order.orderDate) || new Date().toISOString().split('T')[0],
    overallStatus: order.overallStatus || 'PENDING',
    orderItems: order.orderItems?.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    })) || [],
    paymentInstructions: order.paymentInstructions?.map(pi => ({
      instruction: pi.instruction,
      amount: pi.amount,
      paymentDate: formatDateForInput(pi.paymentDate) || new Date().toISOString().split('T')[0]
    })) || [],
    deliveries: order.deliveries?.map(d => ({
      deliveryStatus: d.deliveryStatus,
      deliveryName: d.deliveryName,
      estimatedDeliveryDate: formatDateForInput(d.estimatedDeliveryDate) || '',
      actualDeliveryDate: formatDateForInput(d.actualDeliveryDate) || '',
      shippingDuration: d.shippingDuration || '',
      modeOfPayment: d.modeOfPayment,
      paymentInstructions: d.paymentInstructions?.map(dpi => ({
        instruction: dpi.instruction,
        amount: dpi.amount,
        deliveryDate: formatDateForInput(dpi.deliveryDate) || new Date().toISOString().split('T')[0]
      })) || []
    })) || []
  });
  setShowModal(true);
};



  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await api.delete(`/supplier-orders/${id}`);
      toast.success('Order deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierName: '',
      orderNumber: '',
      modeOfPayment: '',
      orderDate: new Date().toISOString().split('T')[0],
      overallStatus: 'PENDING',
      orderItems: [],
      paymentInstructions: [],
      deliveries: []
    });
    setEditingOrder(null);
  };

  const filteredOrders = orders.filter(order =>
    order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { paymentTotal, deliveryTotal, overallTotal, unitCost, totalQuantity } = calculateTotals();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Inventory Management</h1>
        <p className="text-gray-600 mt-1">Manage supplier orders and deliveries</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by supplier or order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Create Order
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No orders found</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const totalQty = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-6 py-4 text-gray-900">{order.supplierName}</td>
                      <td className="px-6 py-4 text-gray-600">{order.orderDate}</td>
                      <td className="px-6 py-4 text-gray-900">{totalQty}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ₱{order.overallTotal?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-medium text-blue-600">
                        ₱{order.unitCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          order.overallStatus === 'OK' 
                            ? 'bg-green-100 text-green-800' 
                            : order.overallStatus === 'DONE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.overallStatus === 'OK' ? <CheckCircle size={14} /> : 
                          order.overallStatus === 'DONE' ? <XCircle size={14} /> : 
                          <Clock size={14} />}
                          {order.overallStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOrder ? 'Edit Supplier Order' : 'Create Supplier Order'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Order Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={suppliers.map(s => ({ name: s, value: s }))}  // ✅ CORRECT
                      value={formData.supplierName}
                      onChange={(value) => setFormData({ ...formData, supplierName: value, orderItems: [] })}
                      placeholder="Select supplier"
                      displayKey="name"
                      valueKey="value"
                      required={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order No./PI No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter order number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mode of Payment <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.modeOfPayment}
                      onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Bank Transfer, Cash"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Status <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.overallStatus}
                        onChange={(e) => setFormData({ ...formData, overallStatus: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="OK">OK</option>
                        <option value="DONE">DONE</option>
                      </select>
                    <p className="text-xs text-gray-500 mt-1">Set to OK to update product unit costs</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package size={20} />
                    Products
                  </h3>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    disabled={!formData.supplierName}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </div>

                {formData.orderItems.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No products added yet</p>
                ) : (
                  <div className="space-y-3">
                    {formData.orderItems.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                              <SearchableDropdown
                                  options={supplierProducts.map(p => ({
                                    id: p.id,
                                    name: `${p.productName} (${p.sku})`
                                  }))}
                                  value={item.productId}
                                  onChange={(value) => updateOrderItem(index, 'productId', value)}
                                  placeholder="Select product"
                                  displayKey="name"
                                  valueKey="id"
                                  required={true}
                                  formData={formData}
                                  index={index}
                                />
                            </div>

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                                required
                                min="1"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded-lg h-fit"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Instructions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-xl">₱</span>
                        Payment Instructions
                    </h3>
                  <button
                    type="button"
                    onClick={addPaymentInstruction}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus size={16} />
                    Add Payment
                  </button>
                </div>

                {formData.paymentInstructions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No payment instructions added yet</p>
                ) : (
                  <div className="space-y-3">
                    {formData.paymentInstructions.map((pi, index) => (
                      <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                            <input
                              type="text"
                              value={pi.instruction}
                              onChange={(e) => updatePaymentInstruction(index, 'instruction', e.target.value)}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              placeholder="Payment details"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
                            <input
                              type="number"
                              value={pi.amount}
                              onChange={(e) => updatePaymentInstruction(index, 'amount', e.target.value)}
                              required
                              step="0.01"
                              min="0"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                              <input
                                type="date"
                                value={pi.paymentDate}
                                onChange={(e) => updatePaymentInstruction(index, 'paymentDate', e.target.value)}required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removePaymentInstruction(index)}
                              className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded-lg h-fit"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                      <p className="text-sm font-semibold text-green-900">
                        Total: ₱{paymentTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Deliveries */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Truck size={20} />
                    Deliveries
                  </h3>
                  <button
                    type="button"
                    onClick={addDelivery}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Plus size={16} />
                    Add Delivery
                  </button>
                </div>

                {formData.deliveries.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No deliveries added yet</p>
                ) : (
                  <div className="space-y-4">
                    {formData.deliveries.map((delivery, dIndex) => {
                      const delivTotal = delivery.paymentInstructions.reduce((sum, dpi) => 
                        sum + (parseFloat(dpi.amount) || 0), 0
                      );

                      return (
                        <div key={dIndex} className="p-5 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-purple-900">Delivery #{dIndex + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeDelivery(dIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Delivery Status <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={delivery.deliveryStatus}
                                onChange={(e) => updateDelivery(dIndex, 'deliveryStatus', e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="SHIPPING">Shipping</option>
                                <option value="DELIVERED">Delivered</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Delivery Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={delivery.deliveryName}
                                onChange={(e) => updateDelivery(dIndex, 'deliveryName', e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Supplier delivery name"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mode of Payment <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={delivery.modeOfPayment}
                                onChange={(e) => updateDelivery(dIndex, 'modeOfPayment', e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., COD, Prepaid"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
                              <input
                                type="date"
                                value={delivery.estimatedDeliveryDate}
                                onChange={(e) => updateDelivery(dIndex, 'estimatedDeliveryDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Delivery</label>
                              <input
                                type="date"
                                value={delivery.actualDeliveryDate}
                                onChange={(e) => updateDelivery(dIndex, 'actualDeliveryDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Duration (days)</label>
                              <input
                                type="number"
                                value={delivery.shippingDuration}
                                onChange={(e) => updateDelivery(dIndex, 'shippingDuration', e.target.value)}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Days"
                              />
                            </div>
                          </div>

                          {/* Delivery Payment Instructions */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900">Delivery Payment Instructions</h5>
                              <button
                                type="button"
                                onClick={() => addDeliveryPayment(dIndex)}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                              >
                                <Plus size={14} />
                                Add Payment
                              </button>
                            </div>

                            {delivery.paymentInstructions.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No payment instructions for this delivery</p>
                            ) : (
                              <div className="space-y-2">
                                {delivery.paymentInstructions.map((dpi, pIndex) => (
                                  <div key={pIndex} className="p-3 bg-white rounded-lg border">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Instruction</label>
                                        <input
                                          type="text"
                                          value={dpi.instruction}
                                          onChange={(e) => updateDeliveryPayment(dIndex, pIndex, 'instruction', e.target.value)}
                                          required
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                          placeholder="Payment details"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₱)</label>
                                        <input
                                          type="number"
                                          value={dpi.amount}
                                          onChange={(e) => updateDeliveryPayment(dIndex, pIndex, 'amount', e.target.value)}
                                          required
                                          step="0.01"
                                          min="0"
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
                                        <input
                                          type="date"
                                          value={dpi.deliveryDate}
                                          onChange={(e) => updateDeliveryPayment(dIndex, pIndex, 'deliveryDate', e.target.value)}
                                          required
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                      </div>

                                      <div className="flex items-end">
                                        <button
                                          type="button"
                                          onClick={() => removeDeliveryPayment(dIndex, pIndex)}
                                          className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                          <Trash2 size={16} className="mx-auto" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-sm font-semibold text-purple-900">
                              Delivery Total: ₱{delivTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-lg font-bold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total Quantity:</span>
                    <span className="font-semibold">{totalQuantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Supplier Product Total:</span>
                    <span className="font-semibold">₱{paymentTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">All Deliveries Total:</span>
                    <span className="font-semibold">₱{deliveryTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t border-gray-300">
                    <span className="font-bold text-gray-900">Overall Total:</span>
                    <span className="font-bold text-gray-900">₱{overallTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-blue-900">Unit Cost:</span>
                    <span className="font-bold text-blue-600">₱{unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierInventoryManagement;