import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const MultiSelectDropdown = ({
  options,
  selectedIds = [],
  onChange,
  placeholder = 'All',
  searchPlaceholder = 'Search...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.name?.toLowerCase().includes(s) || o.code?.toLowerCase().includes(s);
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const aSelected = selectedIds.includes(a.id);
    const bSelected = selectedIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    if (aSelected && bSelected) {
      return selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id);
    }
    return 0;
  });

  const allSelected = filtered.length > 0 && filtered.every(o => selectedIds.includes(o.id));

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const toggleAll = () => {
    const ids = filtered.map(o => o.id);
    if (allSelected) onChange(selectedIds.filter(id => !ids.includes(id)));
    else onChange([...new Set([...selectedIds, ...ids])]);
  };

  const label = selectedIds.length === 0
    ? placeholder
    : selectedIds.length === 1
      ? options.find(o => o.id === selectedIds[0])?.name || '1 selected'
      : `${selectedIds.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={`truncate ${selectedIds.length ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedIds.length > 0 && (
            <X
              size={14}
              className="text-gray-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          )}
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          {options.length > 4 && (
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-1 px-1"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {sortedFiltered.length === 0 ? (
              <div className="px-2 py-4 text-xs text-gray-400 italic text-center">No options</div>
            ) : (
              sortedFiltered.map(o => (
                <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 truncate">
                    {o.name}
                    {o.code && <span className="text-gray-400"> ({o.code})</span>}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;