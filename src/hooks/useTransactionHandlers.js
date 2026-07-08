import { useState } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const useTransactionHandlers = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productTransactions, setProductTransactions] = useState([]);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showStockDetails, setShowStockDetails] = useState(true);

  const handleViewTransaction = async (transaction, setActionLoading, setLoadingMessage, setViewingId) => {
    try {
      setViewingId(transaction.id);
      setActionLoading(true);
      setLoadingMessage('Loading transaction details...');

      if (transaction.inventoryType === 'SALE') {
        let saleId;

        if (transaction.id > 2000000) {
          saleId = transaction.id - 2000000;
        } else if (transaction.referenceNumber && transaction.referenceNumber.includes('SALE-')) {
          saleId = parseInt(transaction.referenceNumber.replace('SALE-', ''));
        } else if (transaction.id) {
          saleId = transaction.id;
        } else {
          toast.error('Cannot find valid sale ID');
          return;
        }

        if (isNaN(saleId) || saleId <= 0) {
          toast.error('Invalid sale ID: ' + saleId);
          return;
        }

        try {
          const fullSaleRes = await api.get(`/sales/${saleId}`);

          if (!fullSaleRes.success || !fullSaleRes.data) {
            toast.error('Sale details not found. It may have been deleted.');
            return;
          }

          const fullSale = fullSaleRes.data;

          if (!fullSale.items || !Array.isArray(fullSale.items)) {
            toast.error('Sale items data is missing or invalid.');
            return;
          }

          const allTransactionPromises = fullSale.items.map(item => {
            if (item.product && item.product.id) {
              return api.get(`/transactions/product/${item.product.id}`);
            }
            return Promise.resolve({ success: false, data: [] });
          });

          const allProductTransactionResponses = await Promise.all(allTransactionPromises);
          const allProductTransactions = allProductTransactionResponses
            .filter(res => res.success && Array.isArray(res.data))
            .flatMap(res => res.data);

          const thisSaleTransactions = allProductTransactions
            .filter(t =>
              (t.referenceNumber === `SALE-${saleId}`) ||
              (t.referenceId === saleId) ||
              (t.remarks && t.remarks.includes(`SALE-${saleId}`))
            )
            .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

          setSelectedProduct({
            productName: 'Sale Transaction History',
            sku: `SALE-${saleId}`,
            branchName: transaction.fromBranch?.branchName || fullSale.branch?.branchName,
            saleStatus: fullSale.status,
            generatedBy: fullSale.generatedBy,
            invoicedAt: fullSale.invoicedAt,
            confirmedAt: fullSale.createdAt,
            companyName: fullSale.company?.companyName,
            month: fullSale.month,
            year: fullSale.year,
            fullTransactionHistory: thisSaleTransactions
          });

          const transactionItems = fullSale.items.map(item => {
            const itemTransactions = thisSaleTransactions.filter(t =>
              t.productId === item.product?.id
            );

            return {
              id: item.id || `${saleId}-${item.product?.id || 'unknown'}`,
              productId: item.product?.id,
              productName: item.product?.productName || 'Unknown Product',
              sku: item.product?.sku || 'N/A',
              transactionType: 'SALE',
              inventoryType: 'SALE',
              quantity: item.quantity || 0,
              fromBranch: fullSale.branch,
              referenceId: fullSale.id,
              referenceNumber: `SALE-${fullSale.id}`,
              transactionDate: fullSale.createdAt,
              action: 'SUBTRACT',
              remarks: `Sale - SALE-${fullSale.id}`,
              statusHistory: itemTransactions
            };
          });

          setProductTransactions(transactionItems);
          setShowStockDetails(false);
          setShowTransactionsModal(true);
        } catch (saleErr) {
          toast.error('Failed to load sale details. Please try again.');
        }
        return;
      }

      if (transaction.inventoryType === 'DELIVERY') {
        let deliveryId;
        if (transaction.id && transaction.id > 1000000) {
          deliveryId = transaction.id - 1000000;
        } else if (transaction.id) {
          deliveryId = transaction.id;
        } else {
          toast.error('Cannot find valid delivery ID');
          return;
        }

        if (deliveryId <= 0) {
          toast.error('Invalid delivery ID: ' + deliveryId);
          return;
        }

        try {
          const fullDeliveryRes = await api.get(`/deliveries/${deliveryId}`);

          if (!fullDeliveryRes.success || !fullDeliveryRes.data) {
            toast.error('Delivery details not found. It may have been deleted.');
            return;
          }

          const fullDelivery = fullDeliveryRes.data;

          if (!fullDelivery.items || !Array.isArray(fullDelivery.items)) {
            toast.error('Delivery items data is missing or invalid.');
            return;
          }

          const allTransactionPromises = fullDelivery.items.map(item => {
            if (item.product && item.product.id) {
              return api.get(`/transactions/product/${item.product.id}`);
            }
            return Promise.resolve({ success: false, data: [] });
          });

          const allProductTransactionResponses = await Promise.all(allTransactionPromises);
          const allProductTransactions = allProductTransactionResponses
            .filter(res => res.success && Array.isArray(res.data))
            .flatMap(res => res.data);

          const thisDeliveryTransactions = allProductTransactions
            .filter(t => t.referenceNumber === fullDelivery.deliveryReceiptNumber)
            .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

          setSelectedProduct({
            productName: 'Delivery Items',
            sku: fullDelivery.deliveryReceiptNumber || `DEL-${deliveryId}`,
            warehouseName: transaction.fromWarehouse?.warehouseName,
            branchName: transaction.toBranch?.branchName,
            deliveryStatus: fullDelivery.status,
            deliveredAt: fullDelivery.deliveredAt,
            fullTransactionHistory: thisDeliveryTransactions
          });

          const transactionItems = fullDelivery.items.map((item, idx) => {
            const fromWarehouse = item.warehouse;
            const toBranch = fullDelivery.branch;

            const itemTransactions = thisDeliveryTransactions.filter(t =>
              item.product && t.productId === item.product.id
            );

            return {
              id: `${deliveryId}-${item.product?.id || 'unknown'}-${idx}`,
              productId: item.product?.id,
              productName: item.product?.productName || 'Unknown Product',
              sku: item.product?.sku || 'N/A',
              transactionType: 'DELIVERY',
              inventoryType: 'DELIVERY',
              quantity: item.quantity || 0,
              fromWarehouse: fromWarehouse,
              fromBranch: null,
              toWarehouse: null,
              toBranch: toBranch,
              referenceId: deliveryId,
              referenceNumber: fullDelivery.deliveryReceiptNumber || `DEL-${deliveryId}`,
              transactionDate: fullDelivery.deliveredAt || fullDelivery.createdAt || fullDelivery.date,
              action: 'DELIVERY',
              remarks: `DELIVERY: ${fullDelivery.deliveryReceiptNumber}`,
              statusHistory: itemTransactions
            };
          });

          setProductTransactions(transactionItems);
          setShowStockDetails(false);
          setShowTransactionsModal(true);
          return;
        } catch (deliveryErr) {
          toast.error('Failed to load delivery details. Please try again.');
          return;
        }
      }

      // Handle other transaction types
      let inventoryId = transaction.id;

      if (inventoryId > 1000000 && inventoryId < 2000000) {
        toast.error('This appears to be a delivery transaction. Please use delivery view.');
        return;
      } else if (inventoryId > 2000000) {
        toast.error('This appears to be a sale transaction. Please use sale view.');
        return;
      }

      try {
        const freshInventoryRes = await api.get(`/inventories/${inventoryId}`);

        if (!freshInventoryRes.success || !freshInventoryRes.data) {
          toast.error('Inventory details not found. It may have been deleted.');
          return;
        }

        const freshInventory = freshInventoryRes.data;

        setSelectedProduct({
          productName: transaction.inventoryType === 'TRANSFER' ? 'Transfer Transaction' :
            transaction.inventoryType === 'RETURN' ? 'Return Transaction' :
              transaction.inventoryType === 'STOCK_IN' ? 'Stock In Items' :
                transaction.inventoryType === 'DAMAGE' ? 'Damage Report' :
                  'Transaction Items',
          sku: `INV-${inventoryId}`,
          warehouseName: transaction.fromWarehouse?.warehouseName || transaction.toWarehouse?.warehouseName,
          branchName: transaction.fromBranch?.branchName || transaction.toBranch?.branchName
        });

        const transactionItems = (freshInventory.items || []).map((item, idx) => ({
          id: `${inventoryId}-${item.product?.id || 'unknown'}-${idx}`,
          productId: item.product?.id,
          productName: item.product?.productName || 'Unknown Product',
          sku: item.product?.sku || 'N/A',
          transactionType: transaction.inventoryType,
          inventoryType: transaction.inventoryType,
          quantity: item.quantity || 0,
          fromWarehouse: freshInventory.fromWarehouse,
          fromBranch: freshInventory.fromBranch,
          toWarehouse: freshInventory.toWarehouse,
          toBranch: freshInventory.toBranch,
          referenceId: inventoryId,
          referenceNumber: `INV-${inventoryId}`,
          transactionDate: freshInventory.createdAt || freshInventory.verificationDate,
          action: transaction.inventoryType === 'STOCK_IN' ? 'ADD' :
            transaction.inventoryType === 'DAMAGE' ? 'SUBTRACT' :
              'PROCESS',
          remarks: freshInventory.remarks || `${transaction.inventoryType} transaction`
        }));

        setProductTransactions(transactionItems);
        setShowStockDetails(false);
        setShowTransactionsModal(true);

      } catch (err) {
        toast.error('Failed to load transaction details: ' + (err.message || 'Unknown error'));
      }

    } catch (err) {
      if (err.message.includes('404') || err.message.includes('not found')) {
        toast.error('Transaction details not found. The record may have been deleted.');
      } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to load transaction details: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setViewingId(null);
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleViewTransactions = async (product, showStock = false, setActionLoading, setLoadingMessage) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading transaction history...');

      let targetId;
      let targetType;

      if (product.isVariation && product.variationId) {
        targetId = product.variationId;
        targetType = 'variation';
      } else {
        targetId = product.productId;
        targetType = 'product';
      }

      setSelectedProduct({
        productId: product.productId,
        variationId: product.variationId,
        productName: product.productName,
        sku: product.sku,
        upc: product.upc,
        isVariation: product.isVariation,
        variationName: product.variationName,
        variationSku: product.variationSku,
        combinationDisplay: product.combinationDisplay,
        warehouseId: product.warehouseId,
        warehouseName: product.warehouseName,
        branchId: product.branchId,
        branchName: product.branchName,
        targetId: targetId,
        targetType: targetType
      });

      let transactionsRes;
      if (product.isVariation && product.variationId) {
        transactionsRes = await api.get(`/transactions/variation/${product.variationId}`);
      } else {
        transactionsRes = await api.get(`/transactions/product/${product.productId}`);
      }

      const transactionsData = transactionsRes.success ? transactionsRes.data || [] : [];

      setProductTransactions(transactionsData);
      setShowStockDetails(showStock);
      setShowTransactionsModal(true);
    } catch (err) {
      toast.error('Failed to load transaction history');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleViewStockTransactions = async (stock, locationType, setActionLoading, setLoadingMessage) => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading stock transactions...');

      const hasVariation = stock.variationId || stock.isVariation;
      const targetId = hasVariation ? (stock.variationId || stock.id) : (stock.productId || stock.id);
      const targetType = hasVariation ? 'variation' : 'product';

      setSelectedProduct({
        productId: stock.productId,
        variationId: stock.variationId,
        productName: stock.productName,
        sku: stock.sku,
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        branchId: stock.branchId,
        branchName: stock.branchName,
        locationType: locationType,
        variationName: stock.variationName,
        variationSku: stock.variationSku,
        isVariation: hasVariation,
        targetId: targetId,
        targetType: targetType
      });

      let transactionsRes;
      if (hasVariation && stock.variationId) {
        transactionsRes = await api.get(`/transactions/variation/${stock.variationId}`);
      } else {
        transactionsRes = await api.get(`/transactions/product/${stock.productId || stock.id}`);
      }

      const transactionsData = transactionsRes.success ? transactionsRes.data || [] : [];
      let filteredTransactions = transactionsData;

      if (locationType === 'warehouse' && stock.warehouseId) {
        filteredTransactions = transactionsData.filter(t => {
          const transactionType = t.transactionType || t.inventoryType;
          const isCancelled = t.remarks && t.remarks.includes('Delivery cancelled');

          if (transactionType === 'TRANSFER' || transactionType === 'TRANSFER_IN' || transactionType === 'TRANSFER_OUT') {
            const isSendingOut = t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
            const isReceivingIn = t.toWarehouse?.id === stock.warehouseId && t.action === 'ADD';
            return isSendingOut || isReceivingIn;
          }

          if (transactionType === 'DELIVERY') {
            // Normal delivery: warehouse sent stock out
            const isNormalDelivery = t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
            // Cancelled delivery detection: check remarks OR reference number pattern
            const isCancelledByRef = t.referenceNumber?.startsWith('CANCELLED-');
            const isCancelledCheck = isCancelled || isCancelledByRef;
            // Cancelled delivery: stock returned to this warehouse
            const isCancelledReturn = isCancelledCheck && t.action === 'ADD' &&
              t.toWarehouse?.id === stock.warehouseId;
            // Cancelled delivery: removed from branch (show in warehouse history too)
            const isCancelledBranchRemoval = isCancelledCheck && t.action === 'SUBTRACT' && t.fromBranch
              && t.fromWarehouse?.id === stock.warehouseId;
            // Cancelled delivery: reservation released back to this warehouse
            // (delivery cancelled while still PENDING/PREPARING/IN_TRANSIT, before it ever left the warehouse)
            const isCancelledReservationRelease = isCancelledCheck && t.action === 'SUBTRACT' &&
              !t.fromWarehouse && !t.fromBranch && t.toWarehouse?.id === stock.warehouseId;
            return isNormalDelivery || isCancelledReturn || isCancelledBranchRemoval || isCancelledReservationRelease;
          }

          if (transactionType === 'STOCK_IN' || t.action === 'ADD') {
            if (t.toWarehouse?.id) {
              return t.toWarehouse.id === stock.warehouseId;
            }
            return t.action === 'ADD';
          }

          if (transactionType === 'RETURN') {
            return t.toWarehouse?.id === stock.warehouseId && t.action === 'ADD';
          }

          if (transactionType === 'DAMAGE') {
            return t.fromWarehouse?.id === stock.warehouseId && t.action === 'SUBTRACT';
          }

          return t.fromWarehouse?.id === stock.warehouseId ||
            t.toWarehouse?.id === stock.warehouseId;
        });
      } else if (locationType === 'branch' && stock.branchId) {
        filteredTransactions = transactionsData.filter(t => {
          const transactionType = t.transactionType || t.inventoryType;

          if (transactionType === 'TRANSFER' || transactionType === 'TRANSFER_IN' || transactionType === 'TRANSFER_OUT') {
            return t.toBranch?.id === stock.branchId && t.action === 'ADD';
          }

          if (transactionType === 'DELIVERY') {
            const isCancelledByRef = t.referenceNumber?.startsWith('CANCELLED-');
            const isCancelledByRemarks = t.remarks && t.remarks.includes('Delivery cancelled');
            const isCancelled = isCancelledByRef || isCancelledByRemarks;
            const isDeliveryToBranch = t.toBranch?.id === stock.branchId && t.action === 'ADD' && !isCancelled;
            const isCancelledFromBranch = isCancelled && t.fromBranch?.id === stock.branchId && t.action === 'SUBTRACT';
            return isDeliveryToBranch || isCancelledFromBranch;
          }

          if (transactionType === 'SALE') {
            return t.fromBranch?.id === stock.branchId && (t.action === 'SUBTRACT' || t.action === 'INVOICED' || t.action === 'RESERVE');
          }

          if (transactionType === 'RETURN') {
            return t.fromBranch?.id === stock.branchId || t.toBranch?.id === stock.branchId;
          }

          return t.fromBranch?.id === stock.branchId ||
            t.toBranch?.id === stock.branchId; f
        });
      }

      setProductTransactions(filteredTransactions);
      setShowTransactionsModal(true);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  return {
    selectedProduct,
    productTransactions,
    showTransactionsModal,
    showStockDetails,
    setSelectedProduct,
    setProductTransactions,
    setShowTransactionsModal,
    setShowStockDetails,
    handleViewTransaction,
    handleViewTransactions,
    handleViewStockTransactions
  };
};