import React, { useState, useEffect, useCallback } from 'react';
import { Search, BarChart3, Building, Store, Package, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Hooks
import useInventory from '../../hooks/data/useInventory';
import { useTransactionHandlers } from '../../hooks/useTransactionHandlers';
import { useFilters } from '../../hooks/ui/useFilters';
import { usePaginationControl } from '../../hooks/ui/usePaginationControl';
import { api } from '../../services/api';

// Components
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import ProductTransactionsModal from '../../components/modals/ProductTransactionsModal';
import InventorySummaryReportModal from '../../components/modals/InventorySummaryReportModal';
import ProductSummaryTable from '../../components/tables/InventoryManagement/ProductSummaryTable';
import WarehouseStockTable from '../../components/tables/InventoryManagement/WarehouseStockTable';
import BranchStockTable from '../../components/tables/InventoryManagement/BranchStockTable';
import TransactionTable from '../../components/tables/InventoryManagement/TransactionTable';
import StockRebuildPanel from '../../components/tables/InventoryManagement/StockRebuildPanel';
import TransactionCleanupPanel from '../../components/tables/InventoryManagement/TransactionCleanupPanel';
import ProductFilterPanel from '../../components/filters/ProductFilterPanel';
import WarehouseFilterPanel from '../../components/filters/WarehouseFilterPanel';
import BranchFilterPanel from '../../components/filters/BranchFilterPanel';
import TransactionFilterPanel from '../../components/filters/TransactionFilterPanel';
import { calculateTotalQuantity } from '../../utils/transactionHelpers';
import {
  filterProductSummaries,
  filterWarehouseStocks,
  filterBranchStocks,
  filterInventories
} from '../../utils/inventoryFilters';

const InventoryManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [showVariationFilter, setShowVariationFilter] = useState('ALL');
  const [showWarehouseFilter, setShowWarehouseFilter] = useState(true);
  const [showBranchFilter, setShowBranchFilter] = useState(true);
  const [showTransactionFilter, setShowTransactionFilter] = useState(true);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryPageSize] = useState(50);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [refDataLoading, setRefDataLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    warehouse: '',
    dateFrom: '',
    dateTo: '',
  });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const loadProductSummaries = useCallback(async () => {
    try {
      const res = await api.get('/inventories/products/summary');
      if (res.success) {
        setProductSummaries(res.data || []);
      } else {
        console.warn('Product summaries API returned:', res);
        setProductSummaries([]);
      }
    } catch (err) {
      console.error('Failed to load product summaries', err);
      setProductSummaries([]);
    }
  }, []);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [productsRes, warehousesRes, branchesRes, companiesRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/warehouse'),
          api.get('/branches'),
          api.get('/companies'),
        ]);
        if (productsRes.success) setProducts(productsRes.data || []);
        if (warehousesRes.success) {
          console.log('Warehouses loaded:', warehousesRes.data);
          setWarehouses(warehousesRes.data || []);
        }
        if (branchesRes.success) setBranches(branchesRes.data || []);
        if (companiesRes.success) setCompanies(companiesRes.data || []);
        await loadProductSummaries();
      } finally {
        setRefDataLoading(false);
      }
    };
    loadReferenceData();
  }, [loadProductSummaries]);


  const {
    inventories,
    loading,
    canModifyStatus,
    warehouseStocks,
    branchStocks,
    loadingStocks,
    totalInventories,
    loadData,
    loadLocationStock,
    checkCanModify,
    confirmInventory,
    deleteInventory,
    updateInventory,
    createInventory,
    setWarehouseStocks,
    setBranchStocks
  } = useInventory();


  const transactionHandlers = useTransactionHandlers();

  // Filter hooks
  const warehouseFilters = useFilters({
    warehouse: '',
    minQty: '',
    maxQty: '',
    startDate: '',
    endDate: ''
  });

  const branchFilters = useFilters({
    branchIds: [],
    companyIds: [],
    productKeys: [],
    minQty: '',
    maxQty: '',
    startDate: '',
    endDate: ''
  });

  const transactionFilters = useFilters({
    type: 'ALL',
    verifiedBy: '',
    startDate: '',
    endDate: '',
    minItems: '',
    maxItems: ''
  });

  // Pagination hooks
  const productPagination = usePaginationControl(10);
  const stockPagination = usePaginationControl(10);
  const transactionPagination = usePaginationControl(10);

  // Filtered data with safety checks
  const filteredProductSummaries = filterProductSummaries(
    Array.isArray(productSummaries) ? productSummaries : [],
    productSearchTerm,
    showVariationFilter
  );

  const warehouseStocksArray = Array.isArray(warehouseStocks) ? warehouseStocks : [];
  const filteredWarehouseStocks = filterWarehouseStocks(
    warehouseStocksArray,
    stockSearchTerm,
    warehouseFilters.filters
  );

  const branchStocksArray = Array.isArray(branchStocks) ? branchStocks : [];
  const filteredBranchStocks = filterBranchStocks(
    branchStocksArray,
    stockSearchTerm,
    branchFilters.filters,
    branches
  );

  const filteredInventories = filterInventories(
    Array.isArray(inventories) ? inventories : [],
    searchTerm,
    transactionFilters.filters,
    warehouses,
    branches
  );

  // Paginated data
  const currentProductSummaries = productPagination.getPageItems(filteredProductSummaries);
  const currentWarehouseStocks = stockPagination.getPageItems(filteredWarehouseStocks);
  const currentBranchStocks = stockPagination.getPageItems(filteredBranchStocks);
  const currentInventories = transactionPagination.getPageItems(filteredInventories);

  // Total pages
  const productTotalPages = productPagination.getTotalPages(filteredProductSummaries.length);
  const warehouseStockTotalPages = stockPagination.getTotalPages(filteredWarehouseStocks.length);
  const branchStockTotalPages = stockPagination.getTotalPages(filteredBranchStocks.length);
  const transactionTotalPages = transactionPagination.getTotalPages(filteredInventories.length);

  useEffect(() => {
    loadData(inventoryPage, inventoryPageSize);
    window.loadData = () => loadData(inventoryPage, inventoryPageSize);

    return () => {
      delete window.loadData;
    };
  }, [loadData, inventoryPage, inventoryPageSize]);

  const handleViewTransaction = (transaction) => {
    setViewingId(transaction.id);
  };

  const handleViewTransactions = (product, showStock = false) => {
    return transactionHandlers.handleViewTransactions(
      product,
      showStock,
      setActionLoading,
      setLoadingMessage
    );
  };

  const handleViewStockTransactions = (stock, locationType) => {
    return transactionHandlers.handleViewStockTransactions(
      stock,
      locationType,
      setActionLoading,
      setLoadingMessage
    );
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record? This cannot be undone.')) return;

    try {
      setDeletingId(id);
      setActionLoading(true);
      setLoadingMessage('Deleting transaction...');

      const result = await deleteInventory(id);

      if (result && result.success === false) {
        toast.error(result.error || 'Failed to delete inventory');
        return;
      }

      toast.success('Inventory deleted successfully');
      // FIX: reload both inventories AND product summaries after a delete
      await Promise.all([
        loadData(inventoryPage, inventoryPageSize),
        loadProductSummaries(),
      ]);

    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete inventory');
    } finally {
      setDeletingId(null);
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.warehouse) params.append('warehouseId', reportFilters.warehouse);

      // Fix date format: Convert from MM/DD/YYYY to YYYY-MM-DD
      let formattedDateFrom = reportFilters.dateFrom;
      let formattedDateTo = reportFilters.dateTo;

      if (formattedDateFrom && formattedDateFrom.includes('/')) {
        const [month, day, year] = formattedDateFrom.split('/');
        formattedDateFrom = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      if (formattedDateTo && formattedDateTo.includes('/')) {
        const [month, day, year] = formattedDateTo.split('/');
        formattedDateTo = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      if (formattedDateFrom) params.append('dateFrom', formattedDateFrom);
      if (formattedDateTo) params.append('dateTo', formattedDateTo);

      console.log('Report params:', params.toString());
      console.log('Report filters:', reportFilters);
      console.log('Formatted dateFrom:', formattedDateFrom);
      console.log('Formatted dateTo:', formattedDateTo);

      const [movementsRes, begStockRes] = await Promise.all([
        api.get(`/inventories/report/movements?${params}`),
        api.get(`/inventories/report/beginning-stock?${params}`),
      ]);

      console.log('Movements response:', movementsRes.data);
      console.log('BegStock response:', begStockRes.data);

      const productMap = {};

      // 1. Seed from movements
      (movementsRes.data || []).forEach(row => {
        const key = `${row.productId}_${row.variationId || 'base'}`;
        productMap[key] = {
          productName: row.productName,
          variationName: row.variationName || '',
          variationId: row.variationId || null,
          stockIn: Number(row.stockIn) || 0,
          transferIn: Number(row.transferIn) || 0,
          transferOut: Number(row.transferOut) || 0,
          returns: Number(row.returns) || 0,
          damage: Number(row.damage) || 0,
          adjustment: Number(row.adjustment) || 0,
          qtyDelivered: Number(row.qtyDelivered) || 0,
          drCount: Number(row.drCount) || 0,
          begStock: 0,
          stockOnHand: 0,
        };
      });

      // 2. Merge begStock
      (begStockRes.data || []).forEach(row => {
        const key = `${row.productId}_${row.variationId || 'base'}`;
        if (!productMap[key]) {
          productMap[key] = {
            productName: row.productName,
            variationName: row.variationName || '',
            variationId: row.variationId || null,
            stockIn: 0,
            transferIn: 0,
            transferOut: 0,
            returns: 0,
            damage: 0,
            adjustment: 0,
            qtyDelivered: 0,
            drCount: 0,
            begStock: 0,
            stockOnHand: 0,
          };
        }
        productMap[key].begStock = Number(row.begStock) || 0;
      });

      Object.values(productMap).forEach(p => {
        p.stockOnHand = p.begStock
          + p.stockIn + p.transferIn + p.returns
          - p.transferOut - p.damage - p.adjustment - p.qtyDelivered;
      });

      setReportData(Object.values(productMap));
      setShowReportModal(true);
    } catch (err) {
      toast.error('Failed to generate report');
      console.error('Report error:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleRefresh = async () => {
    setActionLoading(true);
    setLoadingMessage('Refreshing...');
    try {
      if (activeTab === 'products') {
        await loadProductSummaries();
      } else if (
        activeTab === 'warehouse-stocks' ||
        activeTab === 'branch-stocks' ||
        activeTab === 'transactions'
      ) {
        await loadData(inventoryPage, inventoryPageSize);
      }
      toast.success('Refreshed');
    } catch (err) {
      toast.error('Refresh failed');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };


  return (
    <>
      <div className="p-2 sm:p-3 lg:p-4 max-w-full mx-auto">
        <Toaster position="top-right" />

        <div className="mb-4">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-600">Track stock movements across warehouses and branches</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 items-end p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Warehouse</label>
            <select
              value={reportFilters.warehouse}
              onChange={e => setReportFilters(f => ({ ...f, warehouse: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={String(w.id)}>{w.warehouseName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Date From</label>
            <input
              type="date"
              value={reportFilters.dateFrom}
              onChange={e => setReportFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Date To</label>
            <input
              type="date"
              value={reportFilters.dateTo}
              onChange={e => setReportFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="px-4 py-1.5 text-sm bg-[#185FA5] text-white rounded-lg hover:bg-[#0C447C] transition disabled:opacity-50 flex items-center gap-2"
          >
            <BarChart3 size={14} />
            {reportLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-4">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 min-w-max">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'products'
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
                Company Stocks
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
              <button
                onClick={() => setActiveTab('stock-rebuild')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stock-rebuild'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <RefreshCw className="inline w-4 h-4 mr-2" />
                Stock Rebuild
              </button>
            </nav>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={handleRefresh}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {activeTab === 'products' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or UPC..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <ProductFilterPanel
              productSearchTerm={productSearchTerm}
              setProductSearchTerm={setProductSearchTerm}
              showVariationFilter={showVariationFilter}
              setShowVariationFilter={setShowVariationFilter}
            />

            <ProductSummaryTable
              currentProductSummaries={currentProductSummaries}
              filteredProductSummaries={filteredProductSummaries}
              productIndexOfFirstItem={productPagination.getIndexOfFirstItem()}
              productIndexOfLastItem={productPagination.getIndexOfLastItem(filteredProductSummaries.length)}
              handleViewTransactions={handleViewTransactions}
              productCurrentPage={productPagination.currentPage}
              productTotalPages={productTotalPages}
              setProductCurrentPage={productPagination.setCurrentPage}
              isLoading={refDataLoading}
            />
          </div>
        )}

        {activeTab === 'warehouse-stocks' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search warehouse stocks by product name, warehouse, or SKU..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <WarehouseFilterPanel
              showWarehouseFilter={showWarehouseFilter}
              warehouses={warehouses}
              filters={warehouseFilters.filters}
              updateFilter={warehouseFilters.updateFilter}
              clearFilters={warehouseFilters.clearFilters}
            />

            <WarehouseStockTable
              currentWarehouseStocks={currentWarehouseStocks}
              filteredWarehouseStocks={filteredWarehouseStocks}
              stockIndexOfFirstItem={stockPagination.getIndexOfFirstItem()}
              stockIndexOfLastItem={stockPagination.getIndexOfLastItem(filteredWarehouseStocks.length)}
              handleViewStockTransactions={handleViewStockTransactions}
              stockCurrentPage={stockPagination.currentPage}
              warehouseStockTotalPages={warehouseStockTotalPages}
              setStockCurrentPage={stockPagination.setCurrentPage}
              isLoading={loading}
              productSummaries={productSummaries}
              isAdmin={true}
              currentUser="Admin"
              onStockUpdated={() => loadData(inventoryPage, inventoryPageSize)}
            />
          </div>
        )}

        {activeTab === 'branch-stocks' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
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

            <BranchFilterPanel
              showBranchFilter={showBranchFilter}
              branches={branches}
              companies={companies}
              productSummaries={productSummaries}
              filters={branchFilters.filters}
              updateFilter={branchFilters.updateFilter}
              clearFilters={branchFilters.clearFilters}
            />

            <BranchStockTable
              currentBranchStocks={currentBranchStocks}
              filteredBranchStocks={filteredBranchStocks}
              stockIndexOfFirstItem={stockPagination.getIndexOfFirstItem()}
              stockIndexOfLastItem={stockPagination.getIndexOfLastItem(filteredBranchStocks.length)}
              handleViewStockTransactions={handleViewStockTransactions}
              stockCurrentPage={stockPagination.currentPage}
              branchStockTotalPages={branchStockTotalPages}
              setStockCurrentPage={stockPagination.setCurrentPage}
              isLoading={loading}
            />
          </div>
        )}

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

            <TransactionFilterPanel
              showTransactionFilter={showTransactionFilter}
              filters={transactionFilters.filters}
              updateFilter={transactionFilters.updateFilter}
              clearFilters={transactionFilters.clearFilters}
            />

            <TransactionTable
              currentInventories={currentInventories}
              filteredInventories={filteredInventories}
              indexOfFirstItem={transactionPagination.getIndexOfFirstItem()}
              indexOfLastItem={transactionPagination.getIndexOfLastItem(filteredInventories.length)}
              currentPage={transactionPagination.currentPage}
              totalPages={transactionTotalPages}
              setCurrentPage={transactionPagination.setCurrentPage}
              viewingId={viewingId}
              deletingId={deletingId}
              handleViewTransaction={handleViewTransaction}
              handleDelete={handleDeleteTransaction}
              calculateTotalQuantity={calculateTotalQuantity}
              isLoading={loading}
            />
            {totalInventories > inventoryPageSize && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-500">
                  Showing {inventoryPage * inventoryPageSize + 1} to{' '}
                  {Math.min((inventoryPage + 1) * inventoryPageSize, totalInventories)} of {totalInventories} transactions
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setIsLoadingPage(true);
                      setInventoryPage(p => Math.max(0, p - 1));
                      setTimeout(() => setIsLoadingPage(false), 500);
                    }}
                    disabled={inventoryPage === 0 || isLoadingPage}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {isLoadingPage ? (
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {inventoryPage + 1} of {Math.ceil(totalInventories / inventoryPageSize)}
                  </span>
                  <button
                    onClick={async () => {
                      setIsLoadingPage(true);
                      setInventoryPage(p => p + 1);
                      setTimeout(() => setIsLoadingPage(false), 500);
                    }}
                    disabled={(inventoryPage + 1) * inventoryPageSize >= totalInventories || isLoadingPage}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    Next
                    {isLoadingPage ? (
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'stock-rebuild' && (
          <div className="mb-8 space-y-6">
            <StockRebuildPanel
              products={products}
              warehouses={warehouses}
              branches={branches}
              onRebuilt={() => {
                loadData(inventoryPage, inventoryPageSize);
                loadProductSummaries();
              }}
            />
            <TransactionCleanupPanel
              onCleaned={() => {
                loadData(inventoryPage, inventoryPageSize);
                loadProductSummaries();
              }}
            />
          </div>
        )}

        <InventorySummaryReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          data={reportData}
          filters={reportFilters}
          warehouses={warehouses}
        />

        <ProductTransactionsModal
          product={transactionHandlers.selectedProduct}
          transactions={transactionHandlers.productTransactions}
          isOpen={transactionHandlers.showTransactionsModal}
          onClose={() => transactionHandlers.setShowTransactionsModal(false)}
          showStockDetails={transactionHandlers.showStockDetails}
          warehouseStocks={warehouseStocks}
          branchStocks={branchStocks}
        />
      </div>
    </>
  );
};

export default InventoryManagement;