// src/components/forms/InventoryForm.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, User, MessageSquare, Plus, Trash2, Package, AlertCircle } from 'lucide-react';
import GroupedSearchableDropdown from '../common/GroupedSearchableDropdown';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';
import { INVENTORY_TYPES } from '../../constants/inventoryTypes';
import { getCurrentUser } from '../../utils/authUtils';

const formatQtyInput = (v) => {
    const digits = String(v ?? '').replace(/[^\d]/g, '');
    return digits ? Number(digits).toLocaleString('en-US') : '';
};
const parseQtyInput = (v) => String(v).replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');

const InventoryForm = ({
    formData,
    setFormData,
    modalMode,
    selectedInventory,
    products,
    warehouses,
    branches,
    loadingStocks,
    warehouseStocks,
    branchStocks,
    onAddProduct,
    onRemoveItem,
    onItemChange,
    onInventoryTypeChange,
    onLocationChange,
    selectedProductForAdd,
    setSelectedProductForAdd,
    tempQuantity,
    setTempQuantity
}) => {
    const needsFromLocation = ['TRANSFER', 'RETURN'].includes(formData.inventoryType);

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

    const productOptions = products.flatMap(p => {
        const truncateProductName = (name) => {
            if (!name) return '';
            const words = name.trim().split(/\s+/);
            if (words.length <= 10) return name;
            return words.slice(0, 10).join(' ') + '...';
        };

        if (p.variations && p.variations.length > 0) {
            return p.variations.map(v => {
                const uniqueId = `${p.id}_${v.id}`;
                const truncatedName = truncateProductName(p.productName);
                const upc = v.upc || p.upc || 'No UPC';
                const sku = v.sku || p.sku || 'No SKU';
                const displayName = truncatedName;

                return {
                    id: uniqueId,
                    parentProductId: p.id,
                    variationId: v.id,
                    originalProductId: p.id,
                    originalVariationId: v.id,
                    name: displayName,
                    subLabel: v.combinationDisplay || 'Variation',
                    fullName: p.productName,
                    upc: upc,
                    sku: sku,
                    price: v.price || p.price,
                    isVariation: true
                };
            });
        } else {
            const uniqueId = `prod_${p.id}`;
            const truncatedName = truncateProductName(p.productName);
            const upc = p.upc || 'No UPC';
            const sku = p.sku || 'No SKU';
            const displayName = truncatedName;

            return [{
                id: uniqueId,
                parentProductId: p.id,
                variationId: null,
                originalProductId: p.id,
                originalVariationId: null,
                name: displayName,
                subLabel: 'No variations',
                fullName: p.productName,
                upc: upc,
                sku: sku,
                price: p.price,
                isVariation: false
            }];
        }
    });

    const getItemStockInfo = (itemIndex, productId, variationId) => {
        let locationId = null;
        const actualProductId = productId;

        const createStockKey = (locId) => {
            return variationId
                ? `${itemIndex}_${actualProductId}_${variationId}_${locId}`
                : `${itemIndex}_${actualProductId}_${locId}`;
        };

        if (formData.fromWarehouseId) {
            const key = createStockKey(formData.fromWarehouseId);
            return (warehouseStocks && !Array.isArray(warehouseStocks)) ? warehouseStocks[key] : warehouseStocks?.__cache?.[key];
        } else if (formData.fromBranchId) {
            const key = createStockKey(formData.fromBranchId);
            return (branchStocks && !Array.isArray(branchStocks)) ? branchStocks[key] : branchStocks?.__cache?.[key];
        } else if (formData.toWarehouseId) {
            const key = createStockKey(formData.toWarehouseId);
            return (warehouseStocks && !Array.isArray(warehouseStocks)) ? warehouseStocks[key] : warehouseStocks?.__cache?.[key];
        } else if (formData.toBranchId) {
            const key = createStockKey(formData.toBranchId);
            return (branchStocks && !Array.isArray(branchStocks)) ? branchStocks[key] : branchStocks?.__cache?.[key];
        }

        return null;
    };

    return (
        <form className="px-6 py-4 flex-1 min-h-0 overflow-y-auto flex flex-col">
            <div className="space-y-3">
                {/* Inventory Type */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Inventory Type</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {INVENTORY_TYPES.map(t => (
                            <button
                                type="button"
                                key={t.value}
                                onClick={() => onInventoryTypeChange(t.value)}
                                className={`px-4 py-2 rounded border-2 text-left transition ${formData.inventoryType === t.value
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
                        <div className="p-5 bg-red-50 rounded border border-red-200">
                            <label className="block font-medium mb-2 text-red-800">From Location *</label>
                            <GroupedSearchableDropdown
                                options={getLocationOptions(formData.inventoryType, 'from')}
                                value={formData.fromWarehouseId ? `warehouse|${formData.fromWarehouseId}` : formData.fromBranchId ? `branch|${formData.fromBranchId}` : ''}
                                onChange={val => onLocationChange('from', val)}
                                placeholder="Select source location..."
                            />
                        </div>
                    )}
                    <div className={`p-5 rounded border ${formData.inventoryType === 'DAMAGE'
                        ? 'bg-red-50 border-red-200 col-span-2'
                        : needsFromLocation
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-orange-50 border-orange-200 col-span-2'
                        }`}>
                        <label className={`block font-medium mb-2 ${formData.inventoryType === 'DAMAGE' ? 'text-red-800' : 'text-orange-800'
                            }`}>
                            To Location *
                        </label>
                        <GroupedSearchableDropdown
                            options={getLocationOptions(formData.inventoryType, 'to')}
                            value={formData.toWarehouseId ? `warehouse|${formData.toWarehouseId}` : formData.toBranchId ? `branch|${formData.toBranchId}` : ''}
                            onChange={val => onLocationChange('to', val)}
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
                            value={formData.dateProcessed ? formData.dateProcessed.slice(0, 10) : ''}
                            onChange={e => {
                                const existingTime = formData.dateProcessed?.includes('T')
                                    ? formData.dateProcessed.slice(10)
                                    : 'T00:00:00';
                                setFormData(prev => ({ ...prev, dateProcessed: `${e.target.value}${existingTime}` }));
                            }}
                            required
                            className="w-full px-4 py-3 border rounded focus:ring-2 focus:ring-orange-500"
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
                            className="w-full px-4 py-3 border rounded focus:ring-2 focus:ring-orange-500"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                            className="w-full px-4 py-3 border rounded focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Products Section */}
                <div>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-4">
                            <Package className="inline mr-2" size={20} />
                            Add Products *
                            {(formData.toWarehouseId || formData.toBranchId || formData.fromWarehouseId || formData.fromBranchId) && (
                                <span className="ml-2 text-sm font-normal text-gray-700">
                                    (
                                    {[
                                        formData.fromWarehouseId && `From: ${warehouses.find(w => w.id === formData.fromWarehouseId)?.warehouseName}`,
                                        formData.fromBranchId && `From: ${branches.find(b => b.id === formData.fromBranchId)?.branchName}`,
                                        formData.toWarehouseId && `To: ${warehouses.find(w => w.id === formData.toWarehouseId)?.warehouseName}`,
                                        formData.toBranchId && `To: ${branches.find(b => b.id === formData.toBranchId)?.branchName}`
                                    ].filter(Boolean).join(' → ')}
                                    )
                                </span>
                            )}
                        </label>



                        {/* Product Selection Row */}
                        <div className="mb-4">
                            <VariationSearchableDropdown
                                options={productOptions}
                                value={selectedProductForAdd}
                                onChange={(value) => setSelectedProductForAdd(value)}
                                placeholder="Select Product to Add..."
                                required={false}
                                formData={formData}
                                index={-1}
                                warehouseStocks={warehouseStocks}
                                branchStocks={branchStocks}
                                loadingStocks={loadingStocks}
                                onAddProduct={onAddProduct}
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    {formData.items.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded text-gray-500 border-2 border-dashed border-gray-300">
                            <Package size={48} className="mx-auto mb-3 text-gray-400" />
                            <p className="font-medium">No products added yet</p>
                            <p className="text-sm">Select a product above and click "Add Product" to start</p>
                        </div>
                    ) : (
                        <div className="h-[600px] overflow-auto rounded border border-gray-200">
                            <table className="w-full">
                                <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-10">Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variation</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU / UPC</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-44">Quantity</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {formData.items.map((item, i) => {
                                        const liveOption = productOptions.find(opt =>
                                            Number(opt.parentProductId) === Number(item.productId) &&
                                            (opt.variationId == null && item.variationId == null
                                                ? true
                                                : Number(opt.variationId) === Number(item.variationId))
                                        );
                                        const selectedOption = liveOption || {
                                            fullName: item.productName || item.productDescription || `Product #${item.productId}`,
                                            sku: item.sku || 'N/A',
                                            upc: item.upc || 'N/A',
                                            subLabel: (item.variationDescription && item.variationDescription !== 'N/A')
                                                ? item.variationDescription
                                                : 'No variations',
                                            isVariation: !!item.variationId,
                                        };
                                        const stockInfo = getItemStockInfo(i, item.productId, item.variationId);
                                        const selectedLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;

                                        return (
                                            <tr key={`item-${i}-${item.productId || 'new'}-${item.variationId || 'none'}`} className="hover:bg-white">
                                                <td className="px-4 py-3 text-center text-sm text-gray-400 font-medium align-top">{i + 1}</td>
                                                {/* Product Name */}
                                                <td className="px-4 py-3">
                                                    {selectedOption ? (
                                                        <div className="font-semibold text-gray-900">
                                                            {selectedOption.fullName}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500 italic">Product not found</div>
                                                    )}
                                                </td>

                                                {/* Variation */}
                                                <td className="px-4 py-3">
                                                    {selectedOption && selectedOption.subLabel && selectedOption.subLabel !== 'No variations' ? (
                                                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                            {selectedOption.subLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">None</span>
                                                    )}
                                                </td>

                                                {/* SKU / UPC */}
                                                <td className="px-4 py-3 text-left">
                                                    {selectedOption && (
                                                        <div className="text-sm space-y-1">
                                                            <div className="font-medium text-gray-700 whitespace-nowrap">{selectedOption.sku || 'N/A'}</div>
                                                            <div className="font-medium text-gray-700 whitespace-nowrap">{selectedOption.upc || 'N/A'}</div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Stock (Available / Total) */}
                                                <td className="px-4 py-3">
                                                    {selectedLocation && stockInfo ? (
                                                        <div className="text-sm space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600">Available:</span>
                                                                <span className={`font-bold ${item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN' ? 'text-red-600' : 'text-gray-700'
                                                                    }`}>
                                                                    {fmtNum(stockInfo.availableQuantity ?? stockInfo.quantity ?? 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600">Total:</span>
                                                                <span className="font-semibold text-gray-700">{fmtNum(stockInfo.quantity)}</span>
                                                            </div>
                                                            {stockInfo.reservedQuantity > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-600">Reserved:</span>
                                                                    <span className="font-semibold text-gray-700">{fmtNum(stockInfo.reservedQuantity)}</span>
                                                                </div>
                                                            )}
                                                            {item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN' && (
                                                                <div className="flex items-center gap-1 text-gray-700 text-xs font-medium mt-1">
                                                                    <AlertCircle size={12} />
                                                                    Exceeds stock!
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : selectedLocation && loadingStocks[`${i}_${item.productId}_${item.variationId}`] ? (
                                                        <div className="text-xs text-orange-600 italic flex items-center gap-2">
                                                            <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                                            Loading...
                                                        </div>
                                                    ) : !selectedLocation ? (
                                                        <div className="text-xs text-yellow-700 italic">
                                                            Select location
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-500 italic">
                                                            No data
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Product Type */}
                                                <td className="px-4 py-3">
                                                    {selectedOption && (
                                                        selectedOption.isVariation ? (
                                                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                                With Variations
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-gray-400 whitespace-nowrap">
                                                                No Variations
                                                            </span>
                                                        )
                                                    )}
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={formatQtyInput(item.quantity)}
                                                        onChange={e => onItemChange(i, 'quantity', parseQtyInput(e.target.value))}
                                                        required
                                                        className={`w-full px-3 py-2 border rounded text-center font-semibold min-w-[140px] ${stockInfo && item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN'
                                                            ? 'border-red-300 bg-red-50 text-red-900'
                                                            : 'border-gray-300'
                                                            }`}
                                                    />
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveItem(i)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
};

export default InventoryForm;