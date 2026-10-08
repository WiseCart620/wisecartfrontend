import React, { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';

const CategoryInput = ({ 
  value, 
  onChange, 
  categories = [], 
  existingCategories = [],
  placeholder = "Search or enter category",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allCategories = [...new Set([...categories, ...existingCategories])].sort();

  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCategory = (category) => {
    setInputValue(category);
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm(inputValue);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={isOpen ? searchTerm : inputValue}
        onChange={handleSearchChange}
        onFocus={handleInputFocus}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'
        }`}
        placeholder={placeholder}
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No matching categories</p>
              {searchTerm && (
                <p className="text-xs text-orange-600 mt-2">
                  Press Enter or click outside to use "{searchTerm}"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto max-h-48">
              {filteredCategories.map((category, index) => {
                const isPredefined = categories.includes(category);
                const isExisting = existingCategories.includes(category);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-orange-50 transition text-sm flex items-center justify-between ${
                      value === category ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-900'
                    }`}
                  >
                    <span>{category}</span>
                    {!isPredefined && isExisting && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        used in products
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {inputValue && !allCategories.includes(inputValue) && !isOpen && !disabled && (
        <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
          <Check size={12} />
          New category: "{inputValue}"
        </p>
      )}
    </div>
  );
};

export default CategoryInput;