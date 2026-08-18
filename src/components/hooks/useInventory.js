import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export const useInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSummaries, setProductSummaries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [totalInventories, setTotalInventories] = useState(0);
  const [canModifyStatus, setCanModifyStatus] = useState({});

  const loadData = useCallback(async (page = 0, size = 50) => {
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
        summaryRes
      ] = await Promise.all([
        api.get(`/inventories/all?page=${page}&size=${size}`),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/branches'),
        api.get('/stocks/warehouses'),
        api.get('/stocks/branches'),
        api.get('/sales'),
        api.get('/companies'),
        api.get('/inventories/products/summary')
      ]);

      setInventories(invRes.success ? (invRes.data?.content || invRes.data || []) : []);
      setTotalInventories(invRes.success ? (invRes.data?.totalElements ?? (invRes.data?.content || invRes.data || []).length) : 0);
      setProducts(prodRes.success ? prodRes.data || [] : []);
      setWarehouses(warehousesRes.success ? warehousesRes.data || [] : []);
      setBranches(branchesRes.success ? branchesRes.data || [] : []);
      setWarehouseStocks(warehouseStocksRes.success ? warehouseStocksRes.data || [] : []);
      setBranchStocks(branchStocksRes.success ? branchStocksRes.data || [] : []);
      setSales(salesRes.success ? salesRes.data || [] : []);
      setCompanies(companiesRes.success ? companiesRes.data || [] : []);
      setProductSummaries(summaryRes.success ? summaryRes.data || [] : []);

    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, []);

  useEffect(() => {
    window.loadData = loadData;

    return () => {
      delete window.loadData;
    };
  }, [loadData]);

  const confirmInventory = async (id, confirmedBy) => {
    try {
      const res = await api.patch(`/inventories/${id}/confirm`, { confirmedBy });
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteInventory = async (id, userRole = 'USER') => {
    try {
      const res = await api.delete(`/inventories/${id}?userRole=${userRole}`);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateInventory = async (id, request, userRole = 'USER') => {
    try {
      const res = await api.put(`/inventories/${id}?userRole=${userRole}`, request);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const createInventory = async (request) => {
    try {
      const res = await api.post('/inventories', request);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const checkCanModify = async (id) => {
    try {
      const res = await api.get(`/inventories/${id}/can-modify`);
      return res.success ? res.data : { canModify: false, hasBeenUsed: true };
    } catch (err) {
      return { canModify: false, hasBeenUsed: true };
    }
  };

  const loadLocationStock = useCallback(async () => {
    try {
      const [warehouseStocksRes, branchStocksRes] = await Promise.all([
        api.get('/stocks/warehouses'),
        api.get('/stocks/branches'),
      ]);
      setWarehouseStocks(warehouseStocksRes.success ? warehouseStocksRes.data || [] : []);
      setBranchStocks(branchStocksRes.success ? branchStocksRes.data || [] : []);
    } catch (err) {
      console.error('Failed to load location stock:', err);
    }
  }, []);

  return {
    inventories,
    products,
    productSummaries,
    warehouses,
    branches,
    warehouseStocks,
    branchStocks,
    sales,
    companies,
    loading,
    loadingStocks: loading,
    actionLoading,
    loadingMessage,
    totalInventories,
    canModifyStatus,
    setActionLoading,
    setLoadingMessage,
    setInventories,
    setWarehouseStocks,
    setBranchStocks,
    setProductSummaries,
    loadData,
    loadLocationStock,
    checkCanModify,
    confirmInventory,
    deleteInventory,
    updateInventory,
    createInventory
  };
};