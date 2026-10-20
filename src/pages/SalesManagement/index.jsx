import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../styles/invoice-print.css';
import '../../styles/sales-report-print.css';
import '../../styles/sales-memo-print.css';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth, can } from '../../context/AuthContext';


import { months, monthsFull, DEFAULT_FILTER_DATA, SALE_STATUS } from '../../constants/salesConstants';
import { useSalesData } from '../../hooks/useSalesData';
import { useSalesForm } from '../../hooks/useSalesForm';
import { useProductOptions } from '../../hooks/useProductOptions';
import InvoiceReportModal from '../../components/modals/InvoiceReportModal'
import SalesFilters from '../../components/filters/SalesFilters';
import SalesTable from '../../components/tables/SalesTable';
import SaleFormModal from '../../components/forms/SaleFormModal';
import SaleViewModal from '../../components/modals/SaleViewModal';
import InvoiceFilterModal from '../../components/modals/InvoiceFilterModal';
import StatusProductsModal from '../../components/modals/StatusProductsModal';
import SalesSummaryModal from '../../components/modals/SalesSummaryModal';
import DuplicateSaleWarningModal from '../../components/modals/DuplicateSaleWarningModal';
import InvoicingProfile from './InvoicingProfile';
import SalesReport from './SalesReport';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';

const extractDuplicateMessage = (rawMsg) => {
  if (typeof rawMsg === 'string' && rawMsg.startsWith('DUPLICATE_INVOICE_NUMBER:')) {
    return { field: true, text: rawMsg.replace('DUPLICATE_INVOICE_NUMBER:', '').trim() };
  }
  if (typeof rawMsg === 'string' && rawMsg.startsWith('DUPLICATE_INVOICE:')) {
    return { field: false, text: rawMsg.replace('DUPLICATE_INVOICE:', '').trim() };
  }
  return null;
};

const SalesManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'sales', 'create');
  const canEdit = can(user, 'sales', 'edit');
  const canDelete = can(user, 'sales', 'delete');
  const canInvoice = can(user, 'sales', 'invoice');
  const canReport = can(user, 'sales', 'report');
  const canSummary = can(user, 'sales', 'summary');

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(SALE_STATUS.ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [saleNoTerm, setSaleNoTerm] = useState('');
  // Sale No. filter takes priority over the general search text
  const effectiveSearch = saleNoTerm.trim() || searchTerm;
  const [filterData, setFilterData] = useState(DEFAULT_FILTER_DATA);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showProductsByStatusModal, setShowProductsByStatusModal] = useState(false);
  const [selectedStatusForModal, setSelectedStatusForModal] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const showInvoicingProfile = location.pathname === '/sales/journal';
  const showSalesReport = location.pathname === '/sales/report';
  const [invoiceReport, setInvoiceReport] = useState(null);
  const [invoiceBranchIds, setInvoiceBranchIds] = useState([]);
  const [invoiceProductIds, setInvoiceProductIds] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceSubmitted, setInvoiceSubmitted] = useState(false);
  const [taxType, setTaxType] = useState('VAT');
  const [includeWithholdingTax, setIncludeWithholdingTax] = useState(true);
  const [invoiceNumberError, setInvoiceNumberError] = useState('');
  const [productsByStatus, setProductsByStatus] = useState({ pending: [], confirmed: [], invoiced: [] });
  const [productsByStatusLoading, setProductsByStatusLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [journalBlock, setJournalBlock] = useState(null);
  const generatingRef = useRef(false);

  const {
    sales, branches, companies, products,
    inventories, warehouses, warehouseStocks, productSummaries,
    loading, staticDataLoading, totalPages, totalElements, allFilteredSales,
    fetchSales, setCompanies, setProducts,
  } = useSalesData({ filterData, statusFilter, searchTerm: effectiveSearch, currentPage });

  const { allProductOptions, productOptions } = useProductOptions({
    products,
    branchInfo: null,
    productPrices: {},
    companyId: filterData.companyIds?.[0] ?? null,
  });

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
    duplicateCheck, cancelDuplicateSubmit, confirmDuplicateSubmit,
  } = useSalesForm({ fetchSales, currentPage, productOptions: allProductOptions });

  const { allProductOptions: allOpts, productOptions: opts } = useProductOptions({
    products,
    branchInfo,
    productPrices,
  });

  useEffect(() => {
    setProductsByStatus({ pending: [], confirmed: [], invoiced: [] });
  }, [
    JSON.stringify(filterData.companyIds),
    JSON.stringify(filterData.branchIds),
    JSON.stringify(filterData.productFilters),
    filterData.startDate, filterData.endDate,
    statusFilter, effectiveSearch,
  ]);

  useEffect(() => {
    if (showModal) setLoadingAction(null);
  }, [showModal]);



  const handleResetFilter = () => {
    setFilterData(DEFAULT_FILTER_DATA);
    setStatusFilter(SALE_STATUS.ALL);
    setSearchTerm('');
    setSaleNoTerm('');
    setCurrentPage(1);
  };

  const aggregateProductsByStatus = async (statusToFetch) => {
    try {
      setProductsByStatusLoading(true);
      const startDateObj = filterData.startDate ? new Date(filterData.startDate) : null;
      const endDateObj = filterData.endDate ? new Date(filterData.endDate) : null;
      const params = new URLSearchParams({
        status: statusToFetch,
        ...(effectiveSearch && { searchTerm: effectiveSearch }),
        ...(startDateObj && { startYear: startDateObj.getFullYear(), startMonth: startDateObj.getMonth() + 1 }),
        ...(endDateObj && { endYear: endDateObj.getFullYear(), endMonth: endDateObj.getMonth() + 1 }),
      });
      if (filterData.companyIds?.length) {
        filterData.companyIds.forEach(id => params.append('companyIds', id));
      }
      if (filterData.branchIds?.length) {
        filterData.branchIds.forEach(id => params.append('branchIds', id));
      }
      if (filterData.productFilters?.length) {
        filterData.productFilters.forEach(pf => {
          if (pf.productId) {
            params.append('productIds', pf.productId);
            params.append('variationIds', pf.variationId ?? 0);
          }
        });
      }
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
    if (!filterData.companyIds?.length) { toast.error('Please select a company first'); return; }
    if (filterData.companyIds.length > 1) { toast.error('Please select only one company for invoice generation'); return; }
    if (generatingRef.current) return;
    generatingRef.current = true;
    toast.loading('Generating Invoice...', { id: 'invoice-loading' });
    try {
      const toNumericProductId = (rawId) => {
        if (typeof rawId === 'number') return rawId;
        const str = String(rawId);
        const numericPart = str.includes('_') ? str.split('_')[0] : str;
        const parsed = parseInt(numericPart, 10);
        return Number.isNaN(parsed) ? null : parsed;
      };

      const resolvedOptions = invoiceProductIds
        .map(id => allOpts.find(o => o.id === id))
        .filter(Boolean);

      const numericProductIds = [...new Set(
        resolvedOptions.map(opt => {
          if (opt.parentProductId != null) return Number(opt.parentProductId);
          return toNumericProductId(opt.id);
        }).filter(id => id !== null && !Number.isNaN(id))
      )];

      const numericVariationIds = [...new Set(
        resolvedOptions
          .filter(opt => opt.variationId != null)
          .map(opt => Number(opt.variationId))
          .filter(id => !Number.isNaN(id))
      )];

      console.log('Selected ids:', invoiceProductIds);
      console.log('Resolved options:', resolvedOptions);
      console.log('→ productIds:', numericProductIds, '→ variationIds:', numericVariationIds);

      const payload = {
        ...filterData,
        companyId: filterData.companyIds[0],
        branchIds: invoiceBranchIds,
        productIds: numericProductIds,
        variationIds: numericVariationIds,
      };
      const response = await api.post('/sales/invoice/generate', payload);
      toast.dismiss('invoice-loading');
      if (response.success || response.data) {
        const invoiceData = response.data || response;
        if (!invoiceData.products?.length) { toast.error('No sales data found for invoice generation!'); return; }
        invoiceData.adjustments = invoiceData.adjustments || [];
        const company = companies.find(c => c.id === filterData.companyIds[0]);
        if (invoiceBranchIds.length === 1) {
          const branch = branches.find(b => b.id === invoiceBranchIds[0]);
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
    } finally {
      generatingRef.current = false;
    }
  };

  const handleGenerateToProfile = async () => {
    if (!invoiceReport) return;
    const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);
    let vatableSales, vat, wht, totalAmountDue;
    if (taxType === 'VAT') {
      vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
      vat = vatableSales * 0.12;
      wht = includeWithholdingTax ? vatableSales * 0.01 : 0;
      totalAmountDue = ((invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal) - wht;
    } else {
      const grossSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      vatableSales = grossSales;
      vat = grossSales * 0.03;
      wht = includeWithholdingTax ? (grossSales / 1.12) * 0.01 : 0;
      totalAmountDue = grossSales - wht;
    }
    const payload = {
      companyId: filterData.companyIds?.[0] || null,
      branchId: invoiceBranchIds.length === 1 ? invoiceBranchIds[0] : null,
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
          companySku: p.companySku || null,
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


    setInvoiceNumberError('');
    try {
      const res = await api.post('/invoice-profiles', payload);
      if (res.success) {
        toast.success('Invoice saved to Sales Journal!');
        setInvoiceReport(null);
        setInvoiceBranchIds([]);
        setInvoiceProductIds([]);
        navigate('/sales/journal');
      } else {
        const rawMsg = res.error || res.message || 'Failed to save to Sales Journal';
        const dupMsg = extractDuplicateMessage(rawMsg);
        if (dupMsg && dupMsg.field) {
          setInvoiceNumberError(dupMsg.text);
        } else if (dupMsg) {
        } else {
          toast.error(rawMsg);
        }
      }
    } catch (err) {
      const rawMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save to Sales Journal';
      const dupMsg = extractDuplicateMessage(rawMsg);
      if (dupMsg && dupMsg.field) {
        setInvoiceNumberError(dupMsg.text);
      } else if (dupMsg) {
      } else {
        toast.error(rawMsg);
      }
    }
  };

  if (showInvoicingProfile) return <InvoicingProfile onBack={() => navigate('/sales')} />;
  if (showSalesReport) return <SalesReport onBack={() => navigate('/sales')} filterData={filterData} companies={companies} branches={branches} allProductOptions={allProductOptions} />;

  return (
    <div className="min-h-screen bg-white p-2 sm:p-3 lg:p-4">
      <LoadingOverlay show={actionLoading && !!loadingMessage} message={loadingMessage} />
      <div className="max-w-full mx-auto">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sales Management</h1>
          <p className="text-sm text-gray-600">Manage sales orders, generate invoices, and track revenue</p>
        </div>

        <SalesFilters
          user={user}
          filterData={filterData}
          setFilterData={setFilterData}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          saleNoTerm={saleNoTerm}
          setSaleNoTerm={setSaleNoTerm}
          companies={companies}
          branches={branches}
          allFilteredSales={allFilteredSales}
          productsByStatus={productsByStatus}
          allProductOptions={allProductOptions}
          dataLoading={staticDataLoading}
          canCreate={canCreate}
          canInvoice={canInvoice}
          canReport={canReport}
          canSummary={canSummary}
          onNewSale={() => handleOpenModal('create')}
          onOpenInvoice={() => {
            if (!canInvoice) { toast.error('You do not have permission to generate invoices'); return; }
            setInvoiceBranchIds(filterData.branchIds || []);
            setShowInvoiceModal(true);
          }}
          onOpenJournal={() => navigate('/sales/journal')}
          onOpenReport={() => {
            if (!canReport) { toast.error('You do not have permission to view reports'); return; }
            navigate('/sales/report');
          }}
          onOpenSummary={() => {
            if (!canSummary) { toast.error('You do not have permission to view summary'); return; }
            setShowSummaryModal(true);
          }}
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
          canEdit={canEdit}
          canDelete={canDelete}
          onView={async (sale) => { setLoadingAction({ id: sale.id, type: 'view' }); await handleOpenModal('view', sale); }}
          onEdit={async (sale) => {
            if (!canEdit) { toast.error('You do not have permission to edit sales'); return; }
            setLoadingAction({ id: sale.id, type: 'edit' }); await handleOpenModal('edit', sale);
          }}
          loadingAction={loadingAction}
          onUpdateStatus={handleUpdateStatus}
          onDelete={async (saleId) => {
            if (!canDelete) { toast.error('You do not have permission to delete sales'); return; }
            const target = sales.find(s => s.id === saleId);
            if (target?.status === 'INVOICED') {
              try {
                const res = await api.get(`/sales/${saleId}/journal-check`);
                if (!res.success) { toast.error('Could not verify the Sales Journal. Try again.'); return; }
                const data = res.data?.data || res.data;
                if (data?.inJournal) {
                  setJournalBlock({ saleId, journals: data.journals || [] });
                  return;
                }
              } catch {
                toast.error('Could not verify the Sales Journal. Try again.');
                return;
              }
            }
            handleDelete(saleId);
          }}
          onPageChange={setCurrentPage}
          productFilters={filterData.productFilters}
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
            onBulkUploadComplete={() => fetchSales(currentPage - 1)}
            companies={companies}
            defaultCompanyId={filterData.companyIds?.[0]}
            dataLoading={staticDataLoading}
            productFilters={filterData.productFilters}
          />
        )}

        {duplicateCheck.show && (
          <DuplicateSaleWarningModal
            matches={duplicateCheck.matches}
            onCancel={cancelDuplicateSubmit}
            onSubmitAnyway={confirmDuplicateSubmit}
          />
        )}

        {showModal && modalMode === 'view' && selectedSale && (
          <SaleViewModal
            sale={selectedSale}
            products={products}
            productPrices={productPrices}
            onClose={handleCloseModal}
            productFilters={filterData.productFilters}
          />
        )}

        {showInvoiceModal && (
          <InvoiceFilterModal
            filterData={filterData}
            setFilterData={setFilterData}
            companies={companies}
            branches={branches}
            allProductOptions={allProductOptions}
            dataLoading={staticDataLoading}
            selectedBranchIds={invoiceBranchIds}
            setSelectedBranchIds={setInvoiceBranchIds}
            selectedProductIds={invoiceProductIds}
            setSelectedProductIds={setInvoiceProductIds}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={setInvoiceNumber}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            taxType={taxType}
            setTaxType={setTaxType}
            includeWithholdingTax={includeWithholdingTax}
            setIncludeWithholdingTax={setIncludeWithholdingTax}
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
            searchTerm={effectiveSearch}
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

        {invoiceReport && (
          <InvoiceReportModal
            invoiceReport={invoiceReport}
            setInvoiceReport={setInvoiceReport}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={(val) => { setInvoiceNumberError(''); setInvoiceNumber(val); }}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            taxType={taxType}
            includeWithholdingTax={includeWithholdingTax}
            setIncludeWithholdingTax={setIncludeWithholdingTax}
            onGenerate={handleGenerateToProfile}
            invoiceNumberError={invoiceNumberError}
          />
        )}

        {journalBlock && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-5 border-b border-gray-100 font-medium text-black">
                Cannot delete this invoiced sale
              </div>
              <div className="p-5 text-sm text-gray-700 space-y-3">
                <p>
                  Sale #{journalBlock.saleId} is already recorded in the Sales Journal.
                  Delete the journal entry first, then come back to delete this sale.
                </p>
                <div className="space-y-1">
                  {journalBlock.journals.map(j => (
                    <div key={j.id} className="bg-gray-50 rounded px-3 py-2 text-xs">
                      <span className="font-mono font-semibold">{j.invoiceNumber || `Journal #${j.id}`}</span>
                      {j.soldTo && <span className="text-gray-500"> · {j.soldTo}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => setJournalBlock(null)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => { setJournalBlock(null); navigate('/sales/journal'); }}
                  className="px-4 py-2 bg-[#2CA01C] text-white rounded text-sm font-medium hover:bg-[#268d19]"
                >
                  Go to Sales Journal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesManagement;