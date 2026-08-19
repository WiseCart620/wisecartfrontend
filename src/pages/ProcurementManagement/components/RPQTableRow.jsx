import React from 'react';
import { ChevronDown, ChevronRight, Eye, Edit2, Trash2, Loader2 } from 'lucide-react';

const RPQTableRow = ({
    req,
    handleDeleteRpq,
    setViewingRpq,
    setEditingRpq,
    setShowRpqModal,
    expandedRpqRows,
    toggleRpqRow,
    buttonLoading,
    formatNumber
}) => {
    return (
        <tr key={req.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 font-medium text-gray-900">{req.controlNumber}</td>
            <td className="px-6 py-4 text-gray-900">{req.requestor}</td>
            <td className="px-6 py-4 text-gray-900">{req.supplierName}</td>
            <td className="px-6 py-4">
                {req.items && req.items.length > 0 ? (
                    req.items.length === 1 ? (
                        <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                                {req.items[0].productName} - {formatNumber(req.items[0].qty)} {req.items[0].uom}
                            </div>
                            {req.items[0].variation && (
                                <div className="text-xs text-gray-500 mt-0.5">{req.items[0].variation}</div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm">
                            <button
                                onClick={() => toggleRpqRow(req.id)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {expandedRpqRows[req.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                {req.items.length} products
                            </button>
                            {expandedRpqRows[req.id] && (
                                <div className="mt-2 space-y-1.5 pl-5 border-l-2 border-blue-200">
                                    {req.items.map((item, idx) => (
                                        <div key={idx}>
                                            <div className="text-gray-900 font-medium">
                                                {item.productName} - {formatNumber(item.qty)} {item.uom}
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
                {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium badge-nowrap ${req.status === 'CONFIRMED'
                    ? 'bg-green-100 text-green-800'
                    : req.status === 'PENDING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                    {req.status || 'DRAFT'}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => setViewingRpq(req)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Eye size={18} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingRpq(req);
                            setShowRpqModal(true);
                        }}
                        disabled={req.status === 'CONFIRMED'}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDeleteRpq(req.id)}
                        disabled={req.status === 'CONFIRMED' || buttonLoading[`delete-rpq-${req.id}`]}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {buttonLoading[`delete-rpq-${req.id}`] ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Trash2 size={18} />
                        )}
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default RPQTableRow;