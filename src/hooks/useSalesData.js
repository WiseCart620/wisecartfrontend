import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { extractArray } from '../utils/salesUtils';
import { invalidateSalesCache, clearSseRefreshTimer, setSseRefreshTimer } from '../utils/salesCache';

const buildSalesParams = (filterData, statusFilter, searchTerm, page = 0, size = 10) => {
  const startDateObj = filterData.startDate ? new Date(filterData.startDate) : null;
  const endDateObj = filterData.endDate ? new Date(filterData.endDate) : null;

  const params = new URLSearchParams({
    page,
    size,
    ...(filterData.companyId && { companyId: filterData.companyId }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(searchTerm && { searchTerm }),
    ...(startDateObj && { startYear: startDateObj.getFullYear(), startMonth: startDateObj.getMonth() + 1 }),
    ...(endDateObj && { endYear: endDateObj.getFullYear(), endMonth: endDateObj.getMonth() + 1 }),
  });

  if (filterData.branchIds?.length > 0) {
    filterData.branchIds.forEach(id => params.append('branchIds', id));
  }

  if (filterData.productFilters?.length > 0) {
    filterData.productFilters.forEach(pf => {
      if (pf.productId) params.append('productIds', pf.productId);
      if (pf.variationId) params.append('variationIds', pf.variationId);
    });
  }

  return params;
};

export const useSalesData = ({ filterData, statusFilter, searchTerm, currentPage }) => {
  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [allFilteredSales, setAllFilteredSales] = useState({});
  const [staticDataLoading, setStaticDataLoading] = useState(true);

  const staticDataLoaded = useRef(false);
  const initialLoadDone = useRef(false);

  const fetchSales = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const params = buildSalesParams(filterData, statusFilter, searchTerm, page);
      const [salesResponse, summaryResponse] = await Promise.all([
        api.get(`/sales/all?${params}`),
        api.get(`/sales/summary?${params}`)
      ]);

      setSales(salesResponse.data.content);
      setTotalPages(salesResponse.data.totalPages);
      setTotalElements(salesResponse.data.totalElements);

      const summary = summaryResponse.data;
      setAllFilteredSales({
        pendingCount: summary.pending || 0,
        confirmedCount: summary.confirmed || 0,
        invoicedCount: summary.invoiced || 0,
        pendingAmount: summary.pendingAmount || 0,
        confirmedAmount: summary.confirmedAmount || 0,
        invoicedAmount: summary.invoicedAmount || 0,
        pendingQty: summary.pendingQty || 0,
        confirmedQty: summary.confirmedQty || 0,
        invoicedQty: summary.invoicedQty || 0,
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [filterData, statusFilter, searchTerm]);

  // Initial load + static data
  useEffect(() => {
    fetchSales(0).then(() => { initialLoadDone.current = true; });

    if (!staticDataLoaded.current) {
      staticDataLoaded.current = true;
      Promise.all([
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/companies').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/inventories').catch(() => ({ data: [] })),
        api.get('/warehouse').catch(() => ({ data: [] })),
        api.get('/stocks/warehouses').catch(() => ({ data: [] })),
        api.get('/inventories/products/summary').catch(() => ({ data: [] })),
      ]).then(results => {
        setBranches(extractArray(results[0]));
        setCompanies(extractArray(results[1]));
        setProducts(extractArray(results[2]));
        setInventories(extractArray(results[3]));
        setWarehouses(extractArray(results[4]));
        setWarehouseStocks(extractArray(results[5]));
        setProductSummaries(extractArray(results[6]));
      }).catch(() => { }).finally(() => setStaticDataLoading(false));
    }
  }, []);

  // Re-fetch on filter change OR page change (single source of truth)
  const prevFilterKey = useRef(null);
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const filterKey = JSON.stringify({
      companyId: filterData.companyId,
      branchIds: filterData.branchIds,
      statusFilter,
      searchTerm,
      startDate: filterData.startDate,
      endDate: filterData.endDate,
      productFilters: filterData.productFilters,
    });

    const filterChanged = prevFilterKey.current !== null && prevFilterKey.current !== filterKey;
    prevFilterKey.current = filterKey;

    if (filterChanged) {
      fetchSales(0);
    } else {
      fetchSales(currentPage - 1);
    }
  }, [
    filterData.companyId, statusFilter, searchTerm,
    filterData.startDate, filterData.endDate,
    JSON.stringify(filterData.branchIds),
    JSON.stringify(filterData.productFilters),
    currentPage,
  ]);

  // Refresh products/companies on window focus
  useEffect(() => {
    const handleFocus = () => {
      Promise.all([
        api.get('/products').catch(() => null),
        api.get('/companies').catch(() => null),
      ]).then(([productsRes, companiesRes]) => {
        if (productsRes?.success) setProducts(productsRes.data || []);
        if (companiesRes?.success) setCompanies(companiesRes.data || []);
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // SSE for real-time updates
  useEffect(() => {
    let es;
    let retryDelay = 5000;
    let retryTimeout;

    const connect = () => {
      es = new EventSource('https://backend.wisecart.ph/api/sales/stream');

      es.addEventListener('connected', () => { retryDelay = 3000; });

      es.addEventListener('sales-update', () => {
        invalidateSalesCache();
        clearSseRefreshTimer();
        setSseRefreshTimer(setTimeout(() => {
          fetchSales(currentPage - 1);
        }, 800));
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 60000);
          connect();
        }, retryDelay);
      };
    };

    connect();
    return () => {
      clearTimeout(retryTimeout);
      if (es) es.close();
    };
  }, [fetchSales, currentPage]);

  return {
    sales, branches, companies, products,
    inventories, warehouses, warehouseStocks, productSummaries,
    loading, staticDataLoading, totalPages, totalElements, allFilteredSales,
    fetchSales,
    setCompanies, setProducts,
  };
};

export { buildSalesParams };