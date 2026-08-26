import React, { useState, useEffect, useCallback } from 'react';
import { Search, BarChart3, Building, Store, RefreshCw, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Hooks
import useInventory from '../../hooks/data/useInventory';
import { useTransactionHandlers } from '../../hooks/useTransactionHandlers';
import { useFilters } from '../../hooks/ui/useFilters';
import { usePaginationControl } from '../../hooks/ui/usePaginationControl';
import { api } from '../../services/api';

// Components
import ProductTransactionsModal from '../../components/modals/ProductTransactionsModal';
import InventorySummaryReportModal from '../../components/modals/InventorySummaryReportModal';
import ProductSummaryTable from '../../components/tables/InventoryManagement/ProductSummaryTable';
import WarehouseStockTable from '../../components/tables/InventoryManagement/WarehouseStockTable';
import BranchStockTable from '../../components/tables/InventoryManagement/BranchStockTable';
import StockRebuildPanel, { PasswordGate } from '../../components/tables/InventoryManagement/StockRebuildPanel';
import TransactionCleanupPanel from '../../components/tables/InventoryManagement/TransactionCleanupPanel';
import ProductSummaryReportPanel from '../../components/filters/ProductSummaryReportPanel';
import BranchSummaryReportModal from '../../components/modals/BranchSummaryReportModal';
import WarehouseFilterPanel from '../../components/filters/WarehouseFilterPanel';
import BranchFilterPanel from '../../components/filters/BranchFilterPanel';
import WarehouseReportInlineTable from '../../components/tables/InventoryManagement/WarehouseReportInlineTable';
import BranchReportInlineTable from '../../components/tables/InventoryManagement/BranchReportInlineTable';
import {
  filterProductSummaries,
  filterWarehouseStocks,
  filterBranchStocks
} from '../../utils/inventoryFilters';

const InventoryManagement = () => {
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [showVariationFilter, setShowVariationFilter] = useState('ALL');
  const [showWarehouseFilter, setShowWarehouseFilter] = useState(true);
  const [showBranchFilter, setShowBranchFilter] = useState(true);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryPageSize] = useState(50);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [refDataLoading, setRefDataLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showBranchReportModal, setShowBranchReportModal] = useState(false);
  const [branchReportData, setBranchReportData] = useState([]);
  const [branchReportLoading, setBranchReportLoading] = useState(false);
  const REBUILD_UNLOCK_KEY = 'stockToolsUnlockedUntil';
  const UNLOCK_TTL_MS = 30 * 60 * 1000;

  const [stockToolsUnlocked, setStockToolsUnlocked] = useState(() => {
    try {
      const expiry = sessionStorage.getItem(REBUILD_UNLOCK_KEY);
      return expiry ? Date.now() < Number(expiry) : false;
    } catch {
      return false;
    }
  });

  const handleUnlockStockTools = () => {
    try {
      sessionStorage.setItem(REBUILD_UNLOCK_KEY, String(Date.now() + UNLOCK_TTL_MS));
    } catch { }
    setStockToolsUnlocked(true);
  };

  const handleRelockStockTools = () => {
    try {
      sessionStorage.removeItem(REBUILD_UNLOCK_KEY);
    } catch { }
    setStockToolsUnlocked(false);
  };

  const productReportFilters = useFilters({
    productKeys: [],
    dateFrom: '',
    dateTo: '',
    warehouseId: '',
    companyIds: [],
    branchIds: [],
  });

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
    loading,
    canModifyStatus,
    warehouseStocks,
    branchStocks,
    loadingStocks,
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

  const productPagination = usePaginationControl(10);
  const stockPagination = usePaginationControl(10);

  const selectedProductKeys = productReportFilters.filters.productKeys || [];
  const baseFilteredSummaries = filterProductSummaries(
    Array.isArray(productSummaries) ? productSummaries : [],
    productSearchTerm,
    showVariationFilter
  );
  const filteredProductSummaries = selectedProductKeys.length > 0
    ? baseFilteredSummaries.filter(p => {
      const key = p.isVariation || p.variationId
        ? `${p.productId}_${p.variationId}`
        : `${p.productId}_base`;
      return selectedProductKeys.includes(key);
    })
    : baseFilteredSummaries;

  const stripRedundantBaseRows = (stocks) => {
    const productIdsWithVariationRows = new Set(
      stocks
        .filter(s => s.variationId != null)
        .map(s => String(s.productId))
    );
    return stocks.filter(s =>
      s.variationId != null || !productIdsWithVariationRows.has(String(s.productId))
    );
  };

  const warehouseStocksArray = stripRedundantBaseRows(Array.isArray(warehouseStocks) ? warehouseStocks : []);
  const filteredWarehouseStocks = filterWarehouseStocks(
    warehouseStocksArray,
    stockSearchTerm,
    warehouseFilters.filters
  );

  const branchStocksArray = stripRedundantBaseRows(Array.isArray(branchStocks) ? branchStocks : []);
  const filteredBranchStocks = filterBranchStocks(
    branchStocksArray,
    stockSearchTerm,
    branchFilters.filters,
    branches,
    products
  );

  const currentProductSummaries = productPagination.getPageItems(filteredProductSummaries);
  const currentWarehouseStocks = stockPagination.getPageItems(filteredWarehouseStocks);
  const currentBranchStocks = stockPagination.getPageItems(filteredBranchStocks);

  const productTotalPages = productPagination.getTotalPages(filteredProductSummaries.length);
  const warehouseStockTotalPages = stockPagination.getTotalPages(filteredWarehouseStocks.length);
  const branchStockTotalPages = stockPagination.getTotalPages(filteredBranchStocks.length);

  useEffect(() => {
    loadData(inventoryPage, inventoryPageSize);
    window.loadData = () => loadData(inventoryPage, inventoryPageSize);

    return () => {
      delete window.loadData;
    };
  }, [loadData, inventoryPage, inventoryPageSize]);

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

  const handleGenerateReport = async (openModal = true) => {
    setReportLoading(true);
    try {
      const { warehouseId, dateFrom, dateTo, productKeys } = productReportFilters.filters;
      const params = new URLSearchParams();
      if (warehouseId) params.append('warehouseId', warehouseId);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const [movementsRes, begStockRes] = await Promise.all([
        api.get(`/inventories/report/movements?${params}`),
        api.get(`/inventories/report/beginning-stock?${params}`),
      ]);

      const productMap = {};

      (movementsRes.data || []).forEach(row => {
        const key = `${row.productId}_${row.variationId || 'base'}`;
        productMap[key] = {
          productName: row.productName,
          sku: row.variationSku || row.productSku || 'N/A',
          upc: row.variationUpc || row.productUpc || 'N/A',
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

      const productIdsWithVariations = new Set();
      Object.keys(productMap).forEach(key => {
        const [prodId, varPart] = key.split('_');
        if (varPart && varPart !== 'base') productIdsWithVariations.add(prodId);
      });
      Object.keys(productMap).forEach(key => {
        const [prodId, varPart] = key.split('_');
        if (varPart === 'base' && productIdsWithVariations.has(prodId)) {
          delete productMap[key];
        }
      });

      Object.values(productMap).forEach(p => {
        p.stockOnHand = p.begStock
          + p.stockIn + p.transferIn + p.returns
          - p.transferOut - p.damage - p.adjustment - p.qtyDelivered;
      });

      let rows = Object.entries(productMap).map(([key, row]) => ({ key, ...row }));
      if (productKeys && productKeys.length > 0) {
        rows = rows.filter(row => productKeys.includes(row.key));
      }

      setReportData(rows);
      if (openModal) setShowReportModal(true);
    } catch (err) {
      toast.error('Failed to generate report');
      console.error('Report error:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateBranchReport = async (openModal = true) => {
    setBranchReportLoading(true);
    try {
      const { companyIds, branchIds, dateFrom, dateTo, productKeys } = productReportFilters.filters;
      const params = new URLSearchParams();
      (companyIds || []).forEach(id => params.append('companyIds', id));
      (branchIds || []).forEach(id => params.append('branchIds', id));
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/inventories/report/branch-summary?${params}`);
      if (!res.success) {
        toast.error(res.error || 'Failed to generate report');
        return;
      }

      let rows = res.data || [];

      const productIdsWithVariations = new Set(
        rows.filter(r => r.variationId != null).map(r => String(r.productId))
      );
      rows = rows.filter(r => !(r.variationId == null && productIdsWithVariations.has(String(r.productId))));

      if (productKeys && productKeys.length > 0) {
        rows = rows.filter(row => productKeys.includes(`${row.productId}_${row.variationId || 'base'}`));
      }

      setBranchReportData(rows);
      if (openModal) setShowBranchReportModal(true);
    } catch (err) {
      toast.error('Failed to generate company/branch report');
      console.error('Branch report error:', err);
    } finally {
      setBranchReportLoading(false);
    }
  };

  const handleGenerateProductReport = () => {
    const { companyIds, branchIds } = productReportFilters.filters;
    if ((companyIds && companyIds.length > 0) || (branchIds && branchIds.length > 0)) {
      handleGenerateBranchReport(true);
    } else {
      handleGenerateReport(true);
    }
  };

  useEffect(() => {
    const { companyIds, branchIds } = productReportFilters.filters;
    const hasCompanyFilter = (companyIds && companyIds.length > 0) || (branchIds && branchIds.length > 0);

    const timer = setTimeout(() => {
      if (hasCompanyFilter) {
        handleGenerateBranchReport(false);
      } else {
        handleGenerateReport(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    productReportFilters.filters.dateFrom,
    productReportFilters.filters.dateTo,
    productReportFilters.filters.warehouseId,
    JSON.stringify(productReportFilters.filters.companyIds),
    JSON.stringify(productReportFilters.filters.branchIds),
    JSON.stringify(productReportFilters.filters.productKeys),
    showVariationFilter,
  ]);

  const handleRefresh = async () => {
    setActionLoading(true);
    setLoadingMessage('Refreshing...');
    try {
      if (activeTab === 'products') {
        await loadProductSummaries();
      } else if (
        activeTab === 'warehouse-stocks' ||
        activeTab === 'branch-stocks'
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
        </div>

        {activeTab === 'products' && (
          <div className="mb-8">
            <ProductSummaryReportPanel
              products={products}
              warehouses={warehouses}
              companies={companies}
              branches={branches}
              filters={productReportFilters.filters}
              updateFilter={productReportFilters.updateFilter}
              onGenerate={handleGenerateProductReport}
              generating={reportLoading || branchReportLoading}
              showVariationFilter={showVariationFilter}
              setShowVariationFilter={setShowVariationFilter}
            />

            {(() => {
              const { companyIds, branchIds, warehouseId, dateFrom, dateTo } = productReportFilters.filters;
              const hasCompanyFilter = (companyIds && companyIds.length > 0) || (branchIds && branchIds.length > 0);
              const hasDateFilter = !!(dateFrom || dateTo);
              const reportMode = hasCompanyFilter ? 'branch' : ((warehouseId || hasDateFilter) ? 'warehouse' : 'default');

              if (reportMode === 'warehouse') {
                return <WarehouseReportInlineTable rows={reportData} loading={reportLoading} />;
              }
              if (reportMode === 'branch') {
                return <BranchReportInlineTable rows={branchReportData} loading={branchReportLoading} />;
              }
              return (
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
              );
            })()}
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
              products={products}
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

        {activeTab === 'stock-rebuild' && (
          <div className="mb-8 border border-gray-100 rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,23,42,0.04)] p-7">
            {!stockToolsUnlocked ? (
              <PasswordGate onUnlock={handleUnlockStockTools} bare />
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleRelockStockTools}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
                  >
                    <Lock size={12} /> Lock
                  </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-7 items-stretch">
                  <div className="flex-1 min-w-0">
                    <StockRebuildPanel
                      bare
                      products={products}
                      warehouses={warehouses}
                      branches={branches}
                      onRebuilt={() => {
                        loadData(inventoryPage, inventoryPageSize);
                        loadProductSummaries();
                      }}
                    />
                  </div>

                  <div className="hidden xl:block w-px bg-gray-200 self-stretch" />
                  <div className="block xl:hidden h-px bg-gray-200 w-full" />

                  <div className="flex-1 min-w-0">
                    <TransactionCleanupPanel
                      bare
                      onCleaned={() => {
                        loadData(inventoryPage, inventoryPageSize);
                        loadProductSummaries();
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <InventorySummaryReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          data={reportData}
          filters={{
            warehouse: productReportFilters.filters.warehouseId,
            dateFrom: productReportFilters.filters.dateFrom,
            dateTo: productReportFilters.filters.dateTo,
          }}
          warehouses={warehouses}
        />

        <BranchSummaryReportModal
          isOpen={showBranchReportModal}
          onClose={() => setShowBranchReportModal(false)}
          data={branchReportData}
          filters={{
            dateFrom: productReportFilters.filters.dateFrom,
            dateTo: productReportFilters.filters.dateTo,
          }}
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