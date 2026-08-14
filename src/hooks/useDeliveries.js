// src/hooks/data/useDeliveries.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatDateForInput } from '../utils/dateUtils';

const normalizeDeliveries = (data) =>
  data.map(d => ({
    ...d,
    branchId: d.branch?.id ?? d.branchId,
    branchName: d.branch?.branchName ?? d.branchName,
    companyId: d.company?.id ?? d.companyId,
    companyName: d.company?.companyName ?? d.companyName,
    warehouses: d.items
      ? [...new Map(
        d.items
          .filter(item => item.warehouse)
          .map(item => [item.warehouse.id, {
            id: item.warehouse.id,
            warehouseName: item.warehouse.warehouseName,
            warehouseCode: item.warehouse.warehouseCode
          }])
      ).values()]
      : d.warehouses || [],
    totalPreparedQty: d.items
      ? d.items.reduce((sum, item) => sum + (item.preparedQty || 0), 0)
      : d.totalPreparedQty || 0,
    totalDeliveredQty: d.items
      ? d.items.reduce((sum, item) => sum + (item.deliveredQty || 0), 0)
      : d.totalDeliveredQty || 0,
    itemCount: d.items?.length ?? d.itemCount ?? 0
  }));

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get('/deliveries');

      if (res.success) setDeliveries(normalizeDeliveries(res.data || []));
    } catch (err) {
      console.error('Failed to load data', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDeliveries = useCallback(async () => {
    try {
      const res = await api.get('/deliveries');
      if (res.success) setDeliveries(normalizeDeliveries(res.data || []));
    } catch (err) {
      console.error('Failed to refresh deliveries', err);
    }
  }, []);

  const updateDeliveryLocally = useCallback((id, changes) => {
    setDeliveries(prev =>
      prev.map(d => d.id === id ? { ...d, ...changes } : d)
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDeliveries();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshDeliveries]);
  const createDelivery = async (deliveryData) => {
    try {
      const response = await api.post('/deliveries', deliveryData);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateDelivery = async (id, deliveryData) => {
    try {
      const currentDelivery = deliveries.find(d => d.id === id);
      if (currentDelivery?.status === 'CANCELLED') {
        return { success: false, error: 'Cannot edit a cancelled delivery.' };
      }
      const response = await api.put(`/deliveries/${id}`, deliveryData);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteDelivery = async (id) => {
    try {
      const userRole = localStorage.getItem('userRole') || 'USER';
      const response = await api.delete(`/deliveries/${id}?userRole=${userRole}`);
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete delivery' };
    }
  };

  const cancelDelivery = async (id, remarks) => {
    try {
      const response = await api.patch(
        `/deliveries/${id}/cancel?remarks=${encodeURIComponent(remarks)}`
      );
      return { success: true, data: response.data || response };
    } catch (error) {
      const msg = error?.response?.data?.error
        || error?.response?.data?.message
        || error?.response?.data
        || error?.message
        || 'Failed to cancel delivery';
      return { success: false, error: msg };
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      const response = await api.patch(`/deliveries/${id}/status`, null, {
        params: { status }
      });
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const saveReceiptDetails = async (id, receiptData) => {
    try {
      const itemsToUpdate = receiptData.items.map(item => ({
        itemId: item.id,
        extra: item.extra || ''
      }));

      const receiptNumberToSave = receiptData.deliveryReceiptNumberDisplay?.trim() ||
        receiptData.deliveryReceiptNumber;

      const response = await api.patch(`/deliveries/${id}/receipt-details`, {
        deliveryReceiptNumber: receiptNumberToSave,
        termsOfPayment: receiptData.termsOfPayment || '',
        businessStyle: receiptData.businessStyle || '',
        preparedBy: receiptData.preparedBy || '',
        extraHeader: receiptData.extraHeader || 'EXTRA',
        items: itemsToUpdate
      });

      return response;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getDeliveryDetails = async (id) => {
    try {
      const response = await api.get(`/deliveries/${id}`);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const loadWarehouseStock = async (warehouseId, productId, variationId = null) => {
    try {
      const endpoint = variationId
        ? `/stocks/warehouses/${warehouseId}/products/${productId}/variations/${variationId}`
        : `/stocks/warehouses/${warehouseId}/products/${productId}`;

      const response = await api.get(endpoint);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, data: { quantity: 0, availableQuantity: 0 } };
    } catch (err) {
      return { success: false, data: { quantity: 0, availableQuantity: 0 }, error: err.message };
    }
  };

  const validateDeliveryForm = (formData, productsData = [], warehousesData = []) => {
    const errors = [];

    if (!formData.branchId) {
      errors.push('Please select a branch');
    }

    if (!formData.deliveryReceiptNumber?.trim()) {
      errors.push('Please enter a delivery receipt number');
    }

    if (!formData.datePrepared) {
      errors.push('Date prepared is required');
    }

    if (formData.items.length === 0) {
      errors.push('Please add at least one item to the delivery');
    }

    const itemsWithoutWarehouse = formData.items.filter(item => !item.warehouseId);
    if (itemsWithoutWarehouse.length > 0) {
      errors.push('Please select a warehouse for all items');
    }

    const itemsWithoutProduct = formData.items.filter(item => !item.productId);
    if (itemsWithoutProduct.length > 0) {
      errors.push('Please select a product for all items');
    }

    const invalidPreparedQty = formData.items.filter(item =>
      item.preparedQty === '' || item.preparedQty === 0 || item.preparedQty < 1
    );
    if (invalidPreparedQty.length > 0) {
      errors.push('Please enter valid prepared quantities (minimum 1) for all items');
    }

    if (formData.status === 'DELIVERED') {
      if (!formData.dateDelivered) {
        errors.push('Date delivered is required for DELIVERED status');
      }

      const invalidDeliveredQty = formData.items.filter(item =>
        item.deliveredQty === '' || item.deliveredQty === 0 || item.deliveredQty < 1
      );
      if (invalidDeliveredQty.length > 0) {
        errors.push('Please enter valid delivered quantities (minimum 1) for all items when status is DELIVERED');
      }
    }

    return errors;
  };

  const prepareProductOptions = (productsData) => {
    return productsData.flatMap(p => {
      if (p.variations && p.variations.length > 0) {
        return p.variations.map(v => ({
          id: `${p.id}_${v.id}`,
          parentProductId: p.id,
          variationId: v.id,
          name: `${v.upc || 'N/A'} - ${p.productName} - ${v.sku || 'N/A'}`,
          subLabel: v.combinationDisplay || (v.attributes ? Object.entries(v.attributes || {})
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ') : 'Variation'),
          fullName: p.productName,
          upc: v.upc,
          sku: v.sku,
          price: v.price || p.price,
          isVariation: true
        }));
      } else {
        return [{
          id: `prod_${p.id}`,
          parentProductId: p.id,
          variationId: null,
          name: `${p.upc || 'N/A'} - ${p.productName} - ${p.sku || 'N/A'}`,
          subLabel: 'No variations',
          fullName: p.productName,
          upc: p.upc,
          sku: p.sku,
          price: p.price,
          isVariation: false
        }];
      }
    });
  };

  const extractReceiptNumber = (receiptStr) => {
    if (!receiptStr) return 0;
    const digits = receiptStr.replace(/\D/g, '');
    return digits.length > 0 ? parseInt(digits, 10) : 0;
  };

  const getStatusGroup = (status) => {
    const groups = {
      PREPARING: 1,
      IN_TRANSIT: 2,
      DELIVERED: 3,
      PENDING: 4,
      RETURNED: 5,
      CANCELLED: 999,
    };
    return groups[status] || 99;
  };

  const sortDeliveriesByStatus = (deliveriesList, sortMode = 'receipt_desc') => {
    return [...deliveriesList].sort((a, b) => {
      const groupDiff = getStatusGroup(a.status) - getStatusGroup(b.status);
      if (groupDiff !== 0) return groupDiff;

      switch (sortMode) {
        case 'receipt_asc': {
          const numA = extractReceiptNumber(a.deliveryReceiptNumber);
          const numB = extractReceiptNumber(b.deliveryReceiptNumber);
          if (numA !== numB) return numA - numB;
          return (a.deliveryReceiptNumber || '').localeCompare(b.deliveryReceiptNumber || '');
        }
        case 'timestamp_desc': {
          const tA = new Date(a.createdAt || a.date);
          const tB = new Date(b.createdAt || b.date);
          return tB - tA;
        }
        case 'timestamp_asc': {
          const tA = new Date(a.createdAt || a.date);
          const tB = new Date(b.createdAt || b.date);
          return tA - tB;
        }
        case 'receipt_desc':
        default: {
          const numA = extractReceiptNumber(a.deliveryReceiptNumber);
          const numB = extractReceiptNumber(b.deliveryReceiptNumber);
          if (numA !== numB) return numB - numA;
          return (b.deliveryReceiptNumber || '').localeCompare(a.deliveryReceiptNumber || '');
        }
      }
    });
  };

  const filterDeliveries = (deliveries, filters) => {
    return deliveries.filter(delivery => {
      if (filters.companyIds && filters.companyIds.length > 0) {
        const id = delivery.company?.id ?? delivery.companyId;
        if (!filters.companyIds.includes(id)) return false;
      }

      if (filters.branchIds && filters.branchIds.length > 0) {
        const id = delivery.branch?.id ?? delivery.branchId;
        if (!filters.branchIds.includes(id)) return false;
      }

      if (filters.warehouseIds && filters.warehouseIds.length > 0) {
        const hasWarehouse = delivery.items?.some(item =>
          filters.warehouseIds.includes(item.warehouse?.id ?? item.warehouseId)
        );
        if (!hasWarehouse) return false;
      }

      if (filters.status) {
        if (filters.status === 'HIDE_CANCELLED') {
          if (delivery.status === 'CANCELLED') return false;
        } else if (delivery.status !== filters.status) {
          return false;
        }
      }

      if (filters.variationId || filters.productId) {
        const hasProduct = delivery.items?.some(item => {
          const itemVariationId = item.variation?.id ?? item.variationId;
          const itemProductId = item.product?.id ?? item.productId;

          if (filters.variationId) {
            // eslint-disable-next-line eqeqeq
            return itemVariationId == filters.variationId;
          }
          // eslint-disable-next-line eqeqeq
          return itemProductId == filters.productId;
        });
        if (!hasProduct) return false;
      }

      if (filters.startDate || filters.endDate) {
        const deliveryDate = new Date(delivery.datePrepared || delivery.date);

        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          if (deliveryDate < start) return false;
        }

        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (deliveryDate > end) return false;
        }
      }

      if (filters.receiptNumber) {
        const search = filters.receiptNumber.toLowerCase();
        if (!delivery.deliveryReceiptNumber?.toLowerCase().includes(search)) return false;
      }

      if (filters.poNumber) {
        const search = filters.poNumber.toLowerCase();
        if (!delivery.purchaseOrderNumber?.toLowerCase().includes(search)) return false;
      }

      return true;
    });
  };

  return {
    deliveries,
    loading,
    error,
    loadData,
    refreshDeliveries,
    updateDeliveryLocally,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    cancelDelivery,
    updateDeliveryStatus,
    saveReceiptDetails,
    getDeliveryDetails,
    loadWarehouseStock,
    validateDeliveryForm,
    prepareProductOptions,
    sortDeliveriesByStatus,
    filterDeliveries
  };
};