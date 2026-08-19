import React, { useState, useEffect } from 'react';
import {
    X, Plus, Package, Eye, Check, ArrowRight, Loader2, Trash2
} from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';

const IRRModal = ({ editingIrr, suppliers, onClose, onSuccess }) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserName = currentUser.fullName || currentUser.name || currentUser.username || 'Unknown User';

    const [irrFormData, setIrrFormData] = useState({
        supplierId: '',
        items: [],
        remarks: ''
    });
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [buttonLoading, setButtonLoading] = useState({});
    const [irrRequests, setIrrRequests] = useState([]);
    const [clickOutsideListener, setClickOutsideListener] = useState(null);

    useEffect(() => {
        if (editingIrr) {
            setIrrFormData({
                supplierId: editingIrr.supplierId,
                items: editingIrr.items && editingIrr.items.length > 0 ? editingIrr.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    variationId: item.variationId || null,
                    displayName: item.productName,
                    sku: item.sku || '',
                    upc: item.upc || '',
                    variation: item.variation || '',
                    uom: item.uom || 'PCS',
                    qty: item.qty
                })) : [],
                remarks: editingIrr.remarks || ''
            });
            loadSupplierProducts(editingIrr.supplierId);
        }
        loadIrrRequests();

        // Handle click outside
        const handleClickOutside = (event) => {
            if (showProductDropdown && !event.target.closest('.relative')) {
                setShowProductDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        setClickOutsideListener(() => handleClickOutside);

        return () => {
            if (clickOutsideListener) {
                document.removeEventListener('mousedown', clickOutsideListener);
            }
        };
    }, [editingIrr, showProductDropdown]);

    const loadIrrRequests = async () => {
        try {
            const response = await api.get('/inventory-requests');
            if (response && response.success) {
                const actualData = response.data?.data || response.data;
                setIrrRequests(Array.isArray(actualData) ? actualData : []);
            }
        } catch (error) {
            console.error('Error loading IRR requests:', error);
        }
    };

    const generateControlNumber = () => {
        const year = new Date().getFullYear();
        const prefix = 'IRR';
        const yearRequests = irrRequests.filter(req =>
            req.controlNumber && req.controlNumber.startsWith(`${prefix}-${year}`)
        );
        let maxNumber = 0;
        yearRequests.forEach(req => {
            const parts = req.controlNumber.split('-');
            if (parts.length === 3) {
                const num = parseInt(parts[2]);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        const nextNumber = maxNumber + 1;
        return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
    };

    const loadSupplierProducts = async (supplierId) => {
        if (!supplierId) return;

        const supplier = suppliers.find(s => s.id === parseInt(supplierId));
        setSelectedSupplier(supplier);

        setLoadingProducts(true);
        try {
            const isForwarder = supplier?.type?.toLowerCase() === 'forwarder';
            const endpoint = isForwarder ? '/products' : `/products/by-supplier/${supplierId}`;
            const response = await api.get(endpoint);

            if (response.success && response.data) {
                const products = response.data.data || response.data;
                const productsArray = Array.isArray(products) ? products : [];
                const flattenedProducts = [];
                productsArray.forEach(product => {
                    if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
                        product.variations.forEach(variation => {
                            flattenedProducts.push({
                                ...product,
                                displayName: `${variation.sku || 'N/A'} - ${product.productName} - ${variation.combinationDisplay || variation.sku} - ${variation.upc || 'N/A'}`,
                                variationId: variation.id,
                                isVariation: true
                            });
                        });
                    } else {
                        flattenedProducts.push({
                            ...product,
                            displayName: `${product.sku || 'N/A'} - ${product.productName} - ${product.upc || 'N/A'}`,
                            isVariation: false
                        });
                    }
                });
                setSupplierProducts(flattenedProducts);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Failed to load supplier products');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSupplierChange = (supplierId) => {
        setIrrFormData({
            supplierId,
            items: [],
            remarks: irrFormData.remarks
        });
        setSelectedProductForAdd('');
        setProductSearchTerm('');
        setShowProductDropdown(false);
        loadSupplierProducts(supplierId);
    };

    const handleAddProductToTable = () => {
        if (!selectedProductForAdd) {
            toast.error('Please select a product first');
            return;
        }

        const selectedProd = supplierProducts.find(p => {
            if (selectedProductForAdd.includes('_')) {
                const [prodId, varId] = selectedProductForAdd.split('_');
                return p.id === parseInt(prodId) && p.variationId === parseInt(varId);
            }
            return p.id === parseInt(selectedProductForAdd);
        });

        if (!selectedProd) {
            toast.error('Product not found');
            return;
        }

        const exists = irrFormData.items.some(item => {
            if (selectedProd.isVariation) {
                return item.productId === selectedProd.id && item.variationId === selectedProd.variationId;
            }
            return item.productId === selectedProd.id;
        });

        if (exists) {
            toast.error('This product is already in the list');
            return;
        }

        const newItem = {
            productId: selectedProd.id,
            productName: selectedProd.productName,
            variationId: selectedProd.isVariation ? selectedProd.variationId : null,
            displayName: selectedProd.displayName,
            sku: selectedProd.isVariation
                ? selectedProd.variations?.find(v => v.id === selectedProd.variationId)?.sku
                : selectedProd.sku,
            upc: selectedProd.isVariation
                ? selectedProd.variations?.find(v => v.id === selectedProd.variationId)?.upc
                : selectedProd.upc,
            variation: selectedProd.isVariation
                ? selectedProd.variations?.find(v => v.id === selectedProd.variationId)?.combinationDisplay
                : '',
            uom: 'PCS',
            qty: 1
        };

        setIrrFormData({
            ...irrFormData,
            items: [...irrFormData.items, newItem]
        });

        setSelectedProductForAdd('');
        setProductSearchTerm('');
        toast.success('Product added to list');
    };

    const handleRemoveItem = (index) => {
        const newItems = irrFormData.items.filter((_, i) => i !== index);
        setIrrFormData({ ...irrFormData, items: newItems });
        toast.success('Product removed');
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...irrFormData.items];
        newItems[index][field] = value;
        setIrrFormData({ ...irrFormData, items: newItems });
    };

    const handleIrrSubmit = async (e) => {
        e.preventDefault();

        if (!irrFormData.supplierId) {
            toast.error('Please select a supplier');
            return;
        }

        if (!irrFormData.items || irrFormData.items.length === 0) {
            toast.error('Please add at least one product');
            return;
        }

        for (const item of irrFormData.items) {
            if (!item.qty || item.qty <= 0) {
                toast.error('All products must have quantity greater than 0');
                return;
            }
        }

        setSubmitting(true);

        try {
            if (editingIrr) {
                const updatePayload = {
                    supplierId: parseInt(irrFormData.supplierId),
                    remarks: irrFormData.remarks || '',
                    items: irrFormData.items.map(item => ({
                        productId: parseInt(item.productId),
                        variationId: item.variationId ? parseInt(item.variationId) : null,
                        productName: item.productName,
                        sku: item.sku || '',
                        upc: item.upc || '',
                        variation: item.variation || '',
                        uom: item.uom || 'PCS',
                        qty: parseInt(item.qty)
                    }))
                };

                const response = await api.put(`/inventory-requests/${editingIrr.id}`, updatePayload);

                if (response.success) {
                    toast.success('✅ Inventory request updated successfully');
                    onSuccess();
                } else {
                    toast.error(response.message || 'Failed to update request');
                }
            } else {
                const batchPayload = {
                    supplierId: parseInt(irrFormData.supplierId),
                    remarks: irrFormData.remarks || '',
                    items: irrFormData.items.map(item => ({
                        productId: parseInt(item.productId),
                        variationId: item.variationId ? parseInt(item.variationId) : null,
                        productName: item.productName,
                        sku: item.sku || '',
                        upc: item.upc || '',
                        variation: item.variation || '',
                        uom: item.uom || 'PCS',
                        qty: parseInt(item.qty)
                    }))
                };

                const response = await api.post('/inventory-requests/batch', batchPayload);

                if (response.success) {
                    const itemCount = response.data?.items?.length
                        || response.data?.data?.items?.length
                        || irrFormData.items.length;

                    toast.success(`✅ Inventory request created with ${itemCount} product(s)`);
                    onSuccess();
                } else {
                    toast.error(response.message || 'Failed to create request');
                }
            }
        } catch (error) {
            console.error('Error saving request:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save request';
            toast.error(`❌ ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleProceedToRpq = async () => {
        setButtonLoading(prev => ({ ...prev, 'proceed-rpq': true }));

        try {
            const supplier = suppliers.find(s => s.id === irrFormData.supplierId);
            const rpqPayload = {
                irrId: editingIrr.id,
                requestor: currentUserName,
                supplierId: irrFormData.supplierId,
                supplierName: supplier?.name || '',
                supplierInfo: {
                    contactPerson: supplier?.contactPerson || '',
                    contactNo: supplier?.contactNo || '',
                    email: supplier?.email || '',
                    address: supplier?.address || '',
                    modeOfPayment: supplier?.modeOfPayment || '',
                    bankName: supplier?.bankName || '',
                    accountNumber: supplier?.accountNumber || '',
                    beneficiaryName: supplier?.beneficiaryName || '',
                    swiftCode: supplier?.swiftCode || '',
                    bankAddress: supplier?.bankAddress || '',
                    bankCountry: supplier?.bankCountry || '',
                    beneficiaryAddress: supplier?.beneficiaryAddress || ''
                },
                items: irrFormData.items.map(item => ({
                    productId: item.productId,
                    variationId: item.variationId || null,
                    productName: item.productName || item.displayName || '',
                    sku: item.sku || '',
                    upc: item.upc || '',
                    variation: item.variation || '',
                    uom: item.uom || 'PCS',
                    qty: item.qty
                })),
                moq: '',
                initialPaymentAmount: 0,
                finalPaymentAmount: 0,
                paymentInstruction: '',
                status: 'DRAFT'
            };

            const response = await api.post('/quotation-requests', rpqPayload);
            if (response.success) {
                await api.patch(`/inventory-requests/${editingIrr.id}`, { status: 'PROCEEDED_TO_RPQ' });
                toast.success(`✅ Successfully created RPQ with ${irrFormData.items.length} product(s)`);
                window.dispatchEvent(new CustomEvent('irrProceededToRpq'));

                onSuccess();
            } else {
                toast.error('Failed to create RPQ request');
            }
        } catch (error) {
            console.error('Error proceeding to RPQ:', error);
            toast.error(error.response?.data?.message || 'Failed to proceed to RPQ');
        } finally {
            setButtonLoading(prev => ({ ...prev, 'proceed-rpq': false }));
        }
    };



    const filteredProducts = supplierProducts.filter(product => {
        if (!productSearchTerm) return true;
        const searchLower = productSearchTerm.toLowerCase();
        const nameMatch = product.displayName?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
        const upcMatch = product.upc?.toLowerCase().includes(searchLower);
        const brandMatch = product.brand?.toLowerCase().includes(searchLower);
        return nameMatch || skuMatch || upcMatch || brandMatch;
    });

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-fit">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {editingIrr ? 'Edit Request' : 'New Inventory Request'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleIrrSubmit} className="p-6 space-y-6">
                    {/* Supplier Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={irrFormData.supplierId}
                            onChange={(e) => handleSupplierChange(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select supplier</option>
                            {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Supplier Details */}
                    {selectedSupplier && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-gray-900 mb-3">Supplier Information</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Contact Person:</span>
                                    <span className="ml-2 text-gray-900">{selectedSupplier.contactPerson || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Contact No:</span>
                                    <span className="ml-2 text-gray-900">{selectedSupplier.contactNo || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Email:</span>
                                    <span className="ml-2 text-gray-900">{selectedSupplier.email || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Type:</span>
                                    <span className="ml-2 text-gray-900">{selectedSupplier.type || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Add Products <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={productSearchTerm}
                                    onChange={(e) => {
                                        setProductSearchTerm(e.target.value);
                                        setShowProductDropdown(true);
                                    }}
                                    onFocus={() => setShowProductDropdown(true)}
                                    disabled={!irrFormData.supplierId || loadingProducts}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder={loadingProducts ? 'Loading products...' : 'Search products...'}
                                />

                                {showProductDropdown && !loadingProducts && irrFormData.supplierId && supplierProducts.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                                No products found
                                            </div>
                                        ) : (
                                            filteredProducts.map((product) => {
                                                const key = product.isVariation
                                                    ? `${product.id}_${product.variationId}`
                                                    : `${product.id}`;

                                                const isAlreadyAdded = irrFormData.items.some(item => {
                                                    if (product.isVariation) {
                                                        return item.productId === product.id && item.variationId === product.variationId;
                                                    }
                                                    return item.productId === product.id;
                                                });

                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isAlreadyAdded) {
                                                                setSelectedProductForAdd(key);
                                                                setProductSearchTerm(product.displayName);
                                                                setShowProductDropdown(false);
                                                            }
                                                        }}
                                                        disabled={isAlreadyAdded}
                                                        className={`w-full px-4 py-2.5 text-left transition border-b border-gray-100 last:border-b-0 ${isAlreadyAdded
                                                            ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                                            : selectedProductForAdd === key
                                                                ? 'bg-blue-50 hover:bg-blue-100'
                                                                : 'hover:bg-blue-50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {product.displayName}
                                                                </div>
                                                                {product.brand && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Brand: {product.brand}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                                {isAlreadyAdded && (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                                        Added
                                                                    </span>
                                                                )}
                                                                {selectedProductForAdd === key && !isAlreadyAdded && (
                                                                    <Check size={16} className="text-blue-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Show message when no products available */}
                                {showProductDropdown && !loadingProducts && irrFormData.supplierId && supplierProducts.length === 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                                        <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                            No products available for this supplier
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddProductToTable}
                                disabled={!selectedProductForAdd}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add Product
                            </button>
                        </div>
                    </div>

                    {/* Product Preview Card */}
                    {selectedProductForAdd && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Eye size={16} className="text-blue-600" />
                                Selected Product Preview
                            </h4>
                            {(() => {
                                const selectedProd = supplierProducts.find(p => {
                                    if (selectedProductForAdd.includes('_')) {
                                        const [prodId, varId] = selectedProductForAdd.split('_');
                                        return p.id === parseInt(prodId) && p.variationId === parseInt(varId);
                                    }
                                    return p.id === parseInt(selectedProductForAdd);
                                });

                                if (!selectedProd) return null;

                                const variation = selectedProd.isVariation
                                    ? selectedProd.variations?.find(v => v.id === selectedProd.variationId)
                                    : null;

                                return (
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600 font-medium">Product Name:</span>
                                            <p className="text-gray-900 font-semibold mt-1">{selectedProd.productName}</p>
                                        </div>

                                        {selectedProd.isVariation && variation && (
                                            <div>
                                                <span className="text-gray-600 font-medium">Variation:</span>
                                                <p className="text-gray-900 font-semibold mt-1">
                                                    {variation.combinationDisplay}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-gray-600 font-medium">SKU:</span>
                                            <p className="text-gray-900 mt-1 font-medium">
                                                {selectedProd.isVariation ? variation?.sku : selectedProd.sku || '-'}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-gray-600 font-medium">UPC:</span>
                                            <p className="text-gray-900 mt-1">
                                                {selectedProd.isVariation ? variation?.upc : selectedProd.upc || '-'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Products Table */}
                    {irrFormData.items.length > 0 && (
                        <div className="border rounded-lg overflow-hidden table-panel">
                            <div className="overflow-x-auto table-fit" style={{ maxHeight: '260px' }}>
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {irrFormData.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                    {item.productName}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.sku || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.upc || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {item.variation || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value="PCS"
                                                        readOnly
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100 cursor-not-allowed text-center"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.qty ? parseInt(item.qty).toLocaleString('en-US') : ''}
                                                        onChange={(e) => {
                                                            const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                                            handleItemChange(index, 'qty', numericValue);
                                                        }}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {irrFormData.items.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Package size={40} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">No products added yet</p>
                            <p className="text-gray-400 text-xs">Select a product above and click "Add Product"</p>
                        </div>
                    )}

                    {/* Control Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Control Number
                        </label>
                        <input
                            type="text"
                            value={editingIrr ? editingIrr.controlNumber : generateControlNumber()}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remarks
                        </label>
                        <textarea
                            value={irrFormData.remarks}
                            onChange={(e) => setIrrFormData({ ...irrFormData, remarks: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter any remarks or special instructions..."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {editingIrr && editingIrr.status !== 'PROCEEDED_TO_RPQ' && (
                            <button
                                type="button"
                                onClick={handleProceedToRpq}
                                disabled={submitting || buttonLoading['proceed-rpq']}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {buttonLoading['proceed-rpq'] ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight size={18} />
                                        Proceed to RPQ
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {editingIrr ? 'Updating...' : 'Submitting...'}
                                </>
                            ) : (
                                editingIrr ? 'Update Request' : 'Submit Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IRRModal;