// src/components/modals/InventoryFormModal.jsx
import React from 'react';
import { X, Check } from 'lucide-react';
import InventoryForm from '../forms/InventoryForm';

const InventoryFormModal = ({
  showModal,
  modalMode,
  selectedInventory,
  formData,
  setFormData,
  products,
  warehouses,
  branches,
  loadingStocks,
  warehouseStocks,
  branchStocks,
  onClose,
  onSubmit,
  onAddProduct,
  onRemoveItem,
  onItemChange,
  onInventoryTypeChange,
  onLocationChange,
  selectedProductForAdd,
  setSelectedProductForAdd,
  tempQuantity,
  setTempQuantity,
  onConfirmInventory
}) => {
  if (!showModal) return null;

  const totalItems = formData.items.length;
  const totalQuantity = formData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-7xl w-full h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="shrink-0 p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl sm:rounded-t-2xl">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            {modalMode === 'create' ? 'Create New Inventory Record' : 'Edit Inventory Record'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        <InventoryForm
          formData={formData}
          setFormData={setFormData}
          modalMode={modalMode}
          selectedInventory={selectedInventory}
          products={products}
          warehouses={warehouses}
          branches={branches}
          loadingStocks={loadingStocks}
          warehouseStocks={warehouseStocks}
          branchStocks={branchStocks}
          onAddProduct={onAddProduct}
          onRemoveItem={onRemoveItem}
          onItemChange={onItemChange}
          onInventoryTypeChange={onInventoryTypeChange}
          onLocationChange={onLocationChange}
          selectedProductForAdd={selectedProductForAdd}
          setSelectedProductForAdd={setSelectedProductForAdd}
          tempQuantity={tempQuantity}
          setTempQuantity={setTempQuantity}
        />


        <div className="shrink-0 flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-gray-200 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* ── Item/Qty totals (left, no background, no border) ── */}
            {formData.items.length > 0 && (
              <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                <span>
                  📦 {totalItems} product{totalItems !== 1 ? 's' : ''}
                </span>
                <span>
                  Total Qty: {totalQuantity.toLocaleString('en-US')}
                </span>
              </div>
            )}

            {modalMode === 'edit' && selectedInventory && selectedInventory.status === 'PENDING' && (
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await onConfirmInventory(selectedInventory, formData.confirmedBy);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-transparent border border-orange-500 text-orange-600 hover:bg-orange-50 rounded transition font-medium"
              >
                <Check size={18} />
                <span>Confirm Inventory</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded hover:bg-white transition font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition font-medium shadow-md text-sm"
            >
              {modalMode === 'create' ? 'Create Record' : 'Update Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryFormModal;