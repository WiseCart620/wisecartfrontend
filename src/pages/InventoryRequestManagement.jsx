import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Search, X, Eye, Check,
    Building2, Package, ArrowRight, Loader2, FileText, ShoppingCart, ChevronDown, ChevronRight, Download
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import LoadingOverlay from '../components/common/LoadingOverlay';
import PurchaseOrderManagement from './PurchaseOrderManagement';



const InventoryRequestManagement = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserName = currentUser.fullName || currentUser.name || currentUser.username || 'Unknown User';
    const [buttonLoading, setButtonLoading] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const setButtonLoadingState = (key, value) => {
        setButtonLoading(prev => ({ ...prev, [key]: value }));
    };
    const [activeTab, setActiveTab] = useState('irr');
    const [irrRequests, setIrrRequests] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [showIrrModal, setShowIrrModal] = useState(false);
    const [editingIrr, setEditingIrr] = useState(null);
    const [viewingIrr, setViewingIrr] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [expandedRpqRows, setExpandedRpqRows] = useState({});
    const [irrFormData, setIrrFormData] = useState({
        supplierId: '',
        items: [],
        remarks: ''
    });

    // RPQ State
    const [rpqRequests, setRpqRequests] = useState([]);
    const [showRpqModal, setShowRpqModal] = useState(false);
    const [editingRpq, setEditingRpq] = useState(null);
    const [viewingRpq, setViewingRpq] = useState(null);
    const [rpqFormData, setRpqFormData] = useState({
        supplierId: '',
        supplierName: '',
        supplierInfo: {},
        productId: '',
        productName: '',
        sku: '',
        variation: '',
        uom: '',
        moq: '',
        qty: '',
        initialPaymentPercent: '',
        finalPaymentPercent: '',
        productionQuestion1: '',
        productionLeadTime: '',
        productionDetails: '',
        productionAnswer1: '',
        productionQuestion2: '',
        productionAnswer2: '',
        paymentInstruction: ''
    });

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchIrr, setSearchIrr] = useState('');
    const [searchRpq, setSearchRpq] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showProductDropdown && !event.target.closest('.relative')) {
                setShowProductDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProductDropdown]);


    // Collapsible Product List Component
    const CollapsibleProductList = ({ items, isExpanded, setIsExpanded }) => {
        return (
            <div className="text-sm">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {items.length} products
                </button>
                {isExpanded && (
                    <div className="mt-2 space-y-1.5 pl-5 border-l-2 border-blue-200">
                        {items.map((item, idx) => (
                            <div key={idx}>
                                <div className="text-gray-900 font-medium">{item.productName}</div>
                                {item.variation && (
                                    <div className="text-xs text-gray-500">{item.variation}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };


    const toggleRpqRow = (rpqId) => {
        setExpandedRpqRows(prev => ({
            ...prev,
            [rpqId]: !prev[rpqId]
        }));
    };





    const IRRTableRow = ({ req, handleDeleteIrr, setViewingIrr, setEditingIrr, setShowIrrModal, setIrrFormData, suppliers, setSelectedSupplier, setLoadingProducts, setSupplierProducts, setButtonLoadingState, setActionLoading, buttonLoading, api, expandedRpqRows, toggleRpqRow }) => {
        const [isExpanded, setIsExpanded] = useState(false);

        return (
            <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{req.controlNumber}</td>
                <td className="px-6 py-4 text-gray-900">{req.requestor}</td>
                <td className="px-6 py-4">
                    {req.items && req.items.length > 0 ? (
                        req.items.length === 1 ? (
                            <div className="text-sm">
                                <div className="text-gray-900 font-medium">
                                    {req.items[0].productName} - {req.items[0].qty} {req.items[0].uom}
                                </div>
                                {req.items[0].variation && (
                                    <div className="text-xs text-gray-500 mt-0.5">{req.items[0].variation}</div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    {req.items.length} products
                                </button>
                                {isExpanded && (
                                    <div className="mt-2 space-y-1.5 pl-5 border-l-2 border-blue-200">
                                        {req.items.map((item, idx) => (
                                            <div key={idx}>
                                                <div className="text-gray-900 font-medium">
                                                    {item.productName} - {item.qty} {item.uom}
                                                </div>
                                                {item.variation && (
                                                    <div className="text-xs text-gray-500">{item.variation}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="text-sm text-gray-500">-</div>
                    )}
                </td>
                <td className="px-6 py-4 text-gray-900">
                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'PROCEEDED_TO_RPQ'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {req.status || 'PENDING'}
                    </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setViewingIrr(req)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Eye size={18} />
                        </button>
                        <button
                            onClick={async () => {
                                const loadKey = `edit-${req.id}`;
                                setButtonLoadingState(loadKey, true);
                                setActionLoading(true);

                                try {
                                    setEditingIrr(req);
                                    setIrrFormData({
                                        supplierId: req.supplierId,
                                        items: req.items && req.items.length > 0 ? req.items.map(item => ({
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
                                        remarks: req.remarks || ''
                                    });

                                    if (req.supplierId) {
                                        const supplier = suppliers.find(s => s.id === req.supplierId);
                                        setSelectedSupplier(supplier);
                                        setLoadingProducts(true);
                                        try {
                                            const isForwarder = supplier?.type?.toLowerCase() === 'forwarder';
                                            const endpoint = isForwarder ? '/products' : `/products/by-supplier/${req.supplierId}`;
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
                                            console.error('Error loading products for edit:', error);
                                            toast.error('Failed to load products');
                                        } finally {
                                            setLoadingProducts(false);
                                        }
                                    }
                                    setShowIrrModal(true);
                                } finally {
                                    setButtonLoadingState(loadKey, false);
                                    setActionLoading(false);
                                }
                            }}
                            disabled={req.status === 'PROCEEDED_TO_RPQ' || buttonLoading[`edit-${req.id}`]}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {buttonLoading[`edit-${req.id}`] ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Edit2 size={18} />
                            )}
                        </button>
                        <button
                            onClick={() => handleDeleteIrr(req.id)}
                            disabled={req.status === 'PROCEEDED_TO_RPQ' || buttonLoading[`delete-irr-${req.id}`]}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {buttonLoading[`delete-irr-${req.id}`] ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Trash2 size={18} />
                            )}
                        </button>
                    </div>
                </td>
            </tr>
        );
    };


    const loadInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadSuppliers(),
                loadIrrRequests(),
                loadRpqRequests()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            if (response.success && response.data) {
                setSuppliers(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            toast.error('Failed to load suppliers');
        }
    };

    const loadIrrRequests = async () => {
        try {
            const response = await api.get('/inventory-requests');
            if (response && response.success) {
                const actualData = response.data?.data || response.data;
                const requests = Array.isArray(actualData) ? actualData : [];
                setIrrRequests(requests);
            } else {
                setIrrRequests([]);
                if (response && response.message) {
                    toast.error(response.message);
                }
            }
        } catch (error) {
            setIrrRequests([]);
            toast.error('Failed to load inventory requests');
        }
    };

    const loadRpqRequests = async () => {
        try {
            const response = await api.get('/quotation-requests');
            if (response && response.success) {
                const actualData = response.data?.data || response.data;
                const requests = Array.isArray(actualData) ? actualData : [];
                setRpqRequests(requests);
            } else {
                setRpqRequests([]);
                if (response && response.message) {
                    toast.error(response.message);
                }
            }
        } catch (error) {
            setRpqRequests([]);
            toast.error('Failed to load quotation requests');
        }
    };

    const pendingIrrCount = irrRequests.filter(req => req.status === 'PENDING').length;
    const pendingRpqCount = rpqRequests.filter(req =>
        req.status === 'DRAFT' || req.status === 'PENDING'
    ).length;

    const tabs = [
        {
            id: 'irr',
            label: 'Inventory Request',
            icon: FileText,
            count: irrRequests.length,
            pendingCount: pendingIrrCount
        },
        {
            id: 'rpq',
            label: 'Product Quotation',
            icon: Package,
            count: rpqRequests.length,
            pendingCount: pendingRpqCount
        },
        {
            id: 'po',
            label: 'Purchase Orders & Payments',
            icon: ShoppingCart
        }
    ];

    const handleProductChange = (productId, product) => {
        if (!productId) {
            setIrrFormData({ ...irrFormData, productId: '', variationId: '' });
            setSelectedProduct(null);
            return;
        }
        setSelectedProduct(product);
        setIrrFormData({
            ...irrFormData,
            productId: parseInt(productId),
            variationId: product?.isVariation ? product.variationId : ''
        });
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

        // Check if product already exists
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

        // Add to items array
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

        // Reset search
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




    const generateControlNumber = (type, existingRequests) => {
        const year = new Date().getFullYear();
        const prefix = type === 'IRR' ? 'IRR' : 'RPQ';
        const yearRequests = existingRequests.filter(req =>
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
        return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`; // Changed from 2 to 4
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

        // Validate all items have quantity
        for (const item of irrFormData.items) {
            if (!item.qty || item.qty <= 0) {
                toast.error('All products must have quantity greater than 0');
                return;
            }
        }

        setSubmitting(true);
        setActionLoading(true);

        try {
            if (editingIrr) {
                // For editing, update the existing request
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
                    setShowIrrModal(false);
                    resetIrrForm();
                    await loadIrrRequests();
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
                    setShowIrrModal(false);
                    resetIrrForm();
                    await loadIrrRequests();
                } else {
                    console.error('Failed response:', response);
                    toast.error(response.message || 'Failed to create request');
                }
            }
        } catch (error) {
            console.error('Error saving request:', error);
            console.error('Error response:', error.response);
            console.error('Error data:', error.response?.data);

            const errorMessage = error.response?.data?.message || error.message || 'Failed to save request';
            toast.error(`❌ ${errorMessage}`);
        } finally {
            setActionLoading(false);
            setSubmitting(false);
        }
    };


    const handleSupplierChange = async (supplierId) => {
        setIrrFormData({
            ...irrFormData,
            supplierId,
            productId: '',
            variationId: '',
            items: []
        });
        setSelectedProduct(null);
        setSupplierProducts([]);
        setSelectedProductForAdd('');
        setProductSearchTerm('');
        setShowProductDropdown(false);

        if (!supplierId) {
            setSelectedSupplier(null);
            return;
        }

        const supplier = suppliers.find(s => s.id === parseInt(supplierId));
        setSelectedSupplier(supplier);

        setLoadingProducts(true);
        try {
            // Check if supplier is a forwarder
            const isForwarder = supplier?.type?.toLowerCase() === 'forwarder';

            // If forwarder, get all products, otherwise get products by supplier
            const endpoint = isForwarder
                ? '/products'
                : `/products/by-supplier/${supplierId}`;

            const response = await api.get(endpoint);

            if (response.success && response.data) {
                // Handle different response structures
                const products = response.data.data || response.data;

                // Make sure products is an array
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


    const handleProceedToRpq = async (irrData) => {
        const items = irrFormData.items && irrFormData.items.length > 0 ? irrFormData.items : irrData.items;
        const supplierId = irrFormData.supplierId || irrData.supplierId;

        if (!items || items.length === 0) {
            toast.error('No items found in this inventory request');
            return;
        }

        // ✅ ADD THIS DEBUG
        console.log('===== DEBUG: Items being sent to RPQ =====');
        items.forEach((item, idx) => {
            console.log(`Item ${idx}:`, {
                productId: item.productId,
                productName: item.productName,
                displayName: item.displayName,
                variation: item.variation,
                sku: item.sku,
                upc: item.upc,
                qty: item.qty
            });
        });
        console.log('==========================================');

        setButtonLoadingState('proceed-rpq', true);
        setActionLoading(true);

        try {
            const supplier = suppliers.find(s => s.id === supplierId);

            // Create ONE RPQ with ALL items
            const rpqPayload = {
                irrId: irrData.id,
                requestor: currentUserName,
                supplierId: supplierId,
                supplierName: supplier?.name || '',
                supplierInfo: {
                    contactPerson: supplier?.contactPerson || '',
                    contactNo: supplier?.contactNo || '',
                    email: supplier?.email || '',
                    address: supplier?.address || '',
                    modeOfPayment: supplier?.modeOfPayment || '',
                    bankName: supplier?.bankName || '',
                    accountNumber: supplier?.accountNumber || ''
                },
                items: items.map(item => ({
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
                await api.patch(`/inventory-requests/${irrData.id}`, { status: 'PROCEEDED_TO_RPQ' });

                toast.success(`✅ Successfully created RPQ with ${items.length} product(s)`);
                setShowIrrModal(false);
                resetIrrForm();
                await Promise.all([loadIrrRequests(), loadRpqRequests()]);
            } else {
                toast.error('Failed to create RPQ request');
            }
        } catch (error) {
            console.error('Error proceeding to RPQ:', error);
            toast.error(error.response?.data?.message || 'Failed to proceed to RPQ');
        } finally {
            setButtonLoadingState('proceed-rpq', false);
            setActionLoading(false);
        }
    };



    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const handleRpqSubmit = async (e) => {
        e.preventDefault();
        if (rpqFormData.items && rpqFormData.items.length > 0) {
            for (const item of rpqFormData.items) {
                if (!item.qty || item.qty <= 0) {
                    toast.error('All products must have quantity greater than 0');
                    return;
                }
            }
        }
        setSubmitting(true);
        setActionLoading(true);
        try {
            const payload = {
                supplierId: rpqFormData.supplierId,
                supplierName: rpqFormData.supplierName,
                supplierInfo: rpqFormData.supplierInfo,
                items: rpqFormData.items.map(item => ({
                    id: item.id || null,
                    productId: item.productId,
                    variationId: item.variationId || null,
                    productName: item.productName,
                    sku: item.sku || '',
                    upc: item.upc || '',
                    variation: item.variation || '',
                    uom: item.uom || 'PCS',
                    qty: parseInt(item.qty) || 1,
                    moq: item.moq ? parseInt(item.moq) : null,
                    unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
                    totalAmount: item.unitPrice && item.qty ?
                        parseFloat(item.unitPrice) * parseInt(item.qty) : null
                })),
                moq: rpqFormData.moq || '',
                initialPaymentAmount: parseFloat(rpqFormData.initialPaymentAmount) || 0,
                finalPaymentAmount: parseFloat(rpqFormData.finalPaymentAmount) || 0,
                initialPaymentPercent: parseFloat(rpqFormData.initialPaymentPercent) || 0,
                finalPaymentPercent: parseFloat(rpqFormData.finalPaymentPercent) || 0,
                productionLeadTime: rpqFormData.productionLeadTime || '',
                productionDetails: rpqFormData.productionDetails || '',
                paymentInstruction: rpqFormData.paymentInstruction || '',
                status: 'PENDING'
            };
            const response = await api.put(`/quotation-requests/${editingRpq.id}`, payload);
            if (response.success) {
                toast.success('Quotation request updated successfully');
                setShowRpqModal(false);
                resetRpqForm();
                await loadRpqRequests();
            }
        } catch (error) {
            console.error('Error updating quotation:', error);
            toast.error(error.response?.data?.message || 'Failed to update quotation request');
        } finally {
            setSubmitting(false);
            setActionLoading(false);
        }
    };


    const handleConfirmProduct = async (rpq) => {
        if (!window.confirm('Confirm this product quotation?')) return;
        setButtonLoadingState('confirm-product', true);
        setActionLoading(true);
        try {
            const response = await api.patch(`/quotation-requests/${rpq.id}`, { status: 'CONFIRMED' });
            if (response.success) {
                const poResponse = await api.post(`/purchase-orders/from-quotation/${rpq.id}`, {});
                if (poResponse.success) {
                    toast.success('Product confirmed and purchase order created');
                    setViewingRpq(null);
                    await loadRpqRequests();
                }
            }
        } catch (error) {
            toast.error('Failed to confirm quotation');
        } finally {
            setButtonLoadingState('confirm-product', false);
            setActionLoading(false);
        }
    };

    const handleDeleteIrr = async (id) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;
        const loadKey = `delete-irr-${id}`;
        setButtonLoadingState(loadKey, true);
        setActionLoading(true);
        try {
            const response = await api.delete(`/inventory-requests/${id}`);
            if (response.success) {
                toast.success('Request deleted successfully');
                await loadIrrRequests();
            }
        } catch (error) {
            toast.error('Failed to delete request');
        } finally {
            setButtonLoadingState(loadKey, false);
            setActionLoading(false);
        }
    };

    const handleDeleteRpq = async (id) => {
        if (!window.confirm(
            'Are you sure you want to delete this quotation request?\n\n⚠️ Warning: This will also delete the associated Inventory Request.'
        )) return;
        const loadKey = `delete-rpq-${id}`;
        setButtonLoadingState(loadKey, true);
        setActionLoading(true);
        try {
            const response = await api.delete(`/quotation-requests/${id}`);
            if (response.success) {
                toast.success('✅ Quotation and inventory request deleted successfully');
                await Promise.all([loadRpqRequests(), loadIrrRequests()]);
            }
        } catch (error) {
            toast.error('Failed to delete quotation request');
        } finally {
            setButtonLoadingState(loadKey, false);
            setActionLoading(false);
        }
    };

    const resetIrrForm = () => {
        setIrrFormData({ supplierId: '', items: [], remarks: '' });
        setSelectedSupplier(null);
        setSelectedProduct(null);
        setSupplierProducts([]);
        setEditingIrr(null);
        setSelectedProductForAdd('');
        setProductSearchTerm('');
        setShowProductDropdown(false);
    };

    const resetRpqForm = () => {
        setRpqFormData({
            supplierId: '',
            supplierName: '',
            supplierInfo: {},
            productId: '',
            productName: '',
            sku: '',
            variation: '',
            uom: '',
            moq: '',
            qty: '',
            initialPaymentAmount: '',
            finalPaymentAmount: '',
            finalPaymentPercent: '',
            productionLeadTime: '',
            initialPaymentPercent: '',
            productionDetails: '',
            productionQuestion1: '',
            productionAnswer1: '',
            productionQuestion2: '',
            productionAnswer2: '',
            paymentInstruction: ''
        });
        setEditingRpq(null);
    };


    const filteredIrrRequests = irrRequests.filter(req =>
        req.controlNumber?.toLowerCase().includes(searchIrr.toLowerCase()) ||
        req.productName?.toLowerCase().includes(searchIrr.toLowerCase())
    );

    const filteredRpqRequests = rpqRequests.filter(req =>
        req.controlNumber?.toLowerCase().includes(searchRpq.toLowerCase()) ||
        req.productName?.toLowerCase().includes(searchRpq.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingOverlay show={true} message="Loading..." />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-full mx-auto px-8">
            <Toaster position="top-right" />
            <LoadingOverlay show={actionLoading} message="Processing..." />

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Procurement Management</h1>
                <p className="text-gray-600 mt-1">Manage inventory requests, quotations, and purchase orders</p>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={20} />
                                {tab.label}

                                {/* Total Count */}
                                {tab.count !== undefined && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}

                                {/* Pending Count Badge (yellow/amber) */}
                                {tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.id
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-amber-50 text-amber-600'
                                        } border border-amber-300`}>
                                        {tab.pendingCount} pending
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'irr' && (
                <div>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by control number or product..."
                                value={searchIrr}
                                onChange={(e) => setSearchIrr(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => {
                                resetIrrForm();
                                setShowIrrModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={20} />
                            New Request
                        </button>
                    </div>

                    {/* IRR Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requestor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredIrrRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                No requests found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredIrrRequests.map((req) => (
                                            <IRRTableRow
                                                key={req.id}
                                                req={req}
                                                handleDeleteIrr={handleDeleteIrr}
                                                setViewingIrr={setViewingIrr}
                                                setEditingIrr={setEditingIrr}
                                                setShowIrrModal={setShowIrrModal}
                                                setIrrFormData={setIrrFormData}
                                                suppliers={suppliers}
                                                setSelectedSupplier={setSelectedSupplier}
                                                setLoadingProducts={setLoadingProducts}
                                                setSupplierProducts={setSupplierProducts}
                                                setButtonLoadingState={setButtonLoadingState}
                                                setActionLoading={setActionLoading}
                                                buttonLoading={buttonLoading}
                                                api={api}
                                                expandedRpqRows={expandedRpqRows}
                                                toggleRpqRow={toggleRpqRow}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rpq' && (
                <div>
                    <div className="flex-1 relative mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by control number or product..."
                            value={searchRpq}
                            onChange={(e) => setSearchRpq(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* RPQ Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requestor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRpqRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                No quotation requests found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRpqRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{req.controlNumber}</td>
                                                <td className="px-6 py-4 text-gray-900">{req.requestor}</td>
                                                <td className="px-6 py-4 text-gray-900">{req.supplierName}</td>
                                                <td className="px-6 py-4">
                                                    {req.items && req.items.length > 0 ? (
                                                        req.items.length === 1 ? (
                                                            <div className="text-sm">
                                                                <div className="text-gray-900 font-medium">
                                                                    {req.items[0].productName} - {req.items[0].qty} {req.items[0].uom}
                                                                </div>
                                                                {req.items[0].variation && (
                                                                    <div className="text-xs text-gray-500 mt-0.5">{req.items[0].variation}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm">
                                                                <button
                                                                    onClick={() => toggleRpqRow(req.id)}
                                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                                                >
                                                                    {expandedRpqRows[req.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                    {req.items.length} products
                                                                </button>
                                                                {expandedRpqRows[req.id] && (
                                                                    <div className="mt-2 space-y-1.5 pl-5 border-l-2 border-blue-200">
                                                                        {req.items.map((item, idx) => (
                                                                            <div key={idx}>
                                                                                <div className="text-gray-900 font-medium">
                                                                                    {item.productName} - {item.qty} {item.uom}
                                                                                </div>
                                                                                {item.variation && (
                                                                                    <div className="text-xs text-gray-500">{item.variation}</div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="text-sm text-gray-500">-</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900">
                                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'CONFIRMED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : req.status === 'PENDING'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {req.status || 'DRAFT'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewingRpq(req)}
                                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingRpq(req);
                                                                setRpqFormData({
                                                                    supplierId: req.supplierId,
                                                                    supplierName: req.supplierName,
                                                                    supplierInfo: req.supplierInfo || {},
                                                                    items: req.items?.map(item => ({
                                                                        ...item,
                                                                        unitPrice: item.unitPrice || '',
                                                                        totalAmount: item.totalAmount || ''
                                                                    })) || [],
                                                                    moq: req.moq || '',
                                                                    initialPaymentAmount: req.initialPaymentAmount || '',
                                                                    finalPaymentAmount: req.finalPaymentAmount || '',
                                                                    initialPaymentPercent: req.initialPaymentPercent || '',
                                                                    finalPaymentPercent: req.finalPaymentPercent || '',
                                                                    productionLeadTime: req.productionLeadTime || '',
                                                                    productionDetails: req.productionDetails || '',
                                                                    paymentInstruction: req.paymentInstruction || ''
                                                                });
                                                                setShowRpqModal(true);
                                                            }}
                                                            disabled={req.status === 'CONFIRMED'}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRpq(req.id)}
                                                            disabled={req.status === 'CONFIRMED' || buttonLoading[`delete-rpq-${req.id}`]}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {buttonLoading[`delete-rpq-${req.id}`] ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* IRR Modal */}
            {showIrrModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingIrr ? 'Edit Request' : 'New Inventory Request'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowIrrModal(false);
                                    resetIrrForm();
                                }}
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

                            {/* Product Selection with Add Button */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Add Products <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    {/* Searchable Dropdown */}
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

                                        {/* Dropdown List */}
                                        {showProductDropdown && !loadingProducts && irrFormData.supplierId && Array.isArray(supplierProducts) && supplierProducts.length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {(() => {
                                                    // Filter products based on search term
                                                    const filtered = supplierProducts.filter(product => {
                                                        if (!productSearchTerm) return true;

                                                        const searchLower = productSearchTerm.toLowerCase();
                                                        const nameMatch = product.displayName?.toLowerCase().includes(searchLower);
                                                        const skuMatch = product.sku?.toLowerCase().includes(searchLower);
                                                        const upcMatch = product.upc?.toLowerCase().includes(searchLower);
                                                        const brandMatch = product.brand?.toLowerCase().includes(searchLower);

                                                        return nameMatch || skuMatch || upcMatch || brandMatch;
                                                    });

                                                    if (filtered.length === 0) {
                                                        return (
                                                            <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                                                No products found
                                                            </div>
                                                        );
                                                    }

                                                    return filtered.map((product) => {
                                                        const key = product.isVariation
                                                            ? `${product.id}_${product.variationId}`
                                                            : `${product.id}`;

                                                        // Check if product is already added
                                                        const isAlreadyAdded = Array.isArray(irrFormData.items) && irrFormData.items.some(item => {
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
                                                    });
                                                })()}
                                            </div>
                                        )}

                                        {/* Show message when no products available */}
                                        {showProductDropdown && !loadingProducts && irrFormData.supplierId && (!Array.isArray(supplierProducts) || supplierProducts.length === 0) && (
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
                                                    <p className="text-gray-900 mt-1">
                                                        {selectedProd.isVariation ? variation?.sku : selectedProd.sku || '-'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-gray-600 font-medium">UPC:</span>
                                                    <p className="text-gray-900 mt-1">
                                                        {selectedProd.isVariation ? variation?.upc : selectedProd.upc || '-'}
                                                    </p>
                                                </div>

                                                {selectedProd.brand && (
                                                    <div>
                                                        <span className="text-gray-600 font-medium">Brand:</span>
                                                        <p className="text-gray-900 mt-1">{selectedProd.brand}</p>
                                                    </div>
                                                )}

                                                {selectedProd.category && (
                                                    <div>
                                                        <span className="text-gray-600 font-medium">Category:</span>
                                                        <p className="text-gray-900 mt-1">{selectedProd.category}</p>
                                                    </div>
                                                )}

                                                {selectedProd.isVariation && variation?.weight && (
                                                    <div>
                                                        <span className="text-gray-600 font-medium">Weight:</span>
                                                        <p className="text-gray-900 mt-1">{variation.weight} kg</p>
                                                    </div>
                                                )}

                                                {selectedProd.isVariation && variation?.dimensions && (
                                                    <div>
                                                        <span className="text-gray-600 font-medium">Dimensions:</span>
                                                        <p className="text-gray-900 mt-1">{variation.dimensions}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}


                            {/* Products Table */}
                            {irrFormData.items.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
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
                                                        <select
                                                            value={item.uom}
                                                            onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="PCS">PCS</option>
                                                            <option value="BOX">BOX</option>
                                                            <option value="CTN">CTN</option>
                                                            <option value="KG">KG</option>
                                                            <option value="L">L</option>
                                                            <option value="M">M</option>
                                                            <option value="SET">SET</option>
                                                            <option value="PACK">PACK</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.qty}
                                                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                            min="1"
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
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
                            )}

                            {irrFormData.items.length === 0 && (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <Package size={40} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-gray-500 text-sm">No products added yet</p>
                                    <p className="text-gray-400 text-xs">Select a product above and click "Add Product"</p>
                                </div>
                            )}


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Control Number
                                </label>
                                <input
                                    type="text"
                                    value={editingIrr ? editingIrr.controlNumber : generateControlNumber('IRR', irrRequests)}
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


                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowIrrModal(false);
                                        resetIrrForm();
                                    }}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                {editingIrr && editingIrr.status !== 'PROCEEDED_TO_RPQ' && (
                                    <button
                                        type="button"
                                        onClick={() => handleProceedToRpq(editingIrr)}
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
            )}

            {/* IRR View Modal */}
            {viewingIrr && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                            <button
                                onClick={() => setViewingIrr(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div>
                                    <span className="text-sm text-gray-600">Control Number:</span>
                                    <p className="font-semibold text-gray-900">{viewingIrr.controlNumber}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Requestor:</span>
                                    <p className="font-semibold text-gray-900">{viewingIrr.requestor}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <p className="font-semibold text-gray-900">{viewingIrr.status || 'PENDING'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Date:</span>
                                    <p className="font-semibold text-gray-900">
                                        {viewingIrr.createdAt ? new Date(viewingIrr.createdAt).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Products Table */}
                            {viewingIrr.items && viewingIrr.items.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Products</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UPC</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Variation</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {viewingIrr.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 text-sm">{item.productName}</td>
                                                        <td className="px-4 py-2 text-sm">{item.sku || '-'}</td>
                                                        <td className="px-4 py-2 text-sm">{item.upc || '-'}</td>
                                                        <td className="px-4 py-2 text-sm">{item.variation || '-'}</td>
                                                        <td className="px-4 py-2 text-sm">{item.qty} {item.uom}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {viewingIrr.remarks && (
                                <div>
                                    <span className="text-sm text-gray-600">Remarks:</span>
                                    <p className="font-semibold text-gray-900 mt-1">{viewingIrr.remarks}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showRpqModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-gray-900">Edit Product Quotation Request</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const printWindow = window.open('', '', 'width=800,height=900');
                                        const content = document.getElementById('rpq-print-content').innerHTML;
                                        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>RPQ ${editingRpq?.controlNumber || ''}</title>
        <style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.3; }
            .company-name { font-family: Georgia, serif; font-size: 24pt; font-weight: bold; letter-spacing: -0.5px; }
            .company-address { font-size: 11pt; line-height: 1.2; }
            .control-number { font-size: 10pt; font-weight: bold; }
            .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 10px 0; }
            .date-section { text-align: right; font-size: 10pt; margin: 5px 0; }
            .section { border: 1px solid #000; padding: 8px; margin: 8px 0; }
            .section-title { font-weight: bold; font-size: 11pt; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { border: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 9pt; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-row { margin: 3px 0; font-size: 10pt; }
            .label { font-weight: bold; }
            .production-line { border-bottom: 1px solid #000; min-height: 20px; margin: 8px 0; padding: 2px 0; }
            .no-print { display: none !important; }
            .border-b-2 { border-bottom: 2px solid #000; }
        </style>
    </head>
    <body>${content}</body>
    </html>
`);
                                        printWindow.document.close();
                                        printWindow.focus();
                                        printWindow.print();
                                        printWindow.close();
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Download PDF
                                </button>
                                <button onClick={() => { setShowRpqModal(false); resetRpqForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleRpqSubmit} className="p-8 space-y-6">
                            <div id="rpq-print-content">
                                {/* Header with Control Number */}
                                <div className="mb-5 pb-4 flex justify-between items-start">
                                    <div className="text-left leading-none space-y-0">
                                        <div className="text-[34px] font-bold text-gray-900 font-serif tracking-tight company-name">
                                            WISECART MERCHANTS CORP.
                                        </div>
                                        <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight company-address">
                                            <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                                            <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                                            <div>VAT REG. TIN 010-751-561-00000</div>
                                        </div>
                                    </div>
                                    <div className="text-right control-number">
                                        <div className="font-semibold">Control #: {editingRpq?.controlNumber}</div>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="text-center mb-4 title">
                                    <h2 className="text-2xl font-bold text-gray-900">REQUEST FOR PRODUCT QUOTATION</h2>
                                </div>

                                {/* Date */}
                                <div className="mb-4 flex justify-end date-section">
                                    <span className="font-medium">Date: </span>
                                    <span>{editingRpq?.createdAt ? new Date(editingRpq.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>

                                {/* Supplier Details */}
                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Supplier Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm grid-2">
                                        <div className="info-row"><span className="font-semibold label">Supplier Name: </span><span>{rpqFormData.supplierName}</span></div>
                                        <div className="info-row"><span className="font-semibold label">Contact Person: </span><span>{rpqFormData.supplierInfo?.contactPerson || '-'}</span></div>
                                        <div className="info-row"><span className="font-semibold label">Contact Number: </span><span>{rpqFormData.supplierInfo?.contactNo || '-'}</span></div>
                                        <div className="info-row"><span className="font-semibold label">Email: </span><span>{rpqFormData.supplierInfo?.email || '-'}</span></div>
                                    </div>
                                </div>


                                {rpqFormData.items && rpqFormData.items.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-bold text-gray-900 mb-2 section-title">Products</h3>
                                        <table className="w-full border-collapse border border-gray-300">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Product Name</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Variation</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">UPC</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">UOM</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Quantity</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Unit Price</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rpqFormData.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <div className="text-xs font-medium text-gray-900">{item.productName}</div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5">SKU: {item.sku || '-'}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-xs border border-gray-300">{item.variation || '-'}</td>
                                                        <td className="px-3 py-2 text-xs border border-gray-300">{item.upc || '-'}</td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="text"
                                                                value={item.uom || 'PCS'}
                                                                onChange={(e) => {
                                                                    const newItems = [...rpqFormData.items];
                                                                    newItems[idx] = { ...newItems[idx], uom: e.target.value };
                                                                    setRpqFormData({ ...rpqFormData, items: newItems });
                                                                }}
                                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                            />
                                                            <span className="hidden print:inline text-xs">{item.uom || 'PCS'}</span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="number"
                                                                value={item.qty}
                                                                onChange={(e) => {
                                                                    const newItems = [...rpqFormData.items];
                                                                    const qty = parseInt(e.target.value) || 0;
                                                                    const unitPrice = parseFloat(newItems[idx].unitPrice) || 0;
                                                                    newItems[idx] = {
                                                                        ...newItems[idx],
                                                                        qty: e.target.value,
                                                                        totalAmount: unitPrice * qty
                                                                    };
                                                                    setRpqFormData({ ...rpqFormData, items: newItems });
                                                                }}
                                                                min="1"
                                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                            />
                                                            <span className="hidden print:inline text-xs">{item.qty}</span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="number"
                                                                value={item.unitPrice || ''}
                                                                onChange={(e) => {
                                                                    const newItems = [...rpqFormData.items];
                                                                    const unitPrice = parseFloat(e.target.value) || 0;
                                                                    const qty = parseInt(newItems[idx].qty) || 0;
                                                                    newItems[idx] = {
                                                                        ...newItems[idx],
                                                                        unitPrice: e.target.value,
                                                                        totalAmount: unitPrice * qty
                                                                    };
                                                                    setRpqFormData({ ...rpqFormData, items: newItems });
                                                                }}
                                                                min="0"
                                                                step="0.01"
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                                placeholder="₱0.00"
                                                            />
                                                            <span className="hidden print:inline text-xs">
                                                                {parseFloat(item.unitPrice) > 0 ? `₱${parseFloat(item.unitPrice).toFixed(2)}` : ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <div className="px-2 py-1 bg-gray-50 text-xs font-medium text-gray-900 no-print">
                                                                {(() => {
                                                                    const total = (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0);
                                                                    return total > 0 ? `₱${total.toFixed(2)}` : '';
                                                                })()}
                                                            </div>
                                                            <span className="hidden print:inline text-xs font-medium">
                                                                {(() => {
                                                                    const total = (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0);
                                                                    return total > 0 ? `₱${total.toFixed(2)}` : '';
                                                                })()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50">
                                                <tr>
                                                    <td colSpan="6" className="px-3 py-2 text-right font-bold text-sm border border-gray-300">GRAND TOTAL:</td>
                                                    <td className="px-3 py-2 font-bold text-sm border border-gray-300">
                                                        ₱{rpqFormData.items.reduce((sum, item) =>
                                                            sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0
                                                        ).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}


                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Payment Arrangement</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-semibold label whitespace-nowrap">Initial Payment (%):</label>
                                            <input
                                                type="number"
                                                value={rpqFormData.initialPaymentPercent || ''}
                                                onChange={(e) => {
                                                    const percent = parseFloat(e.target.value) || 0;
                                                    const grandTotal = rpqFormData.items.reduce((sum, item) =>
                                                        sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0);
                                                    setRpqFormData({
                                                        ...rpqFormData,
                                                        initialPaymentPercent: e.target.value,
                                                        initialPaymentAmount: (grandTotal * percent) / 100
                                                    });
                                                }}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-medium no-print">% = ₱</span>
                                            <input
                                                type="text"
                                                value={(rpqFormData.initialPaymentAmount || 0).toFixed(2)}
                                                readOnly
                                                className="w-24 px-2 py-1 bg-gray-100 border-b-2 border-gray-400 text-xs font-medium no-print text-right"
                                            />
                                            <span className="hidden print:inline text-xs">
                                                <span className="border-b-2 border-gray-800 inline-block min-w-[50px] text-center px-1">
                                                    {rpqFormData.initialPaymentPercent || '     '}
                                                </span>
                                                % = ₱
                                                <span className="border-b-2 border-gray-800 inline-block min-w-[100px] text-right px-1">
                                                    {rpqFormData.initialPaymentAmount ? (rpqFormData.initialPaymentAmount).toFixed(2) : '          '}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-semibold label whitespace-nowrap">Final Payment (%):</label>
                                            <input
                                                type="number"
                                                value={rpqFormData.finalPaymentPercent || ''}
                                                onChange={(e) => {
                                                    const percent = parseFloat(e.target.value) || 0;
                                                    const grandTotal = rpqFormData.items.reduce((sum, item) =>
                                                        sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0);
                                                    setRpqFormData({
                                                        ...rpqFormData,
                                                        finalPaymentPercent: e.target.value,
                                                        finalPaymentAmount: (grandTotal * percent) / 100
                                                    });
                                                }}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-medium no-print">% = ₱</span>
                                            <input
                                                type="text"
                                                value={(rpqFormData.finalPaymentAmount || 0).toFixed(2)}
                                                readOnly
                                                className="w-24 px-2 py-1 bg-gray-100 border-b-2 border-gray-400 text-xs font-medium no-print text-right"
                                            />
                                            <span className="hidden print:inline text-xs">
                                                <span className="border-b-2 border-gray-800 inline-block min-w-[50px] text-center px-1">
                                                    {rpqFormData.finalPaymentPercent || '     '}
                                                </span>
                                                % = ₱
                                                <span className="border-b-2 border-gray-800 inline-block min-w-[100px] text-right px-1">
                                                    {rpqFormData.finalPaymentAmount ? (rpqFormData.finalPaymentAmount).toFixed(2) : '          '}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>



                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Payment Method</h3>
                                    <div className="space-y-2">
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Mode of Payment: </span>
                                            <span>{rpqFormData.supplierInfo?.modeOfPayment || '-'}</span>
                                        </div>
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Bank Name: </span>
                                            <span>{rpqFormData.supplierInfo?.bankName || '-'}</span>
                                        </div>
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Account Number: </span>
                                            <span>{rpqFormData.supplierInfo?.accountNumber || '-'}</span>
                                        </div>
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Account Name: </span>
                                            <span>{rpqFormData.supplierInfo?.accountName || '-'}</span>
                                        </div>
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Swift Code: </span>
                                            <span>{rpqFormData.supplierInfo?.swiftCode || '-'}</span>
                                        </div>
                                        <div className="info-row text-xs">
                                            <span className="font-semibold label">Address: </span>
                                            <span>{rpqFormData.supplierInfo?.address || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Production Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs font-semibold label whitespace-nowrap">Production Lead Time:</label>
                                            <input
                                                type="number"
                                                value={rpqFormData.productionLeadTime || ''}
                                                onChange={(e) => setRpqFormData({ ...rpqFormData, productionLeadTime: e.target.value })}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                placeholder="0"
                                                min="0"
                                            />
                                            <span className="text-xs">days</span>
                                            <span className="hidden print:inline text-xs">{rpqFormData.productionLeadTime || ''} days</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold mb-1 label">Remarks:</label>
                                            <textarea
                                                value={rpqFormData.productionDetails || ''}
                                                onChange={(e) => setRpqFormData({ ...rpqFormData, productionDetails: e.target.value })}
                                                rows="3"
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs no-print"
                                                placeholder="Enter production remarks or special instructions..."
                                            />
                                            <div className="hidden print:block text-xs production-line min-h-[60px] whitespace-pre-wrap">
                                                {rpqFormData.productionDetails || ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Requestor */}
                                <div className="mb-4">
                                    <div className="text-xs info-row"><span className="font-semibold label">Requestor: </span><span>{editingRpq?.requestor || currentUserName}</span></div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4 border-t no-print">
                                <button type="button" onClick={() => { setShowRpqModal(false); resetRpqForm(); }} disabled={submitting}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {submitting ? <><Loader2 size={18} className="animate-spin" />Updating...</> : 'Update Quotation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RPQ View Modal */}
            {viewingRpq && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Quotation Request Details</h2>
                            <button
                                onClick={() => setViewingRpq(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div>
                                    <span className="text-sm text-gray-600">Control Number:</span>
                                    <p className="font-semibold text-gray-900">{viewingRpq.controlNumber}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Requestor:</span>
                                    <p className="font-semibold text-gray-900">{viewingRpq.requestor}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Date:</span>
                                    <p className="font-semibold text-gray-900">
                                        {viewingRpq.createdAt ? new Date(viewingRpq.createdAt).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <p className="font-semibold text-gray-900">{viewingRpq.status || 'DRAFT'}</p>
                                </div>
                            </div>

                            {/* Supplier Info */}
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Supplier Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">Name:</span>
                                        <p className="font-medium text-gray-900">{viewingRpq.supplierName}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Contact Person:</span>
                                        <p className="font-medium text-gray-900">{viewingRpq.supplierInfo?.contactPerson || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Contact No:</span>
                                        <p className="font-medium text-gray-900">{viewingRpq.supplierInfo?.contactNo || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Email:</span>
                                        <p className="font-medium text-gray-900">{viewingRpq.supplierInfo?.email || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
                                {viewingRpq.items && viewingRpq.items.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-100 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Variation</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {viewingRpq.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.productName}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{item.sku || '-'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{item.variation || '-'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{item.qty} {item.uom}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No products</p>
                                )}
                            </div>

                            {/* Payment Info */}
                            <div className="p-4 bg-amber-50 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Payment Arrangement</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">Initial Payment Amount:</span>
                                        <p className="font-medium text-gray-900">
                                            {formatCurrency(viewingRpq.initialPaymentAmount)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Final Payment Amount:</span>
                                        <p className="font-medium text-gray-900">
                                            {formatCurrency(viewingRpq.finalPaymentAmount)}
                                        </p>
                                    </div>
                                    {viewingRpq.paymentInstruction && (
                                        <div className="col-span-2">
                                            <span className="text-gray-600">Payment Instruction:</span>
                                            <p className="font-medium text-gray-900">{viewingRpq.paymentInstruction}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            {viewingRpq.status !== 'CONFIRMED' && (
                                <div className="pt-4 border-t">
                                    <button
                                        onClick={() => handleConfirmProduct(viewingRpq)}
                                        disabled={buttonLoading['confirm-product']}
                                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                                    >
                                        {buttonLoading['confirm-product'] ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Confirming...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={20} />
                                                Confirm Product
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'po' && (
                <div className="border-t-4 border-gray-300 pt-12 mt-12">
                    <PurchaseOrderManagement />
                </div>
            )}
        </div>
    );
};
export default InventoryRequestManagement;