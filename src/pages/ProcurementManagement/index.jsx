import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import InventoryRequestManagement from './InventoryRequestManagement';
import ProductQuotationManagement from './ProductQuotationManagement';
import PurchaseOrderManagement from '../../pages/UploadPaymentManagement';
import ProductUnitCostingTab from './ProductUnitCostingTab';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ProcurementTabs from './components/ProcurementTabs';
import { api } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ProcurementManagement = () => {
    const [activeTab, setActiveTab] = useState('irr');
    const [loading, setLoading] = useState(false);
    const [paymentCounts, setPaymentCounts] = useState({
        pending: 0,
        partial: 0,
        fullPaid: 0,
        total: 0
    });
    const [irrRequests, setIrrRequests] = useState([]);
    const [rpqRequests, setRpqRequests] = useState([]);



    useEffect(() => {
        if (activeTab === 'po') {
            loadPaymentCounts();

            const interval = setInterval(() => {
                loadPaymentCounts();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [activeTab]);



    useEffect(() => {
        loadInitialData();
        loadPaymentCounts();

        const handleUpdate = async () => {
            await loadPaymentCounts();
        };

        const handleIrrProceededToRpq = async () => {
            await Promise.all([
                loadIrrRequests(),
                loadRpqRequests()
            ]);
            setActiveTab('rpq');
        };

        const handleRpqDeleted = async () => {
            await loadIrrRequests();
        };

        const handleQuotationConfirmed = async () => {
            await Promise.all([
                loadRpqRequests(),
                loadPaymentCounts()
            ]);
        };

        const handleNavigateToPO = () => {
            setActiveTab('po');
        };

        window.addEventListener('productUpdated', handleUpdate);
        window.addEventListener('paymentUpdated', handleUpdate);
        window.addEventListener('irrProceededToRpq', handleIrrProceededToRpq);
        window.addEventListener('rpqDeleted', handleRpqDeleted);
        window.addEventListener('quotationConfirmed', handleQuotationConfirmed);
        window.addEventListener('navigateToPO', handleNavigateToPO);

        return () => {
            window.removeEventListener('productUpdated', handleUpdate);
            window.removeEventListener('paymentUpdated', handleUpdate);
            window.removeEventListener('irrProceededToRpq', handleIrrProceededToRpq);
            window.removeEventListener('rpqDeleted', handleRpqDeleted);
            window.removeEventListener('quotationConfirmed', handleQuotationConfirmed);
            window.removeEventListener('navigateToPO', handleNavigateToPO);
        };
    }, []);


    const loadPaymentCounts = async () => {
        try {
            const { getPaymentCounts } = await import('../../pages/UploadPaymentManagement');
            const counts = await getPaymentCounts();
            setPaymentCounts(counts);
        } catch (error) {
            console.error('Error loading payment counts:', error);
        }
    };

    const loadInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadIrrRequests(),
                loadRpqRequests()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadIrrRequests = async () => {
        try {
            const response = await api.get('/inventory-requests');
            if (response && response.success) {
                const actualData = response.data?.data || response.data;
                setIrrRequests(Array.isArray(actualData) ? actualData : []);
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
                setRpqRequests(Array.isArray(actualData) ? actualData : []);
            }
        } catch (error) {
            setRpqRequests([]);
            toast.error('Failed to load quotation requests');
        }
    };

    const handleProceedToRpq = async () => {
        await Promise.all([
            loadIrrRequests(),
            loadRpqRequests()
        ]);
        setActiveTab('rpq');
    };

    const pendingIrrCount = irrRequests.filter(req => req.status === 'PENDING').length;
    const pendingRpqCount = rpqRequests.filter(req =>
        req.status === 'DRAFT' || req.status === 'PENDING'
    ).length;

    const tabs = [
        {
            id: 'irr',
            label: 'Inventory Request',
            icon: 'FileText',
            count: irrRequests.length,
            pendingCount: pendingIrrCount
        },
        {
            id: 'rpq',
            label: 'Product Quotation',
            icon: 'Package',
            count: rpqRequests.length,
            pendingCount: pendingRpqCount
        },
        {
            id: 'po',
            label: 'Purchase Orders & Payments',
            icon: ShoppingCart,
            count: paymentCounts.total,
            pendingCount: paymentCounts.pending + paymentCounts.partial
        },
        {
            id: 'costing',
            label: 'Product Unit Costing',
            icon: 'BarChart2'
        }
    ];

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

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Procurement Management</h1>
                <p className="text-gray-600 mt-1">Manage inventory requests, quotations, and purchase orders</p>
            </div>

            {/* Tabs Navigation */}
            <ProcurementTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'irr' && (
                <InventoryRequestManagement
                    irrRequests={irrRequests}
                    onRefresh={loadIrrRequests}
                    onProceedToRpq={handleProceedToRpq}
                />
            )}

            {activeTab === 'rpq' && (
                <ProductQuotationManagement
                    rpqRequests={rpqRequests}
                    onRefresh={loadRpqRequests}
                />
            )}

            {activeTab === 'po' && (
                <div className="mt-6">
                    <PurchaseOrderManagement />
                </div>
            )}

            {activeTab === 'costing' && (
                <div className="mt-6">
                    <ProductUnitCostingTab />
                </div>
            )}
        </div>
    );
};

export default ProcurementManagement;