// src/components/modals/DeliveryFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, ChevronDown } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';
import { api } from '../../services/api';
import { formatDateForInput } from '../../utils/dateUtils';

const DeliveryFormModal = ({
    mode,
    delivery,
    onClose,
    onSave,
    branches,
    products,
    warehouses,
    companies,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        branchId: '',
        date: '',
        deliveryReceiptNumber: '',
        purchaseOrderNumber: '',
        transmittal: '',
        preparedBy: '',
        status: 'PREPARING',
        customStatus: '',
        remarks: '',
        items: [],
        selectedWarehouseId: '',
        datePrepared: '',
        dateDelivered: ''
    });

    const [branchInfo, setBranchInfo] = useState(null);
    const [warehouseStocks, setWarehouseStocks] = useState({});
    const [loadingStocks, setLoadingStocks] = useState({});
    const [stockErrors, setStockErrors] = useState({});
    const [showBranchDetails, setShowBranchDetails] = useState(true);
    const [showWarehouseDetails, setShowWarehouseDetails] = useState(true);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
    const [branchStocks, setBranchStocks] = useState({});

    useEffect(() => {
        if (mode === 'create') {
            const now = new Date();
            const localISOString = formatDateForInput(now.toISOString());
            setFormData({
                branchId: '',
                date: localISOString,
                deliveryReceiptNumber: '',
                purchaseOrderNumber: '',
                transmittal: '',
                preparedBy: localStorage.getItem('fullName') || localStorage.getItem('username') || '',
                status: 'PREPARING',
                customStatus: '',
                remarks: '',
                items: [],
                selectedWarehouseId: '',
                datePrepared: localISOString,
                dateDelivered: ''
            });
            setBranchInfo(null);
            setWarehouseStocks({});
            setLoadingStocks({});
        } else if (mode === 'edit' && delivery) {
            setWarehouseStocks({});
            setLoadingStocks({});

            const items = delivery.items || [];
            let selectedWarehouseId = '';
            if (items.length > 0 && items[0].warehouse) {
                selectedWarehouseId = items[0].warehouse.id;
            }

            const processedItems = items.map((item, index) => {
                const productId = item.product?.id;
                let variationId = null;
                if (item.variationId !== null && item.variationId !== undefined) {
                    variationId = item.variationId;
                } else if (item.variation?.id !== null && item.variation?.id !== undefined) {
                    variationId = item.variation.id;
                }
                const formattedProductId = variationId ? `${productId}_${variationId}` : `prod_${productId}`;
                return {
                    productId,
                    variationId,
                    quantity: item.quantity || item.preparedQty || 0,
                    preparedQty: item.preparedQty || 0,
                    deliveredQty: item.deliveredQty || 0,
                    uom: item.uom || '',
                    warehouseId: item.warehouse?.id || selectedWarehouseId,
                    originalPreparedQty: item.preparedQty || 0,
                    formattedProductId
                };
            });

            const editFormData = {
                branchId: delivery.branch?.id || '',
                date: delivery.date ? formatDateForInput(delivery.date) : formatDateForInput(new Date()),
                deliveryReceiptNumber: delivery.deliveryReceiptNumber || '',
                purchaseOrderNumber: delivery.purchaseOrderNumber || '',
                transmittal: delivery.transmittal || '',
                preparedBy: delivery.preparedBy || '',
                status: delivery.status || 'PREPARING',
                customStatus: delivery.customStatus || '',
                remarks: delivery.remarks || '',
                selectedWarehouseId,
                datePrepared: delivery.datePrepared
                    ? formatDateForInput(delivery.datePrepared)
                    : formatDateForInput(delivery.date || new Date()),
                dateDelivered: delivery.dateDelivered ? formatDateForInput(delivery.dateDelivered) : '',
                items: processedItems
            };

            setFormData(editFormData);

            if (delivery.branch) {
                const company = delivery.branch.company || delivery.company;
                if (company) {
                    setBranchInfo({
                        companyName: company.companyName || '',
                        fullAddress: `${company.address || ''}, ${company.city || ''}, ${company.province || ''}`.trim(),
                        branchName: delivery.branch.branchName || '',
                        branchCode: delivery.branch.branchCode || '',
                        branchAddress: `${delivery.branch.address || ''}, ${delivery.branch.city || ''}, ${delivery.branch.province || ''}`.trim(),
                        branchTin: delivery.branch.tin || company.tin || '',
                        branchContactNumber: delivery.branch.contactNumber || ''
                    });
                }
            }

            if (processedItems.length > 0) {
                setTimeout(() => {
                    processedItems.forEach((item, index) => {
                        if (item.warehouseId && item.productId) {
                            loadWarehouseStock(item.warehouseId, item.productId, item.variationId, index);
                        }
                    });
                }, 300);
            }
        }
    }, [mode, delivery]);

    useEffect(() => {
        if (selectedProductForAdd && formData.selectedWarehouseId && products.length > 0) {
            const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
            if (selectedOption) {
                loadWarehouseStock(formData.selectedWarehouseId, selectedOption.parentProductId, selectedOption.variationId, -1);
            }
        }
    }, [selectedProductForAdd, formData.selectedWarehouseId, products]);

    const branchOptions = branches ? branches.map(b => ({ id: b.id, name: `${b.branchName || 'Unknown'} (${b.branchCode || 'N/A'})` })) : [];
    const warehouseOptions = warehouses ? warehouses.map(w => ({ id: w.id, name: `${w.warehouseName || 'Unknown'} (${w.warehouseCode || 'N/A'})` })) : [];

    const productOptions = products ? products.flatMap(p => {
        if (!p) return [];
        if (p.variations && p.variations.length > 0) {
            return p.variations.map(v => ({
                id: `${p.id}_${v.id}`,
                parentProductId: p.id,
                variationId: v.id,
                name: `${p.productName || 'Unknown'}`,
                subLabel: v.combinationDisplay || 'Variation',
                fullName: p.productName || 'Unknown Product',
                upc: v.upc,
                sku: v.sku,
                price: v.price || p.price || 0,
                uom: p.uom || '',
                isVariation: true
            }));
        } else {
            return [{
                id: `prod_${p.id}`,
                parentProductId: p.id,
                variationId: null,
                name: `${p.productName || 'Unknown'}`,
                subLabel: 'No variations',
                fullName: p.productName || 'Unknown Product',
                upc: p.upc,
                sku: p.sku,
                price: p.price || 0,
                uom: p.uom || '',
                isVariation: false
            }];
        }
    }) : [];

    const loadWarehouseStock = async (warehouseId, productId, variationId, itemIndex) => {
        if (!warehouseId || !productId) return;
        const stockKey = variationId
            ? `${itemIndex}_${productId}_${variationId}_${warehouseId}`
            : `${itemIndex}_${productId}_${warehouseId}`;

        setLoadingStocks(prev => ({ ...prev, [stockKey]: true }));
        setStockErrors(prev => ({ ...prev, [stockKey]: null }));
        try {
            const endpoint = variationId
                ? `/stocks/warehouses/${warehouseId}/products/${productId}/variations/${variationId}`
                : `/stocks/warehouses/${warehouseId}/products/${productId}`;
            const stock = await api.get(endpoint);
            const stockData = stock.success ? stock.data : stock;
            setWarehouseStocks(prev => ({ ...prev, [stockKey]: stockData || { quantity: 0, availableQuantity: 0 } }));
        } catch (error) {
            setWarehouseStocks(prev => ({ ...prev, [stockKey]: { quantity: 0, availableQuantity: 0 } }));
            setStockErrors(prev => ({ ...prev, [stockKey]: 'Failed to load stock' }));
        } finally {
            setLoadingStocks(prev => ({ ...prev, [stockKey]: false }));
        }
    };

    const handleItemChange = async (index, field, value) => {
        const newItems = [...formData.items];
        if (field === 'preparedQty' || field === 'deliveredQty') {
            newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
        } else if (field === 'productId') {
            const selectedOption = productOptions.find(opt => opt.id === value);
            if (selectedOption) {
                newItems[index] = { ...newItems[index], productId: selectedOption.parentProductId, variationId: selectedOption.variationId || null, uom: selectedOption.uom || '' };
                setFormData({ ...formData, items: newItems });
                if (newItems[index].warehouseId) {
                    setTimeout(() => loadWarehouseStock(newItems[index].warehouseId, selectedOption.parentProductId, selectedOption.variationId, index), 0);
                }
                return;
            }
        } else {
            newItems[index][field] = value;
        }
        setFormData({ ...formData, items: newItems });

        if (field === 'warehouseId') {
            const item = newItems[index];
            if (item.productId && value) {
                setTimeout(() => loadWarehouseStock(value, item.productId, item.variationId, index), 100);
            }
            newItems[index].preparedQty = '';
            newItems[index].deliveredQty = '';
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { productId: '', preparedQty: '', deliveredQty: '', uom: '', warehouseId: formData.selectedWarehouseId || '', originalPreparedQty: 0 }] });
    };

    const handleRemoveItem = (index) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleAddProductToTable = () => {
        if (!selectedProductForAdd) { alert('Please select a product first'); return; }
        if (!formData.selectedWarehouseId) { alert('Please select a warehouse first'); return; }
        const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
        if (!selectedOption) { alert('Selected product not found'); return; }
        const exists = formData.items.some(item => item.productId === selectedOption.parentProductId && item.variationId === selectedOption.variationId);
        if (exists) { alert('This product is already in the delivery list'); return; }
        const newItem = { productId: selectedOption.parentProductId, variationId: selectedOption.variationId || null, preparedQty: '', deliveredQty: '', uom: selectedOption.uom || '', warehouseId: formData.selectedWarehouseId, originalPreparedQty: 0 };
        const newItems = [...formData.items, newItem];
        setFormData({ ...formData, items: newItems });
        setTimeout(() => loadWarehouseStock(formData.selectedWarehouseId, selectedOption.parentProductId, selectedOption.variationId, newItems.length - 1), 100);
        setSelectedProductForAdd('');
    };

    const handleBranchChange = (branchId) => {
        setFormData({ ...formData, branchId });
        if (branchId) {
            const branch = branches.find(b => b.id === branchId);
            if (branch && branch.company) {
                setBranchInfo({
                    companyName: branch.company.companyName,
                    fullAddress: `${branch.company.address || ''}, ${branch.company.city || ''}, ${branch.company.province || ''}`.trim(),
                    branchName: branch.branchName,
                    branchCode: branch.branchCode,
                    branchAddress: `${branch.address || ''}, ${branch.city || ''}, ${branch.province || ''}`.trim(),
                    branchTin: branch.tin || '',
                    branchContactNumber: branch.contactNumber || ''
                });
            }
        } else {
            setBranchInfo(null);
        }
    };

    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    const getStatusDropdownBgColor = (status) => {
        const colors = { PREPARING: 'bg-yellow-50 border-yellow-200', IN_TRANSIT: 'bg-purple-50 border-purple-200', DELIVERED: 'bg-green-50 border-green-200', CANCELLED: 'bg-red-50 border-red-200' };
        return colors[status] || 'bg-gray-50 border-gray-200';
    };

    // ── Compute running totals from items ─────────────────────────────────
    const totalPrepared = formData.items.reduce((s, it) => s + (parseInt(it.preparedQty) || 0), 0);
    const totalDelivered = formData.items.reduce((s, it) => s + (parseInt(it.deliveredQty) || 0), 0);
    const isDeliveredStatus = formData.status === 'DELIVERED';


    const handleFormArrowNav = (e) => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName === 'TEXTAREA') return;

        const focusable = Array.from(
            e.currentTarget.querySelectorAll(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
            )
        ).filter(el => el.offsetParent !== null);

        const current = document.activeElement;
        const index = focusable.indexOf(current);
        if (index === -1) return;

        if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && index < focusable.length - 1) {
            e.preventDefault();
            focusable[index + 1].focus();
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && index > 0) {
            e.preventDefault();
            focusable[index - 1].focus();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-[65vw] w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {mode === 'create' ? 'Create New Delivery' : 'Edit Delivery'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" disabled={isLoading}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} onKeyDown={handleFormArrowNav} className="p-8">
                    <div className="space-y-6">

                        {/* Row 1: Branch and Warehouse */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Branch *
                                    {(formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED') && (
                                        <span className="ml-2 text-xs text-orange-600">(Locked - Cannot change in {formData.status} status)</span>
                                    )}
                                </label>
                                <SearchableDropdown options={branchOptions} value={formData.branchId} onChange={handleBranchChange} placeholder="Select Branch" displayKey="name" valueKey="id" required disabled={formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED'} />
                                {branchInfo && (
                                    <div className="mt-4 bg-green-50 rounded-lg border border-green-200 p-3">
                                        <button type="button" onClick={() => setShowBranchDetails(!showBranchDetails)} className="w-full flex items-center justify-between hover:bg-green-100 transition rounded-lg p-2 -m-2 mb-2">
                                            <h3 className="text-sm font-bold text-green-900 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Branch Details
                                            </h3>
                                            <ChevronDown size={20} className={`text-green-600 transition-transform ${showBranchDetails ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showBranchDetails && (
                                            <div className="space-y-1 mt-2">
                                                <div className="flex items-start gap-2"><span className="text-xs text-green-600 font-medium w-20 flex-shrink-0">Company:</span><span className="text-sm text-green-900 font-semibold flex-1">{branchInfo.companyName}</span></div>
                                                <div className="flex items-start gap-2"><span className="text-xs text-green-600 font-medium w-20 flex-shrink-0">Branch:</span><span className="text-sm text-green-900 font-semibold flex-1">{branchInfo.branchName} ({branchInfo.branchCode})</span></div>
                                                {branchInfo.branchTin && <div className="flex items-start gap-2"><span className="text-xs text-green-600 font-medium w-20 flex-shrink-0">TIN:</span><span className="text-sm text-green-900 flex-1">{branchInfo.branchTin}</span></div>}
                                                <div className="flex items-start gap-2"><span className="text-xs text-green-600 font-medium w-20 flex-shrink-0">Address:</span><span className="text-sm text-green-900 flex-1">{branchInfo.branchAddress}</span></div>
                                                {branchInfo.branchContactNumber && <div className="flex items-start gap-2"><span className="text-xs text-green-600 font-medium w-20 flex-shrink-0">Contact:</span><span className="text-sm text-green-900 flex-1">{branchInfo.branchContactNumber}</span></div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Warehouse (applies to all items) *
                                    {formData.status === 'PREPARING' ? <span className="ml-2 text-xs text-green-600">(Editable)</span> : <span className="ml-2 text-xs text-orange-600">(Locked in {formData.status} status)</span>}
                                </label>
                                <SearchableDropdown
                                    options={warehouseOptions}
                                    value={formData.selectedWarehouseId}
                                    onChange={(value) => setFormData({ ...formData, selectedWarehouseId: value, items: formData.items.map(item => ({ ...item, warehouseId: value })) })}
                                    placeholder="Select Warehouse"
                                    displayKey="name"
                                    valueKey="id"
                                    required
                                    disabled={formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED'}
                                />
                                {formData.selectedWarehouseId && (
                                    <div className="mt-4 bg-blue-50 rounded-lg border border-blue-200 p-3">
                                        <button type="button" onClick={() => setShowWarehouseDetails(!showWarehouseDetails)} className="w-full flex items-center justify-between hover:bg-blue-100 transition rounded-lg p-2 -m-2 mb-2">
                                            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Package size={16} />Warehouse Details</h3>
                                            <ChevronDown size={20} className={`text-blue-600 transition-transform ${showWarehouseDetails ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showWarehouseDetails && (
                                            <div className="space-y-1 mt-2">
                                                {(() => {
                                                    const selectedWarehouse = warehouses.find(w => w.id === parseInt(formData.selectedWarehouseId));
                                                    return selectedWarehouse ? (
                                                        <>
                                                            <div className="flex items-start gap-2"><span className="text-xs text-blue-600 font-medium w-20 flex-shrink-0">Warehouse:</span><span className="text-sm text-blue-900 font-semibold flex-1">{selectedWarehouse.warehouseName}</span></div>
                                                            <div className="flex items-start gap-2"><span className="text-xs text-blue-600 font-medium w-20 flex-shrink-0">Code:</span><span className="text-sm text-blue-900 flex-1">{selectedWarehouse.warehouseCode}</span></div>
                                                            {selectedWarehouse.address && <div className="flex items-start gap-2"><span className="text-xs text-blue-600 font-medium w-20 flex-shrink-0">Address:</span><span className="text-sm text-blue-900 flex-1">{`${selectedWarehouse.address || ''}, ${selectedWarehouse.city || ''}, ${selectedWarehouse.province || ''}`.trim()}</span></div>}
                                                        </>
                                                    ) : <div className="text-sm text-blue-700 italic">Select a warehouse to view details</div>;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: DR#, PO#, Transmittal */}
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Receipt # *</label>
                                <input type="text" value={formData.deliveryReceiptNumber} onChange={(e) => setFormData({ ...formData, deliveryReceiptNumber: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required placeholder="Enter numbers only" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Purchase Order #</label>
                                <input type="text" value={formData.purchaseOrderNumber} onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Transmittal</label>
                                <input type="text" value={formData.transmittal} onChange={(e) => setFormData({ ...formData, transmittal: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                            </div>
                        </div>

                        {/* Status (edit only) */}
                        {mode === 'edit' && delivery && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
                                <select value={formData.status} onChange={(e) => {
                                    const newStatus = e.target.value;
                                    if (newStatus === 'PREPARING') {
                                        setFormData({ ...formData, status: newStatus, dateDelivered: '' });
                                    } else if (newStatus === 'IN_TRANSIT') {
                                        setFormData({ ...formData, status: newStatus, dateDelivered: '' });
                                    } else if (newStatus === 'DELIVERED') {
                                        const updatedItems = formData.items.map(item => ({ ...item, deliveredQty: item.deliveredQty || item.preparedQty }));
                                        const localISOString = formatDateForInput(new Date().toISOString());
                                        setFormData({ ...formData, status: newStatus, dateDelivered: formData.dateDelivered || localISOString, items: updatedItems });
                                    } else if (newStatus === 'CANCELLED') {
                                        setFormData({ ...formData, status: newStatus, dateDelivered: '' });
                                    }
                                }} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${getStatusDropdownBgColor(formData.status)}`}>
                                    {(delivery.status === 'PREPARING' || !delivery.status) && (<><option value="PREPARING">PREPARING</option><option value="IN_TRANSIT">IN_TRANSIT</option></>)}
                                    {delivery.status === 'IN_TRANSIT' && (<><option value="IN_TRANSIT">IN_TRANSIT</option><option value="DELIVERED">DELIVERED</option><option value="CANCELLED">CANCELLED</option></>)}
                                    {(delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') && (<option value={delivery.status}>{delivery.status}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Product add row */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Add Products *</label>
                            <VariationSearchableDropdown
                                options={productOptions}
                                value={selectedProductForAdd}
                                onChange={(value) => setSelectedProductForAdd(value)}
                                placeholder="Select Product to Add..."
                                required={false}
                                formData={{ ...formData, fromWarehouseId: formData.selectedWarehouseId, selectedWarehouseName: warehouses.find(w => w.id === parseInt(formData.selectedWarehouseId))?.warehouseName }}
                                index={-1}
                                warehouseStocks={warehouseStocks}
                                branchStocks={branchStocks}
                                loadingStocks={loadingStocks}
                                onAddProduct={handleAddProductToTable}
                            />
                        </div>

                        {/* ── Items Table ─────────────────────────────────────────────────────── */}
                        <div>
                            {formData.items.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <Package size={48} className="mx-auto mb-3 text-gray-400" />
                                    <p className="font-medium text-gray-500">No products added yet</p>
                                    <p className="text-sm text-gray-400">Select a product above and click "Add Product" to start</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-10">#</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Product Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variation</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UPC</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">UOM</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Prepared Qty</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Delivered Qty</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {formData.items.map((item, i) => {
                                                    const selectedOption = productOptions.find(opt =>
                                                        opt.parentProductId === item.productId &&
                                                        (item.variationId ? opt.variationId === item.variationId : !opt.variationId)
                                                    );
                                                    const stockKey = item.variationId
                                                        ? `${i}_${item.productId}_${item.variationId}_${item.warehouseId}`
                                                        : `${i}_${item.productId}_${item.warehouseId}`;
                                                    const stockInfo = warehouseStocks[stockKey];
                                                    const isLoadingStock = loadingStocks[stockKey];
                                                    const effectiveAvailable = mode === 'edit'
                                                        ? (stockInfo?.availableQuantity || 0) + (item.originalPreparedQty || 0)
                                                        : (stockInfo?.availableQuantity || 0);
                                                    const hasInsufficientStock = stockInfo && item.preparedQty > effectiveAvailable;
                                                    const isDelivered = formData.status === 'DELIVERED';
                                                    const isPreparing = formData.status === 'PREPARING';

                                                    return (
                                                        <tr key={`item-${i}`} className="hover:bg-gray-50">
                                                            {/* Number */}
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="text-sm font-semibold text-gray-500">{i + 1}</span>
                                                            </td>
                                                            {/* Product Name */}
                                                            <td className="px-4 py-3">
                                                                {selectedOption
                                                                    ? <div className="font-semibold text-gray-900 text-sm line-clamp-2">{selectedOption.fullName}</div>
                                                                    : <div className="text-gray-500 italic text-sm">Product not found</div>}
                                                            </td>
                                                            {/* Variation */}
                                                            <td className="px-2 py-3">
                                                                {selectedOption?.subLabel && selectedOption.subLabel !== 'No variations'
                                                                    ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{selectedOption.subLabel}</span>
                                                                    : <span className="text-xs text-gray-500">None</span>}
                                                            </td>
                                                            <td className="px-4 py-3"><span className="text-sm text-gray-900">{selectedOption?.sku || 'N/A'}</span></td>
                                                            <td className="px-4 py-3"><span className="text-sm text-gray-900">{selectedOption?.upc || 'N/A'}</span></td>
                                                            <td className="px-4 py-3"><span className="text-sm text-gray-900 font-medium">{item.uom || 'N/A'}</span></td>
                                                            <td className="px-4 py-3">
                                                                {isLoadingStock ? (
                                                                    <div className="flex items-center gap-2 text-blue-600 text-xs"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Loading...</div>
                                                                ) : stockInfo ? (
                                                                    <div className="text-sm space-y-1">
                                                                        <div className={`font-bold ${hasInsufficientStock ? 'text-red-600' : 'text-green-600'}`}>Available: {(stockInfo.availableQuantity || 0).toLocaleString('en-US')}</div>
                                                                        <div className="text-xs text-gray-500">Total: {(stockInfo.quantity || 0).toLocaleString('en-US')}</div>
                                                                        {mode === 'edit' && item.originalPreparedQty > 0 && <div className="text-xs text-blue-600">Effective: {effectiveAvailable.toLocaleString('en-US')}</div>}
                                                                    </div>
                                                                ) : <span className="text-xs text-gray-400 italic">No data</span>}
                                                            </td>
                                                            {/* Prepared Qty — right-aligned */}
                                                            <td className="px-4 py-3 text-right">
                                                                <input
                                                                    type="text"
                                                                    value={item.preparedQty !== '' && item.preparedQty != null ? Number(item.preparedQty).toLocaleString('en-US') : ''}
                                                                    onChange={(e) => handleItemChange(i, 'preparedQty', e.target.value.replace(/,/g, ''))}
                                                                    className={`w-24 px-3 py-2 border rounded-lg text-sm font-medium text-right ${hasInsufficientStock ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}
                                                                    min="1"
                                                                    disabled={isDelivered}
                                                                    required
                                                                />
                                                                {hasInsufficientStock && <div className="text-xs text-red-600 mt-1">Exceeds stock!</div>}
                                                            </td>
                                                            {/* Delivered Qty — right-aligned */}
                                                            <td className="px-4 py-3 text-right">
                                                                <input
                                                                    type="text"
                                                                    value={item.deliveredQty !== '' && item.deliveredQty != null ? Number(item.deliveredQty).toLocaleString('en-US') : ''}
                                                                    onChange={(e) => handleItemChange(i, 'deliveredQty', e.target.value.replace(/,/g, ''))}
                                                                    className={`w-24 px-3 py-2 border rounded-lg text-sm font-medium text-right ${isDelivered ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-100 cursor-not-allowed'}`}
                                                                    min="0"
                                                                    disabled={!isDelivered}
                                                                    required={isDelivered}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {isPreparing && (
                                                                    <button type="button" onClick={() => handleRemoveItem(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove item">
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>

                                            {/* ── Totals footer row ───────────────────────────────────────────── */}
                                            <tfoot>
                                                <tr className="bg-gray-50 border-t-2 border-gray-300">
                                                    {/* Label spans all columns up to Prepared Qty */}
                                                    <td colSpan={8} className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                            Total ({formData.items.length} item{formData.items.length !== 1 ? 's' : ''})
                                                        </span>
                                                    </td>
                                                    {/* Prepared total */}
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center justify-end gap-1">
                                                            <span className="text-sm font-bold text-blue-800">{totalPrepared.toLocaleString('en-US')}</span>
                                                            <span className="text-xs text-blue-500">pcs</span>
                                                        </div>
                                                    </td>
                                                    {/* Delivered total */}
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        {isDeliveredStatus ? (
                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                <span className="text-sm font-bold text-green-800">{totalDelivered.toLocaleString('en-US')}</span>
                                                                <span className="text-xs text-green-500">pcs</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">—</span>
                                                        )}
                                                    </td>
                                                    {/* Empty action col */}
                                                    <td className="px-4 py-3" />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* ── Quick summary strip below the table ─────────────────────────── */}
                                    <div className="mt-2 flex items-center justify-end gap-4 px-1">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <span className="text-gray-500">Total Prepared:</span>
                                            <span className="font-bold text-blue-700">{totalPrepared.toLocaleString('en-US')} pcs</span>
                                        </div>
                                        {isDeliveredStatus && (
                                            <>
                                                <span className="text-gray-300">|</span>
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <span className="text-gray-500">Total Delivered:</span>
                                                    <span className="font-bold text-green-700">{totalDelivered.toLocaleString('en-US')} pcs</span>
                                                </div>
                                                {totalPrepared !== totalDelivered && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <span className="text-gray-500">Variance:</span>
                                                            <span className={`font-bold ${totalDelivered < totalPrepared ? 'text-red-600' : 'text-orange-600'}`}>
                                                                {totalDelivered - totalPrepared > 0 ? '+' : ''}{totalDelivered - totalPrepared} pcs
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Row 4: Prepared By, Date Prepared */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Prepared By *</label>
                                <input type="text" value={formData.preparedBy} onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Date Prepared *
                                    {mode === 'edit' && formData.status !== 'PREPARING' && <span className="ml-2 text-xs text-orange-600">(Locked)</span>}
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.datePrepared ? (() => { let c = formData.datePrepared.replace('Z', '').split('.')[0].split('+')[0]; if (c.length > 16) c = c.substring(0, 16); return c; })() : ''}
                                    onChange={(e) => { if (mode === 'create' || (mode === 'edit' && formData.status === 'PREPARING')) setFormData({ ...formData, datePrepared: e.target.value + ':00' }); }}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 transition ${mode === 'edit' && formData.status !== 'PREPARING' ? 'border-gray-200 bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-500 bg-white'}`}
                                    disabled={mode === 'edit' && formData.status !== 'PREPARING'}
                                    required
                                />
                            </div>
                        </div>

                        {/* Date Delivered */}
                        {formData.status === 'DELIVERED' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Date Delivered *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dateDelivered ? (() => { let c = formData.dateDelivered.replace('Z', '').split('.')[0].split('+')[0]; if (c.length > 16) c = c.substring(0, 16); return c; })() : ''}
                                    onChange={(e) => setFormData({ ...formData, dateDelivered: e.target.value + ':00' })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                                    required
                                />
                            </div>
                        )}

                        {/* Remarks */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Remarks</label>
                            <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows="3" placeholder="Add any additional notes or comments..." />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium" disabled={isLoading}>Cancel</button>
                        <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md" disabled={isLoading}>
                            {mode === 'create' ? 'Create Delivery' : 'Update Delivery'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeliveryFormModal;