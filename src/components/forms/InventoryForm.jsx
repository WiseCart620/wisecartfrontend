// src/components/forms/InventoryForm.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, User, MessageSquare, Plus, Trash2, Package, AlertCircle } from 'lucide-react';
import GroupedSearchableDropdown from '../common/GroupedSearchableDropdown';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';
import { INVENTORY_TYPES } from '../../constants/inventoryTypes';
import { getCurrentUser } from '../../utils/authUtils';

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
        <form className="p-8">
            <div className="space-y-6">
                {/* Inventory Type */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Inventory Type</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {INVENTORY_TYPES.map(t => (
                            <button
                                type="button"
                                key={t.value}
                                onClick={() => onInventoryTypeChange(t.value)}
                                className={`p-4 rounded-lg border-2 text-left transition ${formData.inventoryType === t.value
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
                            <GroupedSearchableDropdown
                                options={getLocationOptions(formData.inventoryType, 'from')}
                                value={formData.fromWarehouseId ? `warehouse|${formData.fromWarehouseId}` : formData.fromBranchId ? `branch|${formData.fromBranchId}` : ''}
                                onChange={val => onLocationChange('from', val)}
                                placeholder="Select source location..."
                            />
                        </div>
                    )}
                    <div className={`p-5 rounded-lg border ${formData.inventoryType === 'DAMAGE'
                        ? 'bg-red-50 border-red-200 col-span-2'
                        : needsFromLocation
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-blue-50 border-blue-200 col-span-2'
                        }`}>
                        <label className={`block font-medium mb-2 ${formData.inventoryType === 'DAMAGE' ? 'text-red-800' : 'text-blue-800'
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
                            value={formData.dateProcessed}
                            onChange={e => setFormData(prev => ({ ...prev, dateProcessed: e.target.value }))}
                            required
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                <span className="ml-2 text-sm font-normal text-blue-600">
                                    (
                                    {formData.fromWarehouseId && `From: ${warehouses.find(w => w.id === formData.fromWarehouseId)?.warehouseName}`}
                                    {formData.fromBranchId && `From: ${branches.find(b => b.id === formData.fromBranchId)?.branchName}`}
                                    {formData.toWarehouseId && `To: ${warehouses.find(w => w.id === formData.toWarehouseId)?.warehouseName}`}
                                    {formData.toBranchId && `To: ${branches.find(b => b.id === formData.toBranchId)?.branchName}`}
                                    )
                                </span>
                            )}
                        </label>

                        {/* Location Required Warning */}
                        {!formData.toWarehouseId && !formData.toBranchId && !(formData.fromWarehouseId || formData.fromBranchId) && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-sm text-yellow-800 font-medium">Select a location first</p>
                                        <p className="text-xs text-yellow-700">Please select a source or destination location to see available stock levels</p>
                                    </div>
                                </div>
                            </div>
                        )}


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
                        <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500 border-2 border-dashed border-gray-300">
                            <Package size={48} className="mx-auto mb-3 text-gray-400" />
                            <p className="font-medium">No products added yet</p>
                            <p className="text-sm">Select a product above and click "Add Product" to start</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-10">Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU / UPC</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variation</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-44">Quantity</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {formData.items.map((item, i) => {
                                        const selectedOption = productOptions.find(opt =>
                                            opt.parentProductId === item.productId &&
                                            opt.variationId === item.variationId
                                        );
                                        const stockInfo = getItemStockInfo(i, item.productId, item.variationId);
                                        const selectedLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;

                                        return (
                                            <tr key={`item-${i}-${item.productId || 'new'}-${item.variationId || 'none'}`} className="hover:bg-gray-50">
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

                                                {/* SKU / UPC */}
                                                <td className="px-4 py-3">
                                                    {selectedOption && (
                                                        <div className="text-sm space-y-1">
                                                            <div>
                                                                <span className="text-gray-600">SKU:</span>
                                                                <span className="ml-1 font-medium text-gray-900">{selectedOption.sku || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">UPC:</span>
                                                                <span className="ml-1 font-medium text-gray-900">{selectedOption.upc || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Variation */}
                                                <td className="px-4 py-3">
                                                    {selectedOption && selectedOption.subLabel && selectedOption.subLabel !== 'No variations' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {selectedOption.subLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">None</span>
                                                    )}
                                                </td>

                                                {/* Stock (Available / Total) */}
                                                <td className="px-4 py-3">
                                                    {selectedLocation && stockInfo ? (
                                                        <div className="text-sm space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600">Available:</span>
                                                                <span className={`font-bold ${item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN' ? 'text-red-600' : 'text-green-600'
                                                                    }`}>
                                                                    {stockInfo.availableQuantity ?? stockInfo.quantity ?? 0}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600">Total:</span>
                                                                <span className="font-semibold text-gray-900">{stockInfo.quantity || 0}</span>
                                                            </div>
                                                            {stockInfo.reservedQuantity > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-600">Reserved:</span>
                                                                    <span className="font-semibold text-orange-600">{stockInfo.reservedQuantity}</span>
                                                                </div>
                                                            )}
                                                            {item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN' && (
                                                                <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-1">
                                                                    <AlertCircle size={12} />
                                                                    Exceeds stock!
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : selectedLocation && loadingStocks[`${i}_${item.productId}_${item.variationId}`] ? (
                                                        <div className="text-xs text-blue-600 italic flex items-center gap-2">
                                                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                                                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                                                                With Variations
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
                                                                No Variations
                                                            </span>
                                                        )
                                                    )}
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity || ''}
                                                        onChange={e => onItemChange(i, 'quantity', e.target.value)}
                                                        required
                                                        className={`w-full px-3 py-2 border rounded-lg text-center font-semibold min-w-[140px] ${stockInfo && item.quantity > (stockInfo.availableQuantity ?? stockInfo.quantity) && formData.inventoryType !== 'STOCK_IN'
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
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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