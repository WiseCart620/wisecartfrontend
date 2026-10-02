import { useState, useEffect } from 'react';

export const PAGE_SIZE = 10;

const usePagination = (items, resetKey = '') => {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // back to page 1 whenever the filters change
  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  const paginationProps = {
    currentPage: page,
    totalPages,
    onPageChange: setPage,
    onNextPage: () => setPage(p => Math.min(totalPages, p + 1)),
    onPrevPage: () => setPage(p => Math.max(1, p - 1)),
    showingStart: totalItems === 0 ? 0 : start + 1,
    showingEnd: Math.min(start + PAGE_SIZE, totalItems),
    totalItems,
  };

  return { pageItems, paginationProps, totalItems };
};

export default usePagination;