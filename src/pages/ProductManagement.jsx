import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Package, DollarSign, Tag, Globe, User, Box, 
  Weight, Ruler, Palette, ChevronDown, ChevronLeft, ChevronRight, 
  Check, AlertCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';


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

const variationTypes = [
  'SIZE', 'COLOR', 'PACK', 'FLAVOR', 'MATERIAL', 'STYLE', 'VOLUME', 'OTHER'
];

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
  productName: '',
  upc: '',
  sku: '',
  supplier: '',
  countryOfOrigin: '',
  selectedClientId: 'all',
  clientPrice: '',
  dimensions: '',
  weight: '',
  materials: '',
  brand: '',
  shelfLife: '',
  unitCost: '',
  variations: []
});



  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  setLoading(true);
  try {
    const productsResponse = await api.get('/products');
    const clientsResponse = await api.get('/clients');
    
    if (productsResponse.success) {
      setProducts(productsResponse.data || []);
    } else {
      toast.error(productsResponse.error || 'Failed to load products');
      setProducts([]);
    }
    
    if (clientsResponse.success) {
      setClients(clientsResponse.data || []);
    } else {
      toast.error(clientsResponse.error || 'Failed to load clients');
      setClients([]);
    }
  } catch (error) {
    toast.error('Failed to load data');
    console.error(error);
    setProducts([]);
    setClients([]);
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          variationType: 'SIZE',
          variationValue: '',
          customType: '',
          customValue: ''
        }
      ]
    }));
  };

  const removeVariation = (index) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  };

  const updateVariation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => {
        if (i !== index) return v;

        const updated = { ...v, [field]: value };

        if (field === 'variationType') {
          updated.variationValue = '';
          updated.customValue = '';
          updated.customType = '';
        }

        return updated;
      })
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.productName || !formData.sku) {
    toast.error('Please fill in all required fields');
    return;
  }

  if (formData.clientPrice && parseFloat(formData.clientPrice) <= 0) {
    toast.error('Price must be greater than 0');
    return;
  }


    const skuValidation = checkSKUAvailability(formData.sku);
    if (!skuValidation.available) {
      toast.error(skuValidation.message);
      return;
    }

    if (formData.upc && formData.upc.trim() !== '') {
    const upcValidation = checkUPCAvailability(formData.upc);
    if (!upcValidation.available) {
      toast.error(upcValidation.message);
      return;
    }
   }

    if (formData.upc && formData.upc.trim() !== '') {
      const existingProduct = products.find(p => 
        p.upc && p.upc.toLowerCase() === formData.upc.toLowerCase() &&
        (!editingProduct || p.id !== editingProduct.id)
      );
      
      if (existingProduct) {
        toast.error(`Product with UPC "${formData.upc}" already exists`);
        return;
      }
    }

    try {
      const normalizedVariations = formData.variations
        .map(v => {
          if (!v.variationValue?.trim()) return null;

          let finalType = v.variationType;
          let finalValue = v.variationValue.trim();


          if ((v.variationType === 'SIZE' || v.variationType === 'COLOR') && v.variationValue === 'CUSTOM') {
            if (!v.customValue?.trim()) return null;
            finalValue = v.customValue.trim();
          }


          if (v.variationType === 'OTHER' && v.customType?.trim()) {
            finalType = v.customType.trim();
          }

          return {
            variationType: finalType,
            variationValue: finalValue
          };
        })
        .filter(Boolean);
          
  const payload = {
  productName: formData.productName,
  upc: formData.upc || null,
  sku: formData.sku,
  supplier: formData.supplier || null,
  countryOfOrigin: formData.countryOfOrigin || null,
  weight: formData.weight ? parseFloat(formData.weight) : null,
  dimensions: formData.dimensions || null,
  materials: formData.materials || null,
  brand: formData.brand || null,
  shelfLife: formData.shelfLife || null,
  variations: normalizedVariations,
  clientPrices: formData.clientPrice && formData.selectedClientId
    ? (formData.selectedClientId === 'all'
        ? clients.map(client => ({
            clientId: client.id,
            price: parseFloat(formData.clientPrice)
          }))
        : [{
            clientId: parseInt(formData.selectedClientId),
            price: parseFloat(formData.clientPrice)
          }])
    : []
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
      loadData();
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

  // Determine if all clients have the same price
  let selectedClient = 'all';
  let price = '';
  
  if (product.clientPrices && product.clientPrices.length > 0) {
    const firstPrice = product.clientPrices[0].price;
    const allSamePrice = product.clientPrices.every(cp => cp.price === firstPrice);
    
    if (allSamePrice && product.clientPrices.length === clients.length) {
      // All clients have the same price
      selectedClient = 'all';
      price = firstPrice;
    } else if (product.clientPrices.length === 1) {
      // Single client
      selectedClient = product.clientPrices[0].client?.id || '';
      price = product.clientPrices[0].price;
    } else {
      // Multiple clients with different prices - default to 'all'
      selectedClient = 'all';
      price = firstPrice;
    }
  }

  setFormData({
    productName: product.productName || '',
    upc: product.upc || '',
    sku: product.sku || '',
    supplier: product.supplier || '',
    countryOfOrigin: product.countryOfOrigin || '',
    selectedClientId: selectedClient,
    clientPrice: price,
    dimensions: product.dimensions || '',
    weight: product.weight || '',
    materials: product.materials || '',
    brand: product.brand || '',
    shelfLife: product.shelfLife || '',
    unitCost: product.unitCost || '',
    variations: product.variations?.map(v => {
      const isCustomType = !variationTypes.includes(v.variationType);
      const isSizeOrColorCustom = 
        (v.variationType === 'SIZE' || v.variationType === 'COLOR') &&
        !['XXS','XS','S','M','L','XL','XXL','XXXL','SMALL','MEDIUM','LARGE',
          'RED','BLUE','GREEN','YELLOW','BLACK','WHITE','GRAY','BROWN','ORANGE','PURPLE','PINK','BEIGE','NAVY']
          .includes(v.variationValue.toUpperCase());

      return {
        variationType: isCustomType ? 'OTHER' : v.variationType,
        variationValue: isCustomType || isSizeOrColorCustom ? 'CUSTOM' : v.variationValue,
        customType: isCustomType ? v.variationType : '',
        customValue: isSizeOrColorCustom ? v.variationValue : ''
      };
    }) || []
  });
  setShowModal(true);
};



  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      loadData();
      if (filteredProducts.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      toast.error('Failed to delete product');
      console.error(error);
    }
  };

  const resetForm = () => {
  setFormData({
    productName: '',
    upc: '',
    sku: '',
    supplier: '',
    countryOfOrigin: '',
    selectedClientId: 'all',
    clientPrice: '',
    dimensions: '',
    weight: '',
    materials: '',
    brand: '',
    unitCost: '',
    shelfLife: '',
    variations: []
  });
  setEditingProduct(null);
};


  const filteredProducts = products.filter(product =>
    product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.upc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const clientOptions = clients.map(c => ({ id: c.id, name: c.clientName }));

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
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
                      <td className="px-6 py-4 text-sm text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.upc || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        {product.unitCost != null 
                          ? `₱${Number(product.unitCost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {product.clientPrices && product.clientPrices.length > 0 ? (
                          <div className="space-y-1">
                            {product.clientPrices.slice(0, 2).map((cp, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-medium text-blue-600">
                                  ₱{Number(cp.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-gray-500 ml-1">({cp.client?.clientName})</span>
                              </div>
                            ))}
                            {product.clientPrices.length > 2 && (
                              <div className="text-xs text-gray-500">+{product.clientPrices.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.supplier || '-'}</td>
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
                className={`p-2 rounded-lg border ${
                  currentPage === 1 
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

              {/* Next button */}
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
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Real-time validation
                          if (e.target.value.trim() !== '') {
                            const skuValidation = checkSKUAvailability(e.target.value);
                            // Visual feedback is handled by the styling below
                          }
                        }}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formData.sku && formData.sku.trim() !== '' && !checkSKUAvailability(formData.sku).available
                            ? 'border-red-300 bg-red-50' 
                            : formData.sku && formData.sku.trim() !== '' && checkSKUAvailability(formData.sku).available
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="Enter SKU"
                      />
                      {formData.sku && formData.sku.trim() !== '' && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {!checkSKUAvailability(formData.sku).available ? (
                            <X className="h-5 w-5 text-red-500" />
                          ) : (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {formData.sku && formData.sku.trim() !== '' && !checkSKUAvailability(formData.sku).available && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {checkSKUAvailability(formData.sku).message}
                      </p>
                    )}
                    {formData.sku && formData.sku.trim() !== '' && checkSKUAvailability(formData.sku).available && (
                      <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                        <Check size={14} />
                        SKU is available
                      </p>
                    )}
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">UPC</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="upc"
                          value={formData.upc}
                          onChange={(e) => {
                            handleInputChange(e);
                            // Real-time validation
                            if (e.target.value.trim() !== '') {
                              const upcValidation = checkUPCAvailability(e.target.value);
                              // Visual feedback is handled by styling
                            }
                          }}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formData.upc && formData.upc.trim() !== '' && !checkUPCAvailability(formData.upc).available
                              ? 'border-red-300 bg-red-50' 
                              : formData.upc && formData.upc.trim() !== '' && checkUPCAvailability(formData.upc).available
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="Enter UPC"
                        />
                        {formData.upc && formData.upc.trim() !== '' && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {!checkUPCAvailability(formData.upc).available ? (
                              <X className="h-5 w-5 text-red-500" />
                            ) : (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {formData.upc && formData.upc.trim() !== '' && !checkUPCAvailability(formData.upc).available && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {checkUPCAvailability(formData.upc).message}
                        </p>
                      )}
                      {formData.upc && formData.upc.trim() !== '' && checkUPCAvailability(formData.upc).available && (
                        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                          <Check size={14} />
                          UPC is available
                        </p>
                      )}
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

              {/* Client Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={20} />
                  Client Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Price To
                    </label>
                    <SearchableDropdown
                      options={[
                        { id: 'all', name: '🌐 All Clients' },
                        ...clients.map(c => ({ id: c.id, name: c.clientName }))
                      ]}
                      value={formData.selectedClientId}
                      onChange={(value) => setFormData({ ...formData, selectedClientId: value })}
                      placeholder="Select client(s)"
                      displayKey="name"
                      valueKey="id"
                      required={false}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.selectedClientId === 'all' 
                        ? `Price will be assigned to all ${clients.length} clients`
                        : 'Price will be assigned to selected client only'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Price (₱)
                    </label>
                    <input
                      type="number"
                      name="clientPrice"
                      value={formData.clientPrice}
                      onChange={handleInputChange}
                      min="0.01"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the selling price for client(s)
                    </p>
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
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter supplier name"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life</label>
                    <input
                      type="text"
                      name="shelfLife"
                      value={formData.shelfLife}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 12 months"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Box size={20} />
                  Physical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 20x15x10 cm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

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
              </div>

              {/* Variations */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Tag size={20} />
                      Product Variations
                    </h3>
                    <button
                      type="button"
                      onClick={addVariation}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus size={16} />
                      Add Variation
                    </button>
                  </div>

                  {formData.variations.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No variations added yet. Click "Add Variation" to begin.</p>
                  ) : (
                    <div className="space-y-4">
                      {formData.variations.map((variation, index) => {
                        const isCustomSizeOrColor = variation.variationValue === 'CUSTOM' && 
                          (variation.variationType === 'SIZE' || variation.variationType === 'COLOR');

                        const finalValue = isCustomSizeOrColor && variation.customValue 
                          ? variation.customValue 
                          : variation.variationValue;

                        return (
                          <div key={index} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Variation Type */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Variation Type
                                </label>
                                <select
                                  value={variation.variationType}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    updateVariation(index, 'variationType', newType);
                                    // Reset values when type changes
                                    updateVariation(index, 'variationValue', '');
                                    updateVariation(index, 'customValue', '');
                                    updateVariation(index, 'customType', '');
                                  }}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  {variationTypes.map(type => (
                                    <option key={type} value={type}>
                                      {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Variation Value - Smart Input */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Variation Value
                                </label>

                                {/* SIZE with predefined + Custom */}
                                {variation.variationType === 'SIZE' && (
                                  <>
                                    <select
                                      value={variation.variationValue}
                                      onChange={(e) => updateVariation(index, 'variationValue', e.target.value)}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Choose size...</option>
                                      {['XXS','XS','S','M','L','XL','XXL','XXXL','SMALL','MEDIUM','LARGE'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                      <option value="CUSTOM">Custom Size</option>
                                    </select>
                                    {variation.variationValue === 'CUSTOM' && (
                                      <input
                                        type="text"
                                        placeholder="e.g. 28W x 32L, Free Size"
                                        value={variation.customValue || ''}
                                        onChange={(e) => updateVariation(index, 'customValue', e.target.value)}
                                        className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      />
                                    )}
                                  </>
                                )}

                                {/* COLOR with predefined + Custom */}
                                {variation.variationType === 'COLOR' && (
                                  <>
                                    <select
                                      value={variation.variationValue}
                                      onChange={(e) => updateVariation(index, 'variationValue', e.target.value)}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Choose color...</option>
                                      {['RED','BLUE','GREEN','YELLOW','BLACK','WHITE','GRAY','BROWN','ORANGE','PURPLE','PINK','BEIGE','NAVY'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                      <option value="CUSTOM">Custom Color</option>
                                    </select>
                                    {variation.variationValue === 'CUSTOM' && (
                                      <input
                                        type="text"
                                        placeholder="e.g. Rose Gold, Mint Green"
                                        value={variation.customValue || ''}
                                        onChange={(e) => updateVariation(index, 'customValue', e.target.value)}
                                        className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      />
                                    )}
                                  </>
                                )}

                                {/* OTHER → Custom Type + Value */}
                                {variation.variationType === 'OTHER' && (
                                  <div className="space-y-3">
                                    <input
                                      type="text"
                                      placeholder="Variation name (e.g. Pattern, Edition, Scent)"
                                      value={variation.customType || ''}
                                      onChange={(e) => updateVariation(index, 'customType', e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Value (e.g. Striped, Limited Edition)"
                                      value={variation.variationValue}
                                      onChange={(e) => updateVariation(index, 'variationValue', e.target.value)}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                )}

                                {/* Default: Simple text input */}
                                {![ 'SIZE', 'COLOR', 'OTHER' ].includes(variation.variationType) && (
                                  <input
                                    type="text"
                                    placeholder={`Enter ${variation.variationType.toLowerCase()} (e.g. 500g, Vanilla)`}
                                    value={variation.variationValue}
                                    onChange={(e) => updateVariation(index, 'variationValue', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Delete Button */}
                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeVariation(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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