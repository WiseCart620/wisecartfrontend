import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchableSelect = ({ value, onChange, options, placeholder, disabled, loading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    return (
      option.label?.toLowerCase().includes(searchLower) ||
      option.name?.toLowerCase().includes(searchLower) ||
      option.fullName?.toLowerCase().includes(searchLower) ||
      option.subLabel?.toLowerCase().includes(searchLower) ||
      option.upc?.toLowerCase().includes(searchLower) ||
      option.sku?.toLowerCase().includes(searchLower)
    );
  });

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
          }`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400 truncate">
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Loading...
          </span>
        ) : (
          <span className="truncate">
            {selectedOption
              ? `${selectedOption.upc || 'N/A'} - ${selectedOption.fullName || selectedOption.label} - ${selectedOption.sku || 'N/A'}`
              : placeholder}
          </span>
        )}
        <Search size={16} className="text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {isOpen && !loading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, UPC, SKU, or variation..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {option.upc || 'N/A'} - {option.name || option.label} - {option.sku || 'N/A'}
                      </div>
                      {option.subLabel && option.subLabel !== 'No variations' && (
                        <div className="text-xs text-gray-600 mt-0.5">Variation: {option.subLabel}</div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No results found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchableSelect;