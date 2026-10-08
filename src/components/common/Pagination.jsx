// src/components/common/Pagination.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  onNextPage,
  onPrevPage,
  showingStart,
  showingEnd,
  totalItems
}) => {
  const [inputValue, setInputValue] = useState(String(currentPage));

  // Keep input in sync if parent changes the page externally
  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const commitPage = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      // Reset to current page if invalid
      setInputValue(String(currentPage));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitPage();
    if (e.key === 'Escape') setInputValue(String(currentPage));
  };

  // Show a window of page buttons around the current page
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages]);
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      pages.add(i);
    }
    return [...pages].sort((a, b) => a - b);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
      {/* Showing X to Y — with editable page number */}
      <div className="text-sm text-gray-700 flex items-center gap-1">
        Showing{' '}
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={commitPage}
          onKeyDown={handleKeyDown}
          className="w-12 text-center text-sm font-semibold border border-orange-400 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          title="Type a page number and press Enter"
        />
        {' '}to {showingEnd} of {totalItems} results
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className={`p-2 rounded border ${
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed border-gray-200'
              : 'text-gray-700 hover:bg-white border-gray-300'
          }`}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((number, idx) => {
            const prevNumber = pageNumbers[idx - 1];
            const showEllipsis = prevNumber !== undefined && number - prevNumber > 1;
            return (
              <React.Fragment key={number}>
                {showEllipsis && (
                  <span className="px-1 text-gray-400 text-sm select-none">…</span>
                )}
                <button
                  onClick={() => onPageChange(number)}
                  className={`min-w-[40px] px-3 py-2 text-sm rounded border ${
                    currentPage === number
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'text-gray-700 hover:bg-white border-gray-300'
                  }`}
                >
                  {number}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className={`p-2 rounded border ${
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed border-gray-200'
              : 'text-gray-700 hover:bg-white border-gray-300'
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;