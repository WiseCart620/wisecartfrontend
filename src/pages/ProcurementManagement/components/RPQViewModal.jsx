import React, { useState } from 'react';
import {
    X, Upload, FileText, Eye, Download, Loader2, Check
} from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatNumberWithCommas, formatNumber } from '../../../utils/procurementUtils';
import { getFileUrl, getFileDownloadUrl } from '../../../utils/fileUtils';

const RPQViewModal = ({ rpq, onClose, onRefresh, onConfirmSuccess }) => {
    const [uploadingFiles, setUploadingFiles] = useState({
        rpq: false,
        commercialInvoice: false,
        salesContract: false,
        packingList: false
    });
    const [buttonLoading, setButtonLoading] = useState(false);
    const [viewingRpq, setViewingRpq] = useState(rpq);

    // Update viewingRpq when rpq prop changes
    React.useEffect(() => {
        setViewingRpq(rpq);
    }, [rpq]);

    const getDocumentLabel = (type) => {
        const labels = {
            rpq: 'RPQ',
            commercialInvoice: 'Commercial Invoice',
            salesContract: 'Sales Contract',
            packingList: 'Packing List'
        };
        return labels[type] || type;
    };

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

                const updatePayload = {
                    ...viewingRpq,
                    documents: {
                        ...(viewingRpq.documents || {}),
                        [documentType]: fileUrl
                    }
                };

                const response = await api.put(`/quotation-requests/${viewingRpq.id}`, updatePayload);

                if (response.success) {
                    toast.success(`${getDocumentLabel(documentType)} uploaded and saved successfully`);

                    // Refresh the data
                    const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                    if (updatedRpq.success) {
                        setViewingRpq(updatedRpq.data);
                        if (onRefresh) onRefresh();
                    }
                } else {
                    throw new Error('Failed to save document to database');
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

    const handleRemoveDocument = async (documentType) => {
        if (!window.confirm('Remove this document?')) return;

        try {
            const response = await api.put(`/quotation-requests/${viewingRpq.id}`, {
                ...viewingRpq,
                documents: {
                    ...viewingRpq.documents,
                    [documentType]: null
                }
            });

            if (response.success) {
                toast.success('Document removed');
                const updatedRpq = await api.get(`/quotation-requests/${viewingRpq.id}`);
                if (updatedRpq.success) {
                    setViewingRpq(updatedRpq.data);
                    if (onRefresh) onRefresh();
                }
            }
        } catch (error) {
            toast.error('Failed to remove document');
        }
    };

    const handleConfirmProduct = async () => {
        if (!window.confirm('Confirm this product quotation?')) return;

        setButtonLoading(true);

        try {
            const response = await api.patch(`/quotation-requests/${viewingRpq.id}`, { status: 'CONFIRMED' });

            if (response.success) {
                const poResponse = await api.post(`/purchase-orders/from-quotation/${viewingRpq.id}`, {});

                if (poResponse.success) {
                    toast.success('Product confirmed and purchase order created');
                    window.dispatchEvent(new CustomEvent('quotationConfirmed'));
                    window.dispatchEvent(new CustomEvent('productUpdated'));

                    if (onConfirmSuccess) onConfirmSuccess();
                } else {
                    toast.error('Failed to create purchase order');
                }
            } else {
                toast.error('Failed to confirm quotation status');
            }
        } catch (error) {
            console.error('Confirm error:', error);
            if (!error.message?.includes('confirmed')) {
                toast.error(`Failed to confirm quotation: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setButtonLoading(false);
        }
    };

    if (!viewingRpq) return null;

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Quotation Request Details</h2>
                    <button
                        onClick={onClose}
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

                    {/* Required Documents */}
                    <div className="mb-4 p-3 border border-gray-300 rounded-lg">
                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Upload size={18} />
                            Required Documents
                        </h3>
                        <div className="space-y-3">
                            {['rpq', 'commercialInvoice', 'salesContract', 'packingList'].map((docType) => (
                                <div key={docType} className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700 w-48">
                                        Upload {getDocumentLabel(docType)}:
                                    </label>
                                    {!viewingRpq.documents?.[docType] ? (
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        await handleDocumentUpload(file, docType);
                                                    }
                                                }}
                                                disabled={uploadingFiles[docType]}
                                                className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                            />
                                            {uploadingFiles[docType] && (
                                                <span className="ml-2 text-xs text-blue-600">
                                                    <Loader2 size={14} className="inline animate-spin mr-1" />
                                                    Uploading...
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 bg-green-50 px-3 py-2 rounded border border-green-200">
                                            <FileText size={16} className="text-green-600" />
                                            <span className="text-sm text-gray-700 flex-1">{getDocumentLabel(docType)}</span>
                                            <a
                                                href={getFileUrl(viewingRpq.documents[docType])}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            <a
                                                href={getFileDownloadUrl(viewingRpq.documents[docType])}
                                                download
                                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </a>
                                            <button
                                                onClick={() => handleRemoveDocument(docType)}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Remove"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requestor */}
                    <div className="mb-4">
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
                    </div>

                    {/* Confirm Button */}
                    {viewingRpq.status !== 'CONFIRMED' && (
                        <div className="pt-4 border-t">
                            {(() => {
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
                                            onClick={handleConfirmProduct}
                                            disabled={!isComplete || buttonLoading}
                                            className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isComplete
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                } disabled:opacity-50`}
                                            title={!isComplete ? 'Complete all required fields to confirm' : 'Confirm this quotation'}
                                        >
                                            {buttonLoading ? (
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default RPQViewModal;