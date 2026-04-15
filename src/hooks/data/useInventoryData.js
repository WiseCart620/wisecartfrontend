import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

let cachedProducts = null;
let cachedWarehouses = null;
let cachedBranches = null;
let cachedCompanies = null;

export const useInventoryData = () => {
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
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [totalInventories, setTotalInventories] = useState(0);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryPageSize] = useState(50);

  const loadData = useCallback(async (page = 0, size = 50) => {
    try {
      setLoading(true);
      setLoadingMessage('Loading inventory data...');

      // Load reference data only once (cached)
      let productsData = cachedProducts;
      let warehousesData = cachedWarehouses;
      let branchesData = cachedBranches;
      let companiesData = cachedCompanies;

      if (!productsData) {
        const prodRes = await api.get('/products?limit=100');
        productsData = prodRes.success ? prodRes.data || [] : [];
        cachedProducts = productsData;
      }

      if (!warehousesData) {
        const warehousesRes = await api.get('/warehouse');
        warehousesData = warehousesRes.success ? warehousesRes.data || [] : [];
        cachedWarehouses = warehousesData;
      }

      if (!branchesData) {
        const branchesRes = await api.get('/branches');
        branchesData = branchesRes.success ? branchesRes.data || [] : [];
        cachedBranches = branchesData;
      }

      if (!companiesData) {
        const companiesRes = await api.get('/companies');
        companiesData = companiesRes.success ? companiesRes.data || [] : [];
        cachedCompanies = companiesData;
      }

      // Load inventories with pagination
      const invRes = await api.get(`/inventories?page=${page}&size=${size}`);

      // Load other dynamic data with limits
      const [warehouseStocksRes, branchStocksRes, salesRes, productVariationSummariesRes] = await Promise.all([
        api.get('/stocks/warehouses?limit=100'),
        api.get('/stocks/branches?limit=100'),
        api.get('/sales?limit=100'),
        api.get('/transactions/products/summary/variations')
      ]);

      if (productVariationSummariesRes.success) {
        setProductSummaries(productVariationSummariesRes.data || []);
      }

      const inventoriesData = invRes.success ? (invRes.data.content || invRes.data || []) : [];
      const inventoriesTotal = invRes.success ? (invRes.data.totalElements || inventoriesData.length) : 0;
      setTotalInventories(inventoriesTotal);

      // Set all data
      setInventories(inventoriesData);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setBranches(branchesData);
      setCompanies(companiesData);

      const warehouseStocksData = warehouseStocksRes.success ? warehouseStocksRes.data || [] : [];
      const branchStocksData = branchStocksRes.success ? branchStocksRes.data || [] : [];
      const salesData = salesRes.success ? salesRes.data || [] : [];

      setWarehouseStocks(warehouseStocksData);
      setBranchStocks(branchStocksData);
      setSales(salesData);

      // Clean up duplicate sales in inventories
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
  }, []);

  const handleDelete = useCallback(async (id, inventories, setInventories, setWarehouseStocks, setBranchStocks, setProductSummaries) => {
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
      setInventories(prev => prev.filter(inv => inv.id !== id));

    } catch (err) {
      toast.error('Delete failed: ' + (err.message || 'Unknown error'));
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
      setActionLoading(false);
      setLoadingMessage('');
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
    actionLoading,
    loadingMessage,
    deletingId,
    viewingId,
    totalInventories,
    inventoryPage,
    setInventoryPage,
    inventoryPageSize,

    setInventories,
    setWarehouseStocks,
    setBranchStocks,
    setProductSummaries,
    setActionLoading,
    setLoadingMessage,
    setViewingId,

    loadData,
    handleDelete,
  };
};