import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Search, X, Eye, Check,
    Building2, Package, ArrowRight, Loader2, FileText, ShoppingCart, ChevronDown, ChevronRight, Download, Upload
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { getFileUrl, getFileDownloadUrl, getPlaceholderImage } from '../utils/fileUtils';
import PurchaseOrderManagement, { getPaymentCounts } from './UploadPaymentManagement';




const InventoryRequestManagement = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserName = currentUser.fullName || currentUser.name || currentUser.username || 'Unknown User';
    const [buttonLoading, setButtonLoading] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const setButtonLoadingState = (key, value) => {
        setButtonLoading(prev => ({ ...prev, [key]: value }));
    };
    const [paymentCounts, setPaymentCounts] = useState({
        pending: 0,
        partial: 0,
        fullPaid: 0,
        total: 0
    });
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




    const formatNumberWithCommas = (value) => {
        if (!value && value !== 0) return '';
        const stringValue = String(value);
        const numericValue = stringValue.replace(/[^0-9.]/g, '');
        if (!numericValue) return '';

        const parts = numericValue.split('.');
        let wholePart = parts[0];
        const decimalPart = parts.length > 1 ? parts[1] : '';
        wholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return decimalPart ? `${wholePart}.${decimalPart}` : wholePart;
    };

    const parseFormattedNumber = (formattedValue) => {
        if (!formattedValue && formattedValue !== 0) return '';
        const stringValue = String(formattedValue);
        return stringValue.replace(/[^0-9.]/g, '');
    };

    const calculateAmountFromPercent = (percent, total) => {
        const percentage = parseFloat(percent) || 0;
        const totalAmount = parseFloat(total) || 0;
        return (totalAmount * percentage) / 100;
    };


    const formatNumber = (num) => {
        if (!num && num !== 0) return '-';
        return parseInt(num).toLocaleString('en-US');
    };


    const handleCalculatorInput = (currentValue, newInput, isBackspace) => {
        const currentCents = Math.round(parseFloat(currentValue || '0') * 100);
        const currentStr = currentCents.toString().padStart(1, '0');

        let newCents;
        if (isBackspace) {
            newCents = Math.floor(currentCents / 10);
        } else {
            const digit = newInput.replace(/[^0-9]/g, '').slice(-1);
            if (digit) {
                newCents = parseInt(currentStr + digit);
            } else {
                return currentValue;
            }
        }
        return (newCents / 100).toFixed(2);
    };


    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    useEffect(() => {
        loadInitialData();
    }, []);


    useEffect(() => {
        loadPaymentCounts();
        const handleUpdate = () => loadPaymentCounts();
        window.addEventListener('productUpdated', handleUpdate);
        window.addEventListener('paymentUpdated', handleUpdate);

        return () => {
            window.removeEventListener('productUpdated', handleUpdate);
            window.removeEventListener('paymentUpdated', handleUpdate);
        };
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
                                    {req.items[0].productName} - {formatNumber(req.items[0].qty)} {req.items[0].uom}
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
                                                    {item.productName} - {formatNumber(item.qty)} {item.uom}
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



    const recalculatePaymentAmounts = () => {
        const grandTotal = rpqFormData.items.reduce((sum, item) => {
            const unitPrice = parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0;
            const qty = parseInt(item.qty) || 0;
            return sum + (unitPrice * qty);
        }, 0);

        if (rpqFormData.initialPaymentPercent) {
            const initialPercent = parseFloat(rpqFormData.initialPaymentPercent) || 0;
            const finalPercent = initialPercent > 0 ? Math.max(0, 100 - initialPercent) : '';

            setRpqFormData(prev => ({
                ...prev,
                initialPaymentAmount: (grandTotal * initialPercent) / 100,
                finalPaymentPercent: finalPercent === '' ? '' : finalPercent.toString(),
                finalPaymentAmount: finalPercent === '' ? 0 : (grandTotal * finalPercent) / 100
            }));
        }
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


    const loadPaymentCounts = async () => {
        const counts = await getPaymentCounts();
        setPaymentCounts(counts);
    };

    const pendingIrrCount = irrRequests.filter(req => req.status === 'PENDING').length;
    const pendingRpqCount = rpqRequests.filter(req =>
        req.status === 'DRAFT' || req.status === 'PENDING'
    ).length;



    const [uploadedFiles, setUploadedFiles] = useState({
        rpq: null,
        commercialInvoice: null,
        salesContract: null,
        packingList: null
    });
    const [uploadingFiles, setUploadingFiles] = useState({
        rpq: false,
        commercialInvoice: false,
        salesContract: false,
        packingList: false
    });


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
            icon: ShoppingCart,
            count: paymentCounts.total,
            pendingCount: paymentCounts.pending + paymentCounts.partial
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
            const isForwarder = supplier?.type?.toLowerCase() === 'forwarder';
            const endpoint = isForwarder
                ? '/products'
                : `/products/by-supplier/${supplierId}`;

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


    const handleProceedToRpq = async (irrData) => {
        const items = irrFormData.items && irrFormData.items.length > 0 ? irrFormData.items : irrData.items;
        const supplierId = irrFormData.supplierId || irrData.supplierId;

        if (!items || items.length === 0) {
            toast.error('No items found in this inventory request');
            return;
        }

        setButtonLoadingState('proceed-rpq', true);
        setActionLoading(true);

        try {
            const supplier = suppliers.find(s => s.id === supplierId);
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
                    accountNumber: supplier?.accountNumber || '',
                    beneficiaryName: supplier?.beneficiaryName || '',
                    swiftCode: supplier?.swiftCode || '',
                    bankAddress: supplier?.bankAddress || '',
                    bankCountry: supplier?.bankCountry || '',
                    beneficiaryAddress: supplier?.beneficiaryAddress || ''
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
                    unitPrice: item.unitPrice ? parseFloat(parseFormattedNumber(item.unitPrice)) : null,
                    totalAmount: item.unitPrice && item.qty ?
                        parseFloat(parseFormattedNumber(item.unitPrice)) * parseInt(item.qty) : null
                })),
                moq: rpqFormData.moq || '',
                initialPaymentAmount: parseFloat(rpqFormData.initialPaymentAmount) || 0,
                finalPaymentAmount: parseFloat(rpqFormData.finalPaymentAmount) || 0,
                initialPaymentPercent: parseFloat(rpqFormData.initialPaymentPercent) || 0,
                finalPaymentPercent: parseFloat(rpqFormData.finalPaymentPercent) || 0,
                productionLeadTime: rpqFormData.productionLeadTime || '',
                productionDetails: rpqFormData.productionDetails || '',
                paymentInstruction: rpqFormData.paymentInstruction || '',
                status: 'PENDING',
                documents: {
                    rpq: uploadedFiles.rpq?.url || null,
                    commercialInvoice: uploadedFiles.commercialInvoice?.url || null,
                    salesContract: uploadedFiles.salesContract?.url || null,
                    packingList: uploadedFiles.packingList?.url || null
                }
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
        setUploadedFiles({
            rpq: null,
            commercialInvoice: null,
            salesContract: null,
            packingList: null
        });
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



    const handleDocumentUpload = async (file, documentType) => {
        if (!file) return;

        setUploadingFiles(prev => ({ ...prev, [documentType]: true }));

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', `rpq_${documentType}`);

            let uploadEndpoint = '/upload/image';
            if (file.type === 'application/pdf') {
                uploadEndpoint = '/upload/document';
            } else if (file.type.includes('word') || file.type.includes('msword')) {
                uploadEndpoint = '/upload/document';
            } else if (file.type.startsWith('image/')) {
                uploadEndpoint = '/upload/image';
            }

            const uploadResponse = await api.upload(uploadEndpoint, formData);

            if (uploadResponse.success) {
                let fileUrl;
                if (uploadResponse.data?.data?.url) {
                    fileUrl = uploadResponse.data.data.url;
                } else if (uploadResponse.data?.url) {
                    fileUrl = uploadResponse.data.url;
                } else {
                    throw new Error('File uploaded but URL not found in response');
                }

                // Update in state first
                setUploadedFiles(prev => ({
                    ...prev,
                    [documentType]: {
                        url: fileUrl,
                        name: file.name,
                        type: file.type
                    }
                }));

                // If viewing/editing RPQ, update the database immediately
                if (editingRpq || viewingRpq) {
                    const rpqId = editingRpq?.id || viewingRpq?.id;
                    const currentRpq = editingRpq || viewingRpq;

                    const updatePayload = {
                        ...currentRpq,
                        documents: {
                            ...(currentRpq.documents || {}),
                            [documentType]: fileUrl
                        }
                    };

                    const response = await api.put(`/quotation-requests/${rpqId}`, updatePayload);

                    if (response.success) {
                        toast.success(`${getDocumentLabel(documentType)} uploaded and saved successfully`);
                    } else {
                        throw new Error('Failed to save document to database');
                    }
                } else {
                    toast.success(`${getDocumentLabel(documentType)} uploaded successfully`);
                }
            } else {
                throw new Error(uploadResponse.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload ${getDocumentLabel(documentType)}: ${error.message}`);
        } finally {
            setUploadingFiles(prev => ({ ...prev, [documentType]: false }));
        }
    };

    const getDocumentLabel = (type) => {
        const labels = {
            rpq: 'RPQ',
            commercialInvoice: 'Commercial Invoice',
            salesContract: 'Sales Contract',
            packingList: 'Packing List'
        };
        return labels[type] || type;
    };

    const handleRemoveDocument = (documentType) => {
        setUploadedFiles(prev => ({
            ...prev,
            [documentType]: null
        }));
        toast.success(`${getDocumentLabel(documentType)} removed`);
    };


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
                                                                    {req.items[0].productName} - {formatNumber(req.items[0].qty)} {req.items[0].uom}
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
                                                                                    {item.productName} - {formatNumber(item.qty)} {item.uom}
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
                                                                        uom: item.uom || 'PCS',
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
                                                                if (req.documents) {
                                                                    setUploadedFiles({
                                                                        rpq: req.documents.rpq ? { url: req.documents.rpq, name: 'RPQ Document' } : null,
                                                                        commercialInvoice: req.documents.commercialInvoice ? { url: req.documents.commercialInvoice, name: 'Commercial Invoice' } : null,
                                                                        salesContract: req.documents.salesContract ? { url: req.documents.salesContract, name: 'Sales Contract' } : null,
                                                                        packingList: req.documents.packingList ? { url: req.documents.packingList, name: 'Packing List' } : null
                                                                    });
                                                                }

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
                                                        <td className="px-4 py-2 text-sm">{item.qty ? parseInt(item.qty).toLocaleString('en-US') : '-'} PCS</td>
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
                    <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
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
    .title { font-size: 14pt; font-weight: bold; text-align: center; margin: 10px 0; }
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
    .min-h-\[20px\] { min-height: 20px; }
    .border-b { border-bottom: 1px solid #000; }
    .pb-1 { padding-bottom: 4px; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 12px; }
    .text-\[9px\] { font-size: 9px !important; }
    td .text-\[9px\] { font-size: 9px !important; }
    .mt-0\.5 { margin-top: 2px; }
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
                                                    <th className="px-3 py-2 text-left text-xs font-bold border border-gray-300">Unit Price/USD</th>
                                                    <th className="px-3 py-2f text-left text-xs font-bold border border-gray-300">Total/USD</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rpqFormData.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <div className="text-xs font-medium text-gray-900">{item.productName}</div>
                                                            <div className="text-[11px] text-gray-500 mt-0.5">SKU: {item.sku || '-'}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-xs border border-gray-300">{item.variation || '-'}</td>
                                                        <td className="px-3 py-2 text-xs border border-gray-300">{item.upc || '-'}</td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="text"
                                                                value="PCS"
                                                                readOnly
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs bg-gray-100 cursor-not-allowed no-print text-center"
                                                            />
                                                            <span className="hidden print:inline text-xs">PCS</span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="text"
                                                                value={item.qty ? parseInt(item.qty).toLocaleString('en-US') : ''}
                                                                onChange={(e) => {
                                                                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                                                    const newItems = [...rpqFormData.items];
                                                                    const qty = parseInt(numericValue) || 0;
                                                                    const unitPrice = parseFloat(newItems[idx].unitPrice) || 0;
                                                                    newItems[idx] = {
                                                                        ...newItems[idx],
                                                                        qty: numericValue,
                                                                        totalAmount: unitPrice * qty
                                                                    };
                                                                    setRpqFormData({ ...rpqFormData, items: newItems });
                                                                }}
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs no-print text-right"
                                                                placeholder="0"
                                                            />
                                                            <span className="hidden print:inline text-xs">{item.qty ? parseInt(item.qty).toLocaleString('en-US') : ''}</span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <input
                                                                type="text"
                                                                value={formatNumberWithCommas(item.unitPrice || '0.00')}
                                                                onChange={(e) => {
                                                                    // This is handled by onKeyDown
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    e.preventDefault(); // Prevent default input behavior

                                                                    const newItems = [...rpqFormData.items];
                                                                    let newValue;

                                                                    if (e.key === 'Backspace' || e.key === 'Delete') {
                                                                        // Handle backspace/delete
                                                                        newValue = handleCalculatorInput(item.unitPrice || '0.00', '', true);
                                                                    } else if (e.key >= '0' && e.key <= '9') {
                                                                        // Handle number input
                                                                        newValue = handleCalculatorInput(item.unitPrice || '0.00', e.key, false);
                                                                    } else if (e.key === 'Tab' || e.key === 'Enter') {
                                                                        // Allow tab and enter
                                                                        e.preventDefault();
                                                                        return;
                                                                    } else {
                                                                        // Ignore other keys
                                                                        return;
                                                                    }

                                                                    const unitPrice = parseFloat(newValue);
                                                                    const qty = parseInt(newItems[idx].qty) || 0;

                                                                    newItems[idx] = {
                                                                        ...newItems[idx],
                                                                        unitPrice: newValue,
                                                                        totalAmount: unitPrice * qty
                                                                    };

                                                                    setRpqFormData({ ...rpqFormData, items: newItems });
                                                                    recalculatePaymentAmounts();
                                                                }}
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs no-print text-right"
                                                                placeholder="0.00"
                                                            />
                                                            <span className="hidden print:inline text-xs">
                                                                {item.unitPrice && parseFloat(item.unitPrice) > 0 ? `$${formatNumberWithCommas(parseFloat(item.unitPrice).toFixed(2))}` : ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-gray-300">
                                                            <div className="px-2 py-1 bg-gray-50 text-xs font-medium text-gray-900 no-print text-right">
                                                                {(() => {
                                                                    const total = (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0);
                                                                    return total > 0 ? `$${formatNumberWithCommas(total.toFixed(2))}` : '';
                                                                })()}
                                                            </div>

                                                            <span className="hidden print:inline text-xs font-medium">
                                                                {(() => {
                                                                    const total = (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0);
                                                                    return total > 0 ? `$${formatNumberWithCommas(total.toFixed(2))}` : '';
                                                                })()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50">
                                                <tr>
                                                    <td colSpan="6" className="px-3 py-2 text-right font-bold text-sm border border-gray-300">GRAND TOTAL:</td>
                                                    <td className="px-3 py-2 font-bold text-sm border border-gray-300 text-right">
                                                        ${formatNumberWithCommas(rpqFormData.items.reduce((sum, item) =>
                                                            sum + ((parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0) * (parseInt(item.qty) || 0)), 0
                                                        ).toFixed(2))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Payment Arrangement</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mt-2">
                                            <label className="text-xs font-semibold label whitespace-nowrap">Initial Payment (%):</label>
                                            <input
                                                type="number"
                                                value={rpqFormData.initialPaymentPercent || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow only numbers 0-100 with max 2 decimal places
                                                    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                                                        const initialPercent = parseFloat(value) || 0;
                                                        const finalPercent = initialPercent > 0 ? Math.max(0, 100 - initialPercent) : '';

                                                        const grandTotal = rpqFormData.items.reduce((sum, item) => {
                                                            const unitPrice = parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0;
                                                            const qty = parseInt(item.qty) || 0;
                                                            return sum + (unitPrice * qty);
                                                        }, 0);

                                                        setRpqFormData({
                                                            ...rpqFormData,
                                                            initialPaymentPercent: value,
                                                            initialPaymentAmount: (grandTotal * initialPercent) / 100,
                                                            finalPaymentPercent: finalPercent === '' ? '' : finalPercent.toString(),
                                                            finalPaymentAmount: finalPercent === '' ? 0 : (grandTotal * finalPercent) / 100
                                                        });
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value && parseFloat(e.target.value) > 100) {
                                                        const grandTotal = rpqFormData.items.reduce((sum, item) => {
                                                            const unitPrice = parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0;
                                                            const qty = parseInt(item.qty) || 0;
                                                            return sum + (unitPrice * qty);
                                                        }, 0);
                                                        setRpqFormData(prev => ({
                                                            ...prev,
                                                            initialPaymentPercent: '100',
                                                            initialPaymentAmount: calculateAmountFromPercent('100', grandTotal),
                                                            finalPaymentPercent: '0',
                                                            finalPaymentAmount: 0
                                                        }));
                                                    }
                                                }}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print text-right"
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-medium no-print">% = $</span>
                                            <input
                                                type="text"
                                                value={formatNumberWithCommas(
                                                    rpqFormData.initialPaymentAmount
                                                        ? Number(rpqFormData.initialPaymentAmount).toFixed(2)
                                                        : '0.00'
                                                )}
                                                readOnly
                                                className="w-32 px-2 py-1 bg-gray-100 border-b-2 border-gray-400 text-xs font-medium no-print text-right"
                                            />
                                            <span className="hidden print:inline text-xs whitespace-nowrap">
                                                <span className="inline-block min-w-[100px] text-center border-b border-black pb-1 px-2">
                                                    {rpqFormData.initialPaymentPercent ? `${rpqFormData.initialPaymentPercent}%` : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                                                </span>
                                                <span> = $ </span>
                                                <span className="inline-block min-w-[180px] text-right border-b border-black pb-1 px-2">
                                                    {rpqFormData.initialPaymentAmount && rpqFormData.initialPaymentAmount > 0
                                                        ? formatNumberWithCommas(rpqFormData.initialPaymentAmount.toFixed(2))
                                                        : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3">
                                            <label className="text-xs font-semibold label whitespace-nowrap">Final Payment (%):</label>
                                            <input
                                                type="text"
                                                value={rpqFormData.finalPaymentPercent || ''}
                                                readOnly
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print bg-gray-100 cursor-not-allowed text-right"
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-medium no-print">% = $</span>
                                            <input
                                                type="text"
                                                value={formatNumberWithCommas(
                                                    rpqFormData.finalPaymentAmount
                                                        ? Number(rpqFormData.finalPaymentAmount).toFixed(2)
                                                        : '0.00'
                                                )}
                                                readOnly
                                                className="w-32 px-2 py-1 bg-gray-100 border-b-2 border-gray-400 text-xs font-medium no-print text-right"
                                            />
                                            <span className="hidden print:inline text-xs whitespace-nowrap">
                                                <span className="inline-block min-w-[100px] text-center border-b border-black pb-1 px-2">
                                                    {rpqFormData.finalPaymentPercent ? `${rpqFormData.finalPaymentPercent}%` : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                                                </span>
                                                <span> = $ </span>
                                                <span className="inline-block min-w-[180px] text-right border-b border-black pb-1 px-2">
                                                    {rpqFormData.finalPaymentAmount && rpqFormData.finalPaymentAmount > 0
                                                        ? formatNumberWithCommas(rpqFormData.finalPaymentAmount.toFixed(2))
                                                        : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                                    <h3 className="font-bold text-gray-900 mb-2 section-title">Payment Method</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm grid-2">
                                        <div className="info-row">
                                            <span className="font-semibold label">Mode of Payment: </span>
                                            <span>{rpqFormData.supplierInfo?.modeOfPayment || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Bank Name: </span>
                                            <span>{rpqFormData.supplierInfo?.bankName || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Account Number: </span>
                                            <span>{rpqFormData.supplierInfo?.accountNumber || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Account Name: </span>
                                            <span>{rpqFormData.supplierInfo?.beneficiaryName || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Swift Code: </span>
                                            <span>{rpqFormData.supplierInfo?.swiftCode || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Bank Address: </span>
                                            <span>{rpqFormData.supplierInfo?.bankAddress || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Bank Country: </span>
                                            <span>{rpqFormData.supplierInfo?.bankCountry || '-'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="font-semibold label">Beneficiary Address: </span>
                                            <span>{rpqFormData.supplierInfo?.beneficiaryAddress || '-'}</span>
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
                                            <span className="text-xs no-print">days</span>
                                            <span className="hidden print:inline text-xs">
                                                <span className="inline-block min-w-[120px] text-center border-b border-black pb-1 px-2">
                                                    {rpqFormData.productionLeadTime || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                                                </span>
                                                {' '}days
                                            </span>
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

                            {/* Document Uploads Section - ONLY show on screen, NOT in print */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg section no-print">
                                <h3 className="font-bold text-gray-900 mb-2 section-title flex items-center gap-2">
                                    <Upload size={18} />
                                    Required Documents
                                </h3>
                                <div className="space-y-3">
                                    {/* Upload RPQ */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload RPQ:</label>
                                        {!uploadedFiles.rpq ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) handleDocumentUpload(file, 'rpq');
                                                    }}
                                                    disabled={uploadingFiles.rpq}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                    id="upload-rpq"
                                                />
                                                {uploadingFiles.rpq && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">{uploadedFiles.rpq.name}</span>
                                                <a
                                                    href={getFileUrl(uploadedFiles.rpq.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(uploadedFiles.rpq.url)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleRemoveDocument('rpq')}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Commercial Invoice */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Commercial Invoice:</label>
                                        {!uploadedFiles.commercialInvoice ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) handleDocumentUpload(file, 'commercialInvoice');
                                                    }}
                                                    disabled={uploadingFiles.commercialInvoice}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                    id="upload-commercial-invoice"
                                                />
                                                {uploadingFiles.commercialInvoice && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">{uploadedFiles.commercialInvoice.name}</span>
                                                <a
                                                    href={getFileUrl(uploadedFiles.commercialInvoice.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(uploadedFiles.commercialInvoice.url)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleRemoveDocument('commercialInvoice')}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Sales Contract */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Sales Contract:</label>
                                        {!uploadedFiles.salesContract ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) handleDocumentUpload(file, 'salesContract');
                                                    }}
                                                    disabled={uploadingFiles.salesContract}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                    id="upload-sales-contract"
                                                />
                                                {uploadingFiles.salesContract && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">{uploadedFiles.salesContract.name}</span>
                                                <a
                                                    href={getFileUrl(uploadedFiles.salesContract.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(uploadedFiles.salesContract.url)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleRemoveDocument('salesContract')}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Packing List */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Packing List:</label>
                                        {!uploadedFiles.packingList ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) handleDocumentUpload(file, 'packingList');
                                                    }}
                                                    disabled={uploadingFiles.packingList}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                    id="upload-packing-list"
                                                />
                                                {uploadingFiles.packingList && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">{uploadedFiles.packingList.name}</span>
                                                <a
                                                    href={getFileUrl(uploadedFiles.packingList.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(uploadedFiles.packingList.url)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>

                                                <button
                                                    onClick={() => handleRemoveDocument('packingList')}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                    <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Quotation Request Details</h2>
                            <button
                                onClick={() => setViewingRpq(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Header with Control Number */}
                            <div className="mb-5 pb-4 flex justify-between items-start">
                                <div className="text-left leading-none space-y-0">
                                    <div className="text-[34px] font-bold text-gray-900 font-serif tracking-tight">
                                        WISECART MERCHANTS CORP.
                                    </div>
                                    <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
                                        <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                                        <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                                        <div>VAT REG. TIN 010-751-561-00000</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">Control #: {viewingRpq.controlNumber}</div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">REQUEST FOR PRODUCT QUOTATION</h2>
                            </div>

                            {/* Date */}
                            <div className="mb-4 flex justify-end">
                                <span className="font-medium">Date: </span>
                                <span>{viewingRpq.createdAt ? new Date(viewingRpq.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                            </div>

                            {/* Supplier Details */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2">Supplier Details</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="info-row">
                                        <span className="font-semibold">Supplier Name: </span>
                                        <span>{viewingRpq.supplierName}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Contact Person: </span>
                                        <span>{viewingRpq.supplierInfo?.contactPerson || '-'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Contact Number: </span>
                                        <span>{viewingRpq.supplierInfo?.contactNo || '-'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Email: </span>
                                        <span>{viewingRpq.supplierInfo?.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            {viewingRpq.items && viewingRpq.items.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-900 mb-2">Products</h3>
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
                                            {viewingRpq.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 border border-gray-300">
                                                        <div className="text-xs font-medium text-gray-900">{item.productName}</div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5">SKU: {item.sku || '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">{item.variation || '-'}</td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">{item.upc || '-'}</td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">{item.uom || 'PCS'}</td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">
                                                        {item.qty ? parseInt(item.qty).toLocaleString('en-US') : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">
                                                        {item.unitPrice && parseFloat(item.unitPrice) > 0 ? `$${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-medium border border-gray-300">
                                                        {(() => {
                                                            const total = (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0);
                                                            return total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan="6" className="px-3 py-2 text-right font-bold text-sm border border-gray-300">GRAND TOTAL:</td>
                                                <td className="px-3 py-2 font-bold text-sm border border-gray-300 text-right">
                                                    ${formatNumberWithCommas(viewingRpq.items.reduce((sum, item) =>
                                                        sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0
                                                    ).toFixed(2))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {/* Payment Arrangement */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2">Payment Arrangement</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold whitespace-nowrap">Initial Payment (%):</label>
                                        <span className="text-xs">
                                            {viewingRpq.initialPaymentPercent ? `${viewingRpq.initialPaymentPercent}%` : '-'} = {formatCurrency(viewingRpq.initialPaymentAmount || 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold whitespace-nowrap">Final Payment (%):</label>
                                        <span className="text-xs">
                                            {viewingRpq.finalPaymentPercent ? `${viewingRpq.finalPaymentPercent}%` : '-'} = {formatCurrency(viewingRpq.finalPaymentAmount || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2">Payment Method</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="info-row">
                                        <span className="font-semibold">Mode of Payment: </span>
                                        <span>{viewingRpq.supplierInfo?.modeOfPayment || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Bank Name: </span>
                                        <span>{viewingRpq.supplierInfo?.bankName || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Account Number: </span>
                                        <span>{viewingRpq.supplierInfo?.accountNumber || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Account Name: </span>
                                        <span>{viewingRpq.supplierInfo?.beneficiaryName || viewingRpq.supplierInfo?.accountName || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Swift Code: </span>
                                        <span>{viewingRpq.supplierInfo?.swiftCode || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Bank Address: </span>
                                        <span>{viewingRpq.supplierInfo?.bankAddress || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Bank Country: </span>
                                        <span>{viewingRpq.supplierInfo?.bankCountry || 'N/A'}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="font-semibold">Beneficiary Address: </span>
                                        <span>{viewingRpq.supplierInfo?.beneficiaryAddress || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Production Details */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2">Production Details</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-semibold whitespace-nowrap">Production Lead Time:</label>
                                        <span className="text-xs">{viewingRpq.productionLeadTime || '-'} days</span>
                                    </div>
                                    {viewingRpq.productionDetails && (
                                        <div>
                                            <label className="block text-xs font-semibold mb-1">Remarks:</label>
                                            <div className="text-xs whitespace-pre-wrap">{viewingRpq.productionDetails}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Required Documents - Can Upload */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Upload size={18} />
                                    Required Documents
                                </h3>
                                <div className="space-y-3">
                                    {/* RPQ Document */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload RPQ:</label>
                                        {!viewingRpq.documents?.rpq ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            await handleDocumentUpload(file, 'rpq');
                                                            // Update viewingRpq with new document
                                                            const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                            if (updatedRpq.success) {
                                                                setViewingRpq(updatedRpq.data);
                                                                await loadRpqRequests();
                                                            }
                                                        }
                                                    }}
                                                    disabled={uploadingFiles.rpq}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                />
                                                {uploadingFiles.rpq && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">RPQ Document</span>
                                                <a
                                                    href={getFileUrl(viewingRpq.documents.rpq)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(viewingRpq.documents.rpq)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Remove this document?')) {
                                                            try {
                                                                const response = await api.put(`/quotation-requests/${viewingRpq.id}`, {
                                                                    ...viewingRpq,
                                                                    documents: {
                                                                        ...viewingRpq.documents,
                                                                        rpq: null
                                                                    }
                                                                });
                                                                if (response.success) {
                                                                    toast.success('Document removed');
                                                                    const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                                    if (updatedRpq.success) {
                                                                        setViewingRpq(updatedRpq.data);
                                                                        await loadRpqRequests();
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to remove document');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Commercial Invoice */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Commercial Invoice:</label>
                                        {!viewingRpq.documents?.commercialInvoice ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            await handleDocumentUpload(file, 'commercialInvoice');
                                                            const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                            if (updatedRpq.success) {
                                                                setViewingRpq(updatedRpq.data);
                                                                await loadRpqRequests();
                                                            }
                                                        }
                                                    }}
                                                    disabled={uploadingFiles.commercialInvoice}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                />
                                                {uploadingFiles.commercialInvoice && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">Commercial Invoice</span>
                                                <a
                                                    href={getFileUrl(viewingRpq.documents.commercialInvoice)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(viewingRpq.documents.commercialInvoice)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Remove this document?')) {
                                                            try {
                                                                const response = await api.put(`/quotation-requests/${viewingRpq.id}`, {
                                                                    ...viewingRpq,
                                                                    documents: {
                                                                        ...viewingRpq.documents,
                                                                        commercialInvoice: null
                                                                    }
                                                                });
                                                                if (response.success) {
                                                                    toast.success('Document removed');
                                                                    const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                                    if (updatedRpq.success) {
                                                                        setViewingRpq(updatedRpq.data);
                                                                        await loadRpqRequests();
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to remove document');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sales Contract */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Sales Contract:</label>
                                        {!viewingRpq.documents?.salesContract ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            await handleDocumentUpload(file, 'salesContract');
                                                            const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                            if (updatedRpq.success) {
                                                                setViewingRpq(updatedRpq.data);
                                                                await loadRpqRequests();
                                                            }
                                                        }
                                                    }}
                                                    disabled={uploadingFiles.salesContract}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                />
                                                {uploadingFiles.salesContract && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">Sales Contract</span>
                                                <a
                                                    href={getFileUrl(viewingRpq.documents.salesContract)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(viewingRpq.documents.salesContract)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Remove this document?')) {
                                                            try {
                                                                const response = await api.put(`/quotation-requests/${viewingRpq.id}`, {
                                                                    ...viewingRpq,
                                                                    documents: {
                                                                        ...viewingRpq.documents,
                                                                        salesContract: null
                                                                    }
                                                                });
                                                                if (response.success) {
                                                                    toast.success('Document removed');
                                                                    const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                                    if (updatedRpq.success) {
                                                                        setViewingRpq(updatedRpq.data);
                                                                        await loadRpqRequests();
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to remove document');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Packing List */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-gray-700 w-48">Upload Packing List:</label>
                                        {!viewingRpq.documents?.packingList ? (
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            await handleDocumentUpload(file, 'packingList');
                                                            const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                            if (updatedRpq.success) {
                                                                setViewingRpq(updatedRpq.data);
                                                                await loadRpqRequests();
                                                            }
                                                        }
                                                    }}
                                                    disabled={uploadingFiles.packingList}
                                                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                                />
                                                {uploadingFiles.packingList && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        <Loader2 size={14} className="inline animate-spin mr-1" />
                                                        Uploading...
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                                <FileText size={16} className="text-green-600" />
                                                <span className="text-sm text-gray-700 flex-1">Packing List</span>
                                                <a
                                                    href={getFileUrl(viewingRpq.documents.packingList)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <a
                                                    href={getFileDownloadUrl(viewingRpq.documents.packingList)}
                                                    download
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Remove this document?')) {
                                                            try {
                                                                const response = await api.put(`/quotation-requests/${viewingRpq.id}`, {
                                                                    ...viewingRpq,
                                                                    documents: {
                                                                        ...viewingRpq.documents,
                                                                        packingList: null
                                                                    }
                                                                });
                                                                if (response.success) {
                                                                    toast.success('Document removed');
                                                                    const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                                                                    if (updatedRpq.success) {
                                                                        setViewingRpq(updatedRpq.data);
                                                                        await loadRpqRequests();
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to remove document');
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div >
                                        )}
                                    </div >
                                </div >
                            </div >

                            {/* Requestor */}
                            < div className="mb-4" >
                                <div className="text-xs">
                                    <span className="font-semibold">Requestor: </span>
                                    <span>{viewingRpq.requestor}</span>
                                </div>
                                <div className="text-xs mt-1">
                                    <span className="font-semibold">Status: </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewingRpq.status === 'CONFIRMED'
                                        ? 'bg-green-100 text-green-800'
                                        : viewingRpq.status === 'PENDING'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {viewingRpq.status || 'DRAFT'}
                                    </span>
                                </div>
                            </div >

                            {
                                viewingRpq.status !== 'CONFIRMED' && (
                                    <div className="pt-4 border-t">
                                        {(() => {
                                            // Check if all required fields are filled (REMOVED document check)
                                            const hasAllProducts = viewingRpq.items && viewingRpq.items.length > 0;
                                            const allProductsHavePrices = viewingRpq.items?.every(item =>
                                                item.unitPrice && parseFloat(item.unitPrice) > 0
                                            );
                                            const hasPaymentArrangement =
                                                viewingRpq.initialPaymentPercent > 0 &&
                                                viewingRpq.finalPaymentPercent > 0;
                                            const hasProductionLeadTime = viewingRpq.productionLeadTime && viewingRpq.productionLeadTime !== '';

                                            const isComplete =
                                                hasAllProducts &&
                                                allProductsHavePrices &&
                                                hasPaymentArrangement &&
                                                hasProductionLeadTime;

                                            const missingFields = [];
                                            if (!allProductsHavePrices) missingFields.push('Unit prices for all products');
                                            if (!hasPaymentArrangement) missingFields.push('Payment arrangement (Initial & Final payment)');
                                            if (!hasProductionLeadTime) missingFields.push('Production lead time');

                                            return (
                                                <>
                                                    {!isComplete && missingFields.length > 0 && (
                                                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <div className="text-yellow-600 mt-0.5">⚠️</div>
                                                                <div>
                                                                    <h4 className="font-semibold text-yellow-800 mb-2">Cannot Confirm - Missing Required Fields:</h4>
                                                                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                                                        {missingFields.map((field, idx) => (
                                                                            <li key={idx}>{field}</li>
                                                                        ))}
                                                                    </ul>
                                                                    <p className="text-xs text-yellow-600 mt-2">
                                                                        Please click Edit to complete all required fields before confirming.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleConfirmProduct(viewingRpq)}
                                                        disabled={!isComplete || buttonLoading['confirm-product']}
                                                        className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isComplete
                                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            } disabled:opacity-50`}
                                                        title={!isComplete ? 'Complete all required fields to confirm' : 'Confirm this quotation'}
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
                                                </>
                                            );
                                        })()}
                                    </div>
                                )
                            }

                        </div >
                    </div >
                </div >
            )}

            {
                activeTab === 'po' && (
                    <div className="border-t-4 border-gray-300 pt-12 mt-12">
                        <PurchaseOrderManagement />
                    </div>
                )
            }
        </div >
    );
};

export default InventoryRequestManagement;