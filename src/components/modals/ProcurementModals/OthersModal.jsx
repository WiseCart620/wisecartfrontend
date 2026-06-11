import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, FileText, Eye, Download } from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { getFileUrl, getFileDownloadUrl } from '../../../utils/fileUtils';

const PARTICULARS_OPTIONS = ['Customs (VAT)', 'Customs (Others)', 'Tip', 'Labor', 'Others'];

const OthersModal = ({ purchaseOrder, onClose, onSuccess }) => {
    const [items, setItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState({});

    useEffect(() => {
        loadExisting();
    }, [purchaseOrder]);

    const loadExisting = async () => {
        try {
            const res = await api.get(`/other-charges/purchase-order/${purchaseOrder.id}`);
            if (res.success && res.data?.data?.items && res.data.data.items.length > 0) {
                setItems(res.data.data.items.map((item, idx) => ({
                    ...item,
                    _key: idx,
                    date: item.date || (item.createdAt ? item.createdAt.split('T')[0] : '')
                })));
            } else {
                setItems([{
                    _key: Date.now(),
                    particulars: '',
                    customLabel: '',
                    cost: '',
                    date: '',
                    commercialInvoiceUrl: null,
                    proofOfPaymentUrl: null
                }]);
            }
        } catch (e) {
            setItems([{
                _key: Date.now(),
                particulars: '',
                customLabel: '',
                cost: '',
                date: '',
                commercialInvoiceUrl: null,
                proofOfPaymentUrl: null
            }]);
        }
    };

    const addItem = () => {
        setItems(prev => [...prev, {
            _key: Date.now(),
            particulars: '',
            customLabel: '',
            cost: '',
            date: '',
            commercialInvoiceUrl: null,
            proofOfPaymentUrl: null,
            _ciFile: null,
            _popFile: null
        }]);
    };

    const removeItem = (key) => {
        setItems(prev => prev.filter(i => i._key !== key));
    };

    const updateItem = (key, field, value) => {
        setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i));
    };

    const handleFileUpload = async (key, docType, file) => {
        if (!file) return;
        setUploadingFiles(prev => ({ ...prev, [`${key}_${docType}`]: true }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', `other_${docType}`);
            const endpoint = file.type === 'application/pdf' || file.type.includes('word') ? '/upload/document' : '/upload/image';
            const res = await api.upload(endpoint, formData);
            if (res.success) {
                const url = res.data?.data?.url || res.data?.url;
                const field = docType === 'ci' ? 'commercialInvoiceUrl' : 'proofOfPaymentUrl';
                updateItem(key, field, url);
                toast.success('File uploaded');
            }
        } catch (e) {
            toast.error('Upload failed');
        } finally {
            setUploadingFiles(prev => ({ ...prev, [`${key}_${docType}`]: false }));
        }
    };

    const total = items.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                items: items.map(i => ({
                    particulars: i.particulars === 'Others' ? 'Others' : i.particulars,
                    customLabel: i.particulars === 'Others' ? i.customLabel : null,
                    cost: parseFloat(i.cost) || 0,
                    date: i.date || null,
                    commercialInvoiceUrl: i.commercialInvoiceUrl || null,
                    proofOfPaymentUrl: i.proofOfPaymentUrl || null
                }))
            };
            const res = await api.post(`/other-charges/purchase-order/${purchaseOrder.id}`, payload);
            if (res.success) {
                toast.success('Other charges saved');
                onSuccess();
                onClose();
            } else {
                toast.error(res.message || 'Failed to save');
            }
        } catch (e) {
            toast.error('Failed to save other charges');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-gray-900">Other Charges — {purchaseOrder?.controlNumber}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {items.map((item, idx) => (
                        <div key={item._key} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-600">#{idx + 1}</span>
                                <button type="button" onClick={() => removeItem(item._key)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Particulars *</label>
                                    <select
                                        value={item.particulars}
                                        onChange={e => updateItem(item._key, 'particulars', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {PARTICULARS_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Cost (PHP) *</label>
                                    <input
                                        type="number"
                                        value={item.cost}
                                        onChange={e => updateItem(item._key, 'cost', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={item.date || ''}
                                    onChange={e => updateItem(item._key, 'date', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {item.particulars === 'Others' && (
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Custom Label *</label>
                                    <input
                                        type="text"
                                        value={item.customLabel}
                                        onChange={e => updateItem(item._key, 'customLabel', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="Describe this charge..."
                                        required
                                    />
                                </div>
                            )}

                            {/* Document uploads */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'ci', label: 'Commercial Invoice', field: 'commercialInvoiceUrl' },
                                    { key: 'pop', label: 'Proof of Payment', field: 'proofOfPaymentUrl' }
                                ].map(({ key: dk, label, field }) => (
                                    <div key={dk}>
                                        <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                                        {!item[field] ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                    onChange={e => { if (e.target.files[0]) handleFileUpload(item._key, dk, e.target.files[0]); }}
                                                    disabled={uploadingFiles[`${item._key}_${dk}`]}
                                                    className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                                                />
                                                {uploadingFiles[`${item._key}_${dk}`] && (
                                                    <span className="text-xs text-blue-600"><Loader2 size={10} className="inline animate-spin" /> Uploading...</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-200">
                                                <FileText size={12} className="text-green-600" />
                                                <span className="text-xs text-gray-700 flex-1 truncate">{label}</span>
                                                <a href={getFileUrl(item[field])} target="_blank" rel="noopener noreferrer" className="p-0.5 text-blue-600 hover:bg-blue-100 rounded"><Eye size={12} /></a>
                                                <a href={getFileDownloadUrl(item[field])} download className="p-0.5 text-green-600 hover:bg-green-100 rounded"><Download size={12} /></a>
                                                <button type="button" onClick={() => updateItem(item._key, field, null)} className="p-0.5 text-red-600 hover:bg-red-100 rounded"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addItem}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Charge
                    </button>

                    {/* Total */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <span className="text-sm font-semibold text-gray-700">Total Other Charges</span>
                        <span className="text-lg font-bold text-gray-900">
                            ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex gap-3 pt-2 border-t">
                        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Charges'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OthersModal;