import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export const Pagination = ({ page = 1, limit = 20, total = 0, onPageChange, className = '' }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  if (total <= limit) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 rounded-b-xl ${className}`}>
      <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
        Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
        <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
        <span className="font-semibold text-slate-900">{total}</span> items
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500 font-medium px-2 font-mono whitespace-nowrap">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          icon={ChevronRight}
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

