import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, FileText, Eye, Download } from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { getFileUrl, getFileDownloadUrl } from '../../../utils/fileUtils';

const ShippingModal = ({ purchaseOrder, onClose, onSuccess }) => {
    const [forwarders, setForwarders] = useState([]);
    const [selectedForwarderId, setSelectedForwarderId] = useState('');
    const [agentInfo, setAgentInfo] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [usdAmount, setUsdAmount] = useState('');
    const [phpAmount, setPhpAmount] = useState('');
    const [loadingRate, setLoadingRate] = useState(false);
    const [items, setItems] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({
        commercialInvoice: null,
        proofOfPayment: null,
        packingList: null
    });
    const [uploadingFiles, setUploadingFiles] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadForwarders();
        if (purchaseOrder?.items) {
            setItems(purchaseOrder.items.map(item => ({
                purchaseOrderItemId: item.id,
                productName: item.productName,
                sku: item.sku,
                upc: item.upc,
                variation: item.variation,
                qty: item.qty,
                cbm: '',
                allocationPercent: ''
            })));
        }
        loadExisting();
    }, [purchaseOrder]);

    const loadExisting = async () => {
        try {
            const res = await api.get(`/shipping-costs/purchase-order/${purchaseOrder.id}`);
            if (res.success && res.data?.data) {
                const d = res.data.data;
                setSelectedForwarderId(d.forwarderId || '');
                setUsdAmount(d.usdAmount || '');
                setPhpAmount(d.phpAmount || '');
                if (d.forwarderId) loadAgentInfo(d.forwarderId);
                if (d.items) setItems(d.items.map(i => ({
                    ...i,
                    cbm: i.cbm || '',
                    allocationPercent: i.allocationPercent || ''
                })));
                setUploadedFiles({
                    commercialInvoice: d.commercialInvoiceUrl ? { url: d.commercialInvoiceUrl, name: 'Commercial Invoice' } : null,
                    proofOfPayment: d.proofOfPaymentUrl ? { url: d.proofOfPaymentUrl, name: 'Proof of Payment' } : null,
                    packingList: d.packingListUrl ? { url: d.packingListUrl, name: 'Packing List' } : null
                });
            }
        } catch (e) { }
    };

    const loadForwarders = async () => {
        try {
            const res = await api.get('/suppliers');
            if (res.success) {
                const all = Array.isArray(res.data) ? res.data : [];
                setForwarders(all.filter(s => s.type?.toLowerCase() === 'forwarder'));
            }
        } catch (e) { }
    };

    const loadAgentInfo = async (id) => {
        try {
            const res = await api.get('/suppliers');
            if (res.success) {
                const all = Array.isArray(res.data) ? res.data : [];
                const found = all.find(s => s.id === parseInt(id));
                if (found) setAgentInfo(found);
            }
        } catch (e) { }
    };

    const fetchExchangeRate = async () => {
        setLoadingRate(true);
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            const rate = data?.rates?.PHP;
            if (rate) setExchangeRate(rate);
        } catch (e) {
            setExchangeRate(56); // fallback
        } finally {
            setLoadingRate(false);
        }
    };

    const handleUsdChange = (val) => {
        setUsdAmount(val);
    };

    const handleForwarderSelect = (id) => {
        setSelectedForwarderId(id);
        setShowDropdown(false);
        loadAgentInfo(id);
    };

    const handleItemChange = (idx, field, value) => {
        const updated = [...items];
        updated[idx][field] = value;
        setItems(updated);
    };

    const totalPercent = items.reduce((sum, i) => sum + (parseFloat(i.allocationPercent) || 0), 0);

    const handleFileUpload = async (file, docType) => {
        if (!file) return;
        setUploadingFiles(prev => ({ ...prev, [docType]: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', `shipping_${docType}`);
            const endpoint = file.type === 'application/pdf' || file.type.includes('word')
                ? '/upload/document' : '/upload/image';
            const res = await api.upload(endpoint, formData);
            if (res.success) {
                const url = res.data?.data?.url || res.data?.url;
                setUploadedFiles(prev => ({ ...prev, [docType]: { url, name: file.name } }));
                toast.success(`${docType} uploaded`);
            }
        } catch (e) {
            toast.error('Upload failed');
        } finally {
            setUploadingFiles(prev => ({ ...prev, [docType]: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedForwarderId) { toast.error('Select a forwarder'); return; }
        if (!usdAmount) { toast.error('Enter shipping cost in USD'); return; }
        if (Math.round(totalPercent) !== 100 && items.length > 0) {
            toast.error(`Allocation must total 100%. Currently: ${totalPercent.toFixed(1)}%`);
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                forwarderId: parseInt(selectedForwarderId),
                usdAmount: parseFloat(usdAmount),
                phpAmount: parseFloat(phpAmount),
                commercialInvoiceUrl: uploadedFiles.commercialInvoice?.url || null,
                proofOfPaymentUrl: uploadedFiles.proofOfPayment?.url || null,
                packingListUrl: uploadedFiles.packingList?.url || null,
                items: items.map(i => ({
                    purchaseOrderItemId: i.purchaseOrderItemId,
                    productName: i.productName,
                    sku: i.sku,
                    upc: i.upc,
                    variation: i.variation,
                    qty: i.qty,
                    cbm: parseFloat(i.cbm) || 0,
                    allocationPercent: parseFloat(i.allocationPercent) || 0
                }))
            };
            const res = await api.post(`/shipping-costs/purchase-order/${purchaseOrder.id}`, payload);
            if (res.success) {
                toast.success('Shipping cost saved');
                onSuccess();
                onClose();
            } else {
                toast.error(res.message || 'Failed to save');
            }
        } catch (e) {
            toast.error('Failed to save shipping cost');
        } finally {
            setSubmitting(false);
        }
    };

    const docTypes = [
        { key: 'commercialInvoice', label: 'Commercial Invoice' },
        { key: 'proofOfPayment', label: 'Proof of Payment' },
        { key: 'packingList', label: 'Packing List' }
    ];

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-gray-900">Shipping Cost — {purchaseOrder?.controlNumber}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Forwarder Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Forwarding Agent <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                {selectedForwarderId
                                    ? forwarders.find(f => f.id === parseInt(selectedForwarderId))?.name || 'Select forwarder'
                                    : 'Select forwarder'}
                            </button>
                            {showDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {forwarders.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500">No forwarders found</div>
                                    ) : forwarders.map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => handleForwarderSelect(f.id)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                        >
                                            {f.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agent Info */}
                    {agentInfo && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <h3 className="font-semibold text-gray-800 mb-2">Forwarding Agent Details</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-500">Company:</span> <span className="font-medium">{agentInfo.name}</span></div>
                                <div><span className="text-gray-500">Contact Person:</span> <span className="font-medium">{agentInfo.contactPerson || '-'}</span></div>
                                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{agentInfo.email || '-'}</span></div>
                                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{agentInfo.contactNo || '-'}</span></div>
                                <div><span className="text-gray-500">Address / Port:</span> <span className="font-medium">{agentInfo.address || '-'}</span></div>
                            </div>
                        </div>
                    )}

                    {/* Shipping Cost */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipping Cost</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">USD Amount *</label>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    <span className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium">$</span>
                                    <input
                                        type="number"
                                        value={usdAmount}
                                        onChange={e => handleUsdChange(e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm outline-none"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">PHP Amount</label>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    <span className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium">₱</span>
                                    <input
                                        type="number"
                                        value={phpAmount}
                                        onChange={e => setPhpAmount(e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm outline-none"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Details per Product */}
                    {items.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-gray-700">Shipping Details per Product</h3>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${Math.abs(totalPercent - 100) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    Total: {totalPercent.toFixed(1)}% {Math.abs(totalPercent - 100) < 0.01 ? '✓' : '(must be 100%)'}
                                </span>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CBM</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">% Allocation</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">PHP Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item, idx) => {
                                            const allocated = phpAmount && item.allocationPercent
                                                ? (parseFloat(phpAmount) * parseFloat(item.allocationPercent) / 100).toFixed(2)
                                                : '0.00';
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-gray-900">{item.productName}</div>
                                                        {item.variation && <div className="text-xs text-gray-500">{item.variation}</div>}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">{item.qty}</td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            value={item.cbm}
                                                            onChange={e => handleItemChange(idx, 'cbm', e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                                                            placeholder="0.00"
                                                            min="0"
                                                            step="0.0001"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={item.allocationPercent}
                                                                onChange={e => handleItemChange(idx, 'allocationPercent', e.target.value)}
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                                                placeholder="0"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                            />
                                                            <span className="text-xs text-gray-500">%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                        ₱{parseFloat(allocated).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Documents</h3>
                        <div className="space-y-3">
                            {docTypes.map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-3">
                                    <label className="text-sm text-gray-600 w-44">{label}:</label>
                                    {!uploadedFiles[key] ? (
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0], key); }}
                                                disabled={uploadingFiles[key]}
                                                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {uploadingFiles[key] && <span className="text-xs text-blue-600 ml-2"><Loader2 size={12} className="inline animate-spin" /> Uploading...</span>}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded border border-green-200">
                                            <FileText size={14} className="text-green-600" />
                                            <span className="text-sm text-gray-700 flex-1">{uploadedFiles[key].name}</span>
                                            <a href={getFileUrl(uploadedFiles[key].url)} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Eye size={14} /></a>
                                            <a href={getFileDownloadUrl(uploadedFiles[key].url)} download className="p-1 text-green-600 hover:bg-green-100 rounded"><Download size={14} /></a>
                                            <button type="button" onClick={() => setUploadedFiles(prev => ({ ...prev, [key]: null }))} className="p-1 text-red-600 hover:bg-red-100 rounded"><X size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Shipping Cost'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShippingModal;