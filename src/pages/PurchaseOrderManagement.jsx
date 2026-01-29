import React, { useState, useEffect } from 'react';
import {
    Eye, Edit2, Search, X, Upload, Download,
    FileText, Loader2, CreditCard, Package, Calendar, User, Mail, ChevronDown, ChevronRight, Building2, Phone
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { getFileUrl, getPlaceholderImage, getFileDownloadUrl } from '../utils/fileUtils';

const PurchaseOrderManagement = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [paymentOrders, setPaymentOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchPO, setSearchPO] = useState('');
    const [searchPayment, setSearchPayment] = useState('');
    const [activeTab, setActiveTab] = useState('purchase-orders');
    const [viewingPO, setViewingPO] = useState(null);
    const [editingPO, setEditingPO] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPOForPayment, setSelectedPOForPayment] = useState(null);
    const [viewingPayments, setViewingPayments] = useState(null);
    const [isLoadingOverlay, setIsLoadingOverlay] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState(null);
    const [expandedPORows, setExpandedPORows] = useState({});
    const [poFormData, setPoFormData] = useState({
        date: '',
        items: []
    });

    const [paymentFormData, setPaymentFormData] = useState({
        modeOfPayment: '',
        paymentDetails: '',
        productAmount: '',
        processingFee: '0',
        dollarAmount: '0',
        pesoAmount: '0'
    });

    useEffect(() => {
        loadInitialData();
        return () => {
            if (selectedFilePreview) {
                URL.revokeObjectURL(selectedFilePreview);
            }
        };
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            await loadPurchaseOrders();
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };



    const togglePORow = (poId) => {
        setExpandedPORows(prev => ({
            ...prev,
            [poId]: !prev[poId]
        }));
    };




    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (selectedFilePreview) {
            URL.revokeObjectURL(selectedFilePreview);
        }

        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload an image, PDF, Word, or Excel file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            setSelectedFilePreview(previewUrl);
        } else {
            setSelectedFilePreview(null);
        }

        toast.success('File selected. Click "Update Purchase Order" to save.');
    };

    const uploadFileWithPOPrefix = async (file, poId) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', 'purchase_order');

            let uploadEndpoint = '/upload/image';
            if (file.type === 'application/pdf') {
                uploadEndpoint = '/upload/document';
            } else if (file.type.includes('word') || file.type.includes('excel') || file.type.includes('sheet')) {
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

                if (!fileUrl) {
                    throw new Error('File URL is missing');
                }

                const saveResponse = await api.post(`/purchase-orders/${poId}/upload`, {
                    fileUrl: fileUrl
                });

                if (!saveResponse.success) {
                    throw new Error('Failed to save file URL to purchase order');
                }

                return fileUrl;
            } else {
                throw new Error(uploadResponse.error || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            throw error;
        }
    };

    const loadPurchaseOrders = async () => {
        try {
            const response = await api.get('/purchase-orders');
            if (response.success && response.data) {
                const actualData = response.data.data || response.data;
                const orders = Array.isArray(actualData) ? actualData : [];
                setPurchaseOrders(orders);

                const submitted = orders.filter(po =>
                    po.paymentStatus === 'PAYMENT_PENDING' ||
                    po.paymentStatus === 'PARTIAL_PAID' ||
                    po.paymentStatus === 'FULL_PAID'
                );
                setPaymentOrders(submitted);
            } else {
                setPurchaseOrders([]);
                setPaymentOrders([]);
            }
        } catch (error) {
            console.error('Purchase orders error:', error);
            toast.error('Failed to load purchase orders');
            setPurchaseOrders([]);
            setPaymentOrders([]);
        }
    };

    const pendingPOCount = purchaseOrders.filter(po =>
        po.paymentStatus === 'PAYMENT_PENDING'
    ).length;

    const fullyPaidCount = paymentOrders.filter(po =>
        po.paymentStatus === 'FULL_PAID'
    ).length;

    const getPaymentModeLabel = (mode, supplierInfo) => {
        if (mode === 'TELEGRAPHIC_TRANSFER') {
            const bankName = supplierInfo?.bankName || '';
            const accountNumber = supplierInfo?.accountNumber || '';
            if (bankName && accountNumber) {
                return `Telegraphic Transfer - ${bankName} (${accountNumber})`;
            }
            return 'Telegraphic Transfer';
        } else if (mode === 'OTHER') {
            const otherDetails = supplierInfo?.otherPaymentDetails || '';
            if (otherDetails) {
                return `Other - ${otherDetails.length > 50 ? otherDetails.substring(0, 50) + '...' : otherDetails}`;
            }
            return 'Other';
        }
        return mode;
    };

    const handleEditPO = async (e) => {
        e.preventDefault();

        if (!editingPO) {
            toast.error('No purchase order selected for editing');
            return;
        }

        setActionLoading(true);

        try {
            let uploadedFileUrl = editingPO.uploadedFileUrl || null;

            if (selectedFile) {
                setLoadingMessage('Uploading file...');
                setIsLoadingOverlay(true);

                try {
                    uploadedFileUrl = await uploadFileWithPOPrefix(selectedFile, editingPO.id);
                    toast.success('File uploaded successfully');
                } catch (uploadError) {
                    toast.error('Failed to upload file: ' + uploadError.message);
                    setIsLoadingOverlay(false);
                    setActionLoading(false);
                    return;
                }
            }

            setLoadingMessage('Updating purchase order...');

            const payload = {
                date: poFormData.date || null,
                uploadedFileUrl: uploadedFileUrl,
                items: poFormData.items.map(item => ({
                    id: item.id,
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    totalAmount: parseFloat(item.totalAmount) || 0
                }))
            };

            const response = await api.put(`/purchase-orders/${editingPO.id}`, payload);

            if (response.success) {
                toast.success('Purchase order updated successfully');
                setSelectedFile(null);
                setSelectedFilePreview(null);
                setEditingPO(null);
                await loadPurchaseOrders();
                window.dispatchEvent(new Event('productUpdated'));
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update purchase order');
        } finally {
            setIsLoadingOverlay(false);
            setActionLoading(false);
        }
    };

    const handleSubmitOrder = async (po) => {
        // Check if all items have unit price and total amount
        const hasAllPrices = po.items && po.items.length > 0 &&
            po.items.every(item => item.unitPrice && item.unitPrice > 0 && item.totalAmount && item.totalAmount > 0);

        if (!hasAllPrices) {
            toast.error('Please set unit price and total amount for all items before submitting');
            return;
        }

        setLoadingMessage('Submitting purchase order...');
        setIsLoadingOverlay(true);
        setActionLoading(true);
        try {
            const response = await api.post(`/purchase-orders/${po.id}/submit`, {});
            if (response.success) {
                toast.success('Purchase order submitted successfully');
                await loadInitialData();
            }
        } catch (error) {
            toast.error('Failed to submit purchase order');
        } finally {
            setIsLoadingOverlay(false);
            setActionLoading(false);
        }
    };

    const canPayNow = (po) => {
        return po.items && po.items.length > 0 &&
            po.items.every(item => item.unitPrice && item.unitPrice > 0 && item.totalAmount && item.totalAmount > 0) &&
            po.paymentStatus !== 'FULL_PAID';
    };

    const handlePayNow = async (po) => {
        setLoadingMessage('Preparing payment form...');
        setIsLoadingOverlay(true);
        try {
            setSelectedPOForPayment(po);
            setPaymentFormData({
                modeOfPayment: po.modeOfPayment || '',
                paymentDetails: '',
                productAmount: '',
                processingFee: '0',
                dollarAmount: '0',
                pesoAmount: '0'
            });
            setShowPaymentModal(true);
        } finally {
            setIsLoadingOverlay(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoadingMessage('Recording payment...');
        setIsLoadingOverlay(true);
        setActionLoading(true);
        try {
            const payload = {
                purchaseOrderId: selectedPOForPayment.id,
                modeOfPayment: paymentFormData.modeOfPayment,
                paymentDetails: paymentFormData.paymentDetails,
                productAmount: parseFloat(paymentFormData.productAmount),
                processingFee: parseFloat(paymentFormData.processingFee || 0),
                dollarAmount: parseFloat(paymentFormData.dollarAmount || 0),
                pesoAmount: parseFloat(paymentFormData.pesoAmount || 0)
            };

            const response = await api.post('/payments', payload);
            if (response.success) {
                toast.success('Payment recorded successfully');
                setShowPaymentModal(false);
                await loadInitialData();
            }
        } catch (error) {
            toast.error('Failed to record payment');
        } finally {
            setIsLoadingOverlay(false);
            setActionLoading(false);
        }
    };

    const handleViewPayments = async (po) => {
        try {
            setLoadingMessage('Loading payment history...');
            setIsLoadingOverlay(true);

            const response = await api.get(`/payments/purchase-order/${po.id}`);

            if (response.success) {
                const paymentsData = response.data || [];
                const paymentsArray = Array.isArray(paymentsData) ? paymentsData :
                    paymentsData.data ? paymentsData.data :
                        paymentsData.payments ? paymentsData.payments : [];

                setViewingPayments({
                    po: po,
                    payments: paymentsArray
                });
            } else {
                toast.error('Failed to load payments');
                setViewingPayments({
                    po: po,
                    payments: []
                });
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            toast.error('Failed to load payments');
            setViewingPayments({
                po: po,
                payments: []
            });
        } finally {
            setIsLoadingOverlay(false);
        }
    };

    const calculateTotalPayment = () => {
        const productAmount = parseFloat(paymentFormData.productAmount) || 0;
        const processingFee = parseFloat(paymentFormData.processingFee) || 0;
        return productAmount + processingFee;
    };

    const calculatePercentage = () => {
        if (!selectedPOForPayment || !selectedPOForPayment.totalAmount) return 0;
        const total = calculateTotalPayment();
        return ((total / selectedPOForPayment.totalAmount) * 100).toFixed(2);
    };

    const getPaymentStatusBadge = (status) => {
        const statusMap = {
            'PAYMENT_PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Payment Pending' },
            'PARTIAL_PAID': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Partial Paid' },
            'FULL_PAID': { bg: 'bg-green-100', text: 'text-green-800', label: 'Full Paid' }
        };
        const badge = statusMap[status] || statusMap['PAYMENT_PENDING'];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const filteredPurchaseOrders = purchaseOrders.filter(po =>
        po.controlNumber?.toLowerCase().includes(searchPO.toLowerCase()) ||
        (po.items && po.items.some(item => item.productName?.toLowerCase().includes(searchPO.toLowerCase())))
    );

    const filteredPaymentOrders = paymentOrders.filter(po =>
        po.controlNumber?.toLowerCase().includes(searchPayment.toLowerCase()) ||
        (po.items && po.items.some(item => item.productName?.toLowerCase().includes(searchPayment.toLowerCase())))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    return (
        <>
            <LoadingOverlay show={isLoadingOverlay} message={loadingMessage} />
            <div className="p-6 max-w-full mx-auto px-8">
                <Toaster position="top-right" />
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Order Management</h1>
                    <p className="text-gray-600 mt-1">Manage purchase orders and payments</p>
                </div>

                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('purchase-orders')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'purchase-orders'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Package className="inline w-4 h-4" />
                                <span>Inventory Purchase Orders</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'purchase-orders'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {purchaseOrders.length}
                                </span>
                                {pendingPOCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'purchase-orders'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-amber-50 text-amber-600'
                                        } border border-amber-300`}>
                                        {pendingPOCount} pending
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'payments'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <CreditCard className="inline w-4 h-4" />
                                <span>Payment of Purchase Orders</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'payments'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {paymentOrders.length}
                                </span>
                                {fullyPaidCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'payments'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-green-50 text-green-600'
                                        } border border-green-300`}>
                                        {fullyPaidCount} paid
                                    </span>
                                )}
                            </button>
                        </nav>
                    </div>
                </div>

                {activeTab === 'purchase-orders' && (
                    <div>
                        <div className="flex-1 relative mb-6">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by control number or product..."
                                value={searchPO}
                                onChange={(e) => setSearchPO(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredPurchaseOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    No purchase orders found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPurchaseOrders.map((po) => (
                                                <tr key={po.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{po.controlNumber}</td>
                                                    <td className="px-6 py-4 text-gray-900">{po.supplierName}</td>
                                                    <td className="px-6 py-4">
                                                        {po.items && po.items.length > 0 ? (
                                                            po.items.length === 1 ? (
                                                                <div className="text-sm">
                                                                    <div className="text-gray-900 font-medium">
                                                                        {po.items[0].productName} - {po.items[0].qty} {po.items[0].uom}
                                                                    </div>
                                                                    {po.items[0].variation && (
                                                                        <div className="text-xs text-gray-500 mt-0.5">{po.items[0].variation}</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm">
                                                                    <button
                                                                        onClick={() => togglePORow(po.id)}
                                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                                                    >
                                                                        {expandedPORows[po.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                        {po.items.length} products
                                                                    </button>
                                                                    {expandedPORows[po.id] && (
                                                                        <div className="mt-2 space-y-1.5 pl-5 border-l-2 border-blue-200">
                                                                            {po.items.map((item, idx) => (
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
                                                        ₱{po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4">{getPaymentStatusBadge(po.paymentStatus)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setViewingPO(po)}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPO(po);
                                                                    setPoFormData({
                                                                        date: po.date || '',
                                                                        items: po.items?.map(item => ({
                                                                            id: item.id,
                                                                            unitPrice: item.unitPrice || '',
                                                                            totalAmount: item.totalAmount || ''
                                                                        })) || []
                                                                    });
                                                                }}
                                                                disabled={po.paymentStatus !== 'PAYMENT_PENDING'}
                                                                className={`p-2 ${po.paymentStatus !== 'PAYMENT_PENDING' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'} rounded-lg`}
                                                                title={po.paymentStatus !== 'PAYMENT_PENDING' ? 'Cannot edit paid orders' : 'Edit'}
                                                            >
                                                                <Edit2 size={18} />
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

                {activeTab === 'payments' && (
                    <div>
                        <div className="flex-1 relative mb-6">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by control number or product..."
                                value={searchPayment}
                                onChange={(e) => setSearchPayment(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control #</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredPaymentOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    No payment orders found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPaymentOrders.map((po) => (
                                                <tr key={po.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{po.controlNumber}</td>
                                                    <td className="px-6 py-4 text-gray-900">{po.supplierName}</td>
                                                    <td className="px-6 py-4 text-gray-900">
                                                        ₱{po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900">
                                                        ₱{po.totalPaid ? po.totalPaid.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900">
                                                        ₱{po.remainingBalance ? po.remainingBalance.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-6 py-4">{getPaymentStatusBadge(po.paymentStatus)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleViewPayments(po)}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                                title="View Payments"
                                                            >
                                                                <FileText size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePayNow(po)}
                                                                disabled={!canPayNow(po) || isLoadingOverlay}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                                title={!canPayNow(po) ? 'Set all item prices first' : 'Pay Now'}
                                                            >
                                                                {isLoadingOverlay ? (
                                                                    <Loader2 className="animate-spin" size={18} />
                                                                ) : (
                                                                    <CreditCard size={18} />
                                                                )}
                                                                {isLoadingOverlay ? 'Loading...' : 'Pay Now'}
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

                {/* Modals (ViewingModal, EditingModal, PaymentModal, ViewPaymentsModal) */}
                {/* These should remain as separate components as in your previous code */}
                {/* Make sure to update them to handle multiple items */}

                {viewingPO && (
                    <ViewingModal
                        po={viewingPO}
                        onClose={() => setViewingPO(null)}
                        onSubmit={handleSubmitOrder}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                        getFileUrl={getFileUrl}
                        getFileDownloadUrl={getFileDownloadUrl}
                        getPlaceholderImage={getPlaceholderImage}
                    />
                )}

                {editingPO && (
                    <EditingModal
                        po={editingPO}
                        poFormData={poFormData}
                        setPoFormData={setPoFormData}
                        selectedFile={selectedFile}
                        selectedFilePreview={selectedFilePreview}
                        onClose={() => {
                            setEditingPO(null);
                            setSelectedFile(null);
                            setSelectedFilePreview(null);
                        }}
                        onSubmit={handleEditPO}
                        handleFileSelect={handleFileSelect}
                        actionLoading={actionLoading}
                        isLoadingOverlay={isLoadingOverlay}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                        getFileUrl={getFileUrl}
                        getPlaceholderImage={getPlaceholderImage}
                    />
                )}

                {showPaymentModal && selectedPOForPayment && (
                    <PaymentModal
                        po={selectedPOForPayment}
                        formData={paymentFormData}
                        setFormData={setPaymentFormData}
                        onClose={() => setShowPaymentModal(false)}
                        onSubmit={handlePaymentSubmit}
                        actionLoading={actionLoading}
                        calculateTotalPayment={calculateTotalPayment}
                        calculatePercentage={calculatePercentage}
                        getPaymentModeLabel={getPaymentModeLabel}
                    />
                )}

                {viewingPayments && (
                    <ViewPaymentsModal
                        data={viewingPayments}
                        onClose={() => setViewingPayments(null)}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                    />
                )}
            </div>
        </>
    );
};

const ViewingModal = ({ po, onClose, onSubmit, getPaymentStatusBadge, getFileUrl, getFileDownloadUrl, getPlaceholderImage }) => {
    const hasAllPrices = po.items && po.items.length > 0 &&
        po.items.every(item => item.unitPrice && item.unitPrice > 0 && item.totalAmount && item.totalAmount > 0);

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Purchase Order Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-gray-600">Control Number:</span>
                            <p className="font-semibold text-gray-900">{po.controlNumber}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Status:</span>
                            <div className="mt-1">{getPaymentStatusBadge(po.paymentStatus)}</div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Building2 size={18} />
                            Supplier Information
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-1">
                                <Building2 size={12} className="text-gray-600" />
                                <span className="text-gray-600">Supplier Name: </span>
                                <span className="font-semibold text-gray-900">{po.supplierName}</span>
                            </div>
                            {po.supplierInfo?.contactPerson && (
                                <div className="flex items-center gap-1">
                                    <User size={12} className="text-gray-600" />
                                    <span className="text-gray-600">Contact Person: </span>
                                    <span className="font-semibold text-gray-900">{po.supplierInfo.contactPerson}</span>
                                </div>
                            )}
                            {po.supplierInfo?.email && (
                                <div className="flex items-center gap-1">
                                    <Mail size={12} className="text-gray-600" />
                                    <span className="text-gray-600">Email: </span>
                                    <span className="font-semibold text-gray-900 break-all">{po.supplierInfo.email}</span>
                                </div>
                            )}
                            {po.supplierInfo?.contactNo && (
                                <div className="flex items-center gap-1">
                                    <Phone size={12} className="text-gray-600" />
                                    <span className="text-gray-600">Contact Number: </span>
                                    <span className="font-semibold text-gray-900">{po.supplierInfo.contactNo}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
                        {po.items && po.items.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden bg-white">
                                <table className="w-full">
                                    <thead className="bg-gray-100 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {po.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{item.sku || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{item.upc || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{item.variation || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{item.qty} {item.uom}</td>
                                                <td className="px-4 py-2 text-sm text-right">
                                                    {item.unitPrice ? `₱${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-right font-medium">
                                                    {item.totalAmount ? `₱${parseFloat(item.totalAmount).toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No products</p>
                        )}

                        <div className="mt-4 p-3 bg-white rounded border">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Grand Total:</span>
                                    <p className="font-medium text-gray-900 text-lg">
                                        ₱{po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {po.uploadedFileUrl && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText size={18} className="text-purple-600" />
                                Purchase Order Document
                            </h3>
                            {po.uploadedFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                    src={getFileUrl(po.uploadedFileUrl)}
                                    alt="Purchase Order"
                                    className="w-full h-64 object-contain bg-white rounded border cursor-pointer"
                                    onClick={() => window.open(getFileUrl(po.uploadedFileUrl), '_blank')}
                                    onError={(e) => e.target.src = getPlaceholderImage()}
                                />
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => window.open(getFileUrl(po.uploadedFileUrl), '_blank')}
                                        className="w-full flex items-center gap-3 text-blue-600 hover:bg-blue-50 p-3 rounded"
                                    >
                                        <FileText size={40} />
                                        <span>View Document</span>
                                    </button>
                                    <a
                                        href={getFileDownloadUrl(po.uploadedFileUrl)}
                                        download
                                        className="w-full flex items-center gap-3 text-green-600 hover:bg-green-50 p-3 rounded"
                                    >
                                        <Download size={40} />
                                        <span>Download Document</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={() => onSubmit(po)}
                            disabled={po.paymentStatus !== 'PAYMENT_PENDING' || !hasAllPrices}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!hasAllPrices ? 'Set all item prices first' : ''}
                        >
                            Submit Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditingModal = ({ po, poFormData, setPoFormData, selectedFile, selectedFilePreview, onClose, onSubmit, handleFileSelect, actionLoading, isLoadingOverlay, getPaymentStatusBadge, getFileUrl, getPlaceholderImage }) => {
    const handleItemPriceChange = (itemId, field, value) => {
        setPoFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Purchase Order</h2>
                        <p className="text-sm text-gray-500 mt-1">Update pricing and upload purchase order document</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-6">
                    {/* Header Information */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <span className="text-sm text-gray-600 font-medium">Control Number</span>
                            <p className="font-bold text-gray-900 text-lg">{po.controlNumber}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600 font-medium">Payment Status</span>
                            <div className="mt-1">{getPaymentStatusBadge(po.paymentStatus)}</div>
                        </div>
                    </div>

                    {/* Supplier Information */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Building2 size={18} />
                            Supplier Information
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-1">
                                <Building2 size={12} className="text-gray-600" />
                                <span className="text-gray-600">Supplier Name: </span>
                                <span className="font-semibold text-gray-900">{po.supplierName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <User size={12} className="text-gray-600" />
                                <span className="text-gray-600">Contact Person: </span>
                                <span className="font-semibold text-gray-900">
                                    {po.supplierInfo?.contactPerson || '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Mail size={12} className="text-gray-600" />
                                <span className="text-gray-600">Email: </span>
                                <span className="font-semibold text-gray-900 break-all">
                                    {po.supplierInfo?.email || '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Phone size={12} className="text-gray-600" />
                                <span className="text-gray-600">Contact Number: </span>
                                <span className="font-semibold text-gray-900">
                                    {po.supplierInfo?.contactNo || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Product Pricing */}
                    <div className="p-4 bg-green-50 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Edit2 size={18} />
                            Edit Product Pricing
                        </h3>

                        {po.items && po.items.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 border-b">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price (₱)</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total (₱)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {po.items.map((item, idx) => {
                                                const itemFormData = poFormData.items.find(i => i.id === item.id) || {};
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            {item.productName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {item.sku || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700">
                                                            {item.upc || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {item.variation || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            {item.qty} {item.uom}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={itemFormData.unitPrice || ''}
                                                                onChange={(e) => handleItemPriceChange(item.id, 'unitPrice', e.target.value)}
                                                                step="0.01"
                                                                min="0"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="0.00"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={itemFormData.totalAmount || ''}
                                                                onChange={(e) => handleItemPriceChange(item.id, 'totalAmount', e.target.value)}
                                                                step="0.01"
                                                                min="0"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="0.00"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-100 border-t">
                                            <tr>
                                                <td colSpan="6" className="px-4 py-3 text-right font-bold text-gray-900">
                                                    Grand Total:
                                                </td>
                                                <td className="px-4 py-3 font-bold text-lg text-gray-900">
                                                    ₱{po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No products available</p>
                        )}
                    </div>

                    {/* Order Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            Purchase Order Date
                        </label>
                        <input
                            type="date"
                            value={poFormData.date}
                            onChange={(e) => setPoFormData({ ...poFormData, date: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Purchase Order Document */}
                    <div className="p-4 bg-violet-50 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText size={18} />
                            Purchase Order Document
                        </h3>

                        {/* Current/Selected File Preview */}
                        {(selectedFile || po.uploadedFileUrl) && (
                            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-300">
                                {selectedFilePreview ? (
                                    <img
                                        src={selectedFilePreview}
                                        alt="Preview"
                                        className="w-full h-64 object-contain bg-gray-50 rounded"
                                    />
                                ) : selectedFile ? (
                                    <div className="flex items-center gap-3 p-2">
                                        <FileText size={32} className="text-gray-600" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {(selectedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                ) : po.uploadedFileUrl ? (
                                    po.uploadedFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img
                                            src={getFileUrl(po.uploadedFileUrl)}
                                            alt="Current Document"
                                            className="w-full h-64 object-contain bg-gray-50 rounded cursor-pointer"
                                            onClick={() => window.open(getFileUrl(po.uploadedFileUrl), '_blank')}
                                            onError={(e) => e.target.src = getPlaceholderImage()}
                                        />
                                    ) : (
                                        <a
                                            href={getFileUrl(po.uploadedFileUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded"
                                        >
                                            <FileText size={32} className="text-gray-600" />
                                            <span className="text-sm font-medium text-gray-900">View Document</span>
                                        </a>
                                    )
                                ) : null}
                            </div>
                        )}

                        {/* Upload Button */}
                        <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="po-file-upload"
                        />
                        <label
                            htmlFor="po-file-upload"
                            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50"
                        >
                            <Upload size={20} />
                            <div>
                                <span className="block font-medium text-gray-700">
                                    {selectedFile || po.uploadedFileUrl ? 'Replace Document' : 'Upload Purchase Order Document'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    Supported: Images, PDF, Word, Excel (Max 10MB)
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading || isLoadingOverlay}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {actionLoading || isLoadingOverlay ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Updating...
                                </>
                            ) : (
                                'Update Purchase Order'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const PaymentModal = ({ po, formData, setFormData, onClose, onSubmit, actionLoading, calculateTotalPayment, calculatePercentage, getPaymentModeLabel }) => (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-600">PO Number:</span>
                            <p className="font-medium text-gray-900">{po.controlNumber}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Total Amount:</span>
                            <p className="font-medium text-gray-900">₱{po.totalAmount?.toFixed(2)}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Total Paid:</span>
                            <p className="font-medium text-gray-900">₱{po.totalPaid?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Remaining:</span>
                            <p className="font-medium text-gray-900">₱{po.remainingBalance?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mode of Payment <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.modeOfPayment}
                        onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                        required
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="">Select payment mode</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHECK">Check</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        {po?.modeOfPayment === 'TELEGRAPHIC_TRANSFER' && (
                            <option value="TELEGRAPHIC_TRANSFER">
                                {getPaymentModeLabel('TELEGRAPHIC_TRANSFER', po.supplierInfo)}
                            </option>
                        )}
                        {po?.modeOfPayment === 'OTHER' && (
                            <option value="OTHER">
                                {getPaymentModeLabel('OTHER', po.supplierInfo)}
                            </option>
                        )}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Details</label>
                    <textarea
                        value={formData.paymentDetails}
                        onChange={(e) => setFormData({ ...formData, paymentDetails: e.target.value })}
                        rows="3"
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Enter payment details..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Amount (₱) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.productAmount}
                            onChange={(e) => setFormData({ ...formData, productAmount: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Processing Fee (₱)</label>
                        <input
                            type="number"
                            value={formData.processingFee}
                            onChange={(e) => setFormData({ ...formData, processingFee: e.target.value })}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dollar Amount ($)</label>
                        <input
                            type="number"
                            value={formData.dollarAmount}
                            onChange={(e) => setFormData({ ...formData, dollarAmount: e.target.value })}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso Amount (₱)</label>
                        <input
                            type="number"
                            value={formData.pesoAmount}
                            onChange={(e) => setFormData({ ...formData, pesoAmount: e.target.value })}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-600">Payment Total:</span>
                            <p className="font-semibold text-gray-900 text-lg">₱{calculateTotalPayment().toFixed(2)}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Percentage:</span>
                            <p className="font-semibold text-gray-900 text-lg">{calculatePercentage()}%</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {actionLoading ? 'Recording...' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const ViewPaymentsModal = ({ data, onClose, getPaymentStatusBadge }) => (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                            <span className="text-gray-600">PO Number:</span>
                            <p className="font-medium text-gray-900">{data.po.controlNumber}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Total Amount:</span>
                            <p className="font-medium text-gray-900">₱{data.po.totalAmount?.toFixed(2)}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Status:</span>
                            <div className="mt-1">{getPaymentStatusBadge(data.po.paymentStatus)}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Payment Records</h3>
                    {!data.payments || data.payments.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No payments recorded yet</p>
                    ) : (
                        <div className="space-y-4">
                            {data.payments.map((payment) => (
                                <div key={payment.id} className="p-4 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between mb-3">
                                        <div>
                                            <span className="font-semibold">Payment #{payment.paymentNumber || payment.id}</span>
                                            <p className="text-sm text-gray-600">
                                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'No date'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-lg">₱{payment.totalAmount?.toFixed(2) || '0.00'}</p>
                                            <p className="text-sm text-gray-600">{payment.percentageOfTotal?.toFixed(2) || '0.00'}%</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">Mode:</span>
                                            <span className="ml-2">{payment.modeOfPayment || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Product Amount:</span>
                                            <span className="ml-2">₱{payment.productAmount?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        {payment.dollarAmount > 0 && (
                                            <div>
                                                <span className="text-gray-600">Dollar Amount:</span>
                                                <span className="ml-2">${payment.dollarAmount?.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {payment.processingFee > 0 && (
                                            <div>
                                                <span className="text-gray-600">Processing Fee:</span>
                                                <span className="ml-2">₱{payment.processingFee?.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <span className="text-sm text-gray-600">Total Paid:</span>
                            <p className="font-semibold text-lg">₱{data.po.totalPaid?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Remaining Balance:</span>
                            <p className="font-semibold text-lg">₱{data.po.remainingBalance?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Progress:</span>
                            <p className="font-semibold text-lg">
                                {data.po.totalAmount > 0 ? ((data.po.totalPaid / data.po.totalAmount) * 100).toFixed(2) : '0.00'}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default PurchaseOrderManagement;