import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SecondaryButton from './SecondaryButton';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-[#E5E7EB] flex items-center justify-between gap-4 text-xs text-[#64748B] ${className}`}
    >
      <div>
        Showing <span className="font-medium text-[#172B24]">{startItem}</span> to{' '}
        <span className="font-medium text-[#172B24]">{endItem}</span> of{' '}
        <span className="font-medium text-[#172B24]">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-2">
        <SecondaryButton
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={ChevronLeft}
        >
          Previous
        </SecondaryButton>

        <span className="px-2 font-medium text-[#172B24]">
          Page {currentPage} of {totalPages || 1}
        </span>

        <SecondaryButton
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex-row-reverse"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </SecondaryButton>
      </div>
    </div>
  );
};

export default Pagination;
