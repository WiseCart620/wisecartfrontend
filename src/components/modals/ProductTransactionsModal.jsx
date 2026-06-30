import React, { useState, useMemo } from 'react';
import {
    Search, X, Package, Calendar, Clock, CheckCircle, Truck,
    Check, FileText, Trash2, ChevronDown, ShoppingCart, ChevronLeft, ChevronRight,
    ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { parseDate } from '../../utils/dateUtils';
import Pagination from '../../components/common/Pagination';

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

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20); // Changed to 20

    const getTransactionDates = (transaction) => {
        const userEnteredDate = transaction.transactionDate
            ? parseDate(transaction.transactionDate)
            : null;

        const parseUtc = (dateString) => {
            if (!dateString) return null;
            const normalized = dateString.includes('+') || dateString.endsWith('Z')
                ? dateString
                : dateString + '+00:00';
            const d = new Date(normalized);
            return isNaN(d.getTime()) ? null : d;
        };

        const systemDate = transaction.createdAt
            ? parseUtc(transaction.createdAt)
            : userEnteredDate;

        return { userEnteredDate, systemDate };
    };

    const getUserDateLabel = (transaction) => {
        const type = transaction.inventoryType || transaction.transactionType;
        if (type === 'DELIVERY') {
            return 'Delivery Date';
        }
        if (type === 'SALE') {
            if (transaction.invoicedAt) return 'Invoice Date';
            if (transaction.saleDate) return 'Sale Date';
            if (transaction.confirmedAt) return 'Confirmed Date';
            return 'Sale Date';
        }
        if (type === 'STOCK_IN') return 'Stock In Date';
        if (type === 'TRANSFER') return 'Transfer Date';
        if (type === 'RETURN') return 'Return Date';
        if (type === 'DAMAGE') return 'Damage Date';
        return 'Transaction Date';
    };

    const getSystemDateLabel = (transaction) => {
        const type = transaction.inventoryType || transaction.transactionType;
        if (type === 'DELIVERY') return 'System Entry Timestamp';
        if (type === 'SALE') return 'System Entry Timestamp';
        return 'System Verification Timestamp';
    };
    const formatDate = (date) => {
        if (!date) return 'Invalid date';
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDateOnly = (date) => {
        if (!date) return 'Invalid date';
        return date.toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTimeOnly = (date) => {
        if (!date) return 'Invalid date';
        return date.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const isCancellationTransaction = (transaction) => {
        if (transaction.referenceNumber?.startsWith('CANCELLED-')) return true;
        if (transaction.referenceNumber?.startsWith('RETURN-')) return true;
        return transaction.remarks &&
            (transaction.remarks.includes('Delivery cancelled') ||
                transaction.remarks.includes('cancelled — removed from branch') ||
                transaction.remarks.includes('cancelled — returned to warehouse') ||
                transaction.remarks.includes('returned to warehouse') ||
                transaction.remarks.includes('RESTORED RETURN/CANCELLED'));
    };

    const groupTransactionsByReference = (transactions) => {
        const grouped = {};
        transactions.forEach(transaction => {
            let refKey;
            if (isCancellationTransaction(transaction)) {
                refKey = `CANCEL-${transaction.id}`;
            } else {
                const isDeleted = transaction.isDeleted === true || transaction.action === 'DELETED';
                if (isDeleted) {
                    refKey = `DELETED-${transaction.id}`;
                } else {
                    const dest = transaction.toBranch?.id || transaction.toWarehouse?.id || '';
                    const from = transaction.fromBranch?.id || transaction.fromWarehouse?.id || '';
                    const action = transaction.action || '';
                    const txType = transaction.inventoryType || transaction.transactionType || '';
                    refKey = transaction.referenceNumber
                        ? `${transaction.referenceNumber}-${dest}-${from}-${txType === 'TRANSFER' ? action : ''}`
                        : `REF-${transaction.referenceId || transaction.id}`;
                }
            }
            if (!grouped[refKey]) grouped[refKey] = [];
            grouped[refKey].push(transaction);
        });
        Object.keys(grouped).forEach(refKey => {
            grouped[refKey].sort((a, b) => {
                const dateA = a.createdAt ? parseDate(a.createdAt) : null;
                const dateB = b.createdAt ? parseDate(b.createdAt) : null;
                if (dateA && dateB) return (dateB || 0) - (dateA || 0);
                return (b.id || 0) - (a.id || 0);
            });
            if (grouped[refKey].length > 1) {
                grouped[refKey][0].isLatestVersion = true;
                grouped[refKey][0].hasHistory = true;
                grouped[refKey][0].versionCount = grouped[refKey].length;

                const lastIndex = grouped[refKey].length - 1;
                for (let i = 1; i <= lastIndex; i++) {
                    if (i === lastIndex) {
                        grouped[refKey][i].isOriginal = true;
                    } else {
                        grouped[refKey][i].isPreviousVersion = true;
                    }
                }
            }
        });
        return grouped;
    };

    const getQuantityDisplayLocal = (transaction) => {
        const quantity = Math.abs(transaction.quantity || transaction.quantityChanged || 0);
        const action = transaction.action || '';
        const type = transaction.inventoryType || transaction.transactionType || '';

        let sign = '';
        let colorClass = '';

        if (action === 'ADD' || type === 'STOCK_IN' || type === 'RETURN') {
            sign = '+'; colorClass = 'bg-green-100 text-green-800';
        } else if (action === 'SUBTRACT' || type === 'DAMAGE' || type === 'SALE') {
            sign = '-'; colorClass = 'bg-red-100 text-red-800';
        } else if (action === 'RESERVE') {
            sign = '⏳'; colorClass = 'bg-orange-100 text-orange-800';
        } else if (action === 'RELEASE') {
            sign = '↩️'; colorClass = 'bg-blue-100 text-blue-800';
        } else {
            sign = '±'; colorClass = 'bg-gray-100 text-gray-800';
        }

        return { quantity, sign, colorClass };
    };

    const getWarehouseSource = (transaction) => {
        if (!transaction.remarks) return null;
        const m = transaction.remarks.match(/FROM WAREHOUSE: ([^|[\]]+)/) ||
            transaction.remarks.match(/from warehouse: ([^|[\]]+)/) ||
            transaction.remarks.match(/from: ([^|[\]]+)/);
        return m ? m[1].trim() : null;
    };

    const getTransferDirection = (transaction) => {
        const type = transaction.inventoryType || transaction.transactionType;
        if (type !== 'TRANSFER') return type;
        if ((transaction.fromWarehouse || transaction.fromBranch) && (transaction.toWarehouse || transaction.toBranch)) return 'TRANSFER';
        if ((transaction.toWarehouse || transaction.toBranch) && !(transaction.fromWarehouse || transaction.fromBranch)) return 'TRANSFER_IN';
        if ((transaction.fromWarehouse || transaction.fromBranch) && !(transaction.toWarehouse || transaction.toBranch)) return 'TRANSFER_OUT';
        return 'TRANSFER';
    };

    const getTypeColor = (transaction) => {
        const type = transaction.inventoryType || transaction.transactionType;
        if (type === 'TRANSFER') {
            const dir = getTransferDirection(transaction);
            if (dir === 'TRANSFER_IN') return 'bg-teal-100 text-teal-700';
            if (dir === 'TRANSFER_OUT') return 'bg-orange-100 text-orange-700';
            return 'bg-blue-100 text-blue-700';
        }
        switch (type) {
            case 'STOCK_IN': return 'bg-green-100 text-green-700';
            case 'RETURN': return 'bg-yellow-100 text-yellow-700';
            case 'DAMAGE': return 'bg-red-100 text-red-700';
            case 'DELIVERY': return 'bg-purple-100 text-purple-700';
            case 'SALE': return 'bg-pink-100 text-pink-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        const groupedTransactions = groupTransactionsByReference(transactions);
        const latestTransactions = Object.values(groupedTransactions).map(group => group[0]);
        return latestTransactions.filter(transaction => {
            const searchLower = searchTerm.toLowerCase();
            const type = transaction.inventoryType || transaction.transactionType;
            const { userEnteredDate } = getTransactionDates(transaction);

            const matchesSearch = !searchTerm ||
                transaction.productName?.toLowerCase().includes(searchLower) ||
                transaction.referenceNumber?.toLowerCase().includes(searchLower) ||
                transaction.remarks?.toLowerCase().includes(searchLower) ||
                type?.toLowerCase().includes(searchLower);

            const matchesType = filterType === 'ALL' || (() => {
                if (type === 'TRANSFER') {
                    if (filterType === 'TRANSFER_IN') return transaction.toWarehouse || transaction.toBranch;
                    if (filterType === 'TRANSFER_OUT') return transaction.fromWarehouse || transaction.fromBranch;
                    if (filterType === 'TRANSFER') return true;
                }
                return type === filterType;
            })();

            const isDeleted = transaction.isDeleted === true || transaction.action === 'DELETED';
            const matchesDeletedFilter = showDeletedFilter === 'ALL' ||
                (showDeletedFilter === 'ACTIVE' && !isDeleted) ||
                (showDeletedFilter === 'DELETED' && isDeleted);

            const toManilaStartOfDay = (dateStr) => {
                const d = new Date(dateStr + 'T00:00:00+08:00');
                return d;
            };
            const toManilaEndOfDay = (dateStr) => {
                const d = new Date(dateStr + 'T23:59:59+08:00');
                return d;
            };
            const matchesStartDate = !startDate || !userEnteredDate || userEnteredDate >= toManilaStartOfDay(startDate);
            const matchesEndDate = !endDate || !userEnteredDate || userEnteredDate <= toManilaEndOfDay(endDate);

            return matchesSearch && matchesType && matchesDeletedFilter && matchesStartDate && matchesEndDate;
        }).sort((a, b) => {
            const aDeleted = a.isDeleted === true || a.action === 'DELETED';
            const bDeleted = b.isDeleted === true || b.action === 'DELETED';
            if (aDeleted && !bDeleted) return 1;
            if (!aDeleted && bDeleted) return -1;
            const { userEnteredDate: dateA } = getTransactionDates(a);
            const { userEnteredDate: dateB } = getTransactionDates(b);
            return (dateB || 0) - (dateA || 0);
        });
    }, [transactions, searchTerm, filterType, showDeletedFilter, startDate, endDate]);



    const totals = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;
        let totalCancelled = 0;
        filteredTransactions.forEach((t) => {
            const qty = Math.abs(t.quantity || t.quantityChanged || 0);
            const action = t.action || '';
            const type = t.inventoryType || t.transactionType || '';
            const isDeleted = t.isDeleted === true || action === 'DELETED';
            if (isDeleted) return;
            if (isCancellationTransaction(t) && action === 'ADD') {
                totalCancelled += qty;
            }

            if (action === 'ADD' || type === 'STOCK_IN' || type === 'RETURN') {
                totalIn += qty;
            } else if (action === 'SUBTRACT' || type === 'DAMAGE' || type === 'SALE') {
                totalOut += qty;
            }
        });
        return { totalIn, totalOut, totalCancelled };
    }, [filteredTransactions]);

    const groupedTransactionsRef = useMemo(() => {
        if (!transactions || transactions.length === 0) return {};
        return groupTransactionsByReference(transactions);
    }, [transactions]);

    const totalPages = Math.ceil(filteredTransactions.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, showDeletedFilter, startDate, endDate]);

    if (!isOpen) return null;

    const deletedTransactionsCount = filteredTransactions.filter(t =>
        t.isDeleted === true || t.action === 'DELETED'
    ).length;

    // Pagination handlers
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Row expansion
    const toggleRowExpansion = (transactionId) => {
        setExpandedRows(prev => ({ ...prev, [transactionId]: !prev[transactionId] }));
    };

    // Delete handlers
    const handleDeleteTransaction = async (transactionId) => {
        if (!window.confirm('Are you sure you want to permanently delete this transaction? This action cannot be undone.')) return;
        try {
            setDeletingTransactionId(transactionId);
            const response = await api.delete(`/transactions/${transactionId}`);
            if (response.success) {
                toast.success('Transaction deleted successfully');
                if (window.loadData) await window.loadData();
                onClose();
            } else {
                toast.error('Failed to delete transaction');
            }
        } catch (err) {
            toast.error('Failed to delete transaction: ' + (err.message || 'Unknown error'));
        } finally {
            setDeletingTransactionId(null);
        }
    };

    const handleDeleteAllDeleted = async () => {
        const deletedTransactions = filteredTransactions.filter(t => t.isDeleted === true || t.action === 'DELETED');
        if (deletedTransactions.length === 0) { toast.error('No deleted transactions to remove'); return; }
        if (!window.confirm(`Permanently delete ${deletedTransactions.length} transaction(s)?`)) return;

        try {
            setDeletingAll(true);
            let successCount = 0, failCount = 0;
            for (const t of deletedTransactions) {
                try {
                    const r = await api.delete(`/transactions/${t.id}`);
                    r.success ? successCount++ : failCount++;
                } catch { failCount++; }
            }
            if (successCount > 0) toast.success(`Deleted ${successCount} transaction(s)`);
            if (failCount > 0) toast.error(`Failed to delete ${failCount} transaction(s)`);
            if (window.loadData) await window.loadData();
            onClose();
        } catch (err) {
            toast.error('Failed to delete transactions: ' + (err.message || 'Unknown error'));
        } finally {
            setDeletingAll(false);
        }
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-[1600px] w-full max-h-[95vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start shrink-0">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">Product Movement History</h2>
                        <p className="text-gray-600">
                            {product?.productName} - {product?.sku}
                            {product?.warehouseName && <span className="ml-2 text-blue-600 font-semibold">@ {product.warehouseName}</span>}
                            {product?.branchName && <span className="ml-2 text-blue-600 font-semibold">@ {product.branchName}</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded ml-4 flex-shrink-0">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Filters */}
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
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Start Date"
                            />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="End Date"
                            />
                        </div>
                        {(searchTerm || filterType !== 'ALL' || showDeletedFilter !== 'ALL' || startDate || endDate) && (
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => { setSearchTerm(''); setFilterType('ALL'); setShowDeletedFilter('ALL'); setStartDate(''); setEndDate(''); }}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Clear All Filters
                                </button>
                                {deletedTransactionsCount > 0 && (
                                    <button
                                        onClick={handleDeleteAllDeleted}
                                        disabled={deletingAll}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${deletingAll ? 'bg-gray-300 text-gray-500 cursor-wait' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                    >
                                        {deletingAll ? (
                                            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Deleting...</>
                                        ) : (
                                            <><Trash2 size={16} />Delete All Deleted ({deletedTransactionsCount})</>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Totals summary bar */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <ArrowDownCircle size={15} className="text-green-600" />
                            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Total In</span>
                            <span className="text-sm font-bold text-green-800">{totals.totalIn.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                            <ArrowUpCircle size={15} className="text-red-600" />
                            <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Out</span>
                            <span className="text-sm font-bold text-red-800">{totals.totalOut.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Net</span>
                            <span className={`text-sm font-bold ${totals.totalIn - totals.totalOut >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                {totals.totalIn - totals.totalOut >= 0 ? '+' : ''}{(totals.totalIn - totals.totalOut).toLocaleString()}
                            </span>
                        </div>
                        {totals.totalCancelled > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                                <span className="text-xs font-medium text-rose-700 uppercase tracking-wide">Cancelled (returned)</span>
                                <span className="text-sm font-bold text-rose-800">{totals.totalCancelled.toLocaleString()}</span>
                            </div>
                        )}
                        <span className="text-xs text-gray-400 ml-1">
                            ({filteredTransactions.filter(t => !(t.isDeleted === true || t.action === 'DELETED')).length} active transactions)
                        </span>
                    </div>

                    {/* Page Size Selector */}
                    <div className="mb-4 flex justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User-Entered Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Timestamp</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source → Destination</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks / Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                                {transactions.length === 0
                                                    ? 'No transactions found for this product'
                                                    : 'No transactions match your filters'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedTransactions.map((transaction, idx) => {
                                            const { userEnteredDate, systemDate } = getTransactionDates(transaction);
                                            const quantityInfo = getQuantityDisplayLocal(transaction);
                                            const userDateLabel = getUserDateLabel(transaction);
                                            const warehouseSource = getWarehouseSource(transaction);
                                            const fromLocation = transaction.fromWarehouse?.warehouseName || transaction.fromBranch?.branchName;
                                            const toLocation = transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName;
                                            const transactionType = transaction.inventoryType || transaction.transactionType;
                                            const isDeliverySubtract = transactionType === 'DELIVERY' && transaction.action === 'SUBTRACT';
                                            const isDeliveryAdd = transactionType === 'DELIVERY' && transaction.action === 'ADD';
                                            const isDeleted = transaction.isDeleted === true || transaction.action === 'DELETED';
                                            const dest = transaction.toBranch?.id || transaction.toWarehouse?.id || '';
                                            const from = transaction.fromBranch?.id || transaction.fromWarehouse?.id || '';
                                            const isDeletedTx = transaction.isDeleted === true || transaction.action === 'DELETED';
                                            const refKey = isCancellationTransaction(transaction)
                                                ? `CANCEL-${transaction.id}`
                                                : isDeletedTx
                                                    ? `DELETED-${transaction.id}`
                                                    : transaction.referenceNumber
                                                        ? `${transaction.referenceNumber}-${dest}-${from}`
                                                        : `REF-${transaction.referenceId || transaction.id}`;
                                            const transactionHistory = groupedTransactionsRef[refKey] || [];
                                            const hasHistory = transactionHistory.length > 1;
                                            const isExpanded = expandedRows[transaction.id];

                                            return (
                                                <React.Fragment key={`transaction-${idx}-${transaction.id}`}>
                                                    <tr className={`hover:bg-gray-50 ${isDeleted ? 'bg-red-50 opacity-60' : ''}`}>

                                                        {/* User-Entered Date Column */}
                                                        <td className="px-4 py-3 text-sm">
                                                            {userEnteredDate ? (
                                                                <div className="flex flex-col gap-1 p-2 bg-blue-50 rounded-md border-l-2 border-blue-400">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar size={12} className="text-blue-500" />
                                                                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                                                                            {getUserDateLabel(transaction)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {userEnteredDate.toLocaleDateString('en-US', {
                                                                            timeZone: 'Asia/Manila',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        {userEnteredDate.toLocaleTimeString('en-US', {
                                                                            timeZone: 'Asia/Manila',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            hour12: true
                                                                        })}

                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 p-2 bg-gray-50 rounded-md border-l-2 border-gray-300">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar size={12} className="text-gray-400" />
                                                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                                                            {getUserDateLabel(transaction)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 italic">No date set</div>
                                                                    {transaction.remarks && (
                                                                        <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[150px]">
                                                                            Remarks: {transaction.remarks.substring(0, 50)}...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* System Timestamp Column */}
                                                        <td className="px-4 py-3 text-sm">
                                                            {systemDate ? (
                                                                <div className="flex flex-col gap-1 p-2 bg-gray-50 rounded-md border-l-2 border-gray-400">
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock size={12} className="text-gray-500" />
                                                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                                                            {getSystemDateLabel(transaction)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-gray-700">
                                                                        {formatDateOnly(systemDate)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {formatTimeOnly(systemDate)}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-2 bg-gray-50 rounded-md">
                                                                    <div className="text-xs text-gray-400 italic">-</div>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Type Column */}
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction)}`}>
                                                                {getTransferDirection(transaction).replace('_', ' ')}
                                                            </span>
                                                        </td>

                                                        {/* Source → Destination Column */}
                                                        <td className="px-4 py-3 text-sm">
                                                            {(() => {
                                                                const isCancelled = isCancellationTransaction(transaction);
                                                                const isCancelledReturn = isCancelled &&
                                                                    transaction.action === 'ADD' &&
                                                                    transaction.toWarehouse;
                                                                const isCancelledBranchRemoval = isCancelled &&
                                                                    transaction.action === 'SUBTRACT' &&
                                                                    transaction.fromBranch;
                                                                const isReturnToWarehouse = isCancelled &&
                                                                    transaction.action === 'ADD' &&
                                                                    !transaction.toWarehouse;

                                                                if (isCancelledReturn) {
                                                                    return (
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                                                🚫 Delivery Cancelled
                                                                            </span>
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <span className="text-gray-500 text-xs">Returned to:</span>
                                                                                <span className="text-sm font-medium text-green-700">
                                                                                    {transaction.toWarehouse.warehouseName}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                if (isCancelledBranchRemoval) {
                                                                    return (
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                                                🚫 Delivery Cancelled
                                                                            </span>
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <span className="text-gray-500 text-xs">Removed from:</span>
                                                                                <span className="text-sm font-medium text-red-700">
                                                                                    {transaction.fromBranch.branchName}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }


                                                                if (isReturnToWarehouse) {
                                                                    const warehouseName = transaction.remarks?.match(
                                                                        /returned to warehouse[:\s]+([^|[\]]+)/i
                                                                    )?.[1]?.trim() || 'Warehouse';
                                                                    return (
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                                                🚫 Delivery Cancelled
                                                                            </span>
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <span className="text-gray-500 text-xs">Returned to:</span>
                                                                                <span className="text-sm font-medium text-green-700">
                                                                                    {warehouseName}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-600 text-xs">From:</span>
                                                                            <span className="text-sm font-medium">
                                                                                {isDeliverySubtract
                                                                                    ? transaction.fromWarehouse?.warehouseName || 'Warehouse'
                                                                                    : fromLocation || (warehouseSource ? `Warehouse: ${warehouseSource}` : (transactionType === 'SALE' ? transaction.fromBranch?.branchName || 'Branch' : '-'))}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-gray-600 text-xs">To:</span>
                                                                            <span className="text-sm font-medium">
                                                                                {isDeliverySubtract
                                                                                    ? transaction.toBranch?.branchName || 'Branch'
                                                                                    : toLocation || (transactionType === 'SALE' ? 'Sale' : '-')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>

                                                        {/* Quantity Column */}
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${quantityInfo.colorClass}`}>
                                                                {quantityInfo.sign}{quantityInfo.quantity.toLocaleString('en-US')}
                                                            </span>
                                                        </td>

                                                        {/* Reference Column */}
                                                        <td className="px-4 py-3 text-sm">
                                                            {transaction.referenceNumber || `INV-${transaction.referenceId || transaction.id}`}
                                                        </td>

                                                        {/* Action Column */}
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
                                                                        className={`p-1 rounded transition ${deletingTransactionId === transaction.id || deletingAll ? 'bg-gray-300 text-gray-500 cursor-wait' : 'text-red-600 hover:bg-red-50'}`}
                                                                        title="Permanently delete this transaction"
                                                                    >
                                                                        {deletingTransactionId === transaction.id
                                                                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                                                            : <Trash2 size={14} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Remarks Column */}
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            <div className="break-words whitespace-normal max-w-xs">
                                                                {isDeleted ? (
                                                                    <div>
                                                                        <div className="text-xs text-gray-500 line-through">{transaction.remarks || 'No remarks'}</div>
                                                                        {transaction.deletedAt && (
                                                                            <div className="text-xs text-red-600 mt-1 font-semibold">
                                                                                ⚠️ Deleted: {formatDate(parseDate(transaction.deletedAt))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    transaction.remarks || 'No remarks'
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded edit history row */}
                                                    {isExpanded && hasHistory && (
                                                        <tr className="bg-blue-50 border-l-4 border-blue-500">
                                                            <td colSpan="8" className="px-4 py-4">
                                                                <div className="space-y-3">
                                                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                                                        <Clock size={16} />
                                                                        Edit History for {transaction.referenceNumber}
                                                                    </h4>
                                                                    {transactionHistory.slice(1).map((historyItem, histIdx) => {
                                                                        const { userEnteredDate: histDate } = getTransactionDates(historyItem);
                                                                        const histQty = getQuantityDisplayLocal(historyItem);
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
                                                                                                {histDate ? formatDate(histDate) : 'N/A'}
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
                                                                                                <span className={`ml-1 px-1.5 py-0.5 rounded font-medium ${histQty.colorClass}`}>
                                                                                                    {histQty.sign}{histQty.quantity.toLocaleString('en-US')}
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

                    {/* Pagination Component */}
                    {filteredTransactions.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            onNextPage={handleNextPage}
                            onPrevPage={handlePrevPage}
                            showingStart={startIndex + 1}
                            showingEnd={Math.min(endIndex, filteredTransactions.length)}
                            totalItems={filteredTransactions.length}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductTransactionsModal;