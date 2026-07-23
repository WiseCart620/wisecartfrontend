import React, { useState, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';
import { makeStockKey, formatCurrency } from '../../utils/salesUtils';
import { months } from '../../constants/salesConstants';
import MassUploadModal from '../modals/MassUploadModal';

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
  onLoadStock,
  getMaxAllowedQuantity,
  onBulkUploadComplete,
  companies,
  defaultCompanyId,
}) => {
  const [showEncodedByDropdown, setShowEncodedByDropdown] = useState(false);
  const [showMassUpload, setShowMassUpload] = useState(false);

  const handleMassUploadConfirm = async ({ branchId, month, year, items }) => {
    setShowMassUpload(false);
    if (formData.branchId !== branchId) {
      await onBranchChange(branchId);
    }
    setFormData(prev => ({ ...prev, branchId, month, year, items }));
    items.forEach(item => onLoadStock(item.productId, formData.branchId || branchId, item.variationId));
  };

  const branchOptions = branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

  const encodedByOptions = useMemo(() => {
    return [];
  }, []);

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="p-4 sm:p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            {modalMode === 'create' ? 'Create New Sale' : 'Edit Sale'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Branch *</label>
              <SearchableDropdown
                options={branchOptions}
                value={formData.branchId}
                onChange={onBranchChange}
                placeholder="Select Branch"
                displayKey="name" valueKey="id" required
              />
            </div>

            {branchInfo && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-1"><strong>Branch:</strong> {branchInfo.branchName}</p>
                <p className="text-sm text-blue-800 mb-1"><strong>Branch Code:</strong> {branchInfo.branchCode}</p>
                <p className="text-sm text-blue-800 mb-1"><strong>TIN:</strong> {branchInfo.tin}</p>
                <p className="text-sm text-blue-800"><strong>Address:</strong> {branchInfo.fullAddress}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Month *</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                >
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Year *</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Encoded By <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.createdBy}
                onChange={(e) => setFormData(prev => ({ ...prev, createdBy: e.target.value }))}
                onFocus={() => setShowEncodedByDropdown(true)}
                onBlur={() => setTimeout(() => setShowEncodedByDropdown(false), 150)}
                placeholder="Select existing or type a custom name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              {showEncodedByDropdown && encodedByOptions.filter(n => n.toLowerCase().includes(formData.createdBy.toLowerCase())).length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {encodedByOptions.filter(n => n.toLowerCase().includes(formData.createdBy.toLowerCase())).map(name => (
                    <button
                      key={name} type="button"
                      onMouseDown={() => { setFormData(prev => ({ ...prev, createdBy: name })); setShowEncodedByDropdown(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition ${formData.createdBy === name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Add Products *</label>
                {modalMode === 'create' && (
                  <button type="button" onClick={() => setShowMassUpload(true)} className="text-sm text-blue-600 hover:underline font-medium">
                    Mass Upload
                  </button>
                )}
              </div>
              <div className="mb-6">
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
                  onAddProduct={formData.branchId ? onAddProduct : undefined}
                  activeCompanyId={branchInfo?.companyId ?? null}
                />
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="font-medium text-gray-500">No products added yet</p>
                  <p className="text-sm text-gray-400">Select a product above and click "Add Product" to start</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['#', 'Product Name', 'Variation', 'SKU', 'UPC', 'Company SKU', 'Unit Price', 'Stock', 'Quantity', 'Amount', 'Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {formData.items.map((item, i) => {
                        const selectedOption = Array.isArray(productOptions)
                          ? productOptions.find(opt => opt.parentProductId === item.productId && (item.variationId !== null ? opt.variationId === item.variationId : opt.variationId === null))
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
                          <tr key={`${item.productId}_${item.variationId ?? 'base'}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center text-sm text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              {selectedOption
                                ? <div className="font-semibold text-gray-900 text-sm">{selectedOption.fullName}</div>
                                : <div className="text-gray-500 italic text-sm">Product not found</div>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {selectedOption?.variationLabel && selectedOption.variationLabel !== 'No variations'
                                ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{selectedOption.variationLabel}</span>
                                : <span className="text-xs text-gray-500">None</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{selectedOption?.sku || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{selectedOption?.upc || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {selectedOption?.companySku
                                ? <span className="text-sm font-medium text-gray-900">{selectedOption.companySku}</span>
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
                                  className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm font-semibold text-green-700 text-right focus:ring-2 focus:ring-blue-500"
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
                                <div className="text-sm space-y-1">
                                  <div className={`font-bold ${hasEnoughStock ? 'text-green-600' : 'text-red-600'}`}>Avail: {stockInfo.availableQuantity ?? 0}</div>
                                  <div className="text-xs text-gray-500">Total: {stockInfo.quantity ?? 0}</div>
                                  {stockInfo.reservedQuantity > 0 && <div className="text-xs text-orange-600">Reserved: {stockInfo.reservedQuantity}</div>}
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
                                className={`w-24 px-3 py-2 border rounded-lg text-sm font-medium ${!hasEnoughStock && !isLoadingStock && item.quantity > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                min="1" max={maxAllowed} required disabled={isLoadingStock}
                              />
                              {!hasEnoughStock && !isLoadingStock && item.quantity > 0 && (
                                <div className="text-xs text-red-600 mt-1">Exceeds max: {maxAllowed}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {amount > 0
                                ? <span className="text-sm font-bold text-blue-700">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                : <span className="text-xs text-gray-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => onRemoveItem(i)} disabled={isLoadingStock} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={8} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Grand Total:</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
                          ₱{formData.items.reduce((sum, item) => {
                            if (!Array.isArray(productOptions)) return 0;
                            const opt = productOptions.find(o => o.parentProductId === item.productId && (item.variationId !== null ? o.variationId === item.variationId : o.variationId === null));
                            const effectivePrice = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '')
                              ? Number(item.unitPrice)
                              : (opt?.price ?? 0);
                            return sum + (effectivePrice * (item.quantity || 0));
                          }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md">
              {modalMode === 'create' ? 'Create Sale' : 'Update Sale'}
            </button>
          </div>
        </form>
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