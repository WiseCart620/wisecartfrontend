import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import IRRTableRow from './components/IRRTableRow';
import IRRModal from './components/IRRModal';
import IRRViewModal from './components/IRRViewModal';
import Pagination from '../../components/common/Pagination';


const InventoryRequestManagement = ({ irrRequests: initialRequests, onRefresh, onProceedToRpq }) => {
    const [irrRequests, setIrrRequests] = useState(initialRequests || []);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchIrr, setSearchIrr] = useState('');
    const [showIrrModal, setShowIrrModal] = useState(false);
    const [viewingIrr, setViewingIrr] = useState(null);
    const [editingIrr, setEditingIrr] = useState(null);
    const [buttonLoading, setButtonLoading] = useState({});
    const [suppliers, setSuppliers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        setIrrRequests(initialRequests || []);
    }, [initialRequests]);

    useEffect(() => {
        loadSuppliers();
    }, []);


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

    const handleDeleteIrr = async (id) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;
        const loadKey = `delete-irr-${id}`;
        setButtonLoading(prev => ({ ...prev, [loadKey]: true }));
        setActionLoading(true);
        try {
            const response = await api.delete(`/inventory-requests/${id}`);
            if (response.success) {
                toast.success('Request deleted successfully');
                setIrrRequests(prev => prev.filter(req => req.id !== id));
                await onRefresh();
            }
        } catch (error) {
            toast.error('Failed to delete request');
        } finally {
            setButtonLoading(prev => ({ ...prev, [loadKey]: false }));
            setActionLoading(false);
        }
    };

    const setButtonLoadingState = (key, value) => {
        setButtonLoading(prev => ({ ...prev, [key]: value }));
    };

    const formatNumber = (num) => {
        if (!num && num !== 0) return '-';
        return parseInt(num).toLocaleString('en-US');
    };

    const filteredIrrRequests = irrRequests.filter(req =>
        req.controlNumber?.toLowerCase().includes(searchIrr.toLowerCase()) ||
        req.productName?.toLowerCase().includes(searchIrr.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentIrrRequests = filteredIrrRequests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredIrrRequests.length / itemsPerPage);

    return (
        <div>
            <Toaster position="top-right" />
            <LoadingOverlay show={actionLoading} message="Processing..." />

            {/* Search and Add Button */}
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
                        setEditingIrr(null);
                        setShowIrrModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} />
                    New Request
                </button>
            </div>

            {/* IRR Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden table-panel">
                <div className="overflow-x-auto table-fit">
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
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No requests found
                                    </td>
                                </tr>
                            ) : (
                                currentIrrRequests.map((req) => (
                                    <IRRTableRow
                                        key={req.id}
                                        req={req}
                                        handleDeleteIrr={handleDeleteIrr}
                                        setViewingIrr={setViewingIrr}
                                        setEditingIrr={setEditingIrr}
                                        setShowIrrModal={setShowIrrModal}
                                        suppliers={suppliers}
                                        buttonLoading={buttonLoading}
                                        formatNumber={formatNumber}
                                        onProceedToRpq={onProceedToRpq}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredIrrRequests.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    onPrevPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    showingStart={indexOfFirstItem + 1}
                    showingEnd={Math.min(indexOfLastItem, filteredIrrRequests.length)}
                    totalItems={filteredIrrRequests.length}
                />
            )}

            {/* Modals */}
            {showIrrModal && (
                <IRRModal
                    editingIrr={editingIrr}
                    suppliers={suppliers}
                    onClose={() => {
                        setShowIrrModal(false);
                        setEditingIrr(null);
                    }}
                    onSuccess={() => {
                        setShowIrrModal(false);
                        setEditingIrr(null);
                        onRefresh();
                    }}
                />
            )}

            {viewingIrr && (
                <IRRViewModal
                    irr={viewingIrr}
                    onClose={() => setViewingIrr(null)}
                    formatNumber={formatNumber}
                    onRefresh={onRefresh}
                    onProceedToRpq={onProceedToRpq}
                />
            )}
        </div>
    );
};

export default InventoryRequestManagement;