import { IconChevronLeft, IconChevronRight } from '../Icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
}

const pageOptions = [10, 25, 50, 100];

export default function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  onSizeChange,
}: PaginationProps) {
  if (totalElements === 0) return null;

  const start = page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{' '}
        <span className="font-medium text-slate-700">{totalElements}</span>
      </p>

      <div className="flex items-center gap-3">
        {onSizeChange && (
          <select
            className="select !w-auto !py-1.5 text-xs"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-secondary !px-2 !py-1.5"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            aria-label="Previous page"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600 px-2 tabular-nums">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="btn-secondary !px-2 !py-1.5"
            onClick={() => onPageChange(page + 1)}
            disabled={page + 1 >= totalPages}
            aria-label="Next page"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}