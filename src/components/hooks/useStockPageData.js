import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const buildParams = (filters, page, size) => {
  const params = new URLSearchParams({ page, size });
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      value.forEach(v => params.append(key, v));
    } else {
      params.append(key, value);
    }
  });
  return params;
};

const buildSummaryParams = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v));
    } else {
      params.append(key, value);
    }
  });
  return params;
};

const usePagedStocks = ({
  listUrl, summaryUrl, filters, currentPage, pageSize, enabled,
  emptyTotals, mapSummary, errorMessage,
}) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [grandTotals, setGrandTotals] = useState(emptyTotals);

  const filterKey = JSON.stringify(filters);
  const listReq = useRef(0);
  const summaryReq = useRef(0);
  const lastList = useRef(null);    // { key, page } of the last list request
  const summaryKey = useRef(null);  // filter key the current totals belong to
  const prevKey = useRef(null);

  const fetchList = useCallback(async (page) => {
    const reqId = ++listReq.current;
    lastList.current = { key: filterKey, page };
    setLoading(true);
    try {
      const res = await api.get(`${listUrl}?${buildParams(filters, page, pageSize)}`);
      if (reqId !== listReq.current) return; // a newer request replaced this one
      setStocks(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 0);
      setTotalElements(res.data?.totalElements || 0);
    } catch (err) {
      if (reqId !== listReq.current) return;
      lastList.current = null;
      console.error(errorMessage, err);
      toast.error(errorMessage);
    } finally {
      if (reqId === listReq.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl, filterKey, pageSize]);

  const fetchSummary = useCallback(async () => {
    const reqId = ++summaryReq.current;
    summaryKey.current = filterKey;
    try {
      const res = await api.get(`${summaryUrl}?${buildSummaryParams(filters)}`);
      if (reqId !== summaryReq.current) return;
      setGrandTotals(mapSummary(res.data || {}));
    } catch (err) {
      if (reqId !== summaryReq.current) return;
      summaryKey.current = null;
      console.error(`${errorMessage} (totals)`, err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryUrl, filterKey]);

  // Totals depend on the filters only, never on the page
  useEffect(() => {
    if (!enabled || summaryKey.current === filterKey) return;
    fetchSummary();
  }, [enabled, filterKey, fetchSummary]);

  useEffect(() => {
    if (!enabled) return;
    const changed = prevKey.current !== null && prevKey.current !== filterKey;
    prevKey.current = filterKey;
    const page = changed ? 0 : currentPage - 1;
    const last = lastList.current;
    if (last && last.key === filterKey && last.page === page) return; // no duplicate fetch
    fetchList(page);
  }, [enabled, filterKey, currentPage, fetchList]);

  const refetch = () => Promise.all([fetchList(currentPage - 1), fetchSummary()]);

  return {
    stocks,
    loading: loading || (enabled && !hasLoaded),
    totalPages,
    totalElements,
    grandTotals,
    refetch,
  };
};

const mapWarehouseSummary = (d) => ({
  quantity: d.quantity || 0,
  delivered: d.delivered || 0,
  pendingDelivery: d.pendingDelivery || 0,
});
const WAREHOUSE_EMPTY_TOTALS = { quantity: 0, delivered: 0, pendingDelivery: 0 };

export const useWarehouseStockData = ({
  warehouseId, productKeys, searchTerm, minQty, maxQty, startDate, endDate,
  currentPage, pageSize = 20, enabled = true,
}) =>
  usePagedStocks({
    listUrl: '/stocks/warehouses/all',
    summaryUrl: '/stocks/warehouses/summary',
    filters: { warehouseId, productKeys, searchTerm, minQty, maxQty, startDate, endDate },
    currentPage,
    pageSize,
    enabled,
    emptyTotals: WAREHOUSE_EMPTY_TOTALS,
    mapSummary: mapWarehouseSummary,
    errorMessage: 'Failed to load warehouse stocks',
  });

export const fetchAllBranchStocks = async (filters, maxSize = 20000) => {
  const params = buildParams(filters, 0, maxSize);
  const res = await api.get(`/stocks/branches/all?${params}`);
  return res.data?.content || [];
};

export const useProductSummaryData = ({
  searchTerm, variationFilter, productKeys, currentPage, pageSize = 10,
}) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const filters = { search: searchTerm, variationFilter, productKeys };

  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory-reports/products/summary/paginated?${buildParams(filters, page, pageSize)}`);
      setSummaries(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 0);
      setTotalElements(res.data?.totalElements || 0);
    } catch (err) {
      console.error('Failed to load product summaries', err);
      toast.error('Failed to load product summaries');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, variationFilter, JSON.stringify(productKeys), pageSize]);

  const prevKey = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(filters);
    const changed = prevKey.current !== null && prevKey.current !== key;
    prevKey.current = key;
    fetchPage(changed ? 0 : currentPage - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, variationFilter, JSON.stringify(productKeys), currentPage, fetchPage]);

  return { summaries, loading, totalPages, totalElements, refetch: () => fetchPage(currentPage - 1) };
};

const mapBranchSummary = (d) => ({
  quantity: d.quantity || 0,
  delivered: d.delivered || 0,
  totalSales: d.totalSales || 0,
  pendingDelivery: d.pendingDelivery || 0,
  pendingSale: d.pendingSale || 0,
  available: d.available || 0,
});
const BRANCH_EMPTY_TOTALS = {
  quantity: 0, delivered: 0, totalSales: 0, pendingDelivery: 0, pendingSale: 0, available: 0,
};

export const useBranchStockData = ({
  companyIds, branchIds, productKeys, searchTerm, minQty, maxQty, startDate, endDate,
  currentPage, pageSize = 20, enabled = true,
}) =>
  usePagedStocks({
    listUrl: '/stocks/branches/all',
    summaryUrl: '/stocks/branches/summary',
    filters: { companyIds, branchIds, productKeys, searchTerm, minQty, maxQty, startDate, endDate },
    currentPage,
    pageSize,
    enabled,
    emptyTotals: BRANCH_EMPTY_TOTALS,
    mapSummary: mapBranchSummary,
    errorMessage: 'Failed to load company stocks',
  });