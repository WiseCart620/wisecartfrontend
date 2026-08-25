import React, { useState, useMemo } from 'react';
import { X, Trash2, UploadCloud, Building2, Calendar, User, PackagePlus } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';
import { makeStockKey, formatCurrency } from '../../utils/salesUtils';
import { months } from '../../constants/salesConstants';
import MassUploadModal from '../modals/MassUploadModal';

// Small reusable section wrapper — mirrors the "card block" pattern used in QBO forms
const FormSection = ({ icon: Icon, title, action, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-gray-400" />}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const SaleFormModal = ({
  modalMode,
  formData, setFormData,
  branchInfo,
  branches,
  productOptions,
  branchStocks, loadingStocks, stockErrors,
  selectedProductForAdd, setSelectedProductForAdd,
  originalSaleItems,
  onClose, onSubmit,
  onBranchChange,
  onAddProduct,
  onRemoveItem,
  onItemChange,
  onLoadStock,
  getMaxAllowedQuantity,
  onBulkUploadComplete,
  companies,
  defaultCompanyId,
  dataLoading = false,
}) => {
  const [showEncodedByDropdown, setShowEncodedByDropdown] = useState(false);
  const [showMassUpload, setShowMassUpload] = useState(false);
  const [massUploadStockLoading, setMassUploadStockLoading] = useState(false);
  const [grandTotalInput, setGrandTotalInput] = useState('');

  const handleMassUploadConfirm = async ({ branchId, month, year, items }) => {
    setShowMassUpload(false);
    setMassUploadStockLoading(true);
    try {
      if (formData.branchId !== branchId) {
        await onBranchChange(branchId);
      }
      await Promise.all(
        items.map(item => onLoadStock(item.productId, branchId, item.variationId))
      );
      setFormData(prev => ({ ...prev, branchId, month, year, items }));
    } finally {
      setMassUploadStockLoading(false);
    }
  };

  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

  const encodedByOptions = useMemo(() => [], []);

  const grandQty = formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const handleGrandTotalInputChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setGrandTotalInput(val);
  };

  const applyGrandTotal = () => {
    const target = parseFloat(grandTotalInput);
    if (Number.isNaN(target) || target < 0 || grandTotal <= 0) {
      setGrandTotalInput('');
      return;
    }

    const scale = target / grandTotal;

    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        const opt = Array.isArray(productOptions)
          ? productOptions.find(o =>
            o.parentProductId === item.productId &&
            (o.variationId ?? null) === (item.variationId ?? null)
          )
          : null;
        const currentPrice = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '')
          ? Number(item.unitPrice)
          : (opt?.price ?? 0);

        const newPrice = currentPrice * scale;
        const priceStr = parseFloat(newPrice.toFixed(6)).toString();
        return { ...item, unitPrice: priceStr };
      }),
    }));

    setGrandTotalInput('');
  };

  const grandTotal = formData.items.reduce((sum, item) => {
    if (!Array.isArray(productOptions)) return 0;
    const opt = productOptions.find(o =>
      o.parentProductId === item.productId &&
      (o.variationId ?? null) === (item.variationId ?? null)
    );
    const effectivePrice = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '')
      ? Number(item.unitPrice)
      : (opt?.price ?? 0);
    return sum + (effectivePrice * (item.quantity || 0));
  }, 0);

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-gray-50 rounded-xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {modalMode === 'create' ? 'Create New Sale' : 'Edit Sale'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {modalMode === 'create' ? 'Record a new sales order' : 'Update details for this sales order'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <form id="sale-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Branch */}
            <FormSection
              icon={Building2}
              title="Branch"
              action={modalMode === 'create' && (
                <button
                  type="button"
                  onClick={() => setShowMassUpload(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  <UploadCloud size={14} />
                  Mass Upload
                </button>
              )}
            >
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Select Branch *
              </label>
              <SearchableDropdown
                options={branchOptions}
                value={formData.branchId}
                onChange={onBranchChange}
                placeholder="Select Branch"
                displayKey="name" valueKey="id" required
                loading={dataLoading}
              />

              {branchInfo && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-sm">
                    <span className="text-gray-500">Branch</span>
                    <div className="font-semibold text-gray-900">{branchInfo.branchName}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Branch Code</span>
                    <div className="font-semibold text-gray-900">{branchInfo.branchCode}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">TIN</span>
                    <div className="font-semibold text-gray-900">{branchInfo.tin}</div>
                  </div>
                  <div className="text-sm sm:col-span-1">
                    <span className="text-gray-500">Address</span>
                    <div className="font-semibold text-gray-900">{branchInfo.fullAddress}</div>
                  </div>
                </div>
              )}
            </FormSection>

            {/* Sale details */}
            <FormSection icon={Calendar} title="Sale Details">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Month *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none"
                    required
                  >
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="flex items-center gap-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    <User size={11} /> Encoded By <span className="normal-case text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.createdBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, createdBy: e.target.value }))}
                    onFocus={() => setShowEncodedByDropdown(true)}
                    onBlur={() => setTimeout(() => setShowEncodedByDropdown(false), 150)}
                    placeholder="Type a name..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none"
                  />
                  {showEncodedByDropdown && encodedByOptions.filter(n => n.toLowerCase().includes(formData.createdBy.toLowerCase())).length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {encodedByOptions.filter(n => n.toLowerCase().includes(formData.createdBy.toLowerCase())).map(name => (
                        <button
                          key={name} type="button"
                          onMouseDown={() => { setFormData(prev => ({ ...prev, createdBy: name })); setShowEncodedByDropdown(false); }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${formData.createdBy === name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Products */}
            <FormSection icon={PackagePlus} title={`Products${formData.items.length ? ` (${formData.items.length})` : ''}`}>
              <div className="mb-5">
                <VariationSearchableDropdown
                  options={Array.isArray(productOptions) ? productOptions : []}
                  value={selectedProductForAdd}
                  onChange={setSelectedProductForAdd}
                  placeholder="Select Product to Add..."
                  required={false}
                  formData={{ ...formData, fromBranchId: formData.branchId, items: formData.items }}
                  index={-1}
                  warehouseStocks={{}}
                  branchStocks={branchStocks}
                  loadingStocks={loadingStocks}
                  onAddProduct={formData.branchId && !massUploadStockLoading ? onAddProduct : undefined}
                  activeCompanyId={branchInfo?.companyId ?? null}
                  loading={dataLoading}
                />
              </div>

              {massUploadStockLoading ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium text-sm">Loading stock for all items...</span>
                  </div>
                </div>
              ) : formData.items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="font-medium text-gray-500 text-sm">No products added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Select a product above and click "Add to List" to start</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        {['#', 'Product Name', 'Variation', 'SKU', 'UPC', 'Company SKU', 'Unit Price', 'Stock', 'Quantity', 'Amount', ''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {formData.items.map((item, i) => {
                        const selectedOption = Array.isArray(productOptions)
                          ? productOptions.find(opt =>
                            opt.parentProductId === item.productId &&
                            (opt.variationId ?? null) === (item.variationId ?? null)
                          )
                          : null;
                        const stockKey = makeStockKey(item.productId, item.variationId, formData.branchId);
                        const stockInfo = branchStocks[stockKey];
                        const isLoadingStock = loadingStocks[stockKey];
                        const oldItem = modalMode === 'edit' && originalSaleItems
                          ? originalSaleItems.find(oi => oi.productId === item.productId && oi.variationId === item.variationId)
                          : null;
                        const maxAllowed = getMaxAllowedQuantity(item, stockInfo, oldItem);
                        const hasEnoughStock = maxAllowed === undefined || maxAllowed >= item.quantity;
                        const originalPrice = selectedOption?.price ?? 0;
                        const price = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '')
                          ? Number(item.unitPrice)
                          : originalPrice;
                        const amount = price * (item.quantity || 0);

                        return (
                          <tr key={`${item.productId}_${item.variationId ?? 'base'}`} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              {selectedOption
                                ? <div className="font-semibold text-gray-900">{selectedOption.fullName}</div>
                                : <div className="text-gray-400 italic">Product not found</div>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {selectedOption?.variationLabel && selectedOption.variationLabel !== 'No variations'
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{selectedOption.variationLabel}</span>
                                : <span className="text-xs text-gray-400">None</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-gray-700">{selectedOption?.sku || 'N/A'}</td>
                            <td className="px-4 py-3 text-gray-700">{selectedOption?.upc || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {selectedOption?.companySku
                                ? <span className="font-medium text-gray-700">{selectedOption.companySku}</span>
                                : <span className="text-xs text-gray-400 italic">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <input
                                  type="text"
                                  value={item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : (originalPrice || '')}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    onItemChange(i, 'unitPrice', val);
                                  }}
                                  placeholder="0.00"
                                  className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-blue-600 text-right focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                                />
                                {originalPrice > 0 && Number(price) !== Number(originalPrice) && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    ₱{Number(originalPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 15 })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isLoadingStock ? (
                                <div className="flex items-center gap-2 text-blue-600 text-xs">
                                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  Loading...
                                </div>
                              ) : stockInfo ? (
                                <div className="space-y-0.5">
                                  <div className={`font-bold text-xs ${hasEnoughStock ? 'text-blue-600' : 'text-red-600'}`}>Avail: {stockInfo.availableQuantity ?? 0}</div>
                                  <div className="text-[11px] text-gray-400">Total: {stockInfo.quantity ?? 0}</div>
                                  {stockInfo.reservedQuantity > 0 && <div className="text-[11px] text-orange-500">Reserved: {stockInfo.reservedQuantity}</div>}
                                </div>
                              ) : (
                                <button type="button" onClick={() => onLoadStock(item.productId, formData.branchId, item.variationId)} className="text-xs text-blue-600 hover:underline font-medium">
                                  Load stock
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.quantity && item.quantity !== 0 ? Number(item.quantity).toLocaleString('en-US') : ''}
                                onChange={(e) => onItemChange(i, 'quantity', e.target.value.replace(/,/g, ''))}
                                placeholder="Qty"
                                className={`w-20 px-3 py-1.5 border rounded-md text-sm font-medium outline-none transition focus:ring-2 ${!hasEnoughStock && !isLoadingStock && item.quantity > 0 ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500/30 focus:border-blue-500'}`}
                                min="1" max={maxAllowed} required disabled={isLoadingStock}
                              />
                              {!hasEnoughStock && !isLoadingStock && item.quantity > 0 && (
                                <div className="text-[11px] text-red-600 mt-1">Max: {maxAllowed}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {amount > 0
                                ? <span className="font-bold text-gray-900">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                : <span className="text-xs text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => onRemoveItem(i)} disabled={isLoadingStock} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={8} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Grand Total</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {grandQty.toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="text"
                            value={grandTotalInput !== '' ? grandTotalInput : grandTotal.toFixed(2)}
                            onFocus={() => setGrandTotalInput(grandTotal.toFixed(2))}
                            onChange={handleGrandTotalInputChange}
                            onBlur={applyGrandTotal}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                            disabled={formData.items.length === 0}
                            className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm font-bold text-blue-600 text-right focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition disabled:bg-transparent disabled:border-transparent"
                          />
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </FormSection>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="px-5 sm:px-8 py-4 bg-white border-t border-gray-200 flex-shrink-0 flex justify-between items-center">
          <div className="text-sm text-gray-500 hidden sm:block">
            {formData.items.length > 0 && (
              <>
                <span className="font-semibold text-gray-900">{formData.items.length}</span> item{formData.items.length !== 1 ? 's' : ''} ·{' '}
                <span className="font-semibold text-gray-900">₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="sale-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
            >
              {modalMode === 'create' ? 'Create Sale' : 'Update Sale'}
            </button>
          </div>
        </div>
      </div>

      {showMassUpload && (
        <MassUploadModal
          branches={branches}
          companies={companies}
          productOptions={productOptions}
          onClose={() => setShowMassUpload(false)}
          onConfirm={handleMassUploadConfirm}
          onBulkUploadComplete={onBulkUploadComplete}
          defaultCompanyId={defaultCompanyId}
        />
      )}
    </div>
  );
};

export default SaleFormModal;