import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const GroupedSearchableDropdown = ({ options = [], value, onChange, placeholder }) => {
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

    // Ensure options is always an array
    const safeOptions = Array.isArray(options) ? options : [];

    const filtered = safeOptions.filter(opt =>
        opt?.label?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selected = safeOptions.find(opt => opt.value === value);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition text-left flex items-center justify-between bg-white"
            >
                <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-80">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm">No results</div>
                        ) : (
                            filtered.map((opt, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        if (!opt.isGroup) {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }
                                    }}
                                    disabled={opt.isGroup}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition ${opt.isGroup
                                        ? 'font-bold text-gray-700 bg-gray-100 cursor-default'
                                        : value === opt.value
                                            ? 'bg-orange-50 text-orange-700 font-medium'
                                            : 'hover:bg-gray-50 text-gray-900'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupedSearchableDropdown;