// src/hooks/data/useInventory.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

const useInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canModifyStatus, setCanModifyStatus] = useState({});
  const [warehouseStocks, setWarehouseStocks] = useState([]); // ← was {}, now []
  const [branchStocks, setBranchStocks] = useState([]);       // ← was {}, now []
  const [loadingStocks, setLoadingStocks] = useState({});
  const [totalInventories, setTotalInventories] = useState(0);

  const loadData = useCallback(async (page = 0, size = 50) => {
    try {
      setLoading(true);

      // FIX: fetch inventories + both stock lists in parallel
      const [inventoriesRes, warehouseStocksRes, branchStocksRes] = await Promise.all([
        api.get(`/inventories?page=${page}&size=${size}`),
        api.get('/stocks/warehouses?limit=200'),
        api.get('/stocks/branches?limit=200'),
      ]);

      // Handle paginated or array inventory response
      let inventoriesData = [];
      let totalElements = 0;

      if (inventoriesRes.success) {
        if (inventoriesRes.data?.content) {
          inventoriesData = inventoriesRes.data.content || [];
          totalElements = inventoriesRes.data.totalElements || 0;
        } else if (Array.isArray(inventoriesRes.data)) {
          inventoriesData = inventoriesRes.data;
          totalElements = inventoriesData.length;
        }
      }

      const actualInventories = inventoriesData.filter(inv =>
        inv.inventoryType &&
        ['STOCK_IN', 'TRANSFER', 'RETURN', 'DAMAGE'].includes(inv.inventoryType)
      );

      setInventories(actualInventories);
      setTotalInventories(totalElements);

      // FIX: set flat arrays for the summary tables
      if (warehouseStocksRes.success) {
        setWarehouseStocks(warehouseStocksRes.data || []);
      }
      if (branchStocksRes.success) {
        setBranchStocks(branchStocksRes.data || []);
      }

    } catch (error) {
      console.error('Failed to load inventory data', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // loadLocationStock: per-product stock lookup (used in modal, keyed by index)
  const loadLocationStock = useCallback(async (productId, variationId, itemIndex, locationId, locationType) => {
    const loadingKey = `${itemIndex}_${productId}_${variationId}`;
    setLoadingStocks(prev => ({ ...prev, [loadingKey]: true }));

    try {
      if (!locationId || !productId || !locationType) return;

      const stockKey = variationId
        ? `${itemIndex}_${productId}_${variationId}_${locationId}`
        : `${itemIndex}_${productId}_${locationId}`;

      // Use a ref-like per-product cache stored separately so we don't clobber the flat arrays
      let endpoint = '';
      if (locationType === 'warehouse') {
        endpoint = variationId
          ? `/stocks/warehouses/${locationId}/products/${productId}/variations/${variationId}`
          : `/stocks/warehouses/${locationId}/products/${productId}`;
      } else if (locationType === 'branch') {
        endpoint = variationId
          ? `/stocks/branches/${locationId}/products/${productId}/variations/${variationId}`
          : `/stocks/branches/${locationId}/products/${productId}`;
      }

      const stockRes = await api.get(endpoint);

      if (stockRes?.success || stockRes?.data) {
        const stockData = stockRes.data || stockRes;

        // Store per-product lookups in a separate key namespace on the arrays
        // by attaching them as a side-cache object; the flat arrays stay intact
        if (locationType === 'warehouse') {
          setWarehouseStocks(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            // Attach per-product cache as a non-enumerable property clone trick:
            const clone = [...arr];
            clone.__cache = { ...(arr.__cache || {}), [stockKey]: stockData };
            return clone;
          });
        } else {
          setBranchStocks(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            const clone = [...arr];
            clone.__cache = { ...(arr.__cache || {}), [stockKey]: stockData };
            return clone;
          });
        }
      }
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoadingStocks(prev => {
        const newState = { ...prev };
        delete newState[loadingKey];
        return newState;
      });
    }
  }, []);

  const checkCanModify = useCallback(async (inventoryId) => {
    try {
      const response = await api.get(`/inventories/${inventoryId}/can-modify`);
      const responseData = response.data?.data || response.data;
      if (response.success && responseData) {
        const canModify = responseData.canModify ?? false;
        setCanModifyStatus(prev => ({ ...prev, [inventoryId]: canModify }));
        return canModify;
      }
      return false;
    } catch (error) {
      console.error('Failed to check if inventory can be modified:', error);
      return false;
    }
  }, []);

  const confirmInventory = useCallback(async (inventoryId, confirmedBy) => {
    try {
      return await api.patch(`/inventories/${inventoryId}/confirm`, { confirmedBy });
    } catch (error) {
      console.error('Failed to confirm inventory:', error);
      throw error;
    }
  }, []);

  const deleteInventory = useCallback(async (inventoryId) => {
    try {
      const userRole = localStorage.getItem('userRole') || 'USER';
      return await api.delete(`/inventories/${inventoryId}?userRole=${userRole}`);
    } catch (error) {
      console.error('Failed to delete inventory:', error);
      throw error;
    }
  }, []);

  const updateInventory = useCallback(async (inventoryId, payload) => {
    try {
      const userRole = localStorage.getItem('userRole') || 'USER';
      return await api.put(`/inventories/${inventoryId}?userRole=${userRole}`, payload);
    } catch (error) {
      console.error('Failed to update inventory:', error);
      throw error;
    }
  }, []);

  const createInventory = useCallback(async (payload) => {
    try {
      return await api.post('/inventories', payload);
    } catch (error) {
      console.error('Failed to create inventory:', error);
      throw error;
    }
  }, []);

  return {
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
  };
};

export default useInventory;