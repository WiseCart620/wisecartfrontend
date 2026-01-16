import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Search, X, Package, Calendar, User,
  MessageSquare, ChevronDown, Warehouse, ChevronLeft, ChevronRight,
  Eye, BarChart3, Building, Store, Truck, Clock, CheckCircle, Filter, ShoppingCart,
  Check, FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import { LoadingOverlay } from './LoadingOverlay';

const parseDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    if (Array.isArray(dateValue)) {
      const [year, month, day, hour, minute, second] = dateValue;
      return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    }

    const isoTimestamp = String(dateValue).replace(' ', 'T');
    const date = new Date(isoTimestamp);

    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateValue);
      return null;
    }

    return date;
  } catch (error) {
    console.error('Date parsing error:', error, dateValue);
    return null;
  }
};


const GroupedSearchableDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selected = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No results</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!opt.isGroup) {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }
                  }}
                  disabled={opt.isGroup}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${opt.isGroup
                    ? 'font-bold text-gray-700 bg-gray-100 cursor-default'
                    : value === opt.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-900'
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};


const ProductDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60">
            {filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 ${value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getTransactionDisplayInfo = (transaction) => {
  const isTransfer = transaction.inventoryType === 'TRANSFER';
  const hasFromLocation = transaction.fromWarehouse || transaction.fromBranch;
  const hasToLocation = transaction.toWarehouse || transaction.toBranch;

  let type = transaction.inventoryType;
  let typeLabel = type ? type.replace('_', ' ') : 'UNKNOWN';
  let typeColor = '';

  if (transaction.inventoryType === 'DELIVERY') {
    typeLabel = 'DELIVERY';
    typeColor = 'bg-purple-100 text-purple-700';
  }

  if (isTransfer) {
    if (hasToLocation && !hasFromLocation) {
      type = 'TRANSFER_IN';
      typeLabel = 'Transfer In';
      typeColor = 'bg-teal-100 text-teal-700';
    } else if (hasFromLocation && !hasToLocation) {
      type = 'TRANSFER_OUT';
      typeLabel = 'Transfer Out';
      typeColor = 'bg-orange-100 text-orange-700';
    } else if (hasFromLocation && hasToLocation) {
      type = 'TRANSFER_COMPLETE';
      typeLabel = 'Transfer';
      typeColor = 'bg-blue-100 text-blue-700';
    } else {
      typeColor = 'bg-blue-100 text-blue-700';
    }
  } else {
    // Color for other types
    switch (type) {
      case 'STOCK_IN': typeColor = 'bg-green-100 text-green-700'; break;
      case 'RETURN': typeColor = 'bg-yellow-100 text-yellow-700'; break;
      case 'DAMAGE': typeColor = 'bg-red-100 text-red-700'; break;
      case 'DELIVERY': typeColor = 'bg-purple-100 text-purple-700'; break;
      case 'SALE': typeColor = 'bg-pink-100 text-pink-700'; break;
      default: typeColor = 'bg-gray-100 text-gray-700';
    }
  }

  return { type, typeLabel, typeColor };
};

const ProductTransactionsModal = ({ product, transactions, isOpen, onClose, showStockDetails = true, warehouseStocks = [], branchStocks = [] }) => {
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

  // Function to group transactions by their reference number
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

  // Function to get only latest version of each transaction
  const getLatestTransactions = () => {
    const latest = [];
    Object.values(groupedTransactions).forEach(group => {
      latest.push(group[0]);
    });
    return latest;
  };

  const getTransactionType = (transaction) => {
    if (transaction.inventoryType) {
      return transaction.inventoryType.replace('_', ' ');
    }

    if (transaction.transactionType === 'SALE') {
      return 'SALE';
    }

    if (transaction.transactionType === 'DELIVERY') {
      return 'DELIVERY';
    }

    return transaction.transactionType?.replace('_', ' ') || 'UNKNOWN';
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

  const getQuantityDisplay = (transaction) => {
    const quantity = transaction.quantity || 0;
    const action = transaction.action;

    const isPositive = action === 'ADD' || action === 'RESERVE';

    return {
      quantity: Math.abs(quantity),
      sign: isPositive ? '+' : '-',
      colorClass: isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    };
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


  const groupedTransactions = groupTransactionsByReference(transactions);
  const latestTransactions = getLatestTransactions();


  const filteredTransactions = latestTransactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      transaction.productName?.toLowerCase().includes(searchLower) ||
      transaction.referenceNumber?.toLowerCase().includes(searchLower) ||
      transaction.remarks?.toLowerCase().includes(searchLower) ||
      getTransactionType(transaction).toLowerCase().includes(searchLower);

    const matchesType = filterType === 'ALL' ||
      (() => {
        const transactionType = transaction.inventoryType || transaction.transactionType;

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

  // ✅ Sort: Deleted transactions go to the END
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

  // ✅ Count deleted transactions
  const deletedTransactionsCount = filteredTransactions.filter(t =>
    t.isDeleted === true || t.action === 'DELETED'
  ).length;


  const toggleRowExpansion = (transactionId) => {
    setExpandedRows(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };


  // ✅ Handle delete single transaction
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

  // ✅ Handle delete all deleted transactions
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
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Product Movement History</h2>
            <p className="text-gray-600">
              {product.productName} - {product.sku}
              {product.warehouseName && <span className="ml-2 text-blue-600 font-semibold">@ {product.warehouseName}</span>}
              {product.branchName && <span className="ml-2 text-blue-600 font-semibold">@ {product.branchName}</span>}
            </p>
            {showStockDetails && product && (
              <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Stock Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  {product.warehouseName && (
                    <>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Warehouse Total</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {warehouseStocks.find(s =>
                            s.warehouseId === product.warehouseId &&
                            s.productId === product.productId
                          )?.quantity || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{product.warehouseName}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Available</div>
                        <div className="text-2xl font-bold text-green-600">
                          {warehouseStocks.find(s =>
                            s.warehouseId === product.warehouseId &&
                            s.productId === product.productId
                          )?.availableQuantity || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Ready to use</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Reserved</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {warehouseStocks.find(s =>
                            s.warehouseId === product.warehouseId &&
                            s.productId === product.productId
                          )?.reservedQuantity || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">For pending orders</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Delivered</div>
                        <div className="text-2xl font-bold text-teal-600">
                          {warehouseStocks.find(s =>
                            s.warehouseId === product.warehouseId &&
                            s.productId === product.productId
                          )?.deliveredQuantity || 0}
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
                          {branchStocks.find(s =>
                            s.branchId === product.branchId &&
                            s.productId === product.productId
                          )?.quantity || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{product.branchName}</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Available</div>
                        <div className="text-2xl font-bold text-green-600">
                          {branchStocks.find(s =>
                            s.branchId === product.branchId &&
                            s.productId === product.productId
                          )?.availableQuantity || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Ready for sale</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Pending Sales</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {branchStocks.find(s =>
                            s.branchId === product.branchId &&
                            s.productId === product.productId
                          )?.pendingSales || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Awaiting confirmation</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                        <div className="text-2xl font-bold text-pink-600">
                          {branchStocks.find(s =>
                            s.branchId === product.branchId &&
                            s.productId === product.productId
                          )?.totalSales || 0}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Sold to customers</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Overall summary for non-location specific views */}
                {!product.warehouseName && !product.branchName && product.productId && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Total Warehouse Stock</div>
                      <div className="text-xl font-bold text-blue-600">
                        {warehouseStocks
                          .filter(s => s.productId === product.productId)
                          .reduce((sum, s) => sum + (s.quantity || 0), 0)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Total Branch Stock</div>
                      <div className="text-xl font-bold text-green-600">
                        {branchStocks
                          .filter(s => s.productId === product.productId)
                          .reduce((sum, s) => sum + (s.quantity || 0), 0)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Total Delivered</div>
                      <div className="text-xl font-bold text-teal-600">
                        {warehouseStocks
                          .filter(s => s.productId === product.productId)
                          .reduce((sum, s) => sum + (s.deliveredQuantity || 0), 0)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                      <div className="text-xl font-bold text-pink-600">
                        {branchStocks
                          .filter(s => s.productId === product.productId)
                          .reduce((sum, s) => sum + (s.totalSales || 0), 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SALE STATUS HISTORY */}
            {product.saleStatus && (
              <div className="mt-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
                  {/* Header/Toggle Button */}
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

                  {/* Collapsible Content */}
                  {showSaleTimeline && (
                    <div className="space-y-3">
                      {product.fullTransactionHistory && product.fullTransactionHistory.length > 0 ? (
                        // ✅ FILTER: Only show SALE transactions in the sale timeline
                        product.fullTransactionHistory
                          .filter(tx => {
                            // Include only SALE transactions or transactions related to this specific sale
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

                                  {/* Action Details */}
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

                                  {/* Branch Info */}
                                  {tx.fromBranch && (
                                    <p className="text-xs text-blue-700 mt-1">
                                      From Branch: {tx.fromBranch.branchName}
                                    </p>
                                  )}

                                  {/* Generated By */}
                                  {isInvoiced && tx.remarks && tx.remarks.includes('Generated by:') && (
                                    <p className="text-xs text-green-700 mt-1 font-semibold">
                                      Generated by: {tx.remarks.match(/Generated by: (.+?)(?:\[|$)/)?.[1]?.trim()}
                                    </p>
                                  )}

                                  {/* Full Remarks - Clean up if it's a sale */}
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

                  {/* Current Status Badge - Always visible */}
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

            {/* DELIVERY TRANSACTION HISTORY */}
            {product.deliveryStatus && product.fullTransactionHistory && (
              <div className="mt-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  {/* Header/Toggle Button */}
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

                  {/* Collapsible Content */}
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

                              {/* Action Details */}
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

                              {/* Location Info */}
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

                              {/* Full Remarks */}
                              <p className="text-xs text-gray-600 mt-1 italic">
                                {tx.remarks}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Current Status - Always visible */}
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

          {/* Advanced Filters */}
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

              {/* ✅ Add this deleted filter dropdown */}
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

                {/* ✅ Delete All Deleted Transactions Button */}
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
                                if (!date) {
                                  return (
                                    <>
                                      <div className="text-red-600">Invalid Date</div>
                                      <div className="text-xs text-gray-500">--:--</div>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <div className="font-medium">
                                      {date.toLocaleDateString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: 'numeric'
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {date.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </div>
                                    {/* ✅ THIS IS NEW - Shows if transaction has been edited */}
                                    {hasHistory && (
                                      <div className="text-xs text-blue-600 font-semibold mt-1">
                                        ✏️ Edited ({transactionHistory.length} versions)
                                      </div>
                                    )}
                                  </>
                                );
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
                                      // ✅ For DELIVERY SUBTRACT, show the warehouse
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
                                      // ✅ For DELIVERY SUBTRACT, show the branch destination
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
                                {quantityInfo.sign}{quantityInfo.quantity}
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

                                {/* ✅ THIS IS NEW - Button to show/hide edit history */}
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
                                                  {histQuantityInfo.sign}{histQuantityInfo.quantity}
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


const EnhancedInventoryManagement = () => {
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productTransactions, setProductTransactions] = useState([]);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [filteredInventories, setFilteredInventories] = useState([]);
  const [showStockDetails, setShowStockDetails] = useState(true);
  const [showWarehouseFilter, setShowWarehouseFilter] = useState(true);
  const [showBranchFilter, setShowBranchFilter] = useState(true);
  const [showTransactionFilter, setShowTransactionFilter] = useState(true);
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [showVariationFilter, setShowVariationFilter] = useState('ALL');






  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filter states
  const [warehouseFilters, setWarehouseFilters] = useState({
    warehouse: '',
    minQty: '',
    maxQty: '',
    startDate: '',
    endDate: ''
  });

  const [branchFilters, setBranchFilters] = useState({
    branch: '',
    minQty: '',
    maxQty: '',
    startDate: '',
    endDate: ''
  });

  const [transactionFilters, setTransactionFilters] = useState({
    type: 'ALL',
    verifiedBy: '',
    startDate: '',
    endDate: '',
    minItems: '',
    maxItems: ''
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState('products');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [stockCurrentPage, setStockCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [productItemsPerPage] = useState(8);
  const [stockItemsPerPage] = useState(10);


  useEffect(() => {
    if (inventories && inventories.length > 0) {
      const filtered = inventories.filter(inv => {
        const searchLower = searchTerm.toLowerCase();
        const isDeleted = inv.isDeleted === true;
        const deletedText = isDeleted ? "deleted" : "";

        const matchesSearch =
          inv.inventoryType?.toLowerCase().includes(searchLower) ||
          inv.verifiedBy?.toLowerCase().includes(searchLower) ||
          inv.remarks?.toLowerCase().includes(searchLower) ||
          deletedText.includes(searchLower) ||
          (inv.fromWarehouse?.warehouseName?.toLowerCase().includes(searchLower)) ||
          (inv.fromBranch?.branchName?.toLowerCase().includes(searchLower)) ||
          (inv.toWarehouse?.warehouseName?.toLowerCase().includes(searchLower)) ||
          (inv.toBranch?.branchName?.toLowerCase().includes(searchLower));

        let matchesType = true;
        if (transactionFilters.type !== 'ALL') {
          if (inv.inventoryType === 'TRANSFER') {
            const hasFrom = inv.fromWarehouse || inv.fromBranch;
            const hasTo = inv.toWarehouse || inv.toBranch;

            if (transactionFilters.type === 'TRANSFER_IN') {
              matchesType = hasTo && !hasFrom;
            } else if (transactionFilters.type === 'TRANSFER_OUT') {
              matchesType = hasFrom && !hasTo;
            } else if (transactionFilters.type === 'TRANSFER') {
              matchesType = true;
            } else {
              matchesType = false;
            }
          } else {
            matchesType = inv.inventoryType === transactionFilters.type;
          }
        }

        const matchesVerifiedBy = !transactionFilters.verifiedBy ||
          inv.verifiedBy?.toLowerCase().includes(transactionFilters.verifiedBy.toLowerCase());

        const transactionDate = new Date(inv.verificationDate || inv.date || inv.transactionDate || inv.createdAt);
        const matchesStartDate = !transactionFilters.startDate || transactionDate >= new Date(transactionFilters.startDate);
        const matchesEndDate = !transactionFilters.endDate || transactionDate <= new Date(transactionFilters.endDate + 'T23:59:59');

        const itemCount = inv.items?.length || 0;
        const matchesMinItems = !transactionFilters.minItems || itemCount >= parseInt(transactionFilters.minItems);
        const matchesMaxItems = !transactionFilters.maxItems || itemCount <= parseInt(transactionFilters.maxItems);

        return matchesSearch && matchesType && matchesVerifiedBy && matchesStartDate && matchesEndDate && matchesMinItems && matchesMaxItems;
      });

      // ✅ Sort: deleted items go to the end
      const sortedFiltered = filtered.sort((a, b) => {
        if (a.isDeleted && !b.isDeleted) return 1;
        if (!a.isDeleted && b.isDeleted) return -1;
        return 0;
      });

      setFilteredInventories(sortedFiltered);
    } else {
      setFilteredInventories([]);
    }
  }, [inventories, searchTerm, transactionFilters, warehouses, branches]);


  useEffect(() => {
    loadData();
    window.loadData = loadData;

    return () => {
      delete window.loadData;
    };
  }, []);


  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Loading inventory data...');
      const [
        invRes,
        prodRes,
        warehousesRes,
        branchesRes,
        warehouseStocksRes,
        branchStocksRes,
        salesRes,
        companiesRes,
        productVariationSummariesRes
      ] = await Promise.all([
        api.get('/inventories'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/branches'),
        api.get('/stocks/warehouses'),
        api.get('/stocks/branches'),
        api.get('/sales'),
        api.get('/companies'),
        api.get('/transactions/products/summary/variations')
      ]);
      if (productVariationSummariesRes.success) {
        setProductSummaries(productVariationSummariesRes.data || []);
      }

      const inventoriesData = invRes.success ? invRes.data || [] : [];
      const productsData = prodRes.success ? prodRes.data || [] : [];
      const warehousesData = warehousesRes.success ? warehousesRes.data || [] : [];
      const branchesData = branchesRes.success ? branchesRes.data || [] : [];
      const warehouseStocksData = warehouseStocksRes.success ? warehouseStocksRes.data || [] : [];
      const branchStocksData = branchStocksRes.success ? branchStocksRes.data || [] : [];
      const salesData = salesRes.success ? salesRes.data || [] : [];
      const companiesData = companiesRes.success ? companiesRes.data || [] : [];

      setInventories(inventoriesData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setBranches(branchesData);
      setWarehouseStocks(warehouseStocksData);
      setBranchStocks(branchStocksData);
      setSales(salesData);
      setCompanies(companiesData);

      const cleanedInventories = [];
      const seenSaleIds = new Set();

      for (const inv of inventoriesData) {
        if (inv.inventoryType === 'SALE') {
          const saleId = inv.referenceNumber ?
            parseInt(inv.referenceNumber.replace('SALE-', '')) :
            inv.id;

          if (seenSaleIds.has(saleId) || saleId <= 0 || isNaN(saleId)) {
            continue;
          }

          seenSaleIds.add(saleId);
          cleanedInventories.push(inv);
        } else {
          cleanedInventories.push(inv);
        }
      }

      if (cleanedInventories.length !== inventoriesData.length) {
        setInventories(cleanedInventories);
      }

      try {
        const summaryRes = await api.get('/inventories/products/summary');
        if (summaryRes.success) {
          setProductSummaries(summaryRes.data || []);
        }
      } catch (summaryErr) {
        console.warn('Could not load product summaries:', summaryErr);
        setProductSummaries([]);
      }

    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };




  const filteredProductSummaries = productSummaries.filter(product => {
    const searchLower = productSearchTerm.toLowerCase();

    const matchesSearch =
      product.productName?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.upc?.toLowerCase().includes(searchLower) ||
      (product.variationSku && product.variationSku.toLowerCase().includes(searchLower)) ||
      (product.variationName && product.variationName.toLowerCase().includes(searchLower)) ||
      (product.combinationDisplay && product.combinationDisplay.toLowerCase().includes(searchLower));

    const isVariation = product.isVariation === true || product.variationId;

    const matchesVariationFilter =
      showVariationFilter === 'ALL' ||
      (showVariationFilter === 'BASE_ONLY' && !isVariation) ||
      (showVariationFilter === 'VARIATION_ONLY' && isVariation);

    return matchesSearch && matchesVariationFilter;
  });


  const filteredWarehouseStocks = warehouseStocks.filter(stock => {
    const matchesSearch =
      stock.productName?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      stock.warehouseName?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      stock.sku?.toLowerCase().includes(stockSearchTerm.toLowerCase());

    const matchesWarehouse = !warehouseFilters.warehouse ||
      stock.warehouseName === warehouseFilters.warehouse;

    const matchesMinQty = !warehouseFilters.minQty || (stock.quantity || 0) >= parseInt(warehouseFilters.minQty);
    const matchesMaxQty = !warehouseFilters.maxQty || (stock.quantity || 0) <= parseInt(warehouseFilters.maxQty);

    const stockDate = new Date(stock.lastUpdated);
    const matchesStartDate = !warehouseFilters.startDate || stockDate >= new Date(warehouseFilters.startDate);
    const matchesEndDate = !warehouseFilters.endDate || stockDate <= new Date(warehouseFilters.endDate + 'T23:59:59');

    return matchesSearch && matchesWarehouse && matchesMinQty && matchesMaxQty &&
      matchesStartDate && matchesEndDate;
  });


  // Filter branch stocks with advanced filters
  const filteredBranchStocks = branchStocks.filter(stock => {
    const matchesSearch =
      stock.productName?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      stock.branchName?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      stock.sku?.toLowerCase().includes(stockSearchTerm.toLowerCase());

    const matchesBranch = !branchFilters.branch ||
      stock.branchName === branchFilters.branch;

    const matchesMinQty = !branchFilters.minQty || (stock.quantity || 0) >= parseInt(branchFilters.minQty);
    const matchesMaxQty = !branchFilters.maxQty || (stock.quantity || 0) <= parseInt(branchFilters.maxQty);

    const stockDate = new Date(stock.lastUpdated);
    const matchesStartDate = !branchFilters.startDate || stockDate >= new Date(branchFilters.startDate);
    const matchesEndDate = !branchFilters.endDate || stockDate <= new Date(branchFilters.endDate + 'T23:59:59');

    return matchesSearch && matchesBranch && matchesMinQty && matchesMaxQty &&
      matchesStartDate && matchesEndDate;
  });

  // Pagination calculations
  const productIndexOfLastItem = productCurrentPage * productItemsPerPage;
  const productIndexOfFirstItem = productIndexOfLastItem - productItemsPerPage;
  const currentProductSummaries = filteredProductSummaries.slice(productIndexOfFirstItem, productIndexOfLastItem);
  const productTotalPages = Math.ceil(filteredProductSummaries.length / productItemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInventories = filteredInventories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventories.length / itemsPerPage);

  const stockIndexOfLastItem = stockCurrentPage * stockItemsPerPage;
  const stockIndexOfFirstItem = stockIndexOfLastItem - stockItemsPerPage;
  const currentWarehouseStocks = filteredWarehouseStocks.slice(stockIndexOfFirstItem, stockIndexOfLastItem);
  const currentBranchStocks = filteredBranchStocks.slice(stockIndexOfFirstItem, stockIndexOfLastItem);
  const warehouseStockTotalPages = Math.ceil(filteredWarehouseStocks.length / stockItemsPerPage);
  const branchStockTotalPages = Math.ceil(filteredBranchStocks.length / stockItemsPerPage);




  const handleViewTransaction = async (transaction) => {
    try {
      setViewingId(transaction.id);
      setActionLoading(true);
      setLoadingMessage('Loading transaction details...');
      if (transaction.inventoryType === 'SALE') {
        let saleId;

        if (transaction.id > 2000000) {
          saleId = transaction.id - 2000000;
        } else if (transaction.referenceNumber && transaction.referenceNumber.includes('SALE-')) {
          saleId = parseInt(transaction.referenceNumber.replace('SALE-', ''));
        } else if (transaction.id) {
          saleId = transaction.id;
        } else {
          toast.error('Cannot find valid sale ID');
          return;
        }

        if (isNaN(saleId) || saleId <= 0) {
          toast.error('Invalid sale ID: ' + saleId);
          return;
        }

        try {
          const fullSaleRes = await api.get(`/sales/${saleId}`);

          // Check if the API call was successful and has data
          if (!fullSaleRes.success || !fullSaleRes.data) {
            toast.error('Sale details not found. It may have been deleted.');
            return;
          }

          const fullSale = fullSaleRes.data;

          // Check if items exist and is an array
          if (!fullSale.items || !Array.isArray(fullSale.items)) {
            toast.error('Sale items data is missing or invalid.');
            return;
          }

          // Create an array of promises for each product transaction
          const allTransactionPromises = fullSale.items.map(item => {
            if (item.product && item.product.id) {
              return api.get(`/transactions/product/${item.product.id}`);
            }
            return Promise.resolve({ success: false, data: [] });
          });

          const allProductTransactionResponses = await Promise.all(allTransactionPromises);

          // Extract data from successful responses
          const allProductTransactions = allProductTransactionResponses
            .filter(res => res.success && Array.isArray(res.data))
            .flatMap(res => res.data);

          const thisSaleTransactions = allProductTransactions
            .filter(t =>
              (t.referenceNumber === `SALE-${saleId}`) ||
              (t.referenceId === saleId) ||
              (t.remarks && t.remarks.includes(`SALE-${saleId}`))
            )
            .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

          setSelectedProduct({
            productName: 'Sale Transaction History',
            sku: `SALE-${saleId}`,
            branchName: transaction.fromBranch?.branchName || fullSale.branch?.branchName,
            saleStatus: fullSale.status,
            generatedBy: fullSale.generatedBy,
            invoicedAt: fullSale.invoicedAt,
            confirmedAt: fullSale.createdAt,
            companyName: fullSale.company?.companyName,
            month: fullSale.month,
            year: fullSale.year,
            fullTransactionHistory: thisSaleTransactions
          });

          const transactionItems = fullSale.items.map(item => {
            const itemTransactions = thisSaleTransactions.filter(t =>
              t.productId === item.product?.id
            );

            return {
              id: item.id || `${saleId}-${item.product?.id || 'unknown'}`,
              productId: item.product?.id,
              productName: item.product?.productName || 'Unknown Product',
              sku: item.product?.sku || 'N/A',
              transactionType: 'SALE',
              inventoryType: 'SALE',
              quantity: item.quantity || 0,
              fromBranch: fullSale.branch,
              referenceId: fullSale.id,
              referenceNumber: `SALE-${fullSale.id}`,
              transactionDate: fullSale.createdAt,
              action: 'SUBTRACT',
              remarks: `Sale - SALE-${fullSale.id}`,
              statusHistory: itemTransactions
            };
          });

          setProductTransactions(transactionItems);
          setShowStockDetails(false);
          setShowTransactionsModal(true);
        } catch (saleErr) {
          console.error('Failed to fetch sale details:', saleErr);
          toast.error('Failed to load sale details. Please try again.');
        }
        return;
      }

      if (transaction.inventoryType === 'DELIVERY') {
        let deliveryId;
        if (transaction.id && transaction.id > 1000000) {
          deliveryId = transaction.id - 1000000;
        } else if (transaction.id) {
          deliveryId = transaction.id;
        } else {
          toast.error('Cannot find valid delivery ID');
          return;
        }

        if (deliveryId <= 0) {
          toast.error('Invalid delivery ID: ' + deliveryId);
          return;
        }

        try {
          const fullDeliveryRes = await api.get(`/deliveries/${deliveryId}`);

          // Check if the API call was successful and has data
          if (!fullDeliveryRes.success || !fullDeliveryRes.data) {
            toast.error('Delivery details not found. It may have been deleted.');
            return;
          }

          const fullDelivery = fullDeliveryRes.data;

          // Check if items exist and is an array
          if (!fullDelivery.items || !Array.isArray(fullDelivery.items)) {
            toast.error('Delivery items data is missing or invalid.');
            return;
          }

          // Create an array of promises for each product transaction
          const allTransactionPromises = fullDelivery.items.map(item => {
            if (item.product && item.product.id) {
              return api.get(`/transactions/product/${item.product.id}`);
            }
            return Promise.resolve({ success: false, data: [] });
          });

          const allProductTransactionResponses = await Promise.all(allTransactionPromises);

          // Extract data from successful responses
          const allProductTransactions = allProductTransactionResponses
            .filter(res => res.success && Array.isArray(res.data))
            .flatMap(res => res.data);

          const thisDeliveryTransactions = allProductTransactions
            .filter(t => t.referenceNumber === fullDelivery.deliveryReceiptNumber)
            .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

          setSelectedProduct({
            productName: 'Delivery Items',
            sku: fullDelivery.deliveryReceiptNumber || `DEL-${deliveryId}`,
            warehouseName: transaction.fromWarehouse?.warehouseName,
            branchName: transaction.toBranch?.branchName,
            deliveryStatus: fullDelivery.status,
            deliveredAt: fullDelivery.deliveredAt,
            fullTransactionHistory: thisDeliveryTransactions
          });

          const transactionItems = fullDelivery.items.map((item, idx) => {
            const fromWarehouse = item.warehouse;
            const toBranch = fullDelivery.branch;

            const itemTransactions = thisDeliveryTransactions.filter(t =>
              item.product && t.productId === item.product.id
            );

            return {
              id: `${deliveryId}-${item.product?.id || 'unknown'}-${idx}`,
              productId: item.product?.id,
              productName: item.product?.productName || 'Unknown Product',
              sku: item.product?.sku || 'N/A',
              transactionType: 'DELIVERY',
              inventoryType: 'DELIVERY',
              quantity: item.quantity || 0,
              fromWarehouse: fromWarehouse,
              fromBranch: null,
              toWarehouse: null,
              toBranch: toBranch,
              referenceId: deliveryId,
              referenceNumber: fullDelivery.deliveryReceiptNumber || `DEL-${deliveryId}`,
              transactionDate: fullDelivery.deliveredAt || fullDelivery.createdAt || fullDelivery.date,
              action: 'DELIVERY',
              remarks: `DELIVERY: ${fullDelivery.deliveryReceiptNumber}`,
              statusHistory: itemTransactions
            };
          });

          setProductTransactions(transactionItems);
          setShowStockDetails(false);
          setShowTransactionsModal(true);
          return;
        } catch (deliveryErr) {
          console.error('Failed to fetch delivery details:', deliveryErr);
          toast.error('Failed to load delivery details. Please try again.');
          return;
        }
      }

      // Handle other transaction types
      let inventoryId = transaction.id;

      if (inventoryId > 1000000 && inventoryId < 2000000) {
        toast.error('This appears to be a delivery transaction. Please use delivery view.');
        return;
      } else if (inventoryId > 2000000) {
        toast.error('This appears to be a sale transaction. Please use sale view.');
        return;
      }

      try {
        const freshInventoryRes = await api.get(`/inventories/${inventoryId}`);

        if (!freshInventoryRes.success || !freshInventoryRes.data) {
          toast.error('Inventory details not found. It may have been deleted.');
          return;
        }

        const freshInventory = freshInventoryRes.data;

        setSelectedProduct({
          productName: transaction.inventoryType === 'TRANSFER' ? 'Transfer Transaction' :
            transaction.inventoryType === 'RETURN' ? 'Return Transaction' :
              transaction.inventoryType === 'STOCK_IN' ? 'Stock In Items' :
                transaction.inventoryType === 'DAMAGE' ? 'Damage Report' :
                  'Transaction Items',
          sku: `INV-${inventoryId}`,
          warehouseName: transaction.fromWarehouse?.warehouseName || transaction.toWarehouse?.warehouseName,
          branchName: transaction.fromBranch?.branchName || transaction.toBranch?.branchName
        });

        const transactionItems = (freshInventory.items || []).map((item, idx) => ({
          id: `${inventoryId}-${item.product?.id || 'unknown'}-${idx}`,
          productId: item.product?.id,
          productName: item.product?.productName || 'Unknown Product',
          sku: item.product?.sku || 'N/A',
          transactionType: transaction.inventoryType,
          inventoryType: transaction.inventoryType,
          quantity: item.quantity || 0,
          fromWarehouse: freshInventory.fromWarehouse,
          fromBranch: freshInventory.fromBranch,
          toWarehouse: freshInventory.toWarehouse,
          toBranch: freshInventory.toBranch,
          referenceId: inventoryId,
          referenceNumber: `INV-${inventoryId}`,
          transactionDate: freshInventory.createdAt || freshInventory.verificationDate,
          action: transaction.inventoryType === 'STOCK_IN' ? 'ADD' :
            transaction.inventoryType === 'DAMAGE' ? 'SUBTRACT' :
              'PROCESS',
          remarks: freshInventory.remarks || `${transaction.inventoryType} transaction`
        }));

        setProductTransactions(transactionItems);
        setShowStockDetails(false);
        setShowTransactionsModal(true);

      } catch (err) {
        console.error('Failed to load inventory details:', err);
        toast.error('Failed to load transaction details: ' + (err.message || 'Unknown error'));
      }

    } catch (err) {
      console.error('Failed to load transaction details:', err);

      if (err.message.includes('404') || err.message.includes('not found')) {
        toast.error('Transaction details not found. The record may have been deleted.');
      } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to load transaction details: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setViewingId(null);
      setActionLoading(false);
      setLoadingMessage('');
    }
  };




  const handleViewTransactions = async (product, showStock = false) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading transaction history...');
      let targetId;
      if (product.isVariation && product.variationId) {
        targetId = product.variationId;
      } else {
        targetId = product.productId;
      }

      setSelectedProduct({
        productId: product.productId,
        variationId: product.variationId,
        productName: product.productName,
        sku: product.sku,
        upc: product.upc,
        isVariation: product.isVariation,
        variationName: product.variationName,
        variationSku: product.variationSku,
        combinationDisplay: product.combinationDisplay,
        warehouseId: product.warehouseId,
        warehouseName: product.warehouseName,
        branchId: product.branchId,
        branchName: product.branchName
      });
      const transactionsRes = await api.get(`/transactions/product/${targetId}`);
      const transactionsData = transactionsRes.success ? transactionsRes.data || [] : [];

      setProductTransactions(transactionsData);
      setShowStockDetails(showStock);
      setShowTransactionsModal(true);
    } catch (err) {
      console.error('Failed to load product transactions:', err);
      toast.error('Failed to load transaction history');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };


  const handleViewStockTransactions = async (stock, locationType) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading stock transactions...');

      setSelectedProduct({
        productId: stock.productId,
        productName: stock.productName,
        sku: stock.sku,
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        branchId: stock.branchId,
        branchName: stock.branchName,
        locationType: locationType
      });

      const transactionsRes = await api.get(`/transactions/product/${stock.productId}`);
      const transactionsData = transactionsRes.success ? transactionsRes.data || [] : [];


      // Filter transactions for this specific location
      let filteredTransactions = transactionsData;
      if (locationType === 'warehouse' && stock.warehouseId) {
        filteredTransactions = transactionsData.filter(t => {
          const transactionType = t.transactionType || t.inventoryType;

          // For TRANSFER - show BOTH sending out (SUBTRACT) AND receiving in (ADD)
          if (transactionType === 'TRANSFER') {
            // Show SUBTRACT if this warehouse is the source (sending out)
            const isSendingOut = t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
            // Show ADD if this warehouse is the destination (receiving in)
            const isReceivingIn = t.toWarehouse?.id === stock.warehouseId && t.action === 'ADD';
            return isSendingOut || isReceivingIn;
          }

          // For DELIVERY - only show SUBTRACT (warehouse side - sending to branch)
          if (transactionType === 'DELIVERY') {
            return t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
          }

          // For STOCK_IN - show if warehouse is the destination
          if (transactionType === 'STOCK_IN') {
            return t.toWarehouse?.id === stock.warehouseId;
          }

          // For RETURN - show ADD (receiving returns back to warehouse)
          if (transactionType === 'RETURN') {
            return t.toWarehouse?.id === stock.warehouseId && t.action === 'ADD';
          }

          // For DAMAGE - show SUBTRACT (damaged items removed from warehouse)
          if (transactionType === 'DAMAGE') {
            return t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
          }

          // For other transactions, show if warehouse is involved in either side
          return t.fromWarehouse?.id === stock.warehouseId ||
            t.toWarehouse?.id === stock.warehouseId;
        });
      } else if (locationType === 'branch' && stock.branchId) {
        filteredTransactions = transactionsData.filter(t => {
          const transactionType = t.transactionType || t.inventoryType;

          // For TRANSFER - only show ADD (receiving at branch)
          if (transactionType === 'TRANSFER') {
            return t.toBranch?.id === stock.branchId && t.action === 'ADD';
          }

          // For DELIVERY - only show ADD (branch side - receiving from warehouse)
          if (transactionType === 'DELIVERY') {
            return t.toBranch?.id === stock.branchId && t.action === 'ADD';
          }

          // For SALE - show SUBTRACT (items sold from branch)
          if (transactionType === 'SALE') {
            return t.fromBranch?.id === stock.branchId && t.action === 'SUBTRACT';
          }

          // For RETURN - show SUBTRACT (items returned from branch)
          if (transactionType === 'RETURN') {
            return t.fromBranch?.id === stock.branchId && t.action === 'SUBTRACT';
          }

          // For other transactions, show if branch is involved in either side
          return t.fromBranch?.id === stock.branchId ||
            t.toBranch?.id === stock.branchId;
        });
      }

      setProductTransactions(filteredTransactions);
      setShowTransactionsModal(true);
    } catch (err) {
      console.error('Failed to load stock transactions:', err);
      toast.error('Failed to load transactions');
    } finally {
      // ✅ ADD THESE LINES
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const calculateTotalQuantity = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  };




  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record? This cannot be undone.')) return;

    try {
      setDeletingId(id);
      setActionLoading(true);
      setLoadingMessage('Deleting transaction...');

      const transactionToDelete = inventories.find(inv => inv.id === id);
      const isSale = transactionToDelete?.inventoryType === 'SALE';
      const isDelivery = transactionToDelete?.inventoryType === 'DELIVERY';

      let actualReferenceId = id;
      if (isSale && id > 2000000) {
        actualReferenceId = id - 2000000;
      } else if (isDelivery && id > 1000000) {
        actualReferenceId = id - 1000000;
      }

      await api.delete(`/inventories/${id}`);

      if (isSale || isDelivery) {
        try {
          const timestamp = Date.now();

          if (isSale) {
            const branchStocksRes = await api.get(`/stocks/branches?_t=${timestamp}`);
            if (branchStocksRes.success) {
              setBranchStocks(branchStocksRes.data || []);
            }
            const summaryRes = await api.get(`/inventories/products/summary?_t=${timestamp}`);
            if (summaryRes.success) {
              setProductSummaries(summaryRes.data || []);
            }
          }

          if (isDelivery) {
            const [warehouseStocksRes, branchStocksRes] = await Promise.all([
              api.get(`/stocks/warehouses?_t=${timestamp}`),
              api.get(`/stocks/branches?_t=${timestamp}`)
            ]);

            if (warehouseStocksRes.success) {
              setWarehouseStocks(warehouseStocksRes.data || []);
            }
            if (branchStocksRes.success) {
              setBranchStocks(branchStocksRes.data || []);
            }
          }

          toast.success('Stock levels updated successfully');
        } catch (refreshErr) {
          console.error('Failed to refresh stock data:', refreshErr);
          toast.error('Deleted but failed to refresh stock. Please refresh the page.');
        }
      }

      toast.success('Deleted successfully');

      if (showTransactionsModal && selectedProduct) {
        setProductTransactions(prev => prev.map(t => {
          if (t.referenceId === id || t.referenceNumber === `INV-${id}`) {
            return {
              ...t,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              originalRemarks: t.remarks
            };
          }
          return t;
        }));
        toast.info('Transactions marked as deleted in history');
      }

      setInventories(prev => prev.filter(inv => inv.id !== id));

      if (showTransactionsModal && selectedProduct) {
        setProductTransactions(prev => prev.map(t => {
          let matchesDeletedTransaction = false;

          if (isSale) {
            matchesDeletedTransaction =
              t.referenceNumber === `SALE-${actualReferenceId}` ||
              t.referenceId === actualReferenceId ||
              (t.remarks && t.remarks.includes(`SALE-${actualReferenceId}`));
          } else if (isDelivery) {
            const deliveryRefNumber = transactionToDelete.remarks?.match(/Delivery: ([^\s]+)/)?.[1];
            matchesDeletedTransaction =
              t.referenceNumber === deliveryRefNumber ||
              t.referenceId === actualReferenceId ||
              (t.remarks && deliveryRefNumber && t.remarks.includes(deliveryRefNumber));
          } else {
            matchesDeletedTransaction =
              t.referenceId === id ||
              t.referenceNumber === `INV-${id}` ||
              (t.remarks && t.remarks.includes(`INV-${id}`));
          }

          if (matchesDeletedTransaction) {
            return {
              ...t,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              originalRemarks: t.remarks
            };
          }
          return t;
        }));
        toast.info('Transactions marked as deleted in history');
      }

      if (filteredInventories.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      toast.error('Delete failed: ' + (err.message || 'Unknown error'));
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
      setActionLoading(false);
      setLoadingMessage('');
    }
  };




  const SearchableWarehouseDropdown = ({ warehouses, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredWarehouses = warehouses.filter(warehouse =>
      warehouse.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.warehouseCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedWarehouse = warehouses.find(w => w.warehouseName === value);

    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
        >
          <span className={selectedWarehouse ? 'text-gray-900' : 'text-gray-500'}>
            {selectedWarehouse ? selectedWarehouse.warehouseName : placeholder}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search warehouses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-44">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                  }`}
              >
                All Warehouses
              </button>
              {filteredWarehouses.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">No warehouses found</div>
              ) : (
                filteredWarehouses.map(warehouse => (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() => {
                      onChange(warehouse.warehouseName);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${value === warehouse.warehouseName ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                      }`}
                  >
                    <div className="font-medium">{warehouse.warehouseName}</div>
                    <div className="text-xs text-gray-500">{warehouse.warehouseCode}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ────────────────────── Searchable Branch Dropdown ──────────────────────
  const SearchableBranchDropdown = ({ branches, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredBranches = branches.filter(branch =>
      branch.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.branchCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedBranch = branches.find(b => b.branchName === value);

    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between bg-white"
        >
          <span className={selectedBranch ? 'text-gray-900' : 'text-gray-500'}>
            {selectedBranch ? selectedBranch.branchName : placeholder}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-44">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                  }`}
              >
                All Branches
              </button>
              {filteredBranches.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">No branches found</div>
              ) : (
                filteredBranches.map(branch => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      onChange(branch.branchName);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${value === branch.branchName ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                      }`}
                  >
                    <div className="font-medium">{branch.branchName}</div>
                    <div className="text-xs text-gray-500">{branch.branchCode}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingOverlay show={true} message="Loading" />
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay show={loading || actionLoading} message={loadingMessage || 'Loading...'} />
      <div className="p-6 max-w-full mx-auto">
        <Toaster position="top-right" />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track stock movements across warehouses and branches with delivery integration</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <BarChart3 className="inline w-4 h-4 mr-2" />
                Product Summary
              </button>
              <button
                onClick={() => setActiveTab('warehouse-stocks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'warehouse-stocks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Building className="inline w-4 h-4 mr-2" />
                Warehouse Stocks
              </button>
              <button
                onClick={() => setActiveTab('branch-stocks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'branch-stocks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Store className="inline w-4 h-4 mr-2" />
                Branch Stocks
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Package className="inline w-4 h-4 mr-2" />
                Transactions
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'products' && (
          <div className="mb-8">
            {/* Search Bar - Keep this */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or UPC..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ADD THIS VARIATION FILTER PANEL */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Filter size={16} />
                Product Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or UPC..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={showVariationFilter}
                  onChange={(e) => setShowVariationFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ALL">All Products</option>
                  <option value="BASE_ONLY">Base Products Only</option>
                  <option value="VARIATION_ONLY">Variations Only</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {(productSearchTerm || showVariationFilter !== 'ALL') && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setProductSearchTerm('');
                      setShowVariationFilter('ALL');
                    }}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* KEEP THE ENTIRE TABLE SECTION EXACTLY AS IS - Just paste it here */}
            <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Product Inventory Summary
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock In</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transfer Out</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Return</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Damage</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle size={14} />
                          Delivered
                        </div>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart size={14} />
                          Sales
                        </div>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Truck size={14} />
                          Pending Delivery
                        </div>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          Pending Sale
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentProductSummaries.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
                          {filteredProductSummaries.length === 0 ? 'No products found' : 'No products on this page'}
                        </td>
                      </tr>
                    ) : (
                      currentProductSummaries.map((product) => {
                        const isVariation = product.isVariation || product.variationId;

                        // Generate a unique key for each product/variation
                        const uniqueKey = isVariation
                          ? `variation-${product.variationId}-${product.productId}`
                          : `product-${product.productId}`;

                        // For variations, use variation-specific SKU/UPC if available
                        const displaySku = isVariation ? (product.variationSku || product.sku) : product.sku;
                        const displayUpc = isVariation ? (product.variationUpc || product.upc) : product.upc;

                        return (
                          <tr
                            key={uniqueKey}
                            className={`hover:bg-gray-50 ${isVariation ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
                          >
                            <td className="px-3 py-3">
                              <div className="max-w-[200px]">
                                <div className="font-medium text-gray-900 text-sm break-words whitespace-normal leading-tight">
                                  {product.productName}
                                  {isVariation && product.variationName && (
                                    <span className="ml-2 text-blue-600 font-semibold">
                                      ({product.variationName})
                                    </span>
                                  )}
                                </div>
                                {isVariation && product.combinationDisplay && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {product.combinationDisplay}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  SKU: {displaySku || 'N/A'}
                                </div>
                                {displayUpc && displayUpc !== 'N/A' && (
                                  <div className="text-gray-500">UPC: {displayUpc}</div>
                                )}
                                {isVariation && (
                                  <>
                                    {product.sku && product.sku !== displaySku && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Base SKU: {product.sku}
                                      </div>
                                    )}
                                    {product.upc && product.upc !== displayUpc && (
                                      <div className="text-xs text-gray-400">
                                        Base UPC: {product.upc}
                                      </div>
                                    )}
                                    <div className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                                      Product Variation
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                +{product.totalStockIn || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                -{product.totalTransferOut || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                +{product.totalReturn || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                -{product.totalDamage || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                <CheckCircle size={12} />
                                {product.totalDelivered || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                <ShoppingCart size={12} />
                                {product.totalSales || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Truck size={12} />
                                {product.warehousePendingDelivery || 0}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <Clock size={12} />
                                {product.branchPendingDelivery || 0}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => {
                                  const targetProduct = {
                                    ...product,
                                    productId: product.productId,
                                    variationId: product.variationId,
                                    productName: product.productName,
                                    sku: displaySku,
                                    upc: displayUpc,
                                    isVariation: isVariation,
                                    variationName: product.variationName
                                  };
                                  handleViewTransactions(targetProduct, true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Eye size={14} />
                                View History
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Product Summary Pagination */}
              {filteredProductSummaries.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {productIndexOfFirstItem + 1} to {Math.min(productIndexOfLastItem, filteredProductSummaries.length)} of {filteredProductSummaries.length} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={productCurrentPage === 1}
                      className={`p-2 rounded-lg border ${productCurrentPage === 1
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: productTotalPages }, (_, i) => i + 1)
                        .filter(num =>
                          num === 1 ||
                          num === productTotalPages ||
                          (num >= productCurrentPage - 1 && num <= productCurrentPage + 1)
                        )
                        .map((number, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] !== number + 1;
                          return (
                            <React.Fragment key={number}>
                              <button
                                onClick={() => setProductCurrentPage(number)}
                                className={`min-w-[36px] px-2 py-1 text-sm rounded-lg border ${productCurrentPage === number
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                                  }`}
                              >
                                {number}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-gray-500">...</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setProductCurrentPage(prev => Math.min(prev + 1, productTotalPages))}
                      disabled={productCurrentPage === productTotalPages}
                      className={`p-2 rounded-lg border ${productCurrentPage === productTotalPages
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warehouse Stocks */}
        {activeTab === 'warehouse-stocks' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search warehouse stocks by product name, warehouse, or SKU..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Warehouse Advanced Filter Panel */}
            {showWarehouseFilter && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
                    <SearchableWarehouseDropdown
                      warehouses={warehouses}
                      value={warehouseFilters.warehouse}
                      onChange={(value) => setWarehouseFilters({ ...warehouseFilters, warehouse: value })}
                      placeholder="Select warehouse..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Total Stock</label>
                    <input
                      type="number"
                      placeholder="Min total stock..."
                      value={warehouseFilters.minQty}
                      onChange={(e) => setWarehouseFilters({ ...warehouseFilters, minQty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Total Stock</label>
                    <input
                      type="number"
                      placeholder="Max total stock..."
                      value={warehouseFilters.maxQty}
                      onChange={(e) => setWarehouseFilters({ ...warehouseFilters, maxQty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={warehouseFilters.startDate}
                      onChange={(e) => setWarehouseFilters({ ...warehouseFilters, startDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={warehouseFilters.endDate}
                      onChange={(e) => setWarehouseFilters({ ...warehouseFilters, endDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setWarehouseFilters({
                      warehouse: '',
                      minQty: '',
                      maxQty: '',
                      startDate: '',
                      endDate: ''
                    })}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building size={20} />
                  Warehouse Stock Levels
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle size={14} />
                          Delivered
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Truck size={14} />
                          Pending Delivery
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentWarehouseStocks.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                          No warehouse stock records found
                        </td>
                      </tr>
                    ) : (
                      currentWarehouseStocks.map((stock) => {

                        return (
                          <tr key={stock.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="max-w-[180px]">
                                <div className="font-medium text-gray-900 text-sm" title={stock.warehouseName}>
                                  {stock.warehouseName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {stock.warehouseCode}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[200px]">
                                <div className="font-medium text-gray-900 text-sm">
                                  {stock.fullProductName || stock.productName}
                                </div>
                                {stock.combinationDisplay && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {stock.combinationDisplay}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  SKU: {stock.displaySku || stock.productSku || 'N/A'}
                                </div>
                                {stock.displayUpc && stock.displayUpc !== 'N/A' && (
                                  <div className="text-gray-500">UPC: {stock.displayUpc}</div>
                                )}
                                {stock.variationName && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    Variation: {stock.variationName}
                                    {stock.variationSku && ` (SKU: ${stock.variationSku})`}
                                    {stock.variationUpc && stock.variationUpc !== 'N/A' && ` (UPC: ${stock.variationUpc})`}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stock.quantity > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {stock.quantity || 0}
                              </span>
                            </td>
                            {/* ✅ Use backend value - deliveredQuantity */}
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                <CheckCircle size={12} />
                                {stock.deliveredQuantity || 0}
                              </span>
                            </td>

                            {/* ✅ Use backend value - pendingDeliveries */}
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Truck size={12} />
                                {stock.pendingDeliveries || 0}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {stock.availableQuantity || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {(() => {
                                const date = parseDate(stock.lastUpdated);
                                if (!date) return 'N/A';
                                return (
                                  <>
                                    {date.toLocaleDateString()}<br />
                                    <span className="text-gray-400">{date.toLocaleTimeString()}</span>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleViewStockTransactions(stock, 'warehouse')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Warehouse Stock Pagination */}
              {currentWarehouseStocks.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {stockIndexOfFirstItem + 1} to {Math.min(stockIndexOfLastItem, currentWarehouseStocks.length)} of{' '}
                    {filteredWarehouseStocks.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStockCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={stockCurrentPage === 1}
                      className={`p-2 rounded-lg border ${stockCurrentPage === 1
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: warehouseStockTotalPages }, (_, i) => i + 1)
                        .filter(num =>
                          num === 1 ||
                          num === warehouseStockTotalPages ||
                          (num >= stockCurrentPage - 1 && num <= stockCurrentPage + 1)
                        )
                        .map((number, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] !== number + 1;
                          return (
                            <React.Fragment key={number}>
                              <button
                                onClick={() => setStockCurrentPage(number)}
                                className={`min-w-[36px] px-2 py-1 text-sm rounded-lg border ${stockCurrentPage === number
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                                  }`}
                              >
                                {number}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-gray-500">...</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setStockCurrentPage(prev => Math.min(prev + 1, warehouseStockTotalPages))}
                      disabled={stockCurrentPage === warehouseStockTotalPages}
                      className={`p-2 rounded-lg border ${stockCurrentPage === warehouseStockTotalPages
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Branch Stocks */}
        {activeTab === 'branch-stocks' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search branch stocks by product name, branch, or SKU..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Branch Advanced Filter Panel */}
            {showBranchFilter && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <SearchableBranchDropdown
                      branches={branches}
                      value={branchFilters.branch}
                      onChange={(value) => setBranchFilters({ ...branchFilters, branch: value })}
                      placeholder="Select branch..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Total Stock</label>
                    <input
                      type="number"
                      placeholder="Min total stock..."
                      value={branchFilters.minQty}
                      onChange={(e) => setBranchFilters({ ...branchFilters, minQty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Total Stock</label>
                    <input
                      type="number"
                      placeholder="Max total stock..."
                      value={branchFilters.maxQty}
                      onChange={(e) => setBranchFilters({ ...branchFilters, maxQty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={branchFilters.startDate}
                      onChange={(e) => setBranchFilters({ ...branchFilters, startDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={branchFilters.endDate}
                      onChange={(e) => setBranchFilters({ ...branchFilters, endDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setBranchFilters({
                      branch: '',
                      minQty: '',
                      maxQty: '',
                      startDate: '',
                      endDate: ''
                    })}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Store size={20} />
                  Branch Stock Levels
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU/UPC</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle size={14} />
                          Delivered
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart size={14} />
                          Total Sales
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Truck size={14} />
                          Pending Delivery
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          Pending Sale
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentBranchStocks.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
                          No branch stock records found
                        </td>
                      </tr>
                    ) : (
                      currentBranchStocks.map((stock) => {
                        const confirmedSales = stock.confirmedSales || 0;
                        const invoicedSales = stock.invoicedSales || 0;
                        const totalSales = confirmedSales + invoicedSales;

                        return (
                          <tr key={stock.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="max-w-[180px]">
                                <div className="font-medium text-gray-900 text-sm" title={stock.branchName}>
                                  {stock.branchName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {stock.branchCode}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[200px]">
                                <div className="font-medium text-gray-900 text-sm">
                                  {stock.fullProductName || stock.productName}
                                </div>
                                {stock.combinationDisplay && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {stock.combinationDisplay}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  SKU: {stock.displaySku || stock.productSku || 'N/A'}
                                </div>
                                {stock.displayUpc && stock.displayUpc !== 'N/A' && (
                                  <div className="text-gray-500">UPC: {stock.displayUpc}</div>
                                )}
                                {stock.variationName && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    Variation: {stock.variationName}
                                    {stock.variationSku && ` (SKU: ${stock.variationSku})`}
                                    {stock.variationUpc && stock.variationUpc !== 'N/A' && ` (UPC: ${stock.variationUpc})`}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stock.quantity > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {stock.quantity || 0}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                <CheckCircle size={12} />
                                {stock.deliveredQuantity || 0}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                <ShoppingCart size={12} />
                                {stock.totalSales || 0}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Truck size={12} />
                                {stock.pendingDeliveries || 0}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <Clock size={12} />
                                {stock.pendingSales || 0}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {stock.availableQuantity || 0}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-xs text-gray-500">
                              {(() => {
                                const date = parseDate(stock.lastUpdated);
                                if (!date) return 'N/A';
                                return (
                                  <>
                                    {date.toLocaleDateString()}<br />
                                    <span className="text-gray-400">{date.toLocaleTimeString()}</span>
                                  </>
                                );
                              })()}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleViewStockTransactions(stock, 'branch')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Branch Stock Pagination */}
              {currentBranchStocks.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {stockIndexOfFirstItem + 1} to {Math.min(stockIndexOfLastItem, currentBranchStocks.length)} of{' '}
                    {filteredBranchStocks.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStockCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={stockCurrentPage === 1}
                      className={`p-2 rounded-lg border ${stockCurrentPage === 1
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: branchStockTotalPages }, (_, i) => i + 1)
                        .filter(num =>
                          num === 1 ||
                          num === branchStockTotalPages ||
                          (num >= stockCurrentPage - 1 && num <= stockCurrentPage + 1)
                        )
                        .map((number, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] !== number + 1;
                          return (
                            <React.Fragment key={number}>
                              <button
                                onClick={() => setStockCurrentPage(number)}
                                className={`min-w-[36px] px-2 py-1 text-sm rounded-lg border ${stockCurrentPage === number
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                                  }`}
                              >
                                {number}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-gray-500">...</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setStockCurrentPage(prev => Math.min(prev + 1, branchStockTotalPages))}
                      disabled={stockCurrentPage === branchStockTotalPages}
                      className={`p-2 rounded-lg border ${stockCurrentPage === branchStockTotalPages
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>


            {/* Transactions Advanced Filter Panel */}
            {showTransactionFilter && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                    <select
                      value={transactionFilters.type}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Types</option>
                      <option value="STOCK_IN">Stock In</option>
                      <option value="TRANSFER">Transfer</option>
                      <option value="RETURN">Return</option>
                      <option value="DAMAGE">Damage</option>
                      <option value="DELIVERY">Delivery</option>
                      <option value="SALE">Sale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verified By</label>
                    <input
                      type="text"
                      placeholder="Filter by verifier..."
                      value={transactionFilters.verifiedBy}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, verifiedBy: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Items</label>
                    <input
                      type="number"
                      placeholder="Min items..."
                      value={transactionFilters.minItems}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, minItems: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Items</label>
                    <input
                      type="number"
                      placeholder="Max items..."
                      value={transactionFilters.maxItems}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, maxItems: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={transactionFilters.startDate}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, startDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={transactionFilters.endDate}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, endDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setTransactionFilters({
                      type: 'ALL',
                      verifiedBy: '',
                      startDate: '',
                      endDate: '',
                      minItems: '',
                      maxItems: ''
                    })}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
                <p className="text-sm text-gray-600 mt-1">Showing inventory, transfer in/out, delivery, and sales records</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentInventories.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          {filteredInventories.length === 0 ? 'No transactions found' : 'No transactions on this page'}
                        </td>
                      </tr>
                    ) : (
                      currentInventories.map((transaction, idx) => {
                        const displayInfo = getTransactionDisplayInfo(transaction);
                        const isTransferOrReturn = transaction.inventoryType === 'TRANSFER' || transaction.inventoryType === 'RETURN';
                        const isDelivery = transaction.inventoryType === 'DELIVERY';
                        const getTransactionTimestamp = (trans) => {
                          let timestamp = null;

                          if (trans.inventoryType === 'SALE' || trans.transactionType === 'SALE') {
                            timestamp = trans.invoicedAt || trans.createdAt || trans.transactionDate || trans.verificationDateTime;
                          } else if (trans.inventoryType === 'DELIVERY' || trans.transactionType === 'DELIVERY') {
                            timestamp = trans.deliveredAt || trans.date || trans.transactionDate || trans.createdAt || trans.verificationDateTime;
                          } else {
                            timestamp = trans.verificationDateTime || trans.transactionDate || trans.createdAt ||
                              (trans.verificationDate ? new Date(trans.verificationDate).toISOString() : null);
                          }
                          return timestamp || null;
                        };

                        const transactionTimestamp = getTransactionTimestamp(transaction);

                        return (
                          <tr key={`transaction-${transaction.id}-${transaction.inventoryType || transaction.transactionType}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${displayInfo.typeColor}`}>
                                  {displayInfo.typeLabel}
                                </span>
                                {transaction.isDeleted && (
                                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300 shadow-sm">
                                    🗑️ DELETED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="max-w-[250px]">
                                <div className="text-gray-900">
                                  {transaction.inventoryType === 'DELIVERY' ?
                                    `${transaction.fromWarehouse?.warehouseName || 'Warehouse'} → ${transaction.toBranch?.branchName || 'Branch'}` :
                                    transaction.inventoryType === 'SALE' ?
                                      `${transaction.fromBranch?.branchName || 'Branch'} → Sale` :
                                      transaction.inventoryType === 'STOCK_IN' ?
                                        `Stock In → ${transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-'}` :
                                        transaction.inventoryType === 'DAMAGE' ?
                                          `${transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-'} (Damage)` :
                                          `${(transaction.fromWarehouse?.warehouseName || transaction.fromBranch?.branchName || '-')} → ${(transaction.toWarehouse?.warehouseName || transaction.toBranch?.branchName || '-')}`
                                  }
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-sm">{transaction.items?.length || 0}</td>
                            <td className="px-3 py-3 text-center text-sm font-medium text-blue-600">
                              {calculateTotalQuantity(transaction.items).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(() => {
                                if (!transactionTimestamp) {
                                  return (
                                    <>
                                      <div>N/A</div>
                                      <div className="text-xs text-gray-500">--:--</div>
                                    </>
                                  );
                                }

                                try {
                                  let date;
                                  if (Array.isArray(transactionTimestamp)) {
                                    const [year, month, day, hour, minute, second] = transactionTimestamp;
                                    date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
                                  } else {
                                    const isoTimestamp = String(transactionTimestamp).replace(' ', 'T');
                                    date = new Date(isoTimestamp);
                                  }
                                  if (isNaN(date.getTime())) {
                                    console.error('Invalid date:', transactionTimestamp);
                                    return (
                                      <>
                                        <div className="text-red-600">Invalid Date</div>
                                        <div className="text-xs text-gray-500">Check format</div>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      <div>
                                        {date.toLocaleDateString('en-US', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          year: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {date.toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </div>
                                    </>
                                  );
                                } catch (error) {
                                  console.error('Date parsing error:', error, transactionTimestamp);
                                  return (
                                    <>
                                      <div className="text-red-600">Error</div>
                                      <div className="text-xs text-gray-500">Parse failed</div>
                                    </>
                                  );
                                }
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleViewTransaction(transaction)}
                                disabled={viewingId === transaction.id || deletingId === transaction.id}
                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition ${viewingId === transaction.id || deletingId === transaction.id
                                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                                  : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                              >
                                {viewingId === transaction.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Eye size={14} />
                                    View Details
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inventory Transactions Pagination */}
              {filteredInventories.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInventories.length)} of {filteredInventories.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border ${currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(num =>
                          num === 1 ||
                          num === totalPages ||
                          (num >= currentPage - 1 && num <= currentPage + 1)
                        )
                        .map((number, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] !== number + 1;
                          return (
                            <React.Fragment key={number}>
                              <button
                                onClick={() => setCurrentPage(number)}
                                className={`min-w-[36px] px-2 py-1 text-sm rounded-lg border ${currentPage === number
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                                  }`}
                              >
                                {number}
                              </button>
                              {showEllipsis && (
                                <span className="px-1 text-gray-500">...</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg border ${currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}


        <ProductTransactionsModal
          product={selectedProduct}
          transactions={productTransactions}
          isOpen={showTransactionsModal}
          onClose={() => setShowTransactionsModal(false)}
          showStockDetails={showStockDetails}
          warehouseStocks={warehouseStocks}
          branchStocks={branchStocks}
        />
      </div>
    </>
  );
};

export default EnhancedInventoryManagement;