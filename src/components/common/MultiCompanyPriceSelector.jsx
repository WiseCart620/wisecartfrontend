import React, { useState } from 'react';

const MultiCompanyPriceSelector = ({
  companies,
  selectedPrices,
  onChange,
  assignToRemaining,
  remainingPrice
}) => {
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const handleCompanySelect = (companyId) => {
    const newPrices = { ...selectedPrices };
    if (newPrices[companyId] !== undefined) {
      delete newPrices[companyId];
    } else {
      newPrices[companyId] = { price: '', companySku: '' };
    }
    onChange(newPrices, assignToRemaining, remainingPrice);
  };

  const handleFieldChange = (companyId, field, value) => {
    const newPrices = {
      ...selectedPrices,
      [companyId]: { ...(selectedPrices[companyId] || {}), [field]: value }
    };
    onChange(newPrices, assignToRemaining, remainingPrice);
  };

  const handleSelectAll = () => {
    const allSelected = companies.every(c => selectedPrices[c.id] !== undefined);
    if (allSelected) {
      onChange({}, assignToRemaining, remainingPrice);
    } else {
      const newPrices = {};
      companies.forEach(c => {
        newPrices[c.id] = selectedPrices[c.id] || { price: '', companySku: '' };
      });
      onChange(newPrices, assignToRemaining, remainingPrice);
    }
  };

  const handleRemainingToggle = (checked) => {
    onChange(selectedPrices, checked, remainingPrice);
  };

  const handleRemainingPriceChange = (price) => {
    onChange(selectedPrices, assignToRemaining, price);
  };

  const selectedCount = Object.keys(selectedPrices).length;
  const allSelected = selectedCount === companies.length;
  const unassignedCount = companies.length - selectedCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Company Prices</h4>
          <p className="text-xs text-gray-500 mt-1">
            {selectedCount === 0
              ? 'No companies selected'
              : `${selectedCount} company${selectedCount > 1 ? 's' : ''} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={() => setShowAllCompanies(!showAllCompanies)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            {showAllCompanies ? 'Show Less' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Company Selection */}
      <div className={`space-y-2 ${!showAllCompanies ? 'max-h-60 overflow-y-auto' : ''}`}>
        {companies.map((company) => {
          const isSelected = selectedPrices[company.id] !== undefined;
          const val = selectedPrices[company.id] || {};
          return (
            <div
              key={company.id}
              className={`p-3 border rounded-lg transition ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCompanySelect(company.id)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label
                    onClick={() => handleCompanySelect(company.id)}
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {company.companyName}
                  </label>
                  {isSelected && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">₱</span>
                        <input
                          type="number"
                          value={val.price || ''}
                          onChange={(e) => handleFieldChange(company.id, 'price', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <input
                        type="text"
                        value={val.companySku || ''}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/\D/g, '').slice(0, 13);
                          handleFieldChange(company.id, 'companySku', numeric);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Company SKU (13 digits)"
                        maxLength={13}
                        className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {val.companySku && val.companySku.length !== 13 && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {val.companySku.length}/13 digits
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign to Remaining Companies */}
      {unassignedCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="assign-remaining"
              checked={assignToRemaining}
              onChange={(e) => handleRemainingToggle(e.target.checked)}
              className="mt-1 h-4 w-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex-1">
              <label
                htmlFor="assign-remaining"
                className="text-sm font-medium text-amber-900 cursor-pointer"
              >
                Set default price for {unassignedCount} unassigned company{unassignedCount > 1 ? 's' : ''}
              </label>
              <p className="text-xs text-amber-700 mt-1">
                All companies without specific prices will receive this default price
              </p>
              {assignToRemaining && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-amber-700">Default Price (₱):</span>
                  <input
                    type="number"
                    value={remainingPrice}
                    onChange={(e) => handleRemainingPriceChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-32 px-3 py-1.5 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(selectedCount > 0 || (assignToRemaining && remainingPrice)) && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 space-y-1">
            {selectedCount > 0 && (
              <div>✓ {selectedCount} company{selectedCount > 1 ? 's' : ''} with specific prices</div>
            )}
            {assignToRemaining && remainingPrice && (
              <div>✓ {unassignedCount} company{unassignedCount > 1 ? 's' : ''} with default price of ₱{remainingPrice}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiCompanyPriceSelector;