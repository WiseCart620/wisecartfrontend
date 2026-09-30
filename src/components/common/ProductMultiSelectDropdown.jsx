import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const ProductMultiSelectDropdown = ({
    options,
    selectedIds = [],
    onChange,
    placeholder = 'All Products',
    searchPlaceholder = 'Search by name, SKU, or UPC...',
    disabled = false,
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

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const searchLower = search.toLowerCase();
    const filtered = options.filter(o =>
        !search ||
        o.name?.toLowerCase().includes(searchLower) ||
        o.fullName?.toLowerCase().includes(searchLower) ||
        o.sku?.toLowerCase().includes(searchLower) ||
        o.upc?.toLowerCase().includes(searchLower) ||
        o.subLabel?.toLowerCase().includes(searchLower)
    );

    const sortedFiltered = [...filtered].sort((a, b) => {
        const aSelected = selectedIds.includes(a.id);
        const bSelected = selectedIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
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

    const hasVariation = (o) => o?.subLabel && o.subLabel !== 'No variations';

    const label = selectedIds.length === 0
        ? placeholder
        : selectedIds.length === 1
            ? (() => {
                const o = options.find(x => x.id === selectedIds[0]);
                if (!o) return '1 selected';
                return hasVariation(o) ? `${o.name} — ${o.subLabel}` : o.name;
            })()
            : `${selectedIds.length} selected`;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`w-full min-h-[36px] flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white'}`}
            >
                <span className={`flex-1 min-w-0 whitespace-normal break-words ${disabled ? 'text-gray-400' : selectedIds.length ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!disabled && selectedIds.length > 0 && (
                        <X
                            size={14}
                            className="text-gray-400 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                        />
                    )}
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
            </button>

            {open && !disabled && (
                <div className="absolute z-50 mt-1 min-w-full w-max max-w-[90vw] sm:max-w-[600px] bg-white border border-gray-200 rounded-lg shadow-xl p-2">
                    <div className="relative mb-2">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {filtered.length > 0 && (
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium mb-1 px-1"
                        >
                            {allSelected ? 'Clear all' : 'Select all'}
                        </button>
                    )}

                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                        {sortedFiltered.length === 0 ? (
                            <div className="px-2 py-4 text-xs text-gray-400 italic text-center">No products found</div>
                        ) : (
                            sortedFiltered.map(o => (
                                <label key={o.id} className="flex items-start gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(o.id)}
                                        onChange={() => toggle(o.id)}
                                        className="w-4 h-4 mt-0.5 flex-shrink-0 accent-orange-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-gray-800 whitespace-normal break-words">
                                            {o.name}
                                            {hasVariation(o) && (
                                                <span className="text-orange-600"> ({o.subLabel})</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 whitespace-normal break-all">
                                            SKU: {o.sku || 'N/A'} · UPC: {o.upc || 'N/A'}
                                        </div>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductMultiSelectDropdown;