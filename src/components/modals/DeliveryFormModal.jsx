// src/components/modals/DeliveryFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Trash2, Package, Building2, Warehouse, FileText, Truck, ClipboardList } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import VariationSearchableDropdown from '../common/VariationSearchableDropdown';
import { api } from '../../services/api';
import { formatDateForInput } from '../../utils/dateUtils';

// Small reusable section wrapper — mirrors the "card block" pattern used in Sale forms
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

const DeliveryFormModal = ({
    mode,
    delivery,
    onClose,
    onSave,
    branches,
    products,
    warehouses,
    companies,
    isLoading = false,
    productFilters = []
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
    const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
    const [branchStocks, setBranchStocks] = useState({});

    // ── Date helpers ──────────────────────────────────────────────────────
    // Split a stored "YYYY-MM-DDTHH:mm:ss" value into its date and time parts
    const getDatePart = (val) => {
        if (!val) return '';
        const t = val.indexOf('T');
        return t > 0 ? val.substring(0, t) : val.substring(0, 10);
    };
    const getTimePart = (val) => {
        if (!val) return '00:00';
        const t = val.indexOf('T');
        if (t < 0) return '00:00';
        return val.substring(t + 1, t + 6); // "HH:mm"
    };
    const combineDatetime = (date, time) => {
        if (!date) return '';
        return `${date}T${time || '00:00'}:00`;
    };

    const nowDatetime = () => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };

    useEffect(() => {
        if (mode === 'create') {
            const localISOString = nowDatetime();
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

            const processedItems = items.map((item) => {
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
                date: delivery.date ? formatDateForInput(delivery.date) : nowDatetime(),
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

    // Resolve the company ID from the selected branch
    const selectedBranchCompanyId = (() => {
        if (!formData.branchId) return null;
        const branch = branches?.find(b => b.id === formData.branchId);
        return branch?.company?.id ?? null;
    })();

    const productOptions = products ? products.flatMap(p => {
        if (!p) return [];
        if (p.variations && p.variations.length > 0) {
            return p.variations
                .filter(v => {
                    if (selectedBranchCompanyId == null) return true;
                    return (v.companyPrices || []).some(cp => cp.company?.id === selectedBranchCompanyId);
                })
                .map(v => {
                    const companySkus = {};
                    if (v.companyPrices) {
                        v.companyPrices.forEach(cp => {
                            if (cp.company?.id != null) {
                                companySkus[cp.company.id] = cp.companySku ?? '';
                            }
                        });
                    }
                    // Resolve the single companySku for the selected branch's company
                    const companySku = selectedBranchCompanyId != null
                        ? (companySkus[selectedBranchCompanyId] ?? null)
                        : null;

                    return {
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
                        isVariation: true,
                        companySkus,   // ← full map, used by dropdown search
                        companySku     // ← single value for the active company
                    };
                });
        } else {
            if (selectedBranchCompanyId != null) {
                const hasCompanyPrice = (p.companyBasePrices || [])
                    .some(cbp => cbp.company?.id === selectedBranchCompanyId);
                if (!hasCompanyPrice) return [];
            }
            const companySkus = {};
            if (p.companyBasePrices) {
                p.companyBasePrices.forEach(cbp => {
                    if (cbp.company?.id != null) {
                        companySkus[cbp.company.id] = cbp.companySku ?? '';
                    }
                });
            }
            const companySku = selectedBranchCompanyId != null
                ? (companySkus[selectedBranchCompanyId] ?? null)
                : null;

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
                isVariation: false,
                companySkus,
                companySku
            }];
        }
    }) : [];

    const loadWarehouseStock = async (warehouseId, productId, variationId) => {
        if (!warehouseId || !productId) return;
        const stockKey = variationId
            ? `${productId}_${variationId}_${warehouseId}`
            : `${productId}_${warehouseId}`;

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
                    // Use the item's data for stock key, not the index
                    const stockKey = newItems[index].variationId
                        ? `${selectedOption.parentProductId}_${selectedOption.variationId}_${newItems[index].warehouseId}`
                        : `${selectedOption.parentProductId}_${newItems[index].warehouseId}`;
                    // Check if stock data already exists, if not, load it
                    if (!warehouseStocks[stockKey]) {
                        loadWarehouseStock(newItems[index].warehouseId, selectedOption.parentProductId, selectedOption.variationId, index);
                    }
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
                const stockKey = item.variationId
                    ? `${item.productId}_${item.variationId}_${value}`
                    : `${item.productId}_${value}`;
                if (!warehouseStocks[stockKey]) {
                    loadWarehouseStock(value, item.productId, item.variationId, index);
                }
            }
            newItems[index].preparedQty = '';
            newItems[index].deliveredQty = '';
            setFormData({ ...formData, items: newItems });
        }
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
        const newIndex = newItems.length - 1;
        setFormData({ ...formData, items: newItems });
        setTimeout(() => loadWarehouseStock(formData.selectedWarehouseId, selectedOption.parentProductId, selectedOption.variationId, newIndex), 100);
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'edit' && delivery) {
            if (delivery.status !== formData.status) {
                const validTransitions = {
                    'PREPARING': ['IN_TRANSIT'],
                    'IN_TRANSIT': ['DELIVERED', 'CANCELLED'],
                    'DELIVERED': [],
                    'CANCELLED': []
                };

                if (!validTransitions[delivery.status].includes(formData.status)) {
                    alert(`Invalid status transition! Cannot change from ${delivery.status} to ${formData.status}.`);
                    return;
                }

                const lightweightTransitions = ['PREPARING→IN_TRANSIT'];
                const transitionKey = `${delivery.status}→${formData.status}`;
                console.log('transition:', transitionKey);
                if (lightweightTransitions.includes(transitionKey)) {
                    onSave(formData, true);
                    return;
                }
            }
        }

        onSave(formData, false);
    };

    const hasActiveProductFilter = mode === 'edit' && productFilters && productFilters.length > 0;

    const visibleItemsWithIndex = formData.items
        .map((item, i) => ({ item, originalIndex: i }))
        .filter(({ item }) =>
            !hasActiveProductFilter ||
            productFilters.some(pf =>
                Number(pf.productId) === Number(item.productId) &&
                (pf.variationId == null ? null : Number(pf.variationId)) === (item.variationId == null ? null : Number(item.variationId))
            )
        );

    const itemsForTotals = hasActiveProductFilter ? visibleItemsWithIndex.map(v => v.item) : formData.items;

    const totalPrepared = itemsForTotals.reduce((s, it) => s + (parseInt(it.preparedQty) || 0), 0);
    const totalDelivered = itemsForTotals.reduce((s, it) => s + (parseInt(it.deliveredQty) || 0), 0);
    const isDeliveredStatus = formData.status === 'DELIVERED';

    const handleFormArrowNav = (e) => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName === 'TEXTAREA') return;
        if (e.target.type === 'date' || e.target.type === 'time') return; const focusable = Array.from(
            e.currentTarget.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
        ).filter(el => el.offsetParent !== null);
        const current = document.activeElement;
        const index = focusable.indexOf(current);
        if (index === -1) return;
        if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && index < focusable.length - 1) { e.preventDefault(); focusable[index + 1].focus(); }
        else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && index > 0) { e.preventDefault(); focusable[index - 1].focus(); }
    };

    const clampYear = (val) => {
        if (!val) return val;
        const parts = val.split('-');
        if (parts[0]?.length > 4) parts[0] = parts[0].slice(0, 4);
        return parts.join('-');
    };

    // ── Shared input classes (blue theme) ───────────────────────────────
    const inputClass = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none';
    const dateInputClass = 'flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none bg-white';
    const timeInputClass = 'w-32 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition outline-none bg-white';
    const lockedDateInputClass = 'flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed';
    const lockedTimeInputClass = 'w-32 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed';

    const selectedWarehouse = warehouses?.find(w => w.id === parseInt(formData.selectedWarehouseId));

    return (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-2 sm:p-6">
            <div className="bg-gray-50 rounded-xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                            {mode === 'create' ? 'Create New Delivery' : 'Edit Delivery'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {mode === 'create' ? 'Prepare a new delivery for shipment' : 'Update details for this delivery'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <form id="delivery-form" onSubmit={handleSubmit} onKeyDown={handleFormArrowNav} className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
                    <div className="max-w-6xl mx-auto space-y-5">

                        {/* Branch & Warehouse */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormSection icon={Building2} title="Branch">
                                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                    Select Branch *
                                    {(formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED') && (
                                        <span className="ml-2 normal-case text-orange-500">(Locked in {formData.status} status)</span>
                                    )}
                                </label>
                                <SearchableDropdown
                                    options={branchOptions}
                                    value={formData.branchId}
                                    onChange={handleBranchChange}
                                    placeholder="Select Branch"
                                    displayKey="name" valueKey="id" required
                                    disabled={formData.status === 'IN_TRANSIT' || formData.status === 'DELIVERED' || formData.status === 'CANCELLED'}
                                />

                                {branchInfo && (
                                    <div className="mt-4 grid grid-cols-1 gap-y-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="text-sm">
                                            <span className="text-gray-500">Company</span>
                                            <div className="font-semibold text-gray-900">{branchInfo.companyName}</div>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-500">Branch</span>
                                            <div className="font-semibold text-gray-900">{branchInfo.branchName} ({branchInfo.branchCode})</div>
                                        </div>
                                        {branchInfo.branchTin && (
                                            <div className="text-sm">
                                                <span className="text-gray-500">TIN</span>
                                                <div className="font-semibold text-gray-900">{branchInfo.branchTin}</div>
                                            </div>
                                        )}
                                        <div className="text-sm">
                                            <span className="text-gray-500">Address</span>
                                            <div className="font-semibold text-gray-900">{branchInfo.branchAddress}</div>
                                        </div>
                                        {branchInfo.branchContactNumber && (
                                            <div className="text-sm">
                                                <span className="text-gray-500">Contact</span>
                                                <div className="font-semibold text-gray-900">{branchInfo.branchContactNumber}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </FormSection>

                            <FormSection icon={Warehouse} title="Warehouse">
                                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                    Select Warehouse (applies to all items) *
                                    {formData.status === 'PREPARING'
                                        ? <span className="ml-2 normal-case text-blue-600">(Editable)</span>
                                        : <span className="ml-2 normal-case text-orange-500">(Locked in {formData.status} status)</span>}
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
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        {selectedWarehouse ? (
                                            <div className="grid grid-cols-1 gap-y-2">
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Warehouse</span>
                                                    <div className="font-semibold text-gray-900">{selectedWarehouse.warehouseName}</div>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Code</span>
                                                    <div className="font-semibold text-gray-900">{selectedWarehouse.warehouseCode}</div>
                                                </div>
                                                {selectedWarehouse.address && (
                                                    <div className="text-sm">
                                                        <span className="text-gray-500">Address</span>
                                                        <div className="font-semibold text-gray-900">{`${selectedWarehouse.address || ''}, ${selectedWarehouse.city || ''}, ${selectedWarehouse.province || ''}`.trim()}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic">Select a warehouse to view details</div>
                                        )}
                                    </div>
                                )}
                            </FormSection>
                        </div>

                        {/* Delivery details */}
                        <FormSection icon={FileText} title="Delivery Details">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Delivery Receipt # *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.deliveryReceiptNumber}
                                        onChange={(e) => setFormData({ ...formData, deliveryReceiptNumber: e.target.value })}
                                        className={inputClass}
                                        required
                                        placeholder="Enter delivery receipt number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Purchase Order #
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.purchaseOrderNumber}
                                        onChange={(e) => setFormData({ ...formData, purchaseOrderNumber: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Transmittal
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.transmittal}
                                        onChange={(e) => setFormData({ ...formData, transmittal: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-5">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Prepared By *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.preparedBy}
                                        onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Date Prepared *
                                        {mode === 'edit' && formData.status !== 'PREPARING' && <span className="ml-2 normal-case text-orange-500">(Locked)</span>}
                                    </label>
                                    {(() => {
                                        const locked = mode === 'edit' && formData.status !== 'PREPARING';
                                        return (
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    value={getDatePart(formData.datePrepared)}
                                                    onChange={(e) => { if (!locked) setFormData({ ...formData, datePrepared: combineDatetime(clampYear(e.target.value), getTimePart(formData.datePrepared)) }); }}
                                                    className={locked ? lockedDateInputClass : dateInputClass}
                                                    max="9999-12-31" disabled={locked}
                                                    required
                                                />
                                                <input
                                                    type="time"
                                                    value={getTimePart(formData.datePrepared)}
                                                    onChange={(e) => { if (!locked) setFormData({ ...formData, datePrepared: combineDatetime(getDatePart(formData.datePrepared), e.target.value) }); }}
                                                    className={locked ? lockedTimeInputClass : timeInputClass}
                                                    disabled={locked}
                                                    required
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {formData.status === 'DELIVERED' && (
                                <div className="mt-5">
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                        Date Delivered *
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={getDatePart(formData.dateDelivered)}
                                            onChange={(e) => setFormData({ ...formData, dateDelivered: combineDatetime(clampYear(e.target.value), getTimePart(formData.dateDelivered)) })}
                                            className={dateInputClass}
                                            max="9999-12-31"
                                            required
                                        />
                                        <input
                                            type="time"
                                            value={getTimePart(formData.dateDelivered)}
                                            onChange={(e) => setFormData({ ...formData, dateDelivered: combineDatetime(getDatePart(formData.dateDelivered), e.target.value) })}
                                            className={timeInputClass}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-5">
                                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                    Remarks
                                </label>
                                <textarea
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className={inputClass}
                                    rows="3"
                                    placeholder="Add any additional notes or comments..."
                                />
                            </div>
                        </FormSection>

                        {/* Status */}
                        <FormSection icon={Truck} title="Status">
                            {mode === 'create' ? (
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 font-semibold text-sm">
                                        PREPARING
                                    </span>
                                    <span className="text-xs text-gray-400">New deliveries always start in PREPARING.</span>
                                </div>
                            ) : mode === 'edit' && delivery && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-sm ${delivery.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-800' :
                                        delivery.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                                            delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {delivery.status}
                                    </span>

                                    {delivery.status === 'PREPARING' && (
                                        <>
                                            <span className="text-gray-400 text-lg">→</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'IN_TRANSIT', dateDelivered: '' })}
                                                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${formData.status === 'IN_TRANSIT'
                                                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
                                                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                                    }`}
                                            >
                                                IN_TRANSIT
                                            </button>
                                        </>
                                    )}

                                    {delivery.status === 'IN_TRANSIT' && (
                                        <>
                                            <span className="text-gray-400 text-lg">→</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updatedItems = formData.items.map(item => ({
                                                        ...item,
                                                        deliveredQty: item.deliveredQty || item.preparedQty
                                                    }));
                                                    setFormData({
                                                        ...formData,
                                                        status: 'DELIVERED',
                                                        dateDelivered: formData.dateDelivered || nowDatetime(),
                                                        items: updatedItems
                                                    });
                                                }}
                                                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${formData.status === 'DELIVERED'
                                                    ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-300'
                                                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                                                    }`}
                                            >
                                                DELIVERED
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('Cancel this delivery? This will revert all stock.')) {
                                                        setFormData({ ...formData, status: 'CANCELLED', dateDelivered: '' });
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${formData.status === 'CANCELLED'
                                                    ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-300'
                                                    : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                                                    }`}
                                            >
                                                CANCELLED
                                            </button>
                                        </>
                                    )}

                                    {(delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') && (
                                        <span className="text-xs text-gray-400 italic ml-1">No further changes allowed.</span>
                                    )}
                                </div>
                            )}
                        </FormSection>

                        {/* Products */}
                        <FormSection icon={ClipboardList} title={`Products${formData.items.length ? ` (${hasActiveProductFilter ? `${visibleItemsWithIndex.length} of ${formData.items.length}` : formData.items.length})` : ''}`}>
                            <div className="mb-5">
                                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                                    Add Products *
                                </label>
                                <VariationSearchableDropdown
                                    options={productOptions}
                                    value={selectedProductForAdd}
                                    onChange={(value) => setSelectedProductForAdd(value)}
                                    placeholder="Select Product to Add..."
                                    required={false}
                                    formData={{ ...formData, fromWarehouseId: formData.selectedWarehouseId, selectedWarehouseName: selectedWarehouse?.warehouseName }}
                                    index={-1}
                                    warehouseStocks={warehouseStocks}
                                    branchStocks={branchStocks}
                                    loadingStocks={loadingStocks}
                                    onAddProduct={handleAddProductToTable}
                                    activeCompanyId={branchInfo?.companyId ?? null}
                                />
                            </div>

                            {formData.items.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <Package size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium text-gray-500 text-sm">No products added yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Select a product above and click "Add Product" to start</p>
                                </div>
                            ) : visibleItemsWithIndex.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <Package size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium text-gray-500 text-sm">No products match the active filter</p>
                                    <p className="text-xs text-gray-400 mt-1">Clear the product filter to see all items in this delivery</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full min-w-[750px] text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                                <tr>
                                                    {['#', 'Product Name', 'Variation', 'SKU', 'UPC', 'UOM', 'Stock', 'Prepared Qty', 'Delivered Qty', ''].map(h => (
                                                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {visibleItemsWithIndex.map(({ item, originalIndex: i }) => {
                                                    const selectedOption = productOptions.find(opt =>
                                                        opt.parentProductId === item.productId &&
                                                        (item.variationId ? opt.variationId === item.variationId : !opt.variationId)
                                                    );
                                                    const stockKey = item.variationId
                                                        ? `${item.productId}_${item.variationId}_${item.warehouseId}`
                                                        : `${item.productId}_${item.warehouseId}`;
                                                    const stockInfo = warehouseStocks[stockKey];
                                                    const isLoadingStock = loadingStocks[stockKey];
                                                    const effectiveAvailable = mode === 'edit'
                                                        ? (stockInfo?.availableQuantity || 0) + (item.originalPreparedQty || 0)
                                                        : (stockInfo?.availableQuantity || 0);
                                                    const hasInsufficientStock = stockInfo && item.preparedQty > effectiveAvailable;
                                                    const isDelivered = formData.status === 'DELIVERED';
                                                    const isPreparing = formData.status === 'PREPARING';

                                                    return (
                                                        <tr key={`item-${i}`} className="hover:bg-gray-50/80 transition-colors">
                                                            <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                                                            <td className="px-4 py-3">
                                                                {selectedOption
                                                                    ? <div className="font-semibold text-gray-900 line-clamp-2">{selectedOption.fullName}</div>
                                                                    : <div className="text-gray-400 italic">Product not found</div>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {selectedOption?.subLabel && selectedOption.subLabel !== 'No variations'
                                                                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{selectedOption.subLabel}</span>
                                                                    : <span className="text-xs text-gray-400">None</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-700">{selectedOption?.sku || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-gray-700">{selectedOption?.upc || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-gray-700 font-medium">{item.uom || 'N/A'}</td>
                                                            <td className="px-4 py-3">
                                                                {isLoadingStock ? (
                                                                    <div className="flex items-center gap-2 text-blue-600 text-xs">
                                                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                                        Loading...
                                                                    </div>
                                                                ) : stockInfo ? (
                                                                    <div className="space-y-0.5">
                                                                        <div className={`font-bold text-xs ${hasInsufficientStock ? 'text-red-600' : 'text-blue-600'}`}>Avail: {(stockInfo.availableQuantity || 0).toLocaleString('en-US')}</div>
                                                                        <div className="text-[11px] text-gray-400">Total: {(stockInfo.quantity || 0).toLocaleString('en-US')}</div>
                                                                        {mode === 'edit' && item.originalPreparedQty > 0 && <div className="text-[11px] text-blue-500">Effective: {effectiveAvailable.toLocaleString('en-US')}</div>}
                                                                    </div>
                                                                ) : <span className="text-xs text-gray-400 italic">No data</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={item.preparedQty !== '' && item.preparedQty != null ? Number(item.preparedQty).toLocaleString('en-US') : ''}
                                                                    onChange={(e) => handleItemChange(i, 'preparedQty', e.target.value.replace(/,/g, ''))}
                                                                    className={`w-24 px-3 py-1.5 border rounded-md text-sm font-medium outline-none transition focus:ring-2 ${hasInsufficientStock ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-blue-300 bg-blue-50 focus:ring-blue-200'}`}
                                                                    min="1"
                                                                    disabled={isDelivered}
                                                                    required
                                                                />
                                                                {hasInsufficientStock && <div className="text-[11px] text-red-600 mt-1">Exceeds stock!</div>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={item.deliveredQty !== '' && item.deliveredQty != null ? Number(item.deliveredQty).toLocaleString('en-US') : ''}
                                                                    onChange={(e) => handleItemChange(i, 'deliveredQty', e.target.value.replace(/,/g, ''))}
                                                                    className={`w-24 px-3 py-1.5 border rounded-md text-sm font-medium outline-none transition focus:ring-2 ${isDelivered ? 'border-green-300 bg-green-50 focus:ring-green-200' : 'border-gray-300 bg-gray-100 cursor-not-allowed'}`}
                                                                    min="0"
                                                                    disabled={!isDelivered}
                                                                    required={isDelivered}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {isPreparing && (
                                                                    <button type="button" onClick={() => handleRemoveItem(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition" title="Remove item">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        Total ({itemsForTotals.length} item{itemsForTotals.length !== 1 ? 's' : ''})
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <span className="text-sm font-bold text-blue-700">{totalPrepared.toLocaleString('en-US')}</span>
                                                        <span className="text-xs text-blue-400 ml-1">pcs</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        {isDeliveredStatus ? (
                                                            <>
                                                                <span className="text-sm font-bold text-green-700">{totalDelivered.toLocaleString('en-US')}</span>
                                                                <span className="text-xs text-green-500 ml-1">pcs</span>
                                                            </>
                                                        ) : <span className="text-xs text-gray-400 italic">—</span>}
                                                    </td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {isDeliveredStatus && totalPrepared !== totalDelivered && (
                                        <div className="mt-2 flex items-center justify-end gap-1.5 text-sm px-1">
                                            <span className="text-gray-500">Variance:</span>
                                            <span className={`font-bold ${totalDelivered < totalPrepared ? 'text-red-600' : 'text-orange-600'}`}>
                                                {totalDelivered - totalPrepared > 0 ? '+' : ''}{totalDelivered - totalPrepared} pcs
                                            </span>
                                        </div>
                                    )}
                                </>
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
                                <span className="font-semibold text-gray-900">{totalPrepared.toLocaleString('en-US')} pcs prepared</span>
                                {isDeliveredStatus && (
                                    <> · <span className="font-semibold text-gray-900">{totalDelivered.toLocaleString('en-US')} pcs delivered</span></>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="delivery-form"
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mode === 'create' ? 'Create Delivery' : 'Update Delivery'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryFormModal;