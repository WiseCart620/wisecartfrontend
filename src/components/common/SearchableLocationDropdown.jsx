
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const SearchableLocationDropdown = ({
  locations,
  value,
  onChange,
  placeholder,
  label,
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = locations.filter(loc =>
    loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selected = locations.find(loc => loc.id === parseInt(value));

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between ${(disabled || loading) ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'
          } text-sm`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : (
          <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
            {selected ? selected.name : placeholder}
          </span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 italic'}`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-xs">No results found</div>
            ) : (
              filtered.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    onChange(loc.id.toString());
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition ${value === loc.id.toString() ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                >
                  <div className="text-sm font-medium">{loc.name}</div>
                  {loc.code && <div className="text-xs text-gray-500">{loc.code}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableLocationDropdown;