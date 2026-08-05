import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const SearchableBranchDropdown = ({ branches, value, onChange, placeholder, loading = false }) => {
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

  const filteredBranches = branches.filter(branch =>
    branch.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branchCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBranch = branches.find(b => b.branchName === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition text-left flex items-center justify-between ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-gray-400">
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : (
          <span className={selectedBranch ? 'text-gray-900' : 'text-gray-500'}>
            {selectedBranch ? selectedBranch.branchName : placeholder}
          </span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-44">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                }`}
            >
              All Branches
            </button>
            {filteredBranches.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">No branches found</div>
            ) : (
              filteredBranches.map(branch => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    onChange(branch.branchName);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${value === branch.branchName ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                >
                  <div className="font-medium">{branch.branchName}</div>
                  <div className="text-xs text-gray-500">{branch.branchCode}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableBranchDropdown;