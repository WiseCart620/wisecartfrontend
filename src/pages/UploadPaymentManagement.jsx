import React, { useState, useEffect } from 'react';
import {
    Eye, Edit2, Search, X, Upload, Download,
    FileText, Loader2, CreditCard, Package, Calendar, User, Mail, ChevronDown, ChevronRight, Building2, Phone, AlertTriangle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { getFileUrl, getPlaceholderImage, getFileDownloadUrl } from '../utils/fileUtils';

const UploadPaymentManagement = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [paymentOrders, setPaymentOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchPayment, setSearchPayment] = useState('');
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
    const [viewingProducts, setViewingProducts] = useState(null);
    const [poFormData, setPoFormData] = useState({
        date: '',
        items: []
    });

    const [paymentFormData, setPaymentFormData] = useState({
        bank: '',
        referenceNumber: '',
        paymentDate: new Date().toISOString().split('T')[0],
        productDollarAmount: '',
        productPesoAmount: '',
        processingFeeDollar: '0',
        processingFeePeso: '0'
    });

    const loadPurchaseOrders = async () => {
        try {
            const response = await api.get('/purchase-orders');
            if (response.success && response.data) {
                const actualData = response.data.data || response.data;
                const orders = Array.isArray(actualData) ? actualData : [];

                // Load quotation request details for each PO
                const ordersWithQuotations = await Promise.all(
                    orders.map(async (po) => {
                        if (po.quotationRequestId) {
                            try {
                                const qrResponse = await api.get(`/quotation-requests/${po.quotationRequestId}`);
                                if (qrResponse.success && qrResponse.data) {
                                    return {
                                        ...po,
                                        quotationRequest: qrResponse.data
                                    };
                                }
                            } catch (err) {
                                console.error(`Failed to load quotation for PO ${po.id}:`, err);
                            }
                        }
                        return po;
                    })
                );

                setPurchaseOrders(ordersWithQuotations);

                const submitted = ordersWithQuotations.filter(po =>
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
                bank: '',
                referenceNumber: '',
                paymentDate: new Date().toISOString().split('T')[0],
                productDollarAmount: '',
                productPesoAmount: '',
                processingFeeDollar: '0',
                processingFeePeso: '0'
            });
            setShowPaymentModal(true);
        } finally {
            setIsLoadingOverlay(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // ✅ Validate that PO has totalAmount
        if (!selectedPOForPayment.totalAmount || selectedPOForPayment.totalAmount === 0) {
            toast.error('Purchase order total amount is not set. Please update item prices first.');
            return;
        }

        setActionLoading(true);  // Set loading here
        setLoadingMessage('Recording payment...');
        setIsLoadingOverlay(true);

        try {
            const payload = {
                purchaseOrderId: selectedPOForPayment.id,
                bank: paymentFormData.bank,
                referenceNumber: paymentFormData.referenceNumber,
                paymentDate: paymentFormData.paymentDate,
                productDollarAmount: parseFloat(paymentFormData.productDollarAmount),
                productPesoAmount: parseFloat(paymentFormData.productPesoAmount),
                processingFeeDollar: parseFloat(paymentFormData.processingFeeDollar || 0),
                processingFeePeso: parseFloat(paymentFormData.processingFeePeso || 0)
            };

            const response = await api.post('/payments', payload);
            if (response.success) {
                toast.success('Payment recorded successfully');
                setShowPaymentModal(false);
                await loadInitialData();
                window.dispatchEvent(new Event('paymentUpdated'));
            }
        } catch (error) {
            console.error('Payment error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
            toast.error(errorMessage);
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

    const getPaymentStatusBadge = (status) => {
        const statusMap = {
            'PAYMENT_PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Payment Pending' },
            'PARTIAL_PAID': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Partial Paid' },
            'FULL_PAID': { bg: 'bg-green-100', text: 'text-green-800', label: 'Fully Paid' }
        };
        const badge = statusMap[status] || statusMap['PAYMENT_PENDING'];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

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
                    <h1 className="text-3xl font-bold text-gray-900">Payment of Purchase Orders</h1>
                    <p className="text-gray-600 mt-1">Manage purchase order payments</p>
                </div>

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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPaymentOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                                No payment orders found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPaymentOrders.map((po) => (
                                            <tr key={po.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    {/* ✅ UPDATED: Add product icon button */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900">{po.controlNumber}</span>
                                                        {po.items && po.items.length > 0 && (
                                                            <button
                                                                onClick={() => setViewingProducts(po.items)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="View Products"
                                                            >
                                                                <Package size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-900">{po.supplierName}</td>
                                                <td className="px-6 py-4 text-gray-900">
                                                    ${po.totalAmount ? po.totalAmount.toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900">
                                                    ${po.totalPaid ? po.totalPaid.toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900">
                                                    ${po.remainingBalance ? po.remainingBalance.toFixed(2) : '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-900">
                                                    {po.totalAmount > 0 ? ((po.totalPaid / po.totalAmount) * 100).toFixed(2) : '0.00'}%
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
                                                            disabled={isLoadingOverlay || po.paymentStatus === 'FULL_PAID'}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                            title={po.paymentStatus === 'FULL_PAID' ? 'Order is fully paid' : 'Upload Payment'}
                                                        >
                                                            {isLoadingOverlay ? (
                                                                <Loader2 className="animate-spin" size={18} />
                                                            ) : (
                                                                <Upload size={18} />
                                                            )}
                                                            {po.paymentStatus === 'FULL_PAID' ? 'Fully Paid' : (isLoadingOverlay ? 'Loading...' : 'Upload Payment')}
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
                    />
                )}

                {viewingPayments && (
                    <ViewPaymentsModal
                        data={viewingPayments}
                        onClose={() => setViewingPayments(null)}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                    />
                )}

                {viewingProducts && (
                    <ProductDetailsModal
                        products={viewingProducts}
                        onClose={() => setViewingProducts(null)}
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
        </div >
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

                    <div className="p-4 bg-violet-50 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText size={18} />
                            Purchase Order Document
                        </h3>

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
            </div >
        </div >
    );
};




const QuotationDetailsSection = ({ quotationRequest }) => {
    if (!quotationRequest || !quotationRequest.items) return null;

    return (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                Product Quotation Details
            </h3>

            {/* Quotation Info */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                    <span className="text-gray-600">RPQ Control #:</span>
                    <p className="font-medium text-gray-900">{quotationRequest.controlNumber}</p>
                </div>
                <div>
                    <span className="text-gray-600">Supplier:</span>
                    <p className="font-medium text-gray-900">{quotationRequest.supplierName}</p>
                </div>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg overflow-hidden bg-white">
                <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {quotationRequest.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.productName}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{item.sku || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{item.variation || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{item.qty} {item.uom}</td>
                                <td className="px-3 py-2 text-sm text-right">
                                    {item.unitPrice ? `$${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-medium">
                                    {item.totalAmount ? `$${parseFloat(item.totalAmount).toFixed(2)}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                        <tr>
                            <td colSpan="5" className="px-3 py-2 text-right font-bold text-sm">Grand Total:</td>
                            <td className="px-3 py-2 text-right font-bold text-sm">
                                ${quotationRequest.items.reduce((sum, item) =>
                                    sum + (parseFloat(item.totalAmount) || 0), 0
                                ).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};



const PaymentModal = ({ po, formData, setFormData, onClose, onSubmit, actionLoading }) => {
    const [showProductDetails, setShowProductDetails] = useState(false);
    const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);

    const calculateDollarTotal = () => {
        const productDollar = parseFloat(formData.productDollarAmount) || 0;
        const processingDollar = parseFloat(formData.processingFeeDollar) || 0;
        return productDollar + processingDollar;
    };

    const calculatePesoTotal = () => {
        const productPeso = parseFloat(formData.productPesoAmount) || 0;
        const processingPeso = parseFloat(formData.processingFeePeso) || 0;
        return productPeso + processingPeso;
    };

    // Calculate what percentage THIS payment represents
    const calculateThisPaymentPercentage = () => {
        if (!po || !po.totalAmount || po.totalAmount === 0) return 0;

        const productDollar = parseFloat(formData.productDollarAmount) || 0;
        return ((productDollar / po.totalAmount) * 100).toFixed(2);
    };

    // Calculate already paid percentage
    const calculateAlreadyPaidPercentage = () => {
        if (!po || !po.totalAmount || po.totalAmount === 0) return 0;
        return ((po.totalPaid / po.totalAmount) * 100).toFixed(2);
    };

    // Calculate NEW total percentage (first percent + new percent) - NO CAP
    const calculateNewTotalPercentage = () => {
        if (!po || !po.totalAmount || po.totalAmount === 0) return 0;

        const alreadyPaid = parseFloat(calculateAlreadyPaidPercentage()) || 0;
        const thisPayment = parseFloat(calculateThisPaymentPercentage()) || 0;


        const newTotal = alreadyPaid + thisPayment;
        return newTotal.toFixed(2);
    };


    const isOverpayment = () => {
        const newTotal = parseFloat(calculateNewTotalPercentage()) || 0;
        return newTotal > 100;
    };

    const handleSubmitWithWarning = async (e) => {
        e.preventDefault();

        if (isOverpayment()) {
            setShowOverpaymentWarning(true);
        } else {
            await handleSubmitPayment(e);
        }
    };


    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        onSubmit(e);
    };


    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmitWithWarning} className="p-6 space-y-5">
                    {po.quotationRequest && <QuotationDetailsSection quotationRequest={po.quotationRequest} />}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">PO Number:</span>
                                <p className="font-medium text-gray-900">{po.controlNumber}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Total Amount:</span>
                                <p className="font-medium text-gray-900">${po.totalAmount?.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Total Paid:</span>
                                <p className="font-medium text-gray-900">${po.totalPaid?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Remaining:</span>
                                <p className="font-medium text-gray-900">${po.remainingBalance?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Already Paid:</span>
                                <p className="font-medium text-gray-900">
                                    {calculateAlreadyPaidPercentage()}%
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Products:</span>
                                {po.items && po.items.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowProductDetails(true)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="View Products"
                                    >
                                        <Package size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bank <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.bank}
                                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter bank name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reference Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.referenceNumber}
                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter reference number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-start pt-3 border-t">
                        <label className="w-48 text-sm font-medium text-gray-700 pt-2">
                            Product Cost <span className="text-red-500">*</span>
                        </label>
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1">
                                <div className="flex justify-center items-center mb-1">
                                    <span className="text-base font-bold text-gray-800">$</span>
                                    <span className="text-xs text-gray-500 ml-1">(USD)</span>
                                </div>
                                <input
                                    type="number"
                                    value={formData.productDollarAmount}
                                    onChange={(e) => {
                                        setFormData({ ...formData, productDollarAmount: e.target.value });
                                    }}
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-left"
                                    placeholder="USD"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-center items-center mb-1">
                                    <span className="text-base font-bold text-gray-800">₱</span>
                                    <span className="text-xs text-gray-500 ml-1">(PHP)</span>
                                </div>
                                <input
                                    type="number"
                                    value={formData.productPesoAmount}
                                    onChange={(e) => setFormData({ ...formData, productPesoAmount: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-left"
                                    placeholder="PHP"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <label className="w-48 text-sm font-medium text-gray-700 pt-2">
                            Processing Fee
                        </label>
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    value={formData.processingFeeDollar}
                                    onChange={(e) => setFormData({ ...formData, processingFeeDollar: e.target.value })}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="USD"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    value={formData.processingFeePeso}
                                    onChange={(e) => setFormData({ ...formData, processingFeePeso: e.target.value })}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="PHP"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start pt-3  ">
                        <label className="w-48 text-sm font-medium text-gray-700 pt-2">
                            Total
                        </label>
                        <div className="flex-1 flex gap-4">
                            <div className="flex-1">
                                <div className="w-full px-4 py-2 bg-gray-100  rounded-lg font-semibold text-gray-900">
                                    ${calculateDollarTotal().toFixed(2)}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="w-full px-4 py-2 bg-gray-100  rounded-lg font-semibold text-gray-900">
                                    ₱{calculatePesoTotal().toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Percentage Section */}
                    <div className="flex items-start pt-3 border-t">
                        <label className="w-48 text-sm font-medium text-gray-700 pt-2">
                            Payment Percentage
                        </label>
                        <div className="flex-1">
                            <div className={`p-4 rounded-lg ${isOverpayment() ? 'bg-red-50 border border-red-200' : 'bg-amber-50'}`}>
                                <p className={`font-semibold text-xl mb-2 ${isOverpayment() ? 'text-red-700' : 'text-gray-900'}`}>
                                    {formData.productDollarAmount
                                        ? `${calculateNewTotalPercentage()}%`
                                        : `${calculateAlreadyPaidPercentage()}%`
                                    }
                                    {isOverpayment() && (
                                        <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                                            ⚠️ Overpayment
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.productDollarAmount && (
                                        <span className={isOverpayment() ? 'text-red-600 font-medium' : ''}>
                                            <br />
                                            Adding {calculateThisPaymentPercentage()}% to existing {calculateAlreadyPaidPercentage()}% = {calculateNewTotalPercentage()}% total.
                                            {isOverpayment() && (
                                                <span className="font-bold"> This exceeds 100%!</span>
                                            )}
                                        </span>
                                    )}
                                </p>
                                {isOverpayment() && (
                                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                                        <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            Warning: This payment will result in overpayment!
                                        </p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Total paid will exceed the purchase order amount by ${((parseFloat(calculateNewTotalPercentage()) - 100) * po.totalAmount / 100).toFixed(2)}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className={`flex-1 px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 ${isOverpayment() ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 text-white'}`}
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    {isOverpayment() ? 'Proceed with Overpayment' : 'Upload Payment'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Overpayment Warning Modal */}
            {showOverpaymentWarning && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={32} className="text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Overpayment Warning</h3>
                                <p className="text-gray-600">
                                    This payment will result in <span className="font-bold text-red-600">{calculateNewTotalPercentage()}%</span> total payment,
                                    which exceeds 100% of the purchase order amount.
                                </p>
                            </div>

                            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">Total Amount:</span>
                                        <p className="font-medium">${po.totalAmount?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Already Paid:</span>
                                        <p className="font-medium">${po.totalPaid?.toFixed(2)} ({calculateAlreadyPaidPercentage()}%)</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">This Payment:</span>
                                        <p className="font-medium">${parseFloat(formData.productDollarAmount || 0).toFixed(2)} ({calculateThisPaymentPercentage()}%)</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">New Total:</span>
                                        <p className="font-bold text-red-600">${(po.totalPaid + parseFloat(formData.productDollarAmount || 0)).toFixed(2)} ({calculateNewTotalPercentage()}%)</p>
                                    </div>
                                </div>
                                <div className="mt-3 text-center">
                                    <p className="text-sm text-red-700 font-medium">
                                        Overpayment: ${((parseFloat(calculateNewTotalPercentage()) - 100) * po.totalAmount / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOverpaymentWarning(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitPayment}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle size={18} />
                                            Proceed Anyway
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showProductDetails && po.items && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                            <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
                            <button onClick={() => setShowProductDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg">
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
                                    <div className="font-semibold">PO #: {po.controlNumber}</div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">PRODUCT DETAILS</h2>
                            </div>


                            {/* Products Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Products</h3>
                                <div className="border rounded-lg overflow-hidden bg-white">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Product Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">SKU</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">UPC</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Variation</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">UOM</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Quantity</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold border border-gray-300">Unit Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold border border-gray-300">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {po.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 border border-gray-300">
                                                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300">{item.sku || '-'}</td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300">{item.upc || '-'}</td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300">{item.variation || '-'}</td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300">{item.uom || 'PCS'}</td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300">
                                                        {item.qty ? parseInt(item.qty).toLocaleString('en-US') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300 text-right">
                                                        {item.unitPrice && parseFloat(item.unitPrice) > 0 ? `$${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium border border-gray-300 text-right">
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
                                                <td colSpan="7" className="px-4 py-3 text-right font-bold text-sm border border-gray-300">
                                                    GRAND TOTAL:
                                                </td>
                                                <td className="px-4 py-3 font-bold text-sm border border-gray-300 text-right">
                                                    ${po.items.reduce((sum, item) =>
                                                        sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0
                                                    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Payment Arrangement (if available from quotation) */}
                            {po.quotationRequest && (po.quotationRequest.initialPaymentAmount > 0 || po.quotationRequest.finalPaymentAmount > 0) && (
                                <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                    <h3 className="font-bold text-gray-900 mb-2">Payment Arrangement</h3>
                                    <div className="space-y-3">
                                        {po.quotationRequest.initialPaymentAmount > 0 && (
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-semibold whitespace-nowrap">Initial Payment:</label>
                                                <span className="text-sm">
                                                    {po.quotationRequest.initialPaymentPercent ? `${po.quotationRequest.initialPaymentPercent}%` : ''} =
                                                    ${po.quotationRequest.initialPaymentAmount?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        )}
                                        {po.quotationRequest.finalPaymentAmount > 0 && (
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-semibold whitespace-nowrap">Final Payment:</label>
                                                <span className="text-sm">
                                                    {po.quotationRequest.finalPaymentPercent ? `${po.quotationRequest.finalPaymentPercent}%` : ''} =
                                                    ${po.quotationRequest.finalPaymentAmount?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Supplier Information */}
                            <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                                <h3 className="font-bold text-gray-900 mb-2">Supplier Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="info-row">
                                        <span className="font-semibold">Supplier Name: </span>
                                        <span>{po.supplierName || po.quotationRequest?.supplierName || 'N/A'}</span>
                                    </div>
                                    {po.supplierInfo?.contactPerson && (
                                        <div className="info-row">
                                            <span className="font-semibold">Contact Person: </span>
                                            <span>{po.supplierInfo.contactPerson}</span>
                                        </div>
                                    )}
                                    {po.supplierInfo?.contactNo && (
                                        <div className="info-row">
                                            <span className="font-semibold">Contact Number: </span>
                                            <span>{po.supplierInfo.contactNo}</span>
                                        </div>
                                    )}
                                    {po.supplierInfo?.email && (
                                        <div className="info-row">
                                            <span className="font-semibold">Email: </span>
                                            <span>{po.supplierInfo.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


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
                            <p className="font-medium text-gray-900">${data.po.totalAmount?.toFixed(2)}</p>
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
                                            <span className="font-semibold">Payment #{payment.paymentNumber}</span>
                                            <p className="text-sm text-gray-600">
                                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'No date'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-lg">${payment.productDollarAmount?.toFixed(2) || '0.00'}</p>
                                            <p className="text-sm text-gray-600">{payment.percentageOfTotal?.toFixed(2) || '0.00'}%</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
                                        <div>
                                            <span className="text-gray-600">Bank:</span>
                                            <span className="ml-2 font-medium">{payment.bank || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Reference #:</span>
                                            <span className="ml-2 font-medium">{payment.referenceNumber || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Product Cost ($):</span>
                                            <span className="ml-2">${payment.productDollarAmount?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Product Cost (₱):</span>
                                            <span className="ml-2">₱{payment.productPesoAmount?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        {(payment.processingFeeDollar > 0 || payment.processingFeePeso > 0) && (
                                            <>
                                                <div>
                                                    <span className="text-gray-600">Processing Fee ($):</span>
                                                    <span className="ml-2">${payment.processingFeeDollar?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Processing Fee (₱):</span>
                                                    <span className="ml-2">₱{payment.processingFeePeso?.toFixed(2) || '0.00'}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="col-span-2 border-t pt-2 mt-2">
                                            <div className="flex justify-between font-semibold">
                                                <span>Total:</span>
                                                <span>${payment.totalDollar?.toFixed(2) || '0.00'} / ₱{payment.totalPeso?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
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
                            <p className="font-semibold text-lg">${data.po.totalPaid?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Remaining Balance:</span>
                            <p className="font-semibold text-lg">${data.po.remainingBalance?.toFixed(2) || '0.00'}</p>
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

const ProductDetailsModal = ({ products, onClose, po }) => {
    if (!products || products.length === 0) return null;



    const controlNumber = po?.controlNumber ||
        po?.quotationRequest?.controlNumber ||
        products[0]?.controlNumber ||
        'N/A';

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Product Quotation Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Header with Company Info */}
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
                    </div>

                    {/* Title */}
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">PRODUCT DETAILS</h2>
                    </div>


                    {/* Products Table */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-2">Products</h3>
                        <div className="border rounded-lg overflow-hidden bg-white">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">SKU</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">UPC</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Variation</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">UOM</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold border border-gray-300">Quantity</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold border border-gray-300">Unit Price</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold border border-gray-300">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 border border-gray-300">
                                                <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm border border-gray-300">{item.sku || '-'}</td>
                                            <td className="px-4 py-3 text-sm border border-gray-300">{item.upc || '-'}</td>
                                            <td className="px-4 py-3 text-sm border border-gray-300">{item.variation || '-'}</td>
                                            <td className="px-4 py-3 text-sm border border-gray-300">{item.uom || 'PCS'}</td>
                                            <td className="px-4 py-3 text-sm border border-gray-300">
                                                {item.qty ? parseInt(item.qty).toLocaleString('en-US') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm border border-gray-300 text-right">
                                                {item.unitPrice && parseFloat(item.unitPrice) > 0 ? `$${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium border border-gray-300 text-right">
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
                                        <td colSpan="7" className="px-4 py-3 text-right font-bold text-sm border border-gray-300">
                                            GRAND TOTAL:
                                        </td>
                                        <td className="px-4 py-3 font-bold text-sm border border-gray-300 text-right">
                                            ${products.reduce((sum, item) =>
                                                sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0
                                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Export a function to get payment counts
export const getPaymentCounts = async () => {
    try {
        const response = await api.get('/purchase-orders');
        if (response.success && response.data) {
            const actualData = response.data.data || response.data;
            const orders = Array.isArray(actualData) ? actualData : [];

            // Filter submitted orders only
            const submitted = orders.filter(po =>
                po.paymentStatus === 'PAYMENT_PENDING' ||
                po.paymentStatus === 'PARTIAL_PAID' ||
                po.paymentStatus === 'FULL_PAID'
            );

            return {
                pending: submitted.filter(po => po.paymentStatus === 'PAYMENT_PENDING').length,
                partial: submitted.filter(po => po.paymentStatus === 'PARTIAL_PAID').length,
                fullPaid: submitted.filter(po => po.paymentStatus === 'FULL_PAID').length,
                total: submitted.length
            };
        }
        return { pending: 0, partial: 0, fullPaid: 0, total: 0 };
    } catch (error) {
        console.error('Error loading payment counts:', error);
        return { pending: 0, partial: 0, fullPaid: 0, total: 0 };
    }
};

export default UploadPaymentManagement;
