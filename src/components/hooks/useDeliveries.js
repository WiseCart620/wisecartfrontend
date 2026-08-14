// src/hooks/data/useDeliveries.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { formatDateForInput } from '../../utils/dateUtils';

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [deliveriesRes, branchesRes, productsRes, warehousesRes, companiesRes] = await Promise.all([
        api.get('/deliveries/list'),
        api.get('/branches'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/companies')
      ]);

      if (deliveriesRes.success) setDeliveries(deliveriesRes.data || []);
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

  // In src/hooks/useDeliveries.js, update the getDeliveryDetails method:

  const getDeliveryDetails = async (id) => {
    try {
      const response = await api.get(`/deliveries/${id}`);
      if (response.success) {
        // Format the delivery data for the form
        const delivery = response.data;

        // Ensure items have properly formatted product IDs
        const formattedItems = delivery.items?.map(item => {
          const productId = item.product?.id || item.productId;
          const variationId = item.variationId || item.variation?.id;

          return {
            ...item,
            productId: productId,
            variationId: variationId,
            formattedProductId: variationId
              ? `${productId}_${variationId}`
              : `prod_${productId}`
          };
        }) || [];

        return {
          success: true,
          data: {
            ...delivery,
            items: formattedItems
          }
        };
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

  const sortDeliveriesByStatus = (deliveriesList) => {
    const statusOrder = {
      'PREPARING': 1,
      'IN_TRANSIT': 2,
      'DELIVERED': 3,
      'CANCELLED': 4
    };

    return [...deliveriesList].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (dateB - dateA !== 0) {
        return dateB - dateA;
      }

      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  const filterDeliveries = (deliveriesList, filters) => {
    return deliveriesList.filter(delivery => {
      // Filter by receipt number
      if (filters.receiptNumber &&
        !delivery.deliveryReceiptNumber?.toLowerCase().includes(filters.receiptNumber.toLowerCase())) {
        return false;
      }

      // Filter by warehouse
      if (filters.warehouseId && delivery.warehouses) {
        const hasWarehouse = delivery.warehouses.some(wh => wh.id === filters.warehouseId);
        if (!hasWarehouse) {
          return false;
        }
      }

      // Filter by company
      if (filters.companyId && delivery.company?.id !== filters.companyId) {
        return false;
      }

      // Filter by branch
      if (filters.branchId && delivery.branch?.id !== filters.branchId) {
        return false;
      }

      if (filters.status) {
        if (filters.status === 'HIDE_CANCELLED') {
          if (delivery.status === 'CANCELLED') return false;
        } else if (delivery.status !== filters.status) {
          return false;
        }
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        const deliveryDate = new Date(delivery.date);

        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (deliveryDate < startDate) {
            return false;
          }
        }

        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (deliveryDate > endDate) {
            return false;
          }
        }
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
