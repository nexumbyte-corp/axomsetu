import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export const Pagination = ({
  page,
  currentPage,
  limit,
  itemsPerPage,
  total,
  totalItems,
  totalPages: totalPagesProp,
  onPageChange,
  className = '',
}) => {
  const activePage = page ?? currentPage ?? 1;
  const activeLimit = limit ?? itemsPerPage ?? 20;
  const activeTotal = total ?? totalItems ?? 0;
  const computedTotalPages = Math.ceil(activeTotal / activeLimit) || totalPagesProp || 1;

  if (activeTotal <= activeLimit && computedTotalPages <= 1) return null;

  const startItem = activeTotal > 0 ? (activePage - 1) * activeLimit + 1 : 0;
  const endItem = Math.min(activePage * activeLimit, activeTotal);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 rounded-b-xl ${className}`}>
      <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{activeTotal}</span> items
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={activePage <= 1}
          onClick={() => onPageChange && onPageChange(activePage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500 font-medium px-2 font-mono whitespace-nowrap">
          Page {activePage} / {computedTotalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={activePage >= computedTotalPages}
          onClick={() => onPageChange && onPageChange(activePage + 1)}
          icon={ChevronRight}
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

