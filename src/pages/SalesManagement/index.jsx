import React, { useState, useCallback, useEffect } from 'react';
import '../../styles/invoice-print.css';
import '../../styles/sales-report-print.css';
import '../../styles/sales-memo-print.css';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Plus, FileText, Printer, X } from 'lucide-react';

// Separated utilities, constants, hooks, components
import { formatCurrency, formatDate, formatPHDateTime } from '../../utils/salesUtils';
import { months, monthsFull, DEFAULT_FILTER_DATA, SALE_STATUS } from '../../constants/salesConstants';
import { useSalesData } from '../../hooks/useSalesData';
import { useSalesForm } from '../../hooks/useSalesForm';
import { useProductOptions } from '../../hooks/useProductOptions';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import InvoiceReportModal from '../../components/modals/InvoiceReportModal'
import SalesFilters from '../../components/filters/SalesFilters';
import SalesTable from '../../components/tables/SalesTable';
import SaleFormModal from '../../components/forms/SaleFormModal';
import SaleViewModal from '../../components/modals/SaleViewModal';
import InvoiceFilterModal from '../../components/modals/InvoiceFilterModal';
import StatusProductsModal from '../../components/modals/StatusProductsModal';
import SalesSummaryModal from '../../components/modals/SalesSummaryModal';
import InvoicingProfile from './InvoicingProfile';
import SalesReport from './SalesReport';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

const SalesManagement = () => {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'ENCODER', 'ASSISTANT_ADMIN'].includes(user?.role);
  const canDelete = ['ADMIN', 'ASSISTANT_ADMIN'].includes(user?.role);
  const canFinance = ['ADMIN', 'FINANCE', 'ASSISTANT_ADMIN'].includes(user?.role);
  const isEncoder = user?.role === 'ENCODER';

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(SALE_STATUS.ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterData, setFilterData] = useState(DEFAULT_FILTER_DATA);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showProductsByStatusModal, setShowProductsByStatusModal] = useState(false);
  const [selectedStatusForModal, setSelectedStatusForModal] = useState(null);
  const [showInvoicingProfile, setShowInvoicingProfile] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [invoiceReport, setInvoiceReport] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceSubmitted, setInvoiceSubmitted] = useState(false);
  const [taxType, setTaxType] = useState('VAT');
  const [productsByStatus, setProductsByStatus] = useState({ pending: [], confirmed: [], invoiced: [] });
  const [productsByStatusLoading, setProductsByStatusLoading] = useState(false);
  const [loadingSaleId, setLoadingSaleId] = useState(null);

  // Data hook
  const {
    sales, branches, companies, products,
    inventories, warehouses, warehouseStocks, productSummaries,
    loading, totalPages, totalElements, allFilteredSales,
    fetchSales, setCompanies, setProducts,
  } = useSalesData({ filterData, statusFilter, searchTerm, currentPage });

  // Product options hook
  const { allProductOptions, productOptions } = useProductOptions({
    products,
    branchInfo: null, // will come from form hook
    productPrices: {},
  });

  // Form/modal hook
  const {
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
  } = useSalesForm({ fetchSales, currentPage, productOptions });

  // Product options with branchInfo from form
  const { allProductOptions: allOpts, productOptions: opts } = useProductOptions({
    products,
    branchInfo,
    productPrices,
  });

  useEffect(() => {
    if (showModal) setLoadingSaleId(null);
  }, [showModal]);

  const handleResetFilter = () => {
    setFilterData(DEFAULT_FILTER_DATA);
    setStatusFilter(SALE_STATUS.ALL);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const aggregateProductsByStatus = async (statusToFetch) => {
    try {
      setProductsByStatusLoading(true);
      const startDateObj = filterData.startDate ? new Date(filterData.startDate) : null;
      const endDateObj = filterData.endDate ? new Date(filterData.endDate) : null;
      const params = new URLSearchParams({
        status: statusToFetch,
        ...(filterData.companyId && { companyId: filterData.companyId }),
        ...(filterData.branchId && { branchId: filterData.branchId }),
        ...(searchTerm && { searchTerm }),
        ...(startDateObj && { startYear: startDateObj.getFullYear(), startMonth: startDateObj.getMonth() + 1 }),
        ...(endDateObj && { endYear: endDateObj.getFullYear(), endMonth: endDateObj.getMonth() + 1 }),
      });
      const response = await api.get(`/sales/items-by-status?${params}`);
      const sorted = (response.data?.products || []).sort((a, b) => a.productName.localeCompare(b.productName));
      setProductsByStatus(prev => ({ ...prev, [statusToFetch.toLowerCase()]: sorted }));
    } catch {
      toast.error('Failed to load product details');
    } finally {
      setProductsByStatusLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!filterData.companyId) { toast.error('Please select a company first'); return; }
    toast.loading('Generating Invoice...', { id: 'invoice-loading' });
    try {
      const response = await api.post('/sales/invoice/generate', filterData);
      toast.dismiss('invoice-loading');
      if (response.success || response.data) {
        const invoiceData = response.data || response;
        if (!invoiceData.products?.length) { toast.error('No sales data found for invoice generation!'); return; }
        invoiceData.adjustments = invoiceData.adjustments || [];
        const company = companies.find(c => c.id === filterData.companyId);
        if (filterData.branchId) {
          const branch = branches.find(b => b.id === filterData.branchId);
          if (branch) {
            invoiceData.soldTo = branch.branchName;
            invoiceData.registeredName = company?.companyName || branch.branchName;
            invoiceData.tin = branch.tin || invoiceData.tin || 'N/A';
            invoiceData.businessAddress = branch.fullAddress || invoiceData.businessAddress || 'N/A';
          }
        } else if (company) {
          invoiceData.soldTo = company.companyName;
          invoiceData.registeredName = company.companyName;
          invoiceData.tin = company.tin || invoiceData.tin || 'N/A';
          invoiceData.businessAddress = company.fullAddress || company.businessAddress || invoiceData.businessAddress || 'N/A';
        }
        setInvoiceReport(invoiceData);
        setShowInvoiceModal(false);
        toast.success(`Invoice generated! ${invoiceData.products.length} products`);
      }
    } catch (error) {
      toast.dismiss('invoice-loading');
      toast.error(error.response?.data?.message || error.message || 'Failed to generate invoice');
    }
  };

  const handleGenerateToProfile = async () => {
    if (!invoiceReport) return;
    const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
    let vatableSales, vat, wht, totalAmountDue;
    if (taxType === 'VAT') {
      vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
      vat = vatableSales * 0.12;
      wht = vatableSales * 0.01;
      totalAmountDue = ((invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal) - wht;
    } else {
      const grossSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      vatableSales = grossSales;
      vat = grossSales * 0.03;
      wht = (grossSales / 1.12) * 0.01;
      totalAmountDue = grossSales - wht;
    }
    const payload = {
      companyId: filterData.companyId || null,
      branchId: filterData.branchId || null,
      startMonth: filterData.startMonth || null,
      endMonth: filterData.endMonth || null,
      startYear: filterData.startYear || null,
      endYear: filterData.endYear || null,
      soldTo: invoiceReport.soldTo || '',
      registeredName: invoiceReport.registeredName || invoiceReport.soldTo || '',
      tin: invoiceReport.tin || '',
      businessAddress: invoiceReport.businessAddress || '',
      vatableSales, vat, withholdingTax: wht, totalAmountDue,
      transactionType: taxType === 'PT' ? 'Sales Invoice (PT)' : 'Sales Invoice',
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      items: [
        ...(invoiceReport.products || []).map(p => ({
          productName: p.productName,
          variationDisplay: p.variation ? (p.variation.combinationDisplay || `${p.variation.variationType}: ${p.variation.variationValue}`) : null,
          upc: p.variation?.upc || null,
          totalQuantity: p.totalQuantity,
          unitCost: p.totalAmount / p.totalQuantity,
          totalAmount: p.totalAmount,
        })),
        ...(invoiceReport.adjustments || []).filter(a => a.description && a.amount).map(a => ({
          productName: a.description,
          variationDisplay: 'Adjustment',
          upc: null,
          totalQuantity: a.quantity || 1,
          unitCost: a.unitCost || 0,
          totalAmount: a.amount || 0,
        })),
      ],
    };
    try {
      const res = await api.post('/invoice-profiles', payload);
      if (res.success) {
        toast.success('Invoice saved to Sales Journal!');
        setInvoiceReport(null);
        setShowInvoicingProfile(true);
      } else {
        toast.error(res.error || 'Failed to save to Sales Journal');
      }
    } catch {
      toast.error('Failed to save to Sales Journal');
    }
  };

  if (showInvoicingProfile) return <InvoicingProfile onBack={() => setShowInvoicingProfile(false)} />;
  if (showSalesReport) return <SalesReport onBack={() => setShowSalesReport(false)} filterData={filterData} companies={companies} branches={branches} />;

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <LoadingOverlay show={actionLoading && !!loadingMessage} message={loadingMessage} />
      <div className="max-w-full mx-auto">
        <div className="mb-4">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Sales Management</h1>
          <p className="text-sm text-gray-600">Manage sales orders, generate invoices, and track revenue</p>
        </div>

        <SalesFilters
          filterData={filterData}
          setFilterData={setFilterData}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          companies={companies}
          branches={branches}
          allFilteredSales={allFilteredSales}
          productsByStatus={productsByStatus}
          allProductOptions={allOpts}
          canCreate={canCreate}
          canFinance={canFinance}
          isEncoder={isEncoder}
          onNewSale={() => handleOpenModal('create')}
          onOpenInvoice={() => setShowInvoiceModal(true)}
          onOpenJournal={() => setShowInvoicingProfile(true)}
          onOpenReport={() => setShowSalesReport(true)}
          onOpenSummary={() => setShowSummaryModal(true)}
          onOpenStatusModal={(status) => {
            setSelectedStatusForModal(status);
            setProductsByStatus(prev => ({ ...prev, [status.toLowerCase()]: [] }));
            setShowProductsByStatusModal(true);
            aggregateProductsByStatus(status);
          }}
          onResetFilter={handleResetFilter}
          setCurrentPage={setCurrentPage}
        />

        <SalesTable
          sales={sales}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          canCreate={canCreate}
          canDelete={canDelete}
          onView={async (sale) => { setLoadingSaleId(sale.id); await handleOpenModal('view', sale); }}
          onEdit={async (sale) => { setLoadingSaleId(sale.id); await handleOpenModal('edit', sale); }}
          loadingSaleId={loadingSaleId}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
          onPageChange={setCurrentPage}
        />

        {showModal && (modalMode === 'create' || modalMode === 'edit') && (
          <SaleFormModal
            modalMode={modalMode}
            formData={formData}
            setFormData={setFormData}
            branchInfo={branchInfo}
            branches={branches}
            productOptions={opts}
            branchStocks={branchStocks}
            loadingStocks={loadingStocks}
            stockErrors={stockErrors}
            selectedProductForAdd={selectedProductForAdd}
            setSelectedProductForAdd={setSelectedProductForAdd}
            originalSaleItems={originalSaleItems}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
            onBranchChange={handleBranchChange}
            onAddProduct={handleAddProductToTable}
            onRemoveItem={handleRemoveItem}
            onItemChange={handleItemChange}
            onLoadStock={loadProductStock}
            getMaxAllowedQuantity={getMaxAllowedQuantity}
          />
        )}

        {showModal && modalMode === 'view' && selectedSale && (
          <SaleViewModal
            sale={selectedSale}
            products={products}
            productPrices={productPrices}
            onClose={handleCloseModal}
          />
        )}

        {showInvoiceModal && (
          <InvoiceFilterModal
            filterData={filterData}
            setFilterData={setFilterData}
            companies={companies}
            branches={branches}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={setInvoiceNumber}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            taxType={taxType}
            setTaxType={setTaxType}
            invoiceSubmitted={invoiceSubmitted}
            onClose={() => { setShowInvoiceModal(false); setInvoiceSubmitted(false); }}
            onSubmit={() => {
              setInvoiceSubmitted(true);
              if (!invoiceNumber.trim()) return;
              handleGenerateInvoice();
            }}
          />
        )}

        {showSummaryModal && (
          <SalesSummaryModal
            onClose={() => setShowSummaryModal(false)}
            filterData={filterData}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            companies={companies}
            branches={branches}
          />
        )}

        {showProductsByStatusModal && selectedStatusForModal && (
          <StatusProductsModal
            selectedStatus={selectedStatusForModal}
            productsByStatus={productsByStatus}
            loading={productsByStatusLoading}
            onClose={() => setShowProductsByStatusModal(false)}
          />
        )}

        {/* Invoice Report — kept inline since it has heavy inline editing logic */}
        {invoiceReport && (
          <InvoiceReportModal
            invoiceReport={invoiceReport}
            setInvoiceReport={setInvoiceReport}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={setInvoiceNumber}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            taxType={taxType}
            onGenerate={handleGenerateToProfile}
          />
        )}
      </div>
    </div>
  );
};

export default SalesManagement;