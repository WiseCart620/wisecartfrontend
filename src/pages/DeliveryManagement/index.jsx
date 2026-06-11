// src/pages/DeliveryManagement/index.jsx
import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpDown, Hash, Clock, XCircle, FileText, ClipboardList, Package } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import DeliveryTable from '../../components/tables/DeliveryTable';
import DeliveryFilters from '../../components/filters/DeliveryFilters';
import DeliveryFormModal from '../../components/modals/DeliveryFormModal';
import DeliveryViewModal from '../../components/modals/DeliveryViewModal';
import DeliveryReceiptModal from '../../components/modals/DeliveryReceiptModal';
import { useDeliveries } from '../../hooks/useDeliveries';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/deliveryReceipt.css';

const SORT_OPTIONS = [
  { value: 'receipt_desc', label: 'DR # — Highest first', icon: Hash },
  { value: 'receipt_asc', label: 'DR # — Lowest first', icon: Hash },
  { value: 'timestamp_desc', label: 'Date — Newest first', icon: Clock },
  { value: 'timestamp_asc', label: 'Date — Oldest first', icon: Clock },
];

const DeliveryManagement = () => {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'ENCODER', 'ASSISTANT_ADMIN'].includes(user?.role);
  const canDelete = ['ADMIN', 'ASSISTANT_ADMIN'].includes(user?.role);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    deliveries,
    branches,
    products,
    warehouses,
    companies,
    loading,                // ← now wired up properly from the hook
    loadData,
    refreshDeliveries,
    updateDeliveryLocally,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    cancelDelivery,
    saveReceiptDetails,
    getDeliveryDetails,
    validateDeliveryForm,
    prepareProductOptions,
    sortDeliveriesByStatus,
    filterDeliveries
  } = useDeliveries();

  const [modalState, setModalState] = useState({ show: false, mode: null, delivery: null });
  const [receiptModalState, setReceiptModalState] = useState({ show: false, receiptData: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortMode, setSortMode] = useState('receipt_desc');
  const [cancelModal, setCancelModal] = useState({ show: false, delivery: null, remarks: '' });

  const [filterData, setFilterData] = useState({
    companyId: '',
    branchId: '',
    warehouseId: '',
    status: '',
    productId: '',
    variationId: '',
    productName: '',
    productFilters: [],
    startDate: '',
    endDate: '',
    receiptNumber: '',
    poNumber: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const filteredDeliveries = sortDeliveriesByStatus(
    (() => {
      const base = filterDeliveries(deliveries, filterData);
      if (!filterData.productFilters || filterData.productFilters.length === 0) return base;
      return base.filter(delivery =>
        filterData.productFilters.every(pf =>
          (delivery.items || []).some(item => {
            const productMatch = (item.product?.id ?? item.productId) === pf.productId;
            if (!productMatch) return false;
            if (pf.variationId == null) return true;
            return (item.variation?.id ?? item.variationId) === pf.variationId;
          })
        )
      );
    })(),
    sortMode
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeliveries = filteredDeliveries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);

  const handleOpenModal = async (mode, delivery = null) => {
    if (mode === 'edit' && delivery?.status === 'DELIVERED') {
      alert('Cannot edit a delivery that has already been DELIVERED.');
      return;
    }
    if (mode === 'edit' && delivery?.status === 'CANCELLED') {
      alert('Cannot edit a delivery that has been CANCELLED.');
      return;
    }

    if (mode === 'create') {
      setModalState({ show: true, mode: 'create', delivery: null });
    } else if (mode === 'edit' && delivery) {
      try {
        setActionLoading(true);
        setLoadingMessage('Loading delivery details...');
        const response = await getDeliveryDetails(delivery.id);
        if (response.success) {
          setModalState({ show: true, mode: 'edit', delivery: response.data });
        } else {
          alert(response.error || 'Failed to load delivery details');
        }
      } catch (error) {
        alert('Failed to load delivery details: ' + error.message);
      } finally {
        setActionLoading(false);
        setLoadingMessage('');
      }
    } else if (mode === 'view' && delivery) {
      setModalState({ show: true, mode: 'view', delivery });
    }
  };

  const handleCloseModal = () => {
    setModalState({ show: false, mode: null, delivery: null });
  };

  const handleViewDelivery = async (delivery) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading delivery details...');
      const response = await getDeliveryDetails(delivery.id);
      if (response.success) {
        setModalState({ show: true, mode: 'view', delivery: response.data });
      } else {
        alert(response.error || 'Failed to load delivery details');
      }
    } catch (error) {
      alert('Failed to load delivery details: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveDelivery = async (formData, statusOnly = false) => {
    const errors = validateDeliveryForm(formData, products, warehouses);
    if (errors.length > 0) { alert(errors.join('\n')); return; }
    try {
      setActionLoading(true);

      if (statusOnly && modalState.mode === 'edit' && modalState.delivery?.id) {
        setLoadingMessage('Updating status...');
        const result = await api.patch(
          `/deliveries/${modalState.delivery.id}/status`,
          { status: formData.status }
        );
        if (result.success) {
          updateDeliveryLocally(modalState.delivery.id, { status: formData.status });
          setActionLoading(false);
          setLoadingMessage('');
          handleCloseModal();
          toast.success('Status updated successfully!');
          refreshDeliveries();
        } else {
          alert(result.error || 'Failed to update status');
        }
        return;
      }

      setLoadingMessage(modalState.mode === 'create' ? 'Creating delivery...' : 'Updating delivery...');
      const deliveryData = {
        ...formData,
        date: formData.datePrepared || null,
        datePrepared: formData.datePrepared || null,
        dateDelivered: formData.status === 'DELIVERED' && formData.dateDelivered ? formData.dateDelivered : null
      };

      let result;
      if (modalState.mode === 'create') {
        result = await createDelivery(deliveryData);
      } else {
        result = await updateDelivery(modalState.delivery.id, deliveryData);
      }
      if (result.success) {
        alert(`Delivery ${modalState.mode === 'create' ? 'created' : 'updated'} successfully!`);
        handleCloseModal();
        if (modalState.mode === 'create') setCurrentPage(1);
        await refreshDeliveries();
      } else {
        alert(result.error || 'Failed to save delivery');
      }
    } catch (error) {
      alert('Failed to save delivery: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeleteDelivery = async (id) => {
    const delivery = deliveries.find(d => d.id === id);
    if (['DELIVERED', 'IN_TRANSIT', 'CANCELLED'].includes(delivery?.status)) {
      alert(`🚫 DELETION NOT ALLOWED\n\nDeliveries with status "${delivery.status}" cannot be deleted.\n\nOnly deliveries in PENDING or PREPARING status may be deleted.`);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;
    try {
      setActionLoading(true);
      setLoadingMessage('Deleting delivery...');
      const result = await deleteDelivery(id);
      if (result.success) {
        alert('Delivery deleted successfully');
        await refreshDeliveries();
        const newFilteredCount = filteredDeliveries.length - 1;
        const newTotalPages = Math.max(1, Math.ceil(newFilteredCount / itemsPerPage));
        if (currentPage > newTotalPages) setCurrentPage(newTotalPages);
      } else {
        alert(result.error || 'Failed to delete delivery');
      }
    } catch (error) {
      alert(error.message || 'Failed to delete delivery');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleOpenCancelModal = (delivery) => {
    setCancelModal({ show: true, delivery, remarks: '' });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.remarks.trim()) {
      alert('Please enter a reason for cancellation.');
      return;
    }
    try {
      setActionLoading(true);
      setLoadingMessage('Cancelling delivery and reverting stocks...');
      const result = await cancelDelivery(cancelModal.delivery.id, cancelModal.remarks.trim());
      if (result.success) {
        alert('Delivery cancelled successfully. All stocks have been reverted.');
        setCancelModal({ show: false, delivery: null, remarks: '' });
        await refreshDeliveries();
      } else {
        alert(result.error || 'Failed to cancel delivery');
      }
    } catch (error) {
      const msg = error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'Failed to cancel delivery';
      alert(msg);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateReceipt = async (delivery) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Generating receipt...');
      const response = await getDeliveryDetails(delivery.id);
      if (!response.success) throw new Error(response.error || 'Failed to load delivery');
      const fullDelivery = response.data;
      const receipt = {
        id: fullDelivery.id,
        deliveryReceiptNumber: fullDelivery.deliveryReceiptNumber || '',
        deliveryReceiptNumberDisplay: '',
        date: new Date(fullDelivery.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        branchName: fullDelivery.branch?.branchName || delivery.branchName,
        companyName: fullDelivery.company?.companyName || delivery.companyName,
        companyTin: fullDelivery.branch?.tin || fullDelivery.company?.tin || 'N/A',
        branchAddress: `${fullDelivery.branch?.address || ''}, ${fullDelivery.branch?.city || ''}, ${fullDelivery.branch?.province || ''}`.trim(),
        preparedBy: fullDelivery.preparedBy || localStorage.getItem('fullName') || '',
        purchaseOrderNumber: fullDelivery.purchaseOrderNumber || '',
        termsOfPayment: fullDelivery.termsOfPayment || '',
        businessStyle: fullDelivery.businessStyle || '',
        remarks: fullDelivery.remarks || '',
        items: fullDelivery.items?.map(item => ({
          ...item,
          quantity: item.deliveredQty || item.preparedQty || 0,
          unit: item.uom || 'pcs',
          warehouseName: item.warehouse?.warehouseName || 'N/A',
          warehouseCode: item.warehouse?.warehouseCode || 'N/A',
          companySku: item.companySku || ''
        })) || [],
        extraHeader: fullDelivery.extraHeader || 'EXTRA',
        generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      setReceiptModalState({ show: true, receiptData: receipt });
    } catch (error) {
      alert('Failed to generate receipt: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveReceipt = async (receiptData) => {
    try {
      const result = await saveReceiptDetails(receiptData.id, receiptData);
      if (result.success) {
        alert('Receipt details saved successfully!');
        await refreshDeliveries();
      } else {
        alert(result.error || 'Failed to save receipt details');
      }
    } catch (error) {
      alert('Failed to save receipt details: ' + error.message);
    }
  };

  const handleFilterChange = (updates) => {
    setFilterData(prev => ({ ...prev, ...updates }));
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterData({
      companyId: '', branchId: '', warehouseId: '', status: 'HIDE_CANCELLED',
      productId: '', variationId: '', productName: '', productFilters: [],
      startDate: '', endDate: '', receiptNumber: '', poNumber: ''
    });
    setCurrentPage(1);
  };

  return (
    <>
      <LoadingOverlay show={actionLoading} message={loadingMessage || 'Loading...'} />

      <div className="p-2 sm:p-3 lg:p-4 max-w-full mx-auto overflow-x-hidden">
        {/* Sliding Navigation Bar */}
        <div className="mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex overflow-x-auto max-w-full">
            <button
              onClick={() => navigate('/deliveries')}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg transition-all duration-200 font-medium text-sm whitespace-nowrap ${location.pathname === '/deliveries'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <ClipboardList size={18} />
              <span>Delivery Management</span>
            </button>
            <button
              onClick={() => navigate('/transmittals')}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg transition-all duration-200 font-medium text-sm whitespace-nowrap ${location.pathname === '/transmittals'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <FileText size={18} />
              <span>Transmittal Forms</span>
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Delivery Management</h1>
            <p className="text-xs sm:text-sm text-gray-600">Track and manage product deliveries to branches</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {canCreate && (
              <button
                onClick={() => handleOpenModal('create')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus size={16} />
                <span>New Delivery</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shadow-sm">
            <ArrowUpDown size={14} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden sm:inline">Sort by:</span>
            <select
              value={sortMode}
              onChange={e => { setSortMode(e.target.value); setCurrentPage(1); }}
              className="text-xs text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <DeliveryFilters
          filterData={filterData}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          companies={companies}
          branches={branches}
          warehouses={warehouses}
          products={products}
        />

        <DeliveryTable
          deliveries={currentDeliveries}
          onView={handleViewDelivery}
          onEdit={handleOpenModal.bind(null, 'edit')}
          onDelete={handleDeleteDelivery}
          onCancel={handleOpenCancelModal}
          onPrint={handleGenerateReceipt}
          onPageChange={setCurrentPage}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredDeliveries.length}
          isLoading={loading}
          canDelete={canDelete}
          canCreate={canCreate}
        />

        {modalState.show && modalState.mode === 'view' && modalState.delivery && (
          <DeliveryViewModal
            delivery={modalState.delivery}
            onClose={handleCloseModal}
            onEdit={() => { handleCloseModal(); setTimeout(() => handleOpenModal('edit', modalState.delivery), 100); }}
            onPrint={handleGenerateReceipt}
            isLoading={actionLoading}
          />
        )}
        {modalState.show && (modalState.mode === 'create' || modalState.mode === 'edit') && (
          <DeliveryFormModal
            mode={modalState.mode}
            delivery={modalState.delivery}
            onClose={handleCloseModal}
            onSave={handleSaveDelivery}
            branches={branches}
            products={products}
            warehouses={warehouses}
            companies={companies}
            isLoading={actionLoading}
          />
        )}
        {receiptModalState.show && receiptModalState.receiptData && (
          <DeliveryReceiptModal
            receiptData={receiptModalState.receiptData}
            onClose={() => setReceiptModalState({ show: false, receiptData: null })}
            onSave={handleSaveReceipt}
          />
        )}

        {cancelModal.show && cancelModal.delivery && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full shadow-2xl max-h-[95vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg"><XCircle size={22} className="text-orange-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cancel Delivered Delivery</h2>
                  <p className="text-sm text-gray-500 mt-0.5">DR# {cancelModal.delivery.deliveryReceiptNumber}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <p className="font-semibold mb-1">⚠️ What this action does:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Marks the delivery as <strong>CANCELLED</strong></li>
                    <li>Returns all delivered stock back to the warehouse</li>
                    <li>Removes the stock from the branch</li>
                    <li>Records reversal transactions</li>
                  </ul>
                  <p className="mt-2 text-amber-700">This can only proceed if <strong>none</strong> of the delivered items have been sold.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for Cancellation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelModal.remarks}
                    onChange={(e) => setCancelModal(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter the reason why this delivered delivery is being cancelled..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setCancelModal({ show: false, delivery: null, remarks: '' })}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                >
                  Keep Delivery
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={!cancelModal.remarks.trim()}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <XCircle size={16} />Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DeliveryManagement;