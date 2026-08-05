import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import { monthsFull } from '../../constants/salesConstants';
import { api } from '../../services/api';

const InvoiceFilterModal = ({
  filterData, setFilterData,
  companies, branches,
  allProductOptions = [],
  selectedBranchIds, setSelectedBranchIds,
  selectedProductIds, setSelectedProductIds,
  invoiceNumber, setInvoiceNumber,
  invoiceDate, setInvoiceDate,
  taxType, setTaxType,
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

  const companyBranches = filterData.companyId
    ? branches.filter(b => b.company?.id === filterData.companyId)
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

  const toNumericProductId = (rawId) => {
    if (typeof rawId === 'number') return rawId;
    const str = String(rawId);
    const numericPart = str.includes('_') ? str.split('_')[0] : str;
    const parsed = parseInt(numericPart, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toggleBranch = (id) => {
    setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleProduct = (id) => {
    if (id === null || id === undefined) return;
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allBranchesSelected = filteredBranches.length > 0 && filteredBranches.every(b => selectedBranchIds.includes(b.id));
  const allProductsSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full shadow-2xl max-h-[98vh] overflow-y-auto">
        <div className="p-4 sm:p-8 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Generate Invoice Report</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Company *</label>
            <SearchableDropdown
              options={companyOptions} value={filterData.companyId}
              onChange={(value) => {
                setFilterData(prev => ({ ...prev, companyId: value, branchId: '' }));
                setSelectedBranchIds([]);
              }}
              placeholder="Select Company" displayKey="name" valueKey="id" required
              loading={dataLoading}
            />
          </div>

          {/* Branch checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Branches (leave unchecked for all)
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {allBranchesSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            {!dataLoading && companyBranches.length > 4 && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
              {dataLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-gray-400 text-xs">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading branches...
                </div>
              ) : sortedFilteredBranches.length === 0 ? (
                <div className="px-3 py-4 text-xs text-gray-400 italic text-center">
                  {filterData.companyId ? 'No branches for selected company' : 'Select a company to see branches'}
                </div>
              ) : (
                sortedFilteredBranches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
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

          {/* Product checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Products (leave unchecked for all)
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {allProductsSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            {!dataLoading && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {dataLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-gray-400 text-xs">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading products...
                </div>
              ) : sortedFilteredProducts.length === 0 ? (
                <div className="px-3 py-4 text-xs text-gray-400 italic text-center">No products found</div>
              ) : (
                sortedFilteredProducts.map(p => (
                  <label key={p.id} className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex flex-col">
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

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Start Month</label>
              <select value={filterData.startMonth} onChange={(e) => setFilterData(prev => ({ ...prev, startMonth: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                {monthsFull.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">End Month</label>
              <select value={filterData.endMonth} onChange={(e) => setFilterData(prev => ({ ...prev, endMonth: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                {monthsFull.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Start Year</label>
              <input type="number" value={filterData.startYear} onChange={(e) => setFilterData(prev => ({ ...prev, startYear: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">End Year</label>
              <input type="number" value={filterData.endYear} onChange={(e) => setFilterData(prev => ({ ...prev, endYear: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Status Filter</label>
            <select value={filterData.status} onChange={(e) => setFilterData(prev => ({ ...prev, status: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition">
              <option value="">Both (Confirmed & Invoiced)</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="INVOICED">Invoiced Only</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Tax Computation Type *</label>
            <div className="flex gap-3 mb-6">
              {[
                { key: 'VAT', label: 'VAT', sub: 'Standard VAT computation', color: 'blue' },
                { key: 'PT', label: 'Percentage Tax (PT)', sub: 'Gross sales × 3%, EWT', color: 'purple' },
              ].map(({ key, label, sub, color }) => (
                <button key={key} type="button" onClick={() => setTaxType(key)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition ${taxType === key ? `border-${color}-600 bg-${color}-50 text-${color}-700` : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                >
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs mt-0.5 font-normal opacity-75">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Invoice details</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Invoice Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. SI-2025-0001"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${(invoiceSubmitted && !invoiceNumber.trim()) || invoiceNumberError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-3">Invoice Date</label>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!!invoiceNumberError || checkingInvoiceNumber}
            className={`px-6 py-3 rounded-lg transition font-medium shadow-md ${invoiceNumberError || checkingInvoiceNumber
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
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