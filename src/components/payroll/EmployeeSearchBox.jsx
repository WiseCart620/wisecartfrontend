import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { inputCls } from './Shared';

const EmployeeSearchBox = ({ names, search, selected, onSearch, onSelect, className = 'w-full max-w-sm' }) => {
  const [open, setOpen] = useState(false);
  const q = search.trim().toLowerCase();
  const options = names.filter(n => (n || '').toLowerCase().includes(q));

  const clear = () => { onSelect(''); onSearch(''); };
  const pick = (name) => { onSelect(name); onSearch(name); setOpen(false); };

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className={inputCls + ' !pl-9 !pr-9'}
        placeholder="Search employee..."
        value={search}
        onChange={(e) => { onSearch(e.target.value); onSelect(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {(search || selected) && (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
          <X size={16} />
        </button>
      )}
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded shadow-lg text-sm">
          <li onMouseDown={(e) => { e.preventDefault(); clear(); setOpen(false); }}
            className="px-3 py-2 cursor-pointer hover:bg-white text-gray-500">
            All employees
          </li>
          {options.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">No match</li>
          ) : options.map(n => (
            <li key={n}
              onMouseDown={(e) => { e.preventDefault(); pick(n); }}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 ${selected === n ? 'bg-orange-50 font-medium' : ''}`}>
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EmployeeSearchBox;