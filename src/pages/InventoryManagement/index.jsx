import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, BarChart3, Building, Store, RefreshCw, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Hooks
import { useAuth, canSeeFilter } from '../../context/AuthContext';
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
import { useWarehouseStockData, useBranchStockData, useProductSummaryData, fetchAllBranchStocks } from '../../components/hooks/useStockPageData';
import StockRebuildPanel, { PasswordGate } from '../../components/tables/InventoryManagement/StockRebuildPanel';
import TransactionCleanupPanel from '../../components/tables/InventoryManagement/TransactionCleanupPanel';
import ProductSummaryReportPanel from '../../components/filters/ProductSummaryReportPanel';
import BranchSummaryReportModal from '../../components/modals/BranchSummaryReportModal';
import WarehouseFilterPanel from '../../components/filters/WarehouseFilterPanel';
import BranchFilterPanel from '../../components/filters/BranchFilterPanel';
import WarehouseReportInlineTable from '../../components/tables/InventoryManagement/WarehouseReportInlineTable';
import BranchReportInlineTable from '../../components/tables/InventoryManagement/BranchReportInlineTable';
import BranchStockExportButton from '../../components/tables/InventoryManagement/BranchStockExportButton';
const InventoryManagement = () => {
  const { user } = useAuth();
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [debouncedStockSearchTerm, setDebouncedStockSearchTerm] = useState('');
  const [warehouseStockPage, setWarehouseStockPage] = useState(1);
  const [branchStockPage, setBranchStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 20;
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showBranchReportModal, setShowBranchReportModal] = useState(false);
  const [branchReportData, setBranchReportData] = useState([]);
  const [branchReportLoading, setBranchReportLoading] = useState(false);
  const REBUILD_UNLOCK_KEY = 'stockToolsUnlockedUntil';
  const UNLOCK_TTL_MS = 30 * 60 * 1000;
  const [warehouseMovementMap, setWarehouseMovementMap] = useState({});
  const [warehouseMovLoading, setWarehouseMovLoading] = useState(false);
  const warehouseMovementCache = useRef({});
  const fetchedProductIdsByWarehouse = useRef({});

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
      const res = await api.get('/inventory-reports/products/summary');
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
      } catch (err) {
        console.error('Failed to load reference data', err);
      }
    };
    loadReferenceData();
  }, [loadProductSummaries]);


  const {
    warehouseStocks,
    branchStocks,
    loadLocationStock,
  } = useInventory();


  const transactionHandlers = useTransactionHandlers();

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

  const {
    stocks: warehouseStocksPage,
    loading: warehouseStocksPageLoading,
    totalPages: warehouseStockServerTotalPages,
    totalElements: warehouseStockTotalElements,
    grandTotals: warehouseGrandTotals,
    refetch: refetchWarehouseStocks,
  } = useWarehouseStockData({
    warehouseId: warehouseFilters.filters.warehouse || undefined,
    searchTerm: activeTab === 'warehouse-stocks' ? debouncedStockSearchTerm : '',
    minQty: warehouseFilters.filters.minQty || undefined,
    maxQty: warehouseFilters.filters.maxQty || undefined,
    startDate: warehouseFilters.filters.startDate || undefined,
    endDate: warehouseFilters.filters.endDate || undefined,
    currentPage: warehouseStockPage,
    pageSize: STOCK_PAGE_SIZE,
  });

  const branchStockFilterParams = {
    companyIds: branchFilters.filters.companyIds,
    branchIds: branchFilters.filters.branchIds,
    productIds: (branchFilters.filters.productKeys || [])
      .map((k) => k.split('_')[0])
      .filter(Boolean),
    searchTerm: debouncedStockSearchTerm,
    minQty: branchFilters.filters.minQty || undefined,
    maxQty: branchFilters.filters.maxQty || undefined,
    startDate: branchFilters.filters.startDate || undefined,
    endDate: branchFilters.filters.endDate || undefined,
  };

  const handleFetchBranchExportData = useCallback(
    () => fetchAllBranchStocks(branchStockFilterParams),
    [JSON.stringify(branchStockFilterParams)]
  );

  const {
    stocks: branchStocksPage,
    loading: branchStocksPageLoading,
    totalPages: branchStockServerTotalPages,
    totalElements: branchStockTotalElements,
    grandTotals: branchGrandTotals,
    refetch: refetchBranchStocks,
  } = useBranchStockData({
    companyIds: branchFilters.filters.companyIds,
    branchIds: branchFilters.filters.branchIds,
    productIds: (branchFilters.filters.productKeys || [])
      .map((k) => k.split('_')[0])
      .filter(Boolean),
    searchTerm: activeTab === 'branch-stocks' ? debouncedStockSearchTerm : '',
    minQty: branchFilters.filters.minQty || undefined,
    maxQty: branchFilters.filters.maxQty || undefined,
    startDate: branchFilters.filters.startDate || undefined,
    endDate: branchFilters.filters.endDate || undefined,
    currentPage: branchStockPage,
    pageSize: STOCK_PAGE_SIZE,
  });

  const productPagination = usePaginationControl(10);
  const stockPagination = usePaginationControl(10);

  const selectedProductKeys = productReportFilters.filters.productKeys || [];

  const {
    summaries: productSummaryPage,
    loading: productSummaryPageLoading,
    totalPages: productSummaryTotalPages,
    totalElements: productSummaryTotalElements,
  } = useProductSummaryData({
    searchTerm: productSearchTerm,
    variationFilter: showVariationFilter,
    productKeys: selectedProductKeys,
    currentPage: productPagination.currentPage,
    pageSize: 10,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedStockSearchTerm(stockSearchTerm), 400);
    return () => clearTimeout(timer);
  }, [stockSearchTerm]);

  useEffect(() => {
    productPagination.setCurrentPage(1);
  }, [
    productSearchTerm,
    showVariationFilter,
    JSON.stringify(selectedProductKeys),
  ]);

  useEffect(() => {
    stockPagination.setCurrentPage(1);
    setWarehouseStockPage(1);
    setBranchStockPage(1);
  }, [
    debouncedStockSearchTerm,
    activeTab,
    JSON.stringify(warehouseFilters.filters),
    JSON.stringify(branchFilters.filters),
  ]);

  const filteredWarehouseStocks = Array.isArray(warehouseStocksPage) ? warehouseStocksPage : [];

  const productIdsByWarehouse = {};
  filteredWarehouseStocks.forEach((s) => {
    const wid = String(s.warehouseId ?? '');
    const pid = String(s.productId ?? '');
    if (!wid || !pid) return;
    if (!productIdsByWarehouse[wid]) productIdsByWarehouse[wid] = new Set();
    productIdsByWarehouse[wid].add(pid);
  });

  const warehouseIdKey = Object.keys(productIdsByWarehouse).sort().join(',');
  const movementDepsKey = Object.keys(productIdsByWarehouse)
    .sort()
    .map((wid) => `${wid}:${[...productIdsByWarehouse[wid]].sort().join(',')}`)
    .join('|');

  useEffect(() => {
    if (!warehouseIdKey) {
      setWarehouseMovementMap({});
      return;
    }

    const warehouseIds = warehouseIdKey.split(',');

    // Only fetch (warehouse, product) combinations we haven't already cached this session.
    const toFetch = {}; // wid -> [productIds not yet cached]
    warehouseIds.forEach((wid) => {
      const needed = productIdsByWarehouse[wid] || new Set();
      const already = fetchedProductIdsByWarehouse.current[wid] || new Set();
      const missing = [...needed].filter((pid) => !already.has(pid));
      if (missing.length > 0) {
        toFetch[wid] = missing;
      }
    });

    const mergeFromCache = () => {
      const map = {};
      warehouseIds.forEach((wid) => {
        Object.assign(map, warehouseMovementCache.current[wid] || {});
      });
      setWarehouseMovementMap(map);
    };

    if (Object.keys(toFetch).length === 0) {
      // Everything needed on this page has already been fetched this session — no network call.
      mergeFromCache();
      return;
    }

    let cancelled = false;
    setWarehouseMovLoading(true);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          Object.entries(toFetch).map(([wid, productIds]) => {
            const params = new URLSearchParams({ warehouseId: wid });
            productIds.forEach((pid) => params.append('productIds', pid));
            return api
              .get(`/inventory-reports/report/movements?${params}`)
              .then((res) => ({ wid, productIds, rows: Array.isArray(res.data) ? res.data : [] }))
              .catch(() => ({ wid, productIds, rows: [] }));
          })
        );
        if (cancelled) return;

        results.forEach(({ wid, productIds, rows }) => {
          if (!warehouseMovementCache.current[wid]) warehouseMovementCache.current[wid] = {};
          rows.forEach((row) => {
            const pid = String(row.productId ?? '');
            const vid = String(row.variationId ?? '');
            warehouseMovementCache.current[wid][`${wid}|${pid}|${vid}`] = {
              stockIn: Number(row.stockIn) || 0,
              transferIn: Number(row.transferIn) || 0,
              transferOut: Number(row.transferOut) || 0,
              cancelled: Number(row.cancelled) || 0,
              returns: Number(row.returns) || 0,
              damage: Number(row.damage) || 0,
              manualAdjustment: row.manualAdjustment != null ? Number(row.manualAdjustment) : 0,
            };
          });

          if (!fetchedProductIdsByWarehouse.current[wid]) {
            fetchedProductIdsByWarehouse.current[wid] = new Set();
          }
          productIds.forEach((pid) => fetchedProductIdsByWarehouse.current[wid].add(pid));
        });

        mergeFromCache();
      } finally {
        if (!cancelled) setWarehouseMovLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [movementDepsKey]);

  const filteredWarehouseStocksActive = [...filteredWarehouseStocks].sort((a, b) => {
    const warehouseCompare = (a.warehouseName || '').localeCompare(
      b.warehouseName || '',
      undefined,
      { sensitivity: 'base' }
    );
    if (warehouseCompare !== 0) return warehouseCompare;

    const productA = a.fullProductName || a.productName || '';
    const productB = b.fullProductName || b.productName || '';
    return productA.localeCompare(productB, undefined, { sensitivity: 'base' });
  });

  const filteredBranchStocks = Array.isArray(branchStocksPage) ? branchStocksPage : [];

  const currentProductSummaries = productSummaryPage;
  const currentWarehouseStocks = filteredWarehouseStocksActive;
  const currentBranchStocks = filteredBranchStocks;

  const warehouseStockTotalPages = warehouseStockServerTotalPages;
  const branchStockTotalPages = branchStockServerTotalPages;

  useEffect(() => {
    loadLocationStock();
    window.loadData = () => loadLocationStock();

    return () => {
      delete window.loadData;
    };
  }, [loadLocationStock]);

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
        api.get(`/inventory-reports/report/movements?${params}`),
        api.get(`/inventory-reports/report/beginning-stock?${params}`),
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
          pendingDelivery: Number(row.pendingDelivery) || 0,
          begStock: 0,
          stockOnHand: 0,
          availableStock: 0,
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
        p.availableStock = p.stockOnHand - (p.pendingDelivery || 0);
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

      const res = await api.get(`/inventory-reports/report/branch-summary?${params}`);
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
    const { companyIds, branchIds, warehouseId, dateFrom, dateTo } = productReportFilters.filters;
    const hasCompanyFilter = (companyIds && companyIds.length > 0) || (branchIds && branchIds.length > 0);

    // Default view doesn't show this report, so don't run it on page load.
    if (!hasCompanyFilter && !warehouseId && !dateFrom && !dateTo) return;

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
      } else if (activeTab === 'warehouse-stocks') {
        await refetchWarehouseStocks();
      } else if (activeTab === 'branch-stocks') {
        await refetchBranchStocks();
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
              user={user}
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
                  totalElements={productSummaryTotalElements}
                  productIndexOfFirstItem={productPagination.getIndexOfFirstItem()}
                  productIndexOfLastItem={productPagination.getIndexOfFirstItem() + currentProductSummaries.length}
                  handleViewTransactions={handleViewTransactions}
                  productCurrentPage={productPagination.currentPage}
                  productTotalPages={productSummaryTotalPages}
                  setProductCurrentPage={productPagination.setCurrentPage}
                  isLoading={productSummaryPageLoading}
                />
              );
            })()}
          </div>
        )}

        {activeTab === 'warehouse-stocks' && (
          <div className="mb-8">
            {canSeeFilter(user, 'warehouse_inventory', 'search') && (
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
            )}

            <WarehouseFilterPanel
              user={user}
              showWarehouseFilter={showWarehouseFilter}
              warehouses={warehouses}
              filters={warehouseFilters.filters}
              updateFilter={warehouseFilters.updateFilter}
              clearFilters={warehouseFilters.clearFilters}
            />

            <WarehouseStockTable
              currentWarehouseStocks={currentWarehouseStocks}
              filteredWarehouseStocks={filteredWarehouseStocksActive}
              stockIndexOfFirstItem={(warehouseStockPage - 1) * STOCK_PAGE_SIZE}
              stockIndexOfLastItem={(warehouseStockPage - 1) * STOCK_PAGE_SIZE + currentWarehouseStocks.length}
              handleViewStockTransactions={handleViewStockTransactions}
              stockCurrentPage={warehouseStockPage}
              warehouseStockTotalPages={warehouseStockTotalPages}
              setStockCurrentPage={setWarehouseStockPage}
              isLoading={warehouseStocksPageLoading}
              productSummaries={productSummaries}
              isAdmin={true}
              currentUser="Admin"
              onStockUpdated={() => refetchWarehouseStocks()}
              movementMap={warehouseMovementMap}
              movLoading={warehouseMovLoading}
              grandTotals={warehouseGrandTotals}
              totalElements={warehouseStockTotalElements}
            />
          </div>
        )}

        {activeTab === 'branch-stocks' && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              {canSeeFilter(user, 'warehouse_inventory', 'search') && (
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
              )}
              <BranchStockExportButton fetchData={handleFetchBranchExportData} />
            </div>
            <BranchFilterPanel
              user={user}
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
              stockIndexOfFirstItem={(branchStockPage - 1) * STOCK_PAGE_SIZE}
              stockIndexOfLastItem={(branchStockPage - 1) * STOCK_PAGE_SIZE + currentBranchStocks.length}
              handleViewStockTransactions={handleViewStockTransactions}
              stockCurrentPage={branchStockPage}
              branchStockTotalPages={branchStockTotalPages}
              setStockCurrentPage={setBranchStockPage}
              isLoading={branchStocksPageLoading}
              grandTotals={branchGrandTotals}
              totalElements={branchStockTotalElements}
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
                        loadLocationStock();
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
                        loadLocationStock();
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