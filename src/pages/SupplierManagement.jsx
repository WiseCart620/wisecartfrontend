import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Search, X, Building2, MapPin, User, Phone, Mail, CreditCard, DollarSign, Package
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import LoadingOverlay from '../components/common/LoadingOverlay';
import Pagination from '../components/common/Pagination';

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        tin: '',
        type: 'MANUFACTURER',
        productServices: '',
        address: '',
        city: '',
        province: '',
        country: '',
        postalCode: '',
        contactPerson: '',
        contactNo: '',
        wechat: '',
        whatsapp: '',
        email: '',
        website: '',
        others: '',
        modeOfPayment: '',
        bankName: '',
        bankAddress: '',
        accountNumber: '',
        bankCountry: '',
        swiftCode: '',
        beneficiaryName: '',
        beneficiaryAddress: '',
        alipayAccount: '',
        paypalAccount: '',
        weixinAccount: '',
        otherPaymentDetails: ''
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/suppliers');
            if (response.success && response.data) {
                setSuppliers(Array.isArray(response.data) ? response.data : []);
            } else {
                setSuppliers([]);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load suppliers');
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.type) {
            toast.error('Please fill in required fields');
            return;
        }

        if (!formData.modeOfPayment) {
            toast.error('Please select a payment method');
            return;
        }

        setActionLoading(true);
        try {
            let response;
            if (editingSupplier) {
                response = await api.put(`/suppliers/${editingSupplier.id}`, formData);
            } else {
                response = await api.post('/suppliers', formData);
            }

            if (response.success) {
                toast.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully');
                setShowModal(false);
                resetForm();
                loadSuppliers();
            }
        } catch (error) {
            toast.error('Failed to save supplier');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name || '',
            tin: supplier.tin || '',
            type: supplier.type || 'MANUFACTURER',
            productServices: supplier.productServices || '',
            address: supplier.address || '',
            city: supplier.city || '',
            province: supplier.province || '',
            country: supplier.country || '',
            postalCode: supplier.postalCode || '',
            contactPerson: supplier.contactPerson || '',
            contactNo: supplier.contactNo || '',
            wechat: supplier.wechat || '',
            whatsapp: supplier.whatsapp || '',
            email: supplier.email || '',
            website: supplier.website || '',
            others: supplier.others || '',
            modeOfPayment: supplier.modeOfPayment || '',
            bankName: supplier.bankName || '',
            bankAddress: supplier.bankAddress || '',
            accountNumber: supplier.accountNumber || '',
            bankCountry: supplier.bankCountry || '',
            swiftCode: supplier.swiftCode || '',
            beneficiaryName: supplier.beneficiaryName || '',
            beneficiaryAddress: supplier.beneficiaryAddress || '',
            alipayAccount: supplier.alipayAccount || '',
            paypalAccount: supplier.paypalAccount || '',
            weixinAccount: supplier.weixinAccount || '',
            otherPaymentDetails: supplier.otherPaymentDetails || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this supplier?')) return;

        setActionLoading(true);
        try {
            const response = await api.delete(`/suppliers/${id}`);
            if (response.success) {
                toast.success('Supplier deleted successfully');
                loadSuppliers();
            }
        } catch (error) {
            toast.error('Failed to delete supplier');
        } finally {
            setActionLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            tin: '',
            type: 'MANUFACTURER',
            productServices: '',
            address: '',
            city: '',
            province: '',
            country: '',
            postalCode: '',
            contactPerson: '',
            contactNo: '',
            wechat: '',
            whatsapp: '',
            email: '',
            website: '',
            others: '',
            modeOfPayment: '',
            bankName: '',
            bankAddress: '',
            accountNumber: '',
            bankCountry: '',
            swiftCode: '',
            beneficiaryName: '',
            beneficiaryAddress: '',
            alipayAccount: '',
            paypalAccount: '',
            weixinAccount: '',
            otherPaymentDetails: ''
        });
        setEditingSupplier(null);
    };

    const getPaymentMethodDisplay = (method) => {
        switch (method) {
            case 'TELEGRAPHIC_TRANSFER': return 'T/T';
            case 'ALIPAY': return 'Alipay';
            case 'PAYPAL': return 'PayPal';
            case 'WEIXIN': return 'Weixin/WeChat Pay';
            case 'OTHER': return 'Other';
            default: return '-';
        }
    };

    const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.productServices?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSuppliers = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

    return (
        <div className="p-6 max-w-full mx-auto px-8">
            <Toaster position="top-right" />
            <LoadingOverlay
                show={actionLoading}
                message={editingSupplier ? 'Updating supplier...' : 'Processing...'}
            />

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
                <p className="text-gray-600 mt-1">Manage supplier information and payment details</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, contact person, or products/services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={20} />
                    Add Supplier
                </button>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products/Services</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No suppliers found</td>
                                </tr>
                            ) : (
                                currentSuppliers.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-white">
                                        <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.type === 'MANUFACTURER'
                                                ? 'bg-gray-100 text-gray-700'
                                                : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {supplier.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">
                                            <div className="max-w-xs truncate" title={supplier.productServices}>
                                                {supplier.productServices || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{supplier.contactPerson || '-'}</td>
                                        <td className="px-6 py-4 text-gray-900">{supplier.contactNo || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {getPaymentMethodDisplay(supplier.modeOfPayment)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(supplier)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supplier.id)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 size={18} />
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

            {filteredSuppliers.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    onPrevPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    showingStart={indexOfFirstItem + 1}
                    showingEnd={Math.min(indexOfLastItem, filteredSuppliers.length)}
                    totalItems={filteredSuppliers.length}
                />
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                disabled={actionLoading}
                                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Building2 size={20} />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
                                        <input
                                            type="text"
                                            value={formData.tin}
                                            onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            required
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        >
                                            <option value="MANUFACTURER">Manufacturer</option>
                                            <option value="FORWARDER">Forwarder</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Package size={16} />
                                                Products/Services
                                            </div>
                                        </label>
                                        <textarea
                                            value={formData.productServices}
                                            onChange={(e) => setFormData({ ...formData, productServices: e.target.value })}
                                            disabled={actionLoading}
                                            rows="3"
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Describe the products or services this supplier provides..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <MapPin size={20} />
                                    Address Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                                        <input
                                            type="text"
                                            value={formData.province}
                                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <input
                                            type="text"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                        <input
                                            type="text"
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <User size={20} />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter contact person name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contactNo}
                                            onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter contact number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter website URL"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            WeChat
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.wechat}
                                            onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter WeChat ID"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp}
                                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter WhatsApp number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Others
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.others}
                                            onChange={(e) => setFormData({ ...formData, others: e.target.value })}
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Other contact details"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <CreditCard size={20} />
                                    Mode of Payment
                                </h3>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.modeOfPayment}
                                        onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                                        required
                                        disabled={actionLoading}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                    >
                                        <option value="">Select payment method</option>
                                        <option value="TELEGRAPHIC_TRANSFER">Telegraphic Transfer (T/T)</option>
                                        <option value="ALIPAY">Alipay</option>
                                        <option value="PAYPAL">PayPal</option>
                                        <option value="WEIXIN">Weixin/WeChat Pay</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                {/* Telegraphic Transfer */}
                                {formData.modeOfPayment === 'TELEGRAPHIC_TRANSFER' && (
                                    <div className="p-4 bg-gray-50 rounded border border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-3">Telegraphic Transfer Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankName}
                                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Country</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankCountry}
                                                    onChange={(e) => setFormData({ ...formData, bankCountry: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Address</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankAddress}
                                                    onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.accountNumber}
                                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT Code</label>
                                                <input
                                                    type="text"
                                                    value={formData.swiftCode}
                                                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name of Beneficiary</label>
                                                <input
                                                    type="text"
                                                    value={formData.beneficiaryName}
                                                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address of Beneficiary</label>
                                                <input
                                                    type="text"
                                                    value={formData.beneficiaryAddress}
                                                    onChange={(e) => setFormData({ ...formData, beneficiaryAddress: e.target.value })}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Alipay */}
                                {formData.modeOfPayment === 'ALIPAY' && (
                                    <div className="p-4 bg-orange-50 rounded border border-orange-200">
                                        <h4 className="font-medium text-gray-900 mb-3">Alipay Details</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Alipay Account <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.alipayAccount}
                                                    onChange={(e) => setFormData({ ...formData, alipayAccount: e.target.value })}
                                                    required={formData.modeOfPayment === 'ALIPAY'}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter Alipay account (email or phone)"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                                <textarea
                                                    value={formData.otherPaymentDetails}
                                                    onChange={(e) => setFormData({ ...formData, otherPaymentDetails: e.target.value })}
                                                    rows="2"
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter any additional details..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PayPal */}
                                {formData.modeOfPayment === 'PAYPAL' && (
                                    <div className="p-4 bg-orange-50 rounded border border-orange-200">
                                        <h4 className="font-medium text-gray-900 mb-3">PayPal Details</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    PayPal Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.paypalAccount}
                                                    onChange={(e) => setFormData({ ...formData, paypalAccount: e.target.value })}
                                                    required={formData.modeOfPayment === 'PAYPAL'}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter PayPal email address"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                                <textarea
                                                    value={formData.otherPaymentDetails}
                                                    onChange={(e) => setFormData({ ...formData, otherPaymentDetails: e.target.value })}
                                                    rows="2"
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter any additional details..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Weixin/WeChat Pay */}
                                {formData.modeOfPayment === 'WEIXIN' && (
                                    <div className="p-4 bg-green-50 rounded border border-green-200">
                                        <h4 className="font-medium text-gray-900 mb-3">Weixin/WeChat Pay Details</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    WeChat Pay Account <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.weixinAccount}
                                                    onChange={(e) => setFormData({ ...formData, weixinAccount: e.target.value })}
                                                    required={formData.modeOfPayment === 'WEIXIN'}
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter WeChat ID or phone number"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                                <textarea
                                                    value={formData.otherPaymentDetails}
                                                    onChange={(e) => setFormData({ ...formData, otherPaymentDetails: e.target.value })}
                                                    rows="2"
                                                    disabled={actionLoading}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                                    placeholder="Enter any additional details..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Other Payment Method */}
                                {formData.modeOfPayment === 'OTHER' && (
                                    <div className="p-4 bg-white rounded border border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-3">Other Payment Details</h4>
                                        <textarea
                                            value={formData.otherPaymentDetails}
                                            onChange={(e) => setFormData({ ...formData, otherPaymentDetails: e.target.value })}
                                            rows="4"
                                            disabled={actionLoading}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                            placeholder="Enter payment details..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierManagement;