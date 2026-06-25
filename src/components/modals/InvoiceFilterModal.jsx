import React from 'react';
import { X } from 'lucide-react';
import SearchableDropdown from '../../components/common/SaleSearchableDropdown';
import { monthsFull } from '../../constants/salesConstants';

const InvoiceFilterModal = ({
  filterData, setFilterData,
  companies, branches,
  invoiceNumber, setInvoiceNumber,
  invoiceDate, setInvoiceDate,
  taxType, setTaxType,
  invoiceSubmitted,
  onClose, onSubmit,
}) => {
  const companyOptions = companies.map(c => ({ id: c.id, name: c.companyName || c.name }));
  const filteredBranchOptions = filterData.companyId
    ? branches.filter(b => b.company?.id === filterData.companyId).map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }))
    : branches.map(b => ({ id: b.id, name: `${b.branchName} (${b.branchCode})` }));

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
              onChange={(value) => setFilterData(prev => ({ ...prev, companyId: value, branchId: '' }))}
              placeholder="Select Company" displayKey="name" valueKey="id" required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Branch (Optional)</label>
            <SearchableDropdown
              options={filteredBranchOptions} value={filterData.branchId}
              onChange={(value) => setFilterData(prev => ({ ...prev, branchId: value }))}
              placeholder="All Branches" displayKey="name" valueKey="id"
            />
            {filterData.companyId && filteredBranchOptions.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No branches for selected company</p>
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
                <input
                  type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. SI-2025-0001"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${invoiceSubmitted && !invoiceNumber.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                {invoiceSubmitted && !invoiceNumber.trim() && (
                  <p className="text-xs text-red-500 mt-1">Invoice number is required before previewing.</p>
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
          <button onClick={onSubmit} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md">Preview Invoice</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilterModal;