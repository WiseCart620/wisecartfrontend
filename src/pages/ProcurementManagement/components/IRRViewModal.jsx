import React from 'react';
import { X } from 'lucide-react';

const IRRViewModal = ({ irr, onClose, formatNumber }) => {
    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-fit">
                <div className="border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                        <div>
                            <span className="text-sm text-gray-600">Control Number:</span>
                            <p className="font-semibold text-gray-900">{irr.controlNumber}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Requestor:</span>
                            <p className="font-semibold text-gray-900">{irr.requestor}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Status:</span>
                            <p className="font-semibold text-gray-900">{irr.status || 'PENDING'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">Date:</span>
                            <p className="font-semibold text-gray-900">
                                {irr.createdAt ? new Date(irr.createdAt).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Supplier Information */}
                    {irr.supplierName && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-gray-900 mb-3">Supplier Information</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Supplier Name:</span>
                                    <p className="font-semibold text-gray-900">{irr.supplierName}</p>
                                </div>
                                {irr.supplierInfo?.contactPerson && (
                                    <div>
                                        <span className="text-gray-600">Contact Person:</span>
                                        <p className="font-semibold text-gray-900">{irr.supplierInfo.contactPerson}</p>
                                    </div>
                                )}
                                {irr.supplierInfo?.contactNo && (
                                    <div>
                                        <span className="text-gray-600">Contact Number:</span>
                                        <p className="font-semibold text-gray-900">{irr.supplierInfo.contactNo}</p>
                                    </div>
                                )}
                                {irr.supplierInfo?.email && (
                                    <div>
                                        <span className="text-gray-600">Email:</span>
                                        <p className="font-semibold text-gray-900 break-all">{irr.supplierInfo.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products Table */}
                    {irr.items && irr.items.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Products</h3>
                            <div className="border rounded-lg overflow-hidden table-panel">
                                <div className="overflow-x-auto table-fit" style={{ maxHeight: '260px' }}>
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                                jsx
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UPC</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Variation</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {irr.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                                                    <td className="px-4 py-2 text-sm">{item.sku || '-'}</td>
                                                    <td className="px-4 py-2 text-sm">{item.upc || '-'}</td>
                                                    <td className="px-4 py-2 text-sm">{item.variation || '-'}</td>
                                                    <td className="px-4 py-2 text-sm">{item.qty ? formatNumber(item.qty) : '-'} PCS</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {irr.remarks && (
                        <div>
                            <span className="text-sm text-gray-600">Remarks:</span>
                            <p className="font-semibold text-gray-900 mt-1">{irr.remarks}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IRRViewModal;