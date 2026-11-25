import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import { monthsFull } from '../../constants/salesConstants';
import { api } from '../../services/api';

// Static class map: Tailwind can't see classes built like `border-${color}-600`
const TAX_ACTIVE = {
  VAT: 'border-blue-600 bg-blue-50 text-blue-700',
  PT: 'border-purple-600 bg-purple-50 text-purple-700',
};

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const InvoiceFilterModal = ({
  filterData, setFilterData,
  companies, branches,
  allProductOptions = [],
  selectedBranchIds, setSelectedBranchIds,
  selectedProductIds, setSelectedProductIds,
  invoiceNumber, setInvoiceNumber,
  invoiceDate, setInvoiceDate,
  taxType, setTaxType,
  includeWithholdingTax, setIncludeWithholdingTax,
  invoiceSubmitted,
  onClose, onSubmit,
  dataLoading = false,
}) => {
  const [branchSearch, setBranchSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [invoiceNumberError, setInvoiceNumberError] = useState('');
  const [checkingInvoiceNumber, setCheckingInvoiceNumber] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const trimmed = invoiceNumber.trim();
    if (!trimmed) {
      setInvoiceNumberError('');
      setCheckingInvoiceNumber(false);
      return;
    }

    setCheckingInvoiceNumber(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/invoice-profiles/check-invoice-number?invoiceNumber=${encodeURIComponent(trimmed)}`);
        if (res.success && res.data?.exists) {
          setInvoiceNumberError(`Invoice number "${trimmed}" is already in use.`);
        } else {
          setInvoiceNumberError('');
        }
      } catch {
        setInvoiceNumberError('');
      } finally {
        setCheckingInvoiceNumber(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [invoiceNumber]);

  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName || c.name }));

  const selectedCompanyId = filterData.companyIds?.[0] ?? '';

  const companyBranches = selectedCompanyId
    ? branches.filter(b => b.company?.id === selectedCompanyId)
    : branches;

  const filteredBranches = companyBranches.filter(b =>
    !branchSearch || `${b.branchName} ${b.branchCode}`.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Selected branches float to the top, in the order they were selected
  const sortedFilteredBranches = [...filteredBranches].sort((a, b) => {
    const aSel = selectedBranchIds.includes(a.id);
    const bSel = selectedBranchIds.includes(b.id);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    if (aSel && bSel) return selectedBranchIds.indexOf(a.id) - selectedBranchIds.indexOf(b.id);
    return 0;
  });

  const filteredProducts = allProductOptions.filter(p => {
    if (!productSearch) return true;
    const searchLower = productSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(searchLower) ||
      (p.subLabel || '').toLowerCase().includes(searchLower) ||
      (p.upc || '').toLowerCase().includes(searchLower) ||
      (p.sku || '').toLowerCase().includes(searchLower)
    );
  });

  // Selected products float to the top, in the order they were selected
  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    const aSel = selectedProductIds.includes(a.id);
    const bSel = selectedProductIds.includes(b.id);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    if (aSel && bSel) return selectedProductIds.indexOf(a.id) - selectedProductIds.indexOf(b.id);
    return 0;
  });

  const toggleBranch = (id) => {
    setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleProduct = (id) => {
    if (id === null || id === undefined) return;
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allBranchesSelected = filteredBranches.length > 0 && filteredBranches.every(b => selectedBranchIds.includes(b.id));
  const allProductsSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));

  const submitDisabled = !!invoiceNumberError || checkingInvoiceNumber;

  const Spinner = ({ text }) => (
    <div className="flex items-center justify-center gap-2 px-3 py-6 text-gray-400 text-xs">
      <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full shadow-2xl max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Generate Invoice Report</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition">
            <X size={20} />
          </button>
        </div>

        {/* Body: two columns on large screens */}
        <div className="px-6 py-4 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
          {/* LEFT: what to include */}
          <div className="space-y-4 min-w-0">
            <div>
              <label className={labelCls}>Company *</label>
              <SearchableDropdown
                options={companyOptions} value={selectedCompanyId}
                onChange={(value) => {
                  setFilterData(prev => ({ ...prev, companyIds: value ? [value] : [] }));
                  setSelectedBranchIds([]);
                }}
                placeholder="Select Company" displayKey="name" valueKey="id" required
                loading={dataLoading}
              />
            </div>

            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + ' mb-0'}>
                  Branches <span className="text-gray-400 font-normal">(none checked = all)</span>
                </label>
                {!dataLoading && filteredBranches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (allBranchesSelected) {
                        setSelectedBranchIds(prev => prev.filter(id => !filteredBranches.some(b => b.id === id)));
                      } else {
                        setSelectedBranchIds(prev => [...new Set([...prev, ...filteredBranches.map(b => b.id)])]);
                      }
                    }}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    {allBranchesSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>

              {!dataLoading && companyBranches.length > 4 && (
                <div className="relative mb-1.5">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              )}

              <div className="border border-gray-200 rounded-md max-h-32 overflow-y-auto divide-y divide-gray-100">
                {dataLoading ? (
                  <Spinner text="Loading branches..." />
                ) : sortedFilteredBranches.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400 italic text-center">
                    {selectedCompanyId ? 'No branches for selected company' : 'Select a company to see branches'}
                  </div>
                ) : (
                  sortedFilteredBranches.map(b => (
                    <label key={b.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{b.branchName} <span className="text-gray-400 text-xs">({b.branchCode})</span></span>
                    </label>
                  ))
                )}
              </div>
              {selectedBranchIds.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{selectedBranchIds.length} branch{selectedBranchIds.length > 1 ? 'es' : ''} selected</p>
              )}
            </div>

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + ' mb-0'}>
                  Products <span className="text-gray-400 font-normal">(none checked = all)</span>
                </label>
                {!dataLoading && filteredProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ids = filteredProducts.map(p => p.id);
                      if (allProductsSelected) {
                        setSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
                      } else {
                        setSelectedProductIds(prev => [...new Set([...prev, ...ids])]);
                      }
                    }}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    {allProductsSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>

              {!dataLoading && (
                <div className="relative mb-1.5">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              )}
              <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto divide-y divide-gray-100">
                {dataLoading ? (
                  <Spinner text="Loading products..." />
                ) : sortedFilteredProducts.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400 italic text-center">No products found</div>
                ) : (
                  sortedFilteredProducts.map(p => (
                    <label key={p.id} className="flex items-start gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-gray-700">{p.name}</span>
                        {p.subLabel && p.subLabel !== 'No variations' && (
                          <span className="text-xs text-gray-500">Variation: {p.subLabel}</span>
                        )}
                        {p.upc && (
                          <span className="text-xs text-gray-400">UPC: {p.upc}</span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedProductIds.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{selectedProductIds.length} product{selectedProductIds.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>

          {/* RIGHT: period, tax, invoice details */}
          <div className="space-y-4 min-w-0">
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Period</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Start month</label>
                  <select value={filterData.startMonth} onChange={(e) => setFilterData(prev => ({ ...prev, startMonth: parseInt(e.target.value) }))} className={inputCls}>
                    {monthsFull.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Start year</label>
                  <input type="number" value={filterData.startYear} onChange={(e) => setFilterData(prev => ({ ...prev, startYear: parseInt(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End month</label>
                  <select value={filterData.endMonth} onChange={(e) => setFilterData(prev => ({ ...prev, endMonth: parseInt(e.target.value) }))} className={inputCls}>
                    {monthsFull.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>End year</label>
                  <input type="number" value={filterData.endYear} onChange={(e) => setFilterData(prev => ({ ...prev, endYear: parseInt(e.target.value) }))} className={inputCls} />
                </div>
              </div>
              <label className={labelCls}>Status</label>
              <select value={filterData.status} onChange={(e) => setFilterData(prev => ({ ...prev, status: e.target.value }))} className={inputCls}>
                <option value="">Both (Confirmed & Invoiced)</option>
                <option value="CONFIRMED">Confirmed only</option>
                <option value="INVOICED">Invoiced only</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">Tax computation *</p>
              <div className="flex gap-2 mb-3">
                {[
                  { key: 'VAT', label: 'VAT', sub: 'Standard VAT computation' },
                  { key: 'PT', label: 'Percentage Tax (PT)', sub: 'Gross sales × 3%, EWT' },
                ].map(({ key, label, sub }) => (
                  <button key={key} type="button" onClick={() => setTaxType(key)}
                    className={`flex-1 py-2 px-3 rounded-md border-2 text-sm text-left transition ${taxType === key ? TAX_ACTIVE[key] : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs font-normal opacity-75">{sub}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 border border-gray-300 rounded-md px-3 py-2 bg-white">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-700">Include withholding tax</div>
                  <div className="text-xs text-gray-500">Applies to the Sales Invoice and Sales Journal table</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIncludeWithholdingTax(true)}
                    className={`px-3 py-1 rounded-md text-sm font-medium border-2 transition ${includeWithholdingTax ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeWithholdingTax(false)}
                    className={`px-3 py-1 rounded-md text-sm font-medium border-2 transition ${!includeWithholdingTax ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">Invoice details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Invoice number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. SI-2025-0001"
                      className={`${inputCls} ${(invoiceSubmitted && !invoiceNumber.trim()) || invoiceNumberError ? 'border-red-400 bg-red-50' : ''}`}
                    />
                    {checkingInvoiceNumber && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
                        Checking...
                      </span>
                    )}
                  </div>
                  {invoiceSubmitted && !invoiceNumber.trim() && (
                    <p className="text-xs text-red-500 mt-1">Invoice number is required before previewing.</p>
                  )}
                  {invoiceNumberError && (
                    <p className="text-xs text-red-600 font-medium mt-1">{invoiceNumberError}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Invoice date</label>
                  <input
                    type="date" value={invoiceDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) { setInvoiceDate(''); return; }
                      const parts = val.split('-');
                      if (parts[0]?.length > 4) { parts[0] = parts[0].slice(0, 4); setInvoiceDate(parts.join('-')); }
                      else setInvoiceDate(val);
                    }}
                    max="9999-12-31"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition font-medium">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={submitDisabled}
            className={`px-4 py-1.5 text-sm rounded-md transition font-medium ${submitDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
          >
            Preview Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilterModal;
