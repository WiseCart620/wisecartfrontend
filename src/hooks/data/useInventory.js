// src/hooks/data/useInventory.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

const useInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canModifyStatus, setCanModifyStatus] = useState({});
  const [warehouseStocks, setWarehouseStocks] = useState({});
  const [branchStocks, setBranchStocks] = useState({});
  const [loadingStocks, setLoadingStocks] = useState({});
  const [totalInventories, setTotalInventories] = useState(0);

  const loadData = useCallback(async (page = 0, size = 50) => {
    try {
      setLoading(true);
      const [inventoriesRes] = await Promise.all([
        api.get(`/inventories?page=${page}&size=${size}`),
      ]);

      // Handle both array response and paginated response
      let inventoriesData = [];
      let totalElements = 0;

      if (inventoriesRes.success) {
        if (inventoriesRes.data && inventoriesRes.data.content) {
          // Paginated response
          inventoriesData = inventoriesRes.data.content || [];
          totalElements = inventoriesRes.data.totalElements || 0;
        } else if (Array.isArray(inventoriesRes.data)) {
          // Array response
          inventoriesData = inventoriesRes.data;
        } else {
          inventoriesData = [];
        }
      }

      const actualInventories = inventoriesData.filter(inv =>
        inv.inventoryType &&
        ['STOCK_IN', 'TRANSFER', 'RETURN', 'DAMAGE'].includes(inv.inventoryType)
      );
      setInventories(actualInventories);
      setTotalInventories(totalElements);
      
    } catch (error) {
      console.error('Failed to load inventory data', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocationStock = useCallback(async (productId, variationId, itemIndex, locationId, locationType) => {
    const loadingKey = `${itemIndex}_${productId}_${variationId}`;
    setLoadingStocks(prev => ({ ...prev, [loadingKey]: true }));

    try {
      if (!locationId || !productId || !locationType) {
        return;
      }

      const stockKey = variationId
        ? `${itemIndex}_${productId}_${variationId}_${locationId}`
        : `${itemIndex}_${productId}_${locationId}`;

      if (locationType === 'warehouse' && warehouseStocks[stockKey]) {
        return;
      }
      if (locationType === 'branch' && branchStocks[stockKey]) {
        return;
      }

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

        if (locationType === 'warehouse') {
          setWarehouseStocks(prev => ({
            ...prev,
            [stockKey]: stockData
          }));
        } else {
          setBranchStocks(prev => ({
            ...prev,
            [stockKey]: stockData
          }));
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
  }, [warehouseStocks, branchStocks]);

  const checkCanModify = useCallback(async (inventoryId) => {
    try {
      const response = await api.get(`/inventories/${inventoryId}/can-modify`);
      const responseData = response.data?.data || response.data;

      if (response.success && responseData) {
        const canModify = responseData.canModify ?? false;
        setCanModifyStatus(prev => ({
          ...prev,
          [inventoryId]: canModify
        }));
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
      const response = await api.patch(`/inventories/${inventoryId}/confirm`, {
        confirmedBy
      });
      return response;
    } catch (error) {
      console.error('Failed to confirm inventory:', error);
      throw error;
    }
  }, []);

  const deleteInventory = useCallback(async (inventoryId) => {
    try {
      const userRole = localStorage.getItem('userRole') || 'USER';
      const response = await api.delete(`/inventories/${inventoryId}?userRole=${userRole}`);
      return response;
    } catch (error) {
      console.error('Failed to delete inventory:', error);
      throw error;
    }
  }, []);

  const updateInventory = useCallback(async (inventoryId, payload) => {
    try {
      const userRole = localStorage.getItem('userRole') || 'USER';
      const response = await api.put(`/inventories/${inventoryId}?userRole=${userRole}`, payload);
      return response;
    } catch (error) {
      console.error('Failed to update inventory:', error);
      throw error;
    }
  }, []);

  const createInventory = useCallback(async (payload) => {
    try {
      const response = await api.post('/inventories', payload);
      return response;
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