import React, { useState } from 'react';
import {
    Search, X, Package, Calendar, Clock, CheckCircle, Truck,
    Check, FileText, Trash2, ChevronDown, ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { parseDate } from '../../utils/dateUtils';
import { getTransactionDisplayInfo, getQuantityDisplay } from '../../utils/transactionHelpers';

const ProductTransactionsModal = ({
    product,
    transactions,
    isOpen,
    onClose,
    showStockDetails = true,
    warehouseStocks = [],
    branchStocks = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showSaleTimeline, setShowSaleTimeline] = useState(false);
    const [showDeliveryTimeline, setShowDeliveryTimeline] = useState(false);
    const [showDeletedFilter, setShowDeletedFilter] = useState('ALL');
    const [expandedRows, setExpandedRows] = useState({});
    const [deletingTransactionId, setDeletingTransactionId] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);

    if (!isOpen) return null;

    // Helper functions (extracted from original)
    const groupTransactionsByReference = (transactions) => {
        const grouped = {};

        transactions.forEach(transaction => {
            const refKey = transaction.referenceNumber || `REF-${transaction.referenceId || transaction.id}`;

            if (!grouped[refKey]) {
                grouped[refKey] = [];
            }
            grouped[refKey].push(transaction);
        });

        // Sort each group by date (newest first)
        Object.keys(grouped).forEach(refKey => {
            grouped[refKey].sort((a, b) => {
                const dateA = getCorrectTransactionDate(a);
                const dateB = getCorrectTransactionDate(b);
                return dateB - dateA;
            });

            // Mark versions
            if (grouped[refKey].length > 1) {
                grouped[refKey][0].isLatestVersion = true;
                grouped[refKey][0].hasHistory = true;
                grouped[refKey][0].versionCount = grouped[refKey].length;

                for (let i = 1; i < grouped[refKey].length - 1; i++) {
                    grouped[refKey][i].isPreviousVersion = true;
                }

                grouped[refKey][grouped[refKey].length - 1].isOriginal = true;
            }
        });

        return grouped;
    };


    // Add this helper function if getQuantityDisplay is not imported
    const getQuantityDisplay = (transaction) => {
        const quantity = Math.abs(transaction.quantity || transaction.quantityChanged || 0);
        const action = transaction.action || '';
        const type = transaction.inventoryType || transaction.transactionType || '';

        let sign = '';
        let colorClass = '';

        if (action === 'ADD' || type === 'STOCK_IN' || type === 'RETURN') {
            sign = '+';
            colorClass = 'bg-green-100 text-green-800';
        } else if (action === 'SUBTRACT' || type === 'DAMAGE' || type === 'SALE') {
            sign = '-';
            colorClass = 'bg-red-100 text-red-800';
        } else if (action === 'RESERVE') {
            sign = '⏳';
            colorClass = 'bg-orange-100 text-orange-800';
        } else if (action === 'RELEASE') {
            sign = '↩️';
            colorClass = 'bg-blue-100 text-blue-800';
        } else {
            sign = '±';
            colorClass = 'bg-gray-100 text-gray-800';
        }

        return { quantity, sign, colorClass };
    };

    const getCorrectTransactionDate = (transaction) => {
        let timestamp = null;

        if (transaction.inventoryType === 'SALE' || transaction.transactionType === 'SALE') {
            timestamp = transaction.invoicedAt || transaction.createdAt || transaction.transactionDate;
        } else if (transaction.inventoryType === 'DELIVERY' || transaction.transactionType === 'DELIVERY') {
            timestamp = transaction.deliveredAt || transaction.date || transaction.transactionDate || transaction.createdAt;
        } else {
            timestamp = transaction.verificationDateTime || transaction.transactionDate || transaction.createdAt;
        }

        return parseDate(timestamp);
    };

    const getWarehouseSource = (transaction) => {
        if (!transaction.remarks) return null;

        const fromWarehouseMatch = transaction.remarks.match(/FROM WAREHOUSE: ([^|[\]]+)/);
        if (fromWarehouseMatch) {
            return fromWarehouseMatch[1].trim();
        }

        const fromWarehouseLowerMatch = transaction.remarks.match(/from warehouse: ([^|[\]]+)/);
        if (fromWarehouseLowerMatch) {
            return fromWarehouseLowerMatch[1].trim();
        }

        const fromMatch = transaction.remarks.match(/from: ([^|[\]]+)/);
        if (fromMatch) {
            return fromMatch[1].trim();
        }

        return null;
    };

    const getSaleReference = (transaction) => {
        if (transaction.transactionType === 'SALE' && transaction.referenceNumber) {
            return transaction.referenceNumber;
        }

        if (transaction.remarks && transaction.remarks.includes('SALE-')) {
            const saleMatch = transaction.remarks.match(/SALE-(\d+)/);
            if (saleMatch) {
                return `SALE-${saleMatch[1]}`;
            }
        }

        return null;
    };

    const getTransferDirection = (transaction) => {
        const transactionType = transaction.inventoryType || transaction.transactionType;

        if (transactionType !== 'TRANSFER') return transactionType;

        if ((transaction.fromWarehouse || transaction.fromBranch) &&
            (transaction.toWarehouse || transaction.toBranch)) {
            return 'TRANSFER';
        }

        if ((transaction.toWarehouse || transaction.toBranch) &&
            !(transaction.fromWarehouse || transaction.fromBranch)) {
            return 'TRANSFER_IN';
        }

        if ((transaction.fromWarehouse || transaction.fromBranch) &&
            !(transaction.toWarehouse || transaction.toBranch)) {
            return 'TRANSFER_OUT';
        }

        return 'TRANSFER';
    };

    const getTypeColor = (transaction) => {
        const transactionType = transaction.inventoryType || transaction.transactionType;

        if (transactionType === 'TRANSFER') {
            const transferDirection = getTransferDirection(transaction);
            switch (transferDirection) {
                case 'TRANSFER_IN':
                    return 'bg-teal-100 text-teal-700';
                case 'TRANSFER_OUT':
                    return 'bg-orange-100 text-orange-700';
                default:
                    return 'bg-blue-100 text-blue-700';
            }
        }

        switch (transactionType) {
            case 'STOCK_IN':
                return 'bg-green-100 text-green-700';
            case 'RETURN':
                return 'bg-yellow-100 text-yellow-700';
            case 'DAMAGE':
                return 'bg-red-100 text-red-700';
            case 'DELIVERY':
                return 'bg-purple-100 text-purple-700';
            case 'SALE':
                return 'bg-pink-100 text-pink-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const groupedTransactions = groupTransactionsByReference(transactions);

    const getLatestTransactions = () => {
        const latest = [];
        Object.values(groupedTransactions).forEach(group => {
            latest.push(group[0]);
        });
        return latest;
    };

    const latestTransactions = getLatestTransactions();

    const filteredTransactions = latestTransactions.filter(transaction => {
        const searchLower = searchTerm.toLowerCase();
        const transactionType = transaction.inventoryType || transaction.transactionType;

        const matchesSearch = !searchTerm ||
            transaction.productName?.toLowerCase().includes(searchLower) ||
            transaction.referenceNumber?.toLowerCase().includes(searchLower) ||
            transaction.remarks?.toLowerCase().includes(searchLower) ||
            transactionType.toLowerCase().includes(searchLower);

        const matchesType = filterType === 'ALL' ||
            (() => {
                if (transactionType === 'TRANSFER') {
                    if (filterType === 'TRANSFER_IN') {
                        return transaction.toWarehouse || transaction.toBranch;
                    } else if (filterType === 'TRANSFER_OUT') {
                        return transaction.fromWarehouse || transaction.fromBranch;
                    } else if (filterType === 'TRANSFER') {
                        return true;
                    }
                }

                return transactionType === filterType;
            })();

        const isDeleted = transaction.isDeleted === true || transaction.action === 'DELETED';
        const matchesDeletedFilter = showDeletedFilter === 'ALL' ||
            (showDeletedFilter === 'ACTIVE' && !isDeleted) ||
            (showDeletedFilter === 'DELETED' && isDeleted);

        const transactionDate = getCorrectTransactionDate(transaction);
        if (!transactionDate) return matchesSearch && matchesType && matchesDeletedFilter;
        const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
        const matchesEndDate = !endDate || transactionDate <= new Date(endDate + 'T23:59:59');

        return matchesSearch && matchesType && matchesDeletedFilter && matchesStartDate && matchesEndDate;
    });

    // Sort: Deleted transactions go to the END
    const sortedFilteredTransactions = filteredTransactions.sort((a, b) => {
        const aDeleted = a.isDeleted === true || a.action === 'DELETED';
        const bDeleted = b.isDeleted === true || b.action === 'DELETED';

        // If one is deleted and the other isn't, deleted goes last
        if (aDeleted && !bDeleted) return 1;
        if (!aDeleted && bDeleted) return -1;

        // If both have same deleted status, sort by date (newest first)
        const dateA = getCorrectTransactionDate(a);
        const dateB = getCorrectTransactionDate(b);
        return dateB - dateA;
    });

    const deletedTransactionsCount = filteredTransactions.filter(t =>
        t.isDeleted === true || t.action === 'DELETED'
    ).length;

    const toggleRowExpansion = (transactionId) => {
        setExpandedRows(prev => ({
            ...prev,
            [transactionId]: !prev[transactionId]
        }));
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!window.confirm('Are you sure you want to permanently delete this transaction? This action cannot be undone.')) {
            return;
        }

        try {
            setDeletingTransactionId(transactionId);

            // Call API to delete transaction
            const response = await api.delete(`/transactions/${transactionId}`);

            if (response.success) {
                toast.success('Transaction deleted successfully');

                // Reload data to refresh everything
                if (window.loadData) {
                    await window.loadData();
                }

                onClose();
            } else {
                toast.error('Failed to delete transaction');
            }
        } catch (err) {
            console.error('Failed to delete transaction:', err);
            toast.error('Failed to delete transaction: ' + (err.message || 'Unknown error'));
        } finally {
            setDeletingTransactionId(null);
        }
    };

    const handleDeleteAllDeleted = async () => {
        const deletedTransactions = filteredTransactions.filter(t =>
            t.isDeleted === true || t.action === 'DELETED'
        );

        if (deletedTransactions.length === 0) {
            toast.error('No deleted transactions to remove');
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently delete ${deletedTransactions.length} deleted transaction(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingAll(true);
            let successCount = 0;
            let failCount = 0;

            // Delete each transaction
            for (const transaction of deletedTransactions) {
                try {
                    const response = await api.delete(`/transactions/${transaction.id}`);
                    if (response.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (err) {
                    console.error('Failed to delete transaction:', transaction.id, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully deleted ${successCount} transaction(s)`);
            }

            if (failCount > 0) {
                toast.error(`Failed to delete ${failCount} transaction(s)`);
            }

            // Reload data
            if (window.loadData) {
                await window.loadData();
            }

            onClose();
        } catch (err) {
            console.error('Failed to delete transactions:', err);
            toast.error('Failed to delete transactions: ' + (err.message || 'Unknown error'));
        } finally {
            setDeletingAll(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-[1600px] w-full max-h-[95vh] overflow-hidden flex flex-col">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">Product Movement History</h2>
                        <p className="text-gray-600">
                            {product.productName} - {product.sku}
                            {product.warehouseName && <span className="ml-2 text-blue-600 font-semibold">@ {product.warehouseName}</span>}
                            {product.branchName && <span className="ml-2 text-blue-600 font-semibold">@ {product.branchName}</span>}
                        </p>

                        {/* Stock Summary Section */}
                        {showStockDetails && product && (
                            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">Stock Summary</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Warehouse Stock */}
                                    {product.warehouseName && (
                                        <>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Warehouse Total</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {(warehouseStocks.find(s =>
                                                        s.warehouseId === product.warehouseId &&
                                                        s.productId === product.productId
                                                    )?.quantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">{product.warehouseName}</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Available</div>
                                                <div className="text-2xl font-bold text-green-600">
                                                    {(warehouseStocks.find(s =>
                                                        s.warehouseId === product.warehouseId &&
                                                        s.productId === product.productId
                                                    )?.availableQuantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">Ready to use</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Reserved</div>
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {(warehouseStocks.find(s =>
                                                        s.warehouseId === product.warehouseId &&
                                                        s.productId === product.productId
                                                    )?.reservedQuantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">For pending orders</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Delivered</div>
                                                <div className="text-2xl font-bold text-teal-600">
                                                    {(warehouseStocks.find(s =>
                                                        s.warehouseId === product.warehouseId &&
                                                        s.productId === product.productId
                                                    )?.deliveredQuantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">Sent to branches</div>
                                            </div>
                                        </>
                                    )}

                                    {/* Branch Stock */}
                                    {product.branchName && (
                                        <>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Branch Total</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {(branchStocks.find(s =>
                                                        s.branchId === product.branchId &&
                                                        s.productId === product.productId
                                                    )?.quantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">{product.branchName}</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Available</div>
                                                <div className="text-2xl font-bold text-green-600">
                                                    {(branchStocks.find(s =>
                                                        s.branchId === product.branchId &&
                                                        s.productId === product.productId
                                                    )?.availableQuantity || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">Ready for sale</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Pending Sales</div>
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {(branchStocks.find(s =>
                                                        s.branchId === product.branchId &&
                                                        s.productId === product.productId
                                                    )?.pendingSales || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">Awaiting confirmation</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                                                <div className="text-2xl font-bold text-pink-600">
                                                    {(branchStocks.find(s =>
                                                        s.branchId === product.branchId &&
                                                        s.productId === product.productId
                                                    )?.totalSales || 0).toLocaleString('en-US')}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">Sold to customers</div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Global Stock Summary */}
                                {!product.warehouseName && !product.branchName && product.productId && (
                                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">Total Warehouse Stock</div>
                                            <div className="text-xl font-bold text-blue-600">
                                                {warehouseStocks
                                                    .filter(s => s.productId === product.productId)
                                                    .reduce((sum, s) => sum + (s.quantity || 0), 0).toLocaleString('en-US')}
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">Total Branch Stock</div>
                                            <div className="text-xl font-bold text-green-600">
                                                {branchStocks
                                                    .filter(s => s.productId === product.productId)
                                                    .reduce((sum, s) => sum + (s.quantity || 0), 0).toLocaleString('en-US')}
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">Total Delivered</div>
                                            <div className="text-xl font-bold text-teal-600">
                                                {warehouseStocks
                                                    .filter(s => s.productId === product.productId)
                                                    .reduce((sum, s) => sum + (s.deliveredQuantity || 0), 0).toLocaleString('en-US')}
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                                            <div className="text-xl font-bold text-pink-600">
                                                {branchStocks
                                                    .filter(s => s.productId === product.productId)
                                                    .reduce((sum, s) => sum + (s.totalSales || 0), 0).toLocaleString('en-US')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sale Timeline Section */}
                        {product.saleStatus && (
                            <div className="mt-4">
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
                                    <button
                                        onClick={() => setShowSaleTimeline(!showSaleTimeline)}
                                        className="w-full text-left flex justify-between items-center mb-3"
                                    >
                                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Clock size={16} />
                                            Complete Sale Timeline
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.saleStatus === 'INVOICED'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {product.saleStatus}
                                            </span>
                                        </h3>
                                        <ChevronDown size={16} className={`transform transition-transform ${showSaleTimeline ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showSaleTimeline && (
                                        <div className="space-y-3">
                                            {product.fullTransactionHistory && product.fullTransactionHistory.length > 0 ? (
                                                product.fullTransactionHistory
                                                    .filter(tx => {
                                                        const transactionType = tx.transactionType || tx.inventoryType;
                                                        const isSale = transactionType === 'SALE';
                                                        const isSaleRelated = tx.remarks?.includes(`SALE-${product.sku?.replace('SALE-', '')}`);
                                                        const isThisSale = tx.referenceNumber === product.sku;

                                                        return isSale || isSaleRelated || isThisSale;
                                                    })
                                                    .map((tx, idx, filteredArray) => {
                                                        const isConfirmed = tx.remarks?.includes('CONFIRMED');
                                                        const isInvoiced = tx.remarks?.includes('INVOICED') || tx.action === 'INVOICED';

                                                        return (
                                                            <div key={idx} className="flex items-start gap-3">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isInvoiced ? 'bg-green-500' : 'bg-blue-500'
                                                                        }`}>
                                                                        {isInvoiced ? (
                                                                            <FileText size={16} className="text-white" />
                                                                        ) : (
                                                                            <Check size={16} className="text-white" />
                                                                        )}
                                                                    </div>
                                                                    {idx < filteredArray.length - 1 && (
                                                                        <div className="w-0.5 h-8 bg-blue-300 my-1"></div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${isInvoiced
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : 'bg-blue-100 text-blue-800'
                                                                            }`}>
                                                                            {isInvoiced ? 'INVOICED' : 'CONFIRMED'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {(() => {
                                                                                const date = parseDate(tx.transactionDate);
                                                                                if (!date) return 'Invalid date';
                                                                                return date.toLocaleString('en-US', {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                });
                                                                            })()}
                                                                        </span>
                                                                    </div>

                                                                    <div className="mt-1 text-xs">
                                                                        {tx.action === 'SUBTRACT' && (
                                                                            <div className="text-red-600 font-medium">
                                                                                ↓ Stock Deducted: {tx.quantity} units
                                                                            </div>
                                                                        )}
                                                                        {isInvoiced && (
                                                                            <div className="text-green-600 font-medium">
                                                                                ✓ Marked as Invoiced
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {tx.fromBranch && (
                                                                        <p className="text-xs text-blue-700 mt-1">
                                                                            From Branch: {tx.fromBranch.branchName}
                                                                        </p>
                                                                    )}

                                                                    {isInvoiced && tx.remarks && tx.remarks.includes('Generated by:') && (
                                                                        <p className="text-xs text-green-700 mt-1 font-semibold">
                                                                            Generated by: {tx.remarks.match(/Generated by: (.+?)(?:\[|$)/)?.[1]?.trim()}
                                                                        </p>
                                                                    )}

                                                                    <p className="text-xs text-gray-600 mt-1 italic">
                                                                        {tx.remarks?.replace(/.*(SALE-\d+.*)/, '$1') || 'Sale transaction'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div className="text-xs text-gray-500 italic">No sale transaction history available</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-blue-200">
                                        <span className="text-xs text-gray-600">Current Status: </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.saleStatus === 'INVOICED'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {product.saleStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delivery Timeline Section */}
                        {product.deliveryStatus && product.fullTransactionHistory && (
                            <div className="mt-4">
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                                    <button
                                        onClick={() => setShowDeliveryTimeline(!showDeliveryTimeline)}
                                        className="w-full text-left flex justify-between items-center mb-3"
                                    >
                                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Truck size={16} />
                                            Delivery Transaction History
                                        </h3>
                                        <ChevronDown size={16} className={`transform transition-transform ${showDeliveryTimeline ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDeliveryTimeline && (
                                        <div className="space-y-3">
                                            {product.fullTransactionHistory.map((tx, idx) => {
                                                const isSubtract = tx.action === 'SUBTRACT';
                                                const isAdd = tx.action === 'ADD';

                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="flex flex-col items-center">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSubtract ? 'bg-orange-500' : 'bg-green-500'
                                                                }`}>
                                                                {isSubtract ? (
                                                                    <Package size={16} className="text-white" />
                                                                ) : (
                                                                    <Check size={16} className="text-white" />
                                                                )}
                                                            </div>
                                                            {idx < product.fullTransactionHistory.length - 1 && (
                                                                <div className="w-0.5 h-8 bg-purple-300 my-1"></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${isSubtract
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {isSubtract ? 'REMOVED FROM WAREHOUSE' : 'ADDED TO BRANCH'}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {(() => {
                                                                        const date = parseDate(tx.transactionDate);
                                                                        if (!date) return 'Invalid date';
                                                                        return date.toLocaleString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        });
                                                                    })()}
                                                                </span>
                                                            </div>

                                                            <div className="mt-1 text-xs">
                                                                {isSubtract && (
                                                                    <div className="text-orange-600 font-medium">
                                                                        ↓ Removed: {tx.quantity} units
                                                                    </div>
                                                                )}
                                                                {isAdd && (
                                                                    <div className="text-green-600 font-medium">
                                                                        ↑ Added: {tx.quantity} units
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {tx.fromWarehouse && (
                                                                <p className="text-xs text-orange-700 mt-1">
                                                                    From: {tx.fromWarehouse.warehouseName}
                                                                </p>
                                                            )}
                                                            {tx.toBranch && (
                                                                <p className="text-xs text-green-700 mt-1">
                                                                    To: {tx.toBranch.branchName}
                                                                </p>
                                                            )}

                                                            <p className="text-xs text-gray-600 mt-1 italic">
                                                                {tx.remarks}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                        <span className="text-xs text-gray-600">Status: </span>
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                            {product.deliveryStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Filters Section */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                        <h3 className="font-semibold text-gray-700 mb-3">Advanced Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Types</option>
                                <option value="STOCK_IN">Stock In</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="TRANSFER_IN">Transfer In</option>
                                <option value="TRANSFER_OUT">Transfer Out</option>
                                <option value="RETURN">Return</option>
                                <option value="DAMAGE">Damage</option>
                                <option value="DELIVERY">Delivery</option>
                                <option value="SALE">Sale</option>
                            </select>

                            <select
                                value={showDeletedFilter}
                                onChange={(e) => setShowDeletedFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="ALL">All Transactions</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="DELETED">Deleted Only</option>
                            </select>

                            <input
                                type="date"
                                placeholder="Start Date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="date"
                                placeholder="End Date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {(searchTerm || filterType !== 'ALL' || showDeletedFilter !== 'ALL' || startDate || endDate) && (
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterType('ALL');
                                        setShowDeletedFilter('ALL');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Clear All Filters
                                </button>

                                {deletedTransactionsCount > 0 && (
                                    <button
                                        onClick={handleDeleteAllDeleted}
                                        disabled={deletingAll}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${deletingAll
                                            ? 'bg-gray-300 text-gray-500 cursor-wait'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                            }`}
                                    >
                                        {deletingAll ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                Delete All Deleted ({deletedTransactionsCount})
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source → Destination</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks / Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {sortedFilteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                {transactions.length === 0 ? 'No transactions found for this product' : 'No transactions match your filters'}
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedFilteredTransactions.map((transaction, idx) => {
                                            const quantityInfo = getQuantityDisplay(transaction);
                                            const transactionDate = new Date(transaction.transactionDate || transaction.createdAt);
                                            const warehouseSource = getWarehouseSource(transaction);
                                            const saleReference = getSaleReference(transaction);

                                            const fromLocation = transaction.fromWarehouse?.warehouseName || transaction.fromBranch?.branchName;
                                            const toLocation = transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName;
                                            const transactionType = transaction.inventoryType || transaction.transactionType;

                                            const isDeliverySubtract = transactionType === 'DELIVERY' && transaction.action === 'SUBTRACT';
                                            const isDeliveryAdd = transactionType === 'DELIVERY' && transaction.action === 'ADD';
                                            const isDeleted = transaction.isDeleted === true || transaction.action === 'DELETED';

                                            const refKey = transaction.referenceNumber || `REF-${transaction.referenceId || transaction.id}`;
                                            const transactionHistory = groupedTransactions[refKey] || [];
                                            const hasHistory = transactionHistory.length > 1;
                                            const isExpanded = expandedRows[transaction.id];

                                            return (
                                                <React.Fragment key={`transaction-${idx}-${transaction.id}`}>
                                                    <tr className={`hover:bg-gray-50 ${transaction.isDeleted ? 'bg-red-50 opacity-60' : ''}`}>
                                                        <td className="px-4 py-3 text-sm">
                                                            {(() => {
                                                                const date = getCorrectTransactionDate(transaction);
                                                                if (!date) return 'Invalid date';
                                                                return date.toLocaleString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                });
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction)}`}>
                                                                {getTransferDirection(transaction).replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-600 text-xs">From:</span>
                                                                    <span className="text-sm font-medium">
                                                                        {isDeliverySubtract ? (
                                                                            transaction.fromWarehouse?.warehouseName || 'Warehouse'
                                                                        ) : (
                                                                            fromLocation ||
                                                                            (warehouseSource ? `Warehouse: ${warehouseSource}` :
                                                                                (transactionType === 'SALE' ? transaction.fromBranch?.branchName || 'Branch' : '-'))
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-gray-600 text-xs">To:</span>
                                                                    <span className="text-sm font-medium">
                                                                        {isDeliverySubtract ? (
                                                                            transaction.toBranch?.branchName || 'Branch'
                                                                        ) : (
                                                                            toLocation ||
                                                                            (transactionType === 'SALE' ? 'Sale' : '-')
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                {transactionType === 'TRANSFER' && fromLocation && toLocation && (
                                                                    <div className="text-xs text-blue-600 mt-1 italic">
                                                                        ↕️ Complete Transfer: {fromLocation} → {toLocation}
                                                                    </div>
                                                                )}

                                                                {transactionType === 'RETURN' && fromLocation && toLocation && (
                                                                    <div className="text-xs text-yellow-600 mt-1 italic">
                                                                        ↕️ Complete Return: {fromLocation} → {toLocation}
                                                                    </div>
                                                                )}

                                                                {transactionType === 'TRANSFER' && (
                                                                    <div className="text-xs mt-1">
                                                                        {transaction.action === 'ADD' && toLocation && (
                                                                            <span className="text-teal-600 italic">⇩ Receiving at: {toLocation}</span>
                                                                        )}
                                                                        {transaction.action === 'SUBTRACT' && fromLocation && (
                                                                            <span className="text-orange-600 italic">⇧ Sending from: {fromLocation}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {transactionType === 'RETURN' && (
                                                                    <div className="text-xs mt-1">
                                                                        {transaction.action === 'ADD' && toLocation && (
                                                                            <span className="text-teal-600 italic">⇩ Receiving Return at: {toLocation}</span>
                                                                        )}
                                                                        {transaction.action === 'SUBTRACT' && fromLocation && (
                                                                            <span className="text-orange-600 italic">⇧ Sending Return from: {fromLocation}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {transactionType === 'DELIVERY' &&
                                                                    transaction.action === 'ADD' &&
                                                                    toLocation &&
                                                                    warehouseSource && (
                                                                        <div className="text-xs text-blue-600 mt-1 italic">
                                                                            📦 Source: {warehouseSource}
                                                                        </div>
                                                                    )}

                                                                {transactionType === 'SALE' &&
                                                                    fromLocation && (
                                                                        <div className="text-xs text-pink-600 mt-1 italic">
                                                                            🛒 Sold from: {fromLocation}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${quantityInfo.colorClass}`}>
                                                                {quantityInfo.sign}{quantityInfo.quantity.toLocaleString('en-US')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {transaction.referenceNumber ||
                                                                saleReference ||
                                                                `INV-${transaction.referenceId || transaction.id}`}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${isDeleted ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                                                                    transaction.action === 'ADD' ? 'bg-green-100 text-green-700' :
                                                                        transaction.action === 'SUBTRACT' ? 'bg-red-100 text-red-700' :
                                                                            transaction.action === 'RESERVE' ? 'bg-orange-100 text-orange-700' :
                                                                                transaction.action === 'RELEASE' ? 'bg-blue-100 text-blue-700' :
                                                                                    transaction.action === 'INVOICED' ? 'bg-pink-100 text-pink-700' :
                                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {isDeleted ? '🗑️ DEL' : (transaction.action || 'PROCESS')}
                                                                </span>

                                                                {hasHistory && (
                                                                    <button
                                                                        onClick={() => toggleRowExpansion(transaction.id)}
                                                                        className="p-1 hover:bg-blue-100 rounded transition text-blue-600"
                                                                        title="View edit history"
                                                                    >
                                                                        <ChevronDown size={16} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                )}

                                                                {isDeleted && (
                                                                    <button
                                                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                                                        disabled={deletingTransactionId === transaction.id || deletingAll}
                                                                        className={`p-1 rounded transition ${deletingTransactionId === transaction.id || deletingAll
                                                                            ? 'bg-gray-300 text-gray-500 cursor-wait'
                                                                            : 'text-red-600 hover:bg-red-50'
                                                                            }`}
                                                                        title="Permanently delete this transaction"
                                                                    >
                                                                        {deletingTransactionId === transaction.id ? (
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                                        ) : (
                                                                            <Trash2 size={14} />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            <div className="break-words whitespace-normal">
                                                                {isDeleted ? (
                                                                    <div>
                                                                        <div className="text-xs text-gray-500 line-through">
                                                                            {transaction.remarks || 'No remarks'}
                                                                        </div>
                                                                        {transaction.deletedAt && (
                                                                            <div className="text-xs text-red-600 mt-1 font-semibold">
                                                                                ⚠️ Deleted: {(() => {
                                                                                    const date = parseDate(transaction.deletedAt);
                                                                                    if (!date) return 'Unknown date';
                                                                                    return date.toLocaleString('en-US', {
                                                                                        month: 'short',
                                                                                        day: 'numeric',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    });
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {transaction.remarks || 'No remarks'}
                                                                    </>
                                                                )}
                                                            </div>
                                                            {!isDeleted && transaction.deliveryStatus && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Status: {transaction.deliveryStatus}
                                                                </div>
                                                            )}
                                                            {!isDeleted && transaction.saleStatus && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Sale Status: {transaction.saleStatus}
                                                                </div>
                                                            )}
                                                        </td>

                                                    </tr>
                                                    {isExpanded && hasHistory && (
                                                        <tr className="bg-blue-50 border-l-4 border-blue-500">
                                                            <td colSpan="7" className="px-4 py-4">
                                                                <div className="space-y-3">
                                                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                                                        <Clock size={16} />
                                                                        Edit History for {transaction.referenceNumber}
                                                                    </h4>

                                                                    {transactionHistory.slice(1).map((historyItem, histIdx) => {
                                                                        const histDate = getCorrectTransactionDate(historyItem);
                                                                        const histQuantityInfo = getQuantityDisplay(historyItem);
                                                                        const isOriginal = historyItem.isOriginal;

                                                                        return (
                                                                            <div key={`history-${histIdx}`} className="bg-white rounded-lg p-3 border border-gray-200">
                                                                                <div className="flex items-start justify-between">
                                                                                    <div className="flex-1 space-y-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isOriginal ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                                {isOriginal ? '📄 Original' : '✏️ Previous Edit'}
                                                                                            </span>
                                                                                            <span className="text-xs text-gray-500">
                                                                                                {histDate ? histDate.toLocaleString('en-US', {
                                                                                                    month: 'short',
                                                                                                    day: 'numeric',
                                                                                                    year: 'numeric',
                                                                                                    hour: '2-digit',
                                                                                                    minute: '2-digit'
                                                                                                }) : 'N/A'}
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                                                            <div>
                                                                                                <span className="text-gray-500">Type:</span>
                                                                                                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${getTypeColor(historyItem)}`}>
                                                                                                    {getTransferDirection(historyItem).replace('_', ' ')}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-gray-500">Quantity:</span>
                                                                                                <span className={`ml-1 px-1.5 py-0.5 rounded font-medium ${histQuantityInfo.colorClass}`}>
                                                                                                    {histQuantityInfo.sign}{histQuantityInfo.quantity.toLocaleString('en-US')}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-gray-500">Action:</span>
                                                                                                <span className="ml-1 font-medium">{historyItem.action || 'N/A'}</span>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-gray-500">From:</span>
                                                                                                <span className="ml-1 font-medium">
                                                                                                    {historyItem.fromWarehouse?.warehouseName || historyItem.fromBranch?.branchName || '-'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {historyItem.remarks && (
                                                                                            <div className="text-xs text-gray-600 italic">
                                                                                                <span className="font-medium">Remarks:</span> {historyItem.remarks}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 text-center">
                        Showing {sortedFilteredTransactions.length} of {transactions.length} transactions
                        {deletedTransactionsCount > 0 && (
                            <span className="ml-2 text-red-600 font-medium">
                                ({deletedTransactionsCount} deleted)
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTransactionsModal;