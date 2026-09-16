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

export const useWarehouseStockData = ({
  warehouseId, searchTerm, minQty, maxQty, startDate, endDate, currentPage, pageSize = 20,
}) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [grandTotals, setGrandTotals] = useState({ quantity: 0, delivered: 0, pendingDelivery: 0 });

  const filters = { warehouseId, searchTerm, minQty, maxQty, startDate, endDate };

  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get(`/stocks/warehouses/all?${buildParams(filters, page, pageSize)}`),
        api.get(`/stocks/warehouses/summary?${buildSummaryParams(filters)}`),
      ]);
      setStocks(listRes.data?.content || []);
      setTotalPages(listRes.data?.totalPages || 0);
      setTotalElements(listRes.data?.totalElements || 0);
      setGrandTotals({
        quantity: summaryRes.data?.quantity || 0,
        delivered: summaryRes.data?.delivered || 0,
        pendingDelivery: summaryRes.data?.pendingDelivery || 0,
      });
    } catch (err) {
      console.error('Failed to load warehouse stocks', err);
      toast.error('Failed to load warehouse stocks');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, searchTerm, minQty, maxQty, startDate, endDate, pageSize]);

  const prevKey = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(filters);
    const changed = prevKey.current !== null && prevKey.current !== key;
    prevKey.current = key;
    fetchPage(changed ? 0 : currentPage - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, searchTerm, minQty, maxQty, startDate, endDate, currentPage, fetchPage]);

  return { stocks, loading, totalPages, totalElements, grandTotals, refetch: () => fetchPage(currentPage - 1) };
};

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

export const useBranchStockData = ({
  companyIds, branchIds, productIds, searchTerm, minQty, maxQty, startDate, endDate, currentPage, pageSize = 20,
}) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [grandTotals, setGrandTotals] = useState({
    quantity: 0, delivered: 0, totalSales: 0, pendingDelivery: 0, pendingSale: 0, available: 0,
  });

  const filters = { companyIds, branchIds, productIds, searchTerm, minQty, maxQty, startDate, endDate };

  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get(`/stocks/branches/all?${buildParams(filters, page, pageSize)}`),
        api.get(`/stocks/branches/summary?${buildSummaryParams(filters)}`),
      ]);
      setStocks(listRes.data?.content || []);
      setTotalPages(listRes.data?.totalPages || 0);
      setTotalElements(listRes.data?.totalElements || 0);
      setGrandTotals({
        quantity: summaryRes.data?.quantity || 0,
        delivered: summaryRes.data?.delivered || 0,
        totalSales: summaryRes.data?.totalSales || 0,
        pendingDelivery: summaryRes.data?.pendingDelivery || 0,
        pendingSale: summaryRes.data?.pendingSale || 0,
        available: summaryRes.data?.available || 0,
      });
    } catch (err) {
      console.error('Failed to load branch stocks', err);
      toast.error('Failed to load company stocks');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companyIds), JSON.stringify(branchIds), JSON.stringify(productIds), searchTerm, minQty, maxQty, startDate, endDate, pageSize]);

  const prevKey = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(filters);
    const changed = prevKey.current !== null && prevKey.current !== key;
    prevKey.current = key;
    fetchPage(changed ? 0 : currentPage - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companyIds), JSON.stringify(branchIds), JSON.stringify(productIds), searchTerm, minQty, maxQty, startDate, endDate, currentPage, fetchPage]);

  return { stocks, loading, totalPages, totalElements, grandTotals, refetch: () => fetchPage(currentPage - 1) };
};