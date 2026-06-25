import { useState } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { makeStockKey, extractArray } from '../utils/salesUtils';
import { invalidateSalesCache } from '../utils/salesCache';

const DEFAULT_FORM = {
  branchId: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  items: [],
  createdBy: '',
};

export const useSalesForm = ({ fetchSales, currentPage, productOptions }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [modalMode, setModalMode] = useState('create');
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [productPrices, setProductPrices] = useState({});
  const [branchStocks, setBranchStocks] = useState({});
  const [loadingStocks, setLoadingStocks] = useState({});
  const [stockErrors, setStockErrors] = useState({});
  const [originalSaleItems, setOriginalSaleItems] = useState([]);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadProductPricesForCompany = async (companyId) => {
    if (!companyId) { setProductPrices({}); return; }
    try {
      const response = await api.get(`/sales/product-prices?companyId=${companyId}`);
      if (response.success) setProductPrices(response.data || {});
    } catch {
      setProductPrices({});
    }
  };

  const loadProductStock = async (productId, branchId, variationId) => {
    if (!branchId || !productId) return;
    const stockKey = makeStockKey(productId, variationId, branchId);
    setLoadingStocks(prev => ({ ...prev, [stockKey]: true }));
    setStockErrors(prev => ({ ...prev, [stockKey]: null }));
    try {
      const endpoint = variationId
        ? `/stocks/branches/${branchId}/products/${productId}/variations/${variationId}`
        : `/stocks/branches/${branchId}/products/${productId}`;
      const stock = await api.get(endpoint);
      const stockData = stock.success ? stock.data : stock;
      setBranchStocks(prev => ({ ...prev, [stockKey]: stockData || { quantity: 0, availableQuantity: 0 } }));
    } catch {
      setBranchStocks(prev => ({ ...prev, [stockKey]: { quantity: 0, availableQuantity: 0 } }));
      setStockErrors(prev => ({ ...prev, [stockKey]: 'Failed to load stock' }));
    } finally {
      setLoadingStocks(prev => ({ ...prev, [stockKey]: false }));
    }
  };

  const handleBranchChange = async (branchId) => {
    setFormData(prev => ({ ...prev, branchId, items: [] }));
    if (!branchId) return;
    const loadingToast = toast.loading('Loading branch information...');
    try {
      const info = await api.get(`/sales/branch-info/${branchId}`);
      if (info.success) {
        setBranchInfo(info.data);
        await loadProductPricesForCompany(info.data?.companyId);
        setBranchStocks({});
        setStockErrors({});
        toast.success('Branch information loaded successfully!', { id: loadingToast });
      }
    } catch {
      setBranchInfo(null);
      setProductPrices({});
      setBranchStocks({});
      toast.error('Failed to load branch information', { id: loadingToast });
    }
  };

  const handleAddProductToTable = async () => {
    if (!selectedProductForAdd) { toast.error('Please select a product first'); return; }
    if (!formData.branchId) { toast.error('Please select a branch first'); return; }

    const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
    if (!selectedOption) { toast.error('Selected product not found'); return; }

    const exists = formData.items.some(item =>
      item.productId === selectedOption.parentProductId &&
      item.variationId === (selectedOption.variationId || null)
    );
    if (exists) { toast.error('This product is already in the list'); return; }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: selectedOption.parentProductId, variationId: selectedOption.variationId || null, quantity: 1 }]
    }));
    await loadProductStock(selectedOption.parentProductId, formData.branchId, selectedOption.variationId || null);
    setSelectedProductForAdd('');
    toast.success('Product added to list');
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'quantity') {
      newItems[index][field] = parseInt(value) || 0;
    } else if (field === 'productId' && value) {
      const selectedProduct = productOptions.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].productId = selectedProduct.parentProductId;
        newItems[index].variationId = selectedProduct.variationId || null;
        setFormData(prev => ({ ...prev, items: newItems }));
        if (formData.branchId) {
          await loadProductStock(selectedProduct.parentProductId, formData.branchId, selectedProduct.variationId || null);
        }
        return;
      }
    } else {
      newItems[index][field] = value;
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleOpenModal = async (mode, sale = null) => {
    setModalMode(mode);
    setLoadingStocks({});
    setStockErrors({});

    if (mode === 'edit' && sale?.status !== 'PENDING') {
      alert(`Cannot edit sale that is ${sale.status}. Only PENDING sales can be edited.`);
      return;
    }

    if (mode === 'create') {
      setSelectedSale(null);
      setFormData(DEFAULT_FORM);
      setBranchInfo(null);
      setBranchStocks({});
      setSelectedProductForAdd('');
    } else if (mode === 'edit' && sale) {
      setSelectedSale(sale);
      const sortedItems = [...sale.items].sort((a, b) => a.id - b.id).map(item => ({
        productId: item.product.id,
        variationId: item.variation?.id || null,
        quantity: item.quantity || 1,
      }));
      setFormData({ branchId: sale.branch.id, month: sale.month, year: sale.year, items: sortedItems, createdBy: sale.createdBy || '' });
      setOriginalSaleItems(sortedItems);

      const loadingToast = toast.loading('Loading sale data and stock information...');
      try {
        const info = await api.get(`/sales/branch-info/${sale.branch.id}`);
        if (info.success) {
          setBranchInfo(info.data);
          const stockMap = {};
          const errors = {};
          const [stockResults] = await Promise.all([
            Promise.all(sale.items.map(async (item) => {
              const variationId = item.variation?.id || null;
              const stockKey = makeStockKey(item.product.id, variationId, sale.branch.id);
              const endpoint = variationId
                ? `/stocks/branches/${sale.branch.id}/products/${item.product.id}/variations/${variationId}`
                : `/stocks/branches/${sale.branch.id}/products/${item.product.id}`;
              try {
                const stock = await api.get(endpoint);
                return { stockKey, data: stock.success ? stock.data : { quantity: 0, availableQuantity: 0 }, error: null };
              } catch {
                return { stockKey, data: { quantity: 0, availableQuantity: 0 }, error: 'Failed to load stock' };
              }
            })),
            loadProductPricesForCompany(info.data?.companyId),
          ]);
          stockResults.forEach(({ stockKey, data, error }) => {
            stockMap[stockKey] = data;
            if (error) errors[stockKey] = error;
          });
          setBranchStocks(stockMap);
          setStockErrors(errors);
          toast.success('Sale data loaded successfully!', { id: loadingToast });
        }
      } catch {
        toast.error('Failed to load sale data', { id: loadingToast });
      }
    } else if (mode === 'view' && sale) {
      setSelectedSale(sale);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
    setBranchInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branchId) { toast.error('Please select a branch'); return; }
    if (!formData.items?.length) { toast.error('Please add at least one item'); return; }
    for (const item of formData.items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        toast.error('All items must have a product and quantity greater than 0');
        return;
      }
    }

    handleCloseModal();
    const toastId = toast.loading(modalMode === 'create' ? 'Creating sale...' : 'Updating sale...');
    try {
      if (modalMode === 'create') {
        const response = await api.post('/sales', formData);
        if (response.success) {
          toast.success('Sale created successfully!', { id: toastId });
          invalidateSalesCache();
          await fetchSales(0);
        } else {
          toast.error(response.message || 'Failed to create sale', { id: toastId });
        }
      } else if (modalMode === 'edit') {
        const response = await api.put(`/sales/${selectedSale.id}`, formData);
        if (response.success) {
          toast.success('Sale updated successfully!', { id: toastId });
          invalidateSalesCache();
          fetchSales(currentPage - 1);
        } else {
          toast.error(response.message || 'Failed to update sale', { id: toastId });
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Failed to save sale';
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    const action = { CONFIRMED: 'confirm', INVOICED: 'invoice' }[newStatus] || newStatus.toLowerCase();
    if (!window.confirm(`Are you sure you want to ${action} this sale?`)) return;

    setActionLoading(true);
    setLoadingMessage(`${action.charAt(0).toUpperCase() + action.slice(1)}ing sale...`);
    try {
      const response = await api.put(`/sales/${saleId}/status?status=${newStatus}`);
      if (response.success || response.data) {
        toast.success(`Sale ${action}ed successfully!`);
        invalidateSalesCache();
        await fetchSales(currentPage - 1);
      } else {
        toast.error(`Failed to ${action} sale`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.response?.data || error.message || `Failed to ${action} sale`);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) return;
    setActionLoading(true);
    setLoadingMessage('Deleting sale...');
    try {
      const response = await api.delete(`/sales/${saleId}`);
      if (response.success || response.data?.message) {
        toast.success('Sale deleted successfully!');
        invalidateSalesCache();
        await fetchSales(currentPage - 1);
      } else {
        toast.error('Failed to delete sale');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || error.response?.data || error.message || 'Failed to delete sale');
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const getMaxAllowedQuantity = (item, stockInfo, oldItem) => {
    if (!stockInfo) return undefined;
    const currentAvailable = stockInfo.availableQuantity || 0;
    const originalReserved = oldItem ? oldItem.quantity : 0;
    return currentAvailable + originalReserved;
  };

  return {
    formData, setFormData,
    modalMode, showModal,
    selectedSale,
    branchInfo,
    productPrices,
    branchStocks,
    loadingStocks,
    stockErrors,
    originalSaleItems,
    selectedProductForAdd, setSelectedProductForAdd,
    actionLoading, loadingMessage,
    handleOpenModal,
    handleCloseModal,
    handleBranchChange,
    handleAddProductToTable,
    handleRemoveItem,
    handleItemChange,
    handleSubmit,
    handleUpdateStatus,
    handleDelete,
    loadProductStock,
    getMaxAllowedQuantity,
  };
};