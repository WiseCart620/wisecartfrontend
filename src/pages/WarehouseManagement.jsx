import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Warehouse, MapPin, Building, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { LoadingOverlay } from './LoadingOverlay';
import { api } from '../services/api';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const [formData, setFormData] = useState({
    warehouseCode: '',
    warehouseName: '',
    address: '',
    city: '',
    province: '',
    area: '',
    region: '',
    isDefault: false
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
  setLoading(true);
  setLoadingMessage('Loading warehouses...');
  try {
    const response = await api.get('/warehouse');
    if (response.success) {
      setWarehouses(response.data || []);
    } else {
      toast.error(response.error || 'Failed to load warehouses');
      setWarehouses([]);
    }
  } catch (error) {
    toast.error('Failed to load warehouses');
    console.error(error);
    setWarehouses([]);
  } finally {
    setLoading(false);
    setLoadingMessage('');
  }
};



  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.warehouseCode || !formData.warehouseName || !formData.address || 
      !formData.city || !formData.province) {
    toast.error('Please fill in all required fields');
    return;
  }

  setActionLoading(true);
  setLoadingMessage(editingWarehouse ? 'Updating warehouse...' : 'Creating warehouse...');

  try {
    const payload = {
      warehouseCode: formData.warehouseCode,
      warehouseName: formData.warehouseName,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      area: formData.area || null,
      region: formData.region || null,
      isDefault: formData.isDefault
    };

    if (editingWarehouse) {
      await api.put(`/warehouse/${editingWarehouse.id}`, payload);
      toast.success('Warehouse updated successfully');
    } else {
      await api.post('/warehouse', payload);
      toast.success('Warehouse created successfully');
    }

    setShowModal(false);
    resetForm();
    loadWarehouses();
    setCurrentPage(1);
  } catch (error) {
    toast.error(error.message || 'Failed to save warehouse');
    console.error(error);
  } finally {
    setActionLoading(false);
    setLoadingMessage('');
  }
};

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      warehouseCode: warehouse.warehouseCode || '',
      warehouseName: warehouse.warehouseName || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      province: warehouse.province || '',
      area: warehouse.area || '',
      region: warehouse.region || '',
      isDefault: warehouse.isDefault || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
  if (!window.confirm('Are you sure you want to delete this warehouse?')) return;
  
  setActionLoading(true);
  setLoadingMessage('Deleting warehouse...');

  try {
    await api.delete(`/warehouse/${id}`);
    toast.success('Warehouse deleted successfully');
    loadWarehouses();
    if (currentWarehouses.length % itemsPerPage === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  } catch (error) {
    toast.error('Failed to delete warehouse');
    console.error(error);
  } finally {
    setActionLoading(false);
    setLoadingMessage('');
  }
};

  const resetForm = () => {
    setFormData({
      warehouseCode: '',
      warehouseName: '',
      address: '',
      city: '',
      province: '',
      area: '',
      region: '',
      isDefault: false
    });
    setEditingWarehouse(null);
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.warehouseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWarehouses = filteredWarehouses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);

  // Pagination controls
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Generate page numbers to display
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

    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <LoadingOverlay show={true} message="Loading warehouses..." />
        </div>
      );
    }



  return (
    <div className="p-6 max-w-7xl mx-auto">
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
        <p className="text-gray-600 mt-1">Manage your warehouse locations and facilities</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, code, or city..."
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
          Add Warehouse
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {currentWarehouses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Warehouse size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {filteredWarehouses.length === 0 ? 'No warehouses found' : 'No warehouses on this page'}
            </p>
          </div>
        ) : (
          currentWarehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Warehouse size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{warehouse.warehouseName}</h3>
                    <p className="text-sm text-gray-500">{warehouse.warehouseCode}</p>
                  </div>
                </div>
                {warehouse.isDefault && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
                    <Star size={14} fill="currentColor" />
                    Default
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{warehouse.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">
                    {warehouse.city}, {warehouse.province}
                  </span>
                </div>
                {warehouse.region && (
                  <div className="text-sm text-gray-500 pl-6">
                    {warehouse.region}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(warehouse)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm font-medium"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(warehouse.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredWarehouses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Results count */}
          <div className="text-sm text-gray-700">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredWarehouses.length)} of {filteredWarehouses.length} results
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {/* Previous button */}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
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
              {/* Warehouse Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Warehouse size={20} />
                  Warehouse Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="warehouseCode"
                      value={formData.warehouseCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., WH-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="warehouseName"
                      value={formData.warehouseName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter warehouse name"
                    />
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin size={20} />
                  Location Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="province"
                        value={formData.province}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Province"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area
                      </label>
                      <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Metro Manila"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., NCR, Region VII"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isDefault" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">Set as Default Warehouse</div>
                    <div className="text-sm text-gray-500">This warehouse will be used as the default for new operations</div>
                  </label>
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
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;

