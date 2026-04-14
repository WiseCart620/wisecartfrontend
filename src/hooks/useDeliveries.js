// src/hooks/data/useDeliveries.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatDateForInput } from '../utils/dateUtils';

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);

      const [deliveriesRes, branchesRes, productsRes, warehousesRes, companiesRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/branches'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/companies')
      ]);

      if (deliveriesRes.success) {
        const normalized = (deliveriesRes.data || []).map(d => ({
          ...d,
          branchId: d.branch?.id ?? d.branchId,
          branchName: d.branch?.branchName ?? d.branchName,
          companyId: d.company?.id ?? d.companyId,
          companyName: d.company?.companyName ?? d.companyName,
          warehouses: d.items
            ? [
              ...new Map(
                d.items
                  .filter(item => item.warehouse)
                  .map(item => [
                    item.warehouse.id,
                    {
                      id: item.warehouse.id,
                      warehouseName: item.warehouse.warehouseName,
                      warehouseCode: item.warehouse.warehouseCode
                    }
                  ])
              ).values()
            ]
            : d.warehouses || [],
          totalPreparedQty: d.items
            ? d.items.reduce((sum, item) => sum + (item.preparedQty || 0), 0)
            : d.totalPreparedQty || 0,
          totalDeliveredQty: d.items
            ? d.items.reduce((sum, item) => sum + (item.deliveredQty || 0), 0)
            : d.totalDeliveredQty || 0,
          itemCount: d.items?.length ?? d.itemCount ?? 0
        }));
        setDeliveries(normalized);
      }
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    let es;
    let retryTimeout;
    let retryDelay = 3000;

    const connect = () => {
      es = new EventSource('https://erp.wisecart.ph/api/deliveries/stream');

      es.addEventListener('connected', () => {
        retryDelay = 3000;
      });

      es.addEventListener('delivery-update', () => {
        loadData(true);
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      if (es) es.close();
    };
  }, [loadData]);

  const createDelivery = async (deliveryData) => {
    try {
      const response = await api.post('/deliveries', deliveryData);
      if (response.success) {
        await loadData();
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
        await loadData();
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
        await loadData();
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
        await loadData();
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

  /**
   * Extract the numeric portion of a delivery receipt number for proper numeric sorting.
   * e.g. "DR-00123" → 123, "DR-00045" → 45, "00099" → 99
   * Falls back to string comparison if no numeric part is found.
   */
  const extractReceiptNumber = (receiptStr) => {
    if (!receiptStr) return 0;
    const digits = receiptStr.replace(/\D/g, '');
    return digits.length > 0 ? parseInt(digits, 10) : 0;
  };

  /**
   * Sort deliveries.
   *
   * sortMode:
   *   'receipt_desc'   — highest DR number first (default)
   *   'receipt_asc'    — lowest DR number first
   *   'timestamp_desc' — most recently created first
   *   'timestamp_asc'  — oldest created first
   */
  const sortDeliveriesByStatus = (deliveriesList, sortMode = 'receipt_desc') => {
    return [...deliveriesList].sort((a, b) => {
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

      // Company — handle both nested object and flat id
      if (filters.companyId) {
        const id = delivery.company?.id ?? delivery.companyId;
        if (id !== filters.companyId) return false;
      }

      // Branch — handle both nested object and flat id
      if (filters.branchId) {
        const id = delivery.branch?.id ?? delivery.branchId;
        if (id !== filters.branchId) return false;
      }

      // Warehouse — warehouses live inside items, not on the delivery root
      if (filters.warehouseId) {
        const hasWarehouse = delivery.items?.some(item =>
          (item.warehouse?.id ?? item.warehouseId) === filters.warehouseId
        );
        if (!hasWarehouse) return false;
      }

      // Status
      if (filters.status && delivery.status !== filters.status) {
        return false;
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

      // Date range
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

      // Receipt number (case-insensitive partial match)
      if (filters.receiptNumber) {
        const search = filters.receiptNumber.toLowerCase();
        if (!delivery.deliveryReceiptNumber?.toLowerCase().includes(search)) return false;
      }

      return true;
    });
  };

  return {
    deliveries,
    branches,
    products,
    warehouses,
    companies,
    loading,
    error,
    loadData,
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