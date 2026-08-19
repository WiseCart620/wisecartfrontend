// src/components/modals/ProcurementModals/RPQModal.jsx
import React, { useState, useEffect } from 'react';
import {
    X, Download, Upload, FileText, Eye, Loader2
} from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import {
    formatNumberWithCommas,
    parseFormattedNumber,
    handleCalculatorInput
} from '../../../utils/procurementUtils';
import { getFileUrl, getFileDownloadUrl } from '../../../utils/fileUtils';

const RPQModal = ({ editingRpq, onClose, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [rpqFormData, setRpqFormData] = useState({
        supplierId: '',
        supplierName: '',
        supplierInfo: {},
        items: [],
        moq: '',
        initialPaymentAmount: '',
        finalPaymentAmount: '',
        initialPaymentPercent: '',
        finalPaymentPercent: '',
        productionLeadTime: '',
        productionDetails: '',
        paymentInstruction: ''
    });

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

    // Initialize form data when editingRpq changes
    useEffect(() => {
        if (editingRpq) {
            setRpqFormData({
                supplierId: editingRpq.supplierId,
                supplierName: editingRpq.supplierName,
                supplierInfo: editingRpq.supplierInfo || {},
                items: editingRpq.items?.map(item => ({
                    ...item,
                    uom: item.uom || 'PCS',
                    unitPrice: item.unitPrice
                        ? parseFloat(item.unitPrice).toFixed(4)
                        : '0.0000',
                    totalAmount: item.totalAmount || ''
                })) || [],
                moq: editingRpq.moq || '',
                initialPaymentAmount: editingRpq.initialPaymentAmount || '',
                finalPaymentAmount: editingRpq.finalPaymentAmount || '',
                initialPaymentPercent: editingRpq.initialPaymentPercent || '',
                finalPaymentPercent: editingRpq.finalPaymentPercent || '',
                productionLeadTime: editingRpq.productionLeadTime || '',
                productionDetails: editingRpq.productionDetails || '',
                paymentInstruction: editingRpq.paymentInstruction || ''
            });

            if (editingRpq.documents) {
                setUploadedFiles({
                    rpq: editingRpq.documents.rpq ? { url: editingRpq.documents.rpq, name: 'RPQ Document' } : null,
                    commercialInvoice: editingRpq.documents.commercialInvoice ? { url: editingRpq.documents.commercialInvoice, name: 'Commercial Invoice' } : null,
                    salesContract: editingRpq.documents.salesContract ? { url: editingRpq.documents.salesContract, name: 'Sales Contract' } : null,
                    packingList: editingRpq.documents.packingList ? { url: editingRpq.documents.packingList, name: 'Packing List' } : null
                });
            }
        }
    }, [editingRpq]);

    const recalculatePaymentAmounts = (updatedItems) => {
        const grandTotal = updatedItems.reduce((sum, item) => {
            const unitPrice = parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0;
            const qty = parseInt(item.qty) || 0;
            return sum + (unitPrice * qty);
        }, 0);

        if (rpqFormData.initialPaymentPercent) {
            const initialPercent = parseFloat(rpqFormData.initialPaymentPercent) || 0;
            const finalPercent = initialPercent > 0 ? Math.max(0, 100 - initialPercent) : '';

            setRpqFormData(prev => ({
                ...prev,
                items: updatedItems,
                initialPaymentAmount: (grandTotal * initialPercent) / 100,
                finalPaymentPercent: finalPercent === '' ? '' : finalPercent.toString(),
                finalPaymentAmount: finalPercent === '' ? 0 : (grandTotal * finalPercent) / 100
            }));
        } else {
            setRpqFormData(prev => ({ ...prev, items: updatedItems }));
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

                setUploadedFiles(prev => ({
                    ...prev,
                    [documentType]: {
                        url: fileUrl,
                        name: file.name,
                        type: file.type
                    }
                }));

                if (editingRpq) {
                    const updatePayload = {
                        ...editingRpq,
                        documents: {
                            ...(editingRpq.documents || {}),
                            [documentType]: fileUrl
                        }
                    };

                    const response = await api.put(`/quotation-requests/${editingRpq.id}`, updatePayload);

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

    const handleRemoveDocument = (documentType) => {
        setUploadedFiles(prev => ({
            ...prev,
            [documentType]: null
        }));
        toast.success(`${getDocumentLabel(documentType)} removed`);
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
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error updating quotation:', error);
            toast.error(error.response?.data?.message || 'Failed to update quotation request');
        } finally {
            setSubmitting(false);
        }
    };

    if (!editingRpq) return null;

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto modal-fit">
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
        .min-h-\\[20px\\] { min-height: 20px; }
        .border-b { border-bottom: 1px solid #000; }
        .pb-1 { padding-bottom: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .text-\\[9px\\] { font-size: 9px !important; }
        td .text-\\[9px\\] { font-size: 9px !important; }
        .mt-0\\.5 { margin-top: 2px; }
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
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
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

                        {/* Products Table */}
                        {rpqFormData.items && rpqFormData.items.length > 0 && (
                            <div className="mb-4 table-panel">
                                <h3 className="font-bold text-gray-900 mb-2 section-title">Products</h3>
                                <div className="overflow-x-auto table-fit" style={{ maxHeight: '320px' }}>
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
                                                        <div className="text-[11px] text-gray-500 mt-0.5">SKU: {item.sku || '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">{item.variation || '-'}</td>
                                                    <td className="px-3 py-2 text-xs border border-gray-300">{item.upc || '-'}</td>
                                                    <td className="px-3 py-2 border border-gray-300">
                                                        <input
                                                            type="text"
                                                            value="PCS"
                                                            onChange={() => { }}
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
                                                            value={formatNumberWithCommas(item.unitPrice || '0.0000')}
                                                            onChange={() => { }} // Add this to silence the warning
                                                            onKeyDown={(e) => {
                                                                e.preventDefault();
                                                                const newItems = [...rpqFormData.items];
                                                                let newValue;

                                                                if (e.key === 'Backspace' || e.key === 'Delete') {
                                                                    newValue = handleCalculatorInput(item.unitPrice || '0.0000', '', true, 4);
                                                                } else if (e.key >= '0' && e.key <= '9') {
                                                                    newValue = handleCalculatorInput(item.unitPrice || '0.0000', e.key, false, 4);
                                                                } else if (e.key === 'Tab' || e.key === 'Enter') {
                                                                    return;
                                                                } else {
                                                                    return;
                                                                }

                                                                const unitPrice = parseFloat(newValue);
                                                                const qty = parseInt(newItems[idx].qty) || 0;

                                                                newItems[idx] = {
                                                                    ...newItems[idx],
                                                                    unitPrice: newValue,
                                                                    totalAmount: unitPrice * qty
                                                                };
                                                                recalculatePaymentAmounts(newItems);
                                                            }}
                                                            className="w-24 px-2 py-1 border border-gray-300 rounded text-xs no-print text-right"
                                                            placeholder="0.0000"
                                                        />
                                                        <span className="hidden print:inline text-xs">
                                                            {item.unitPrice && parseFloat(item.unitPrice) > 0 ? `$${formatNumberWithCommas(parseFloat(item.unitPrice).toFixed(4))}` : ''}
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
                                                <td colSpan="4" className="px-3 py-2 text-right font-bold text-sm border border-gray-300">TOTAL QTY:</td>
                                                <td className="px-3 py-2 font-bold text-sm border border-gray-300 text-right">
                                                    {rpqFormData.items.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0).toLocaleString('en-US')}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-sm border border-gray-300">GRAND TOTAL:</td>
                                                <td className="px-3 py-2 font-bold text-sm border border-gray-300 text-right">
                                                    ${formatNumberWithCommas(rpqFormData.items.reduce((sum, item) =>
                                                        sum + ((parseFloat(parseFormattedNumber(item.unitPrice || 0)) || 0) * (parseInt(item.qty) || 0)), 0
                                                    ).toFixed(2))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="mb-4 p-3 border border-gray-300 rounded-lg section">
                            <h3 className="font-bold text-gray-900 mb-2 section-title">Payment Arrangement</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mt-2">
                                    <label className="text-xs font-semibold label whitespace-nowrap w-[110px]">Initial Payment:</label>
                                    <input
                                        type="number"
                                        value={rpqFormData.initialPaymentPercent || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
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
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-medium no-print w-[40px]">% = $</span>
                                    <input
                                        type="text"
                                        value={formatNumberWithCommas(
                                            rpqFormData.initialPaymentAmount
                                                ? Number(rpqFormData.initialPaymentAmount).toFixed(2)
                                                : '0.00'
                                        )}
                                        onChange={() => { }}
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
                                    <label className="text-xs font-semibold label whitespace-nowrap w-[110px]">Final Payment:</label>
                                    <input
                                        type="text"
                                        value={rpqFormData.finalPaymentPercent || ''}
                                        onChange={() => { }}
                                        readOnly
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs no-print bg-gray-100 cursor-not-allowed text-right"
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-medium no-print w-[40px]">% = $</span>
                                    <input
                                        type="text"
                                        value={formatNumberWithCommas(
                                            rpqFormData.finalPaymentAmount
                                                ? Number(rpqFormData.finalPaymentAmount).toFixed(2)
                                                : '0.00'
                                        )}
                                        onChange={() => { }}
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

                        {/* Payment Method */}
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

                        {/* Production Details */}
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
                            <div className="text-xs info-row">
                                <span className="font-semibold label">Requestor: </span>
                                <span>{editingRpq?.requestor || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Document Uploads Section */}
                    <div className="mb-4 p-3 border border-gray-300 rounded-lg section no-print">
                        <h3 className="font-bold text-gray-900 mb-2 section-title flex items-center gap-2">
                            <Upload size={18} />
                            Required Documents
                        </h3>
                        <div className="space-y-3">
                            {['rpq', 'commercialInvoice', 'salesContract', 'packingList'].map((docType) => (
                                <div key={docType} className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700 w-48">
                                        Upload {getDocumentLabel(docType)}:
                                    </label>
                                    {!uploadedFiles[docType] ? (
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) handleDocumentUpload(file, docType);
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
                                            <span className="text-sm text-gray-700 flex-1">{uploadedFiles[docType].name}</span>
                                            <a
                                                href={getFileUrl(uploadedFiles[docType].url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            <a
                                                href={getFileDownloadUrl(uploadedFiles[docType].url)}
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

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4 border-t no-print">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Quotation'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RPQModal;