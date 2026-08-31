import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import styles from './Pagination.module.css';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (limit: number) => void;
  className?: string;
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/**
 * Shared, responsive pagination control used across admin tables and lists.
 * Renders prev/next, first/last, page numbers, and an optional page-size
 * selector. All interaction is driven by the parent's onPageChange/onPageSizeChange.
 */
const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  className,
}) => {
  const { page, limit, total, pages, hasNext, hasPrevious } = meta;

  // Nothing to paginate when there is a single page (or no data)
  if (pages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < pages;

  // Build a compact window of page numbers (max 5)
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pageNumbers: number[] = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  // "Showing X–Y of Z" range label
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={`${styles.pagination} ${className || ''}`}>
      <div className={styles.info}>
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong>
      </div>

      <div className={styles.controls}>
        {onPageSizeChange && (
          <select
            className={styles.pageSize}
            value={limit}
            aria-label="Rows per page"
            onChange={e => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        )}

        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label="First page"
          aria-disabled={!canPrev}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious && !canPrev}
          aria-label="Previous page"
          aria-disabled={!canPrev}
        >
          <ChevronLeft size={16} />
        </button>

        {start > 1 && (
          <>
            <button className={styles.pageBtn} onClick={() => onPageChange(1)}>1</button>
            {start > 2 && <span className={styles.ellipsis}>…</span>}
          </>
        )}

        {pageNumbers.map(num => (
          <button
            key={num}
            className={`${styles.pageBtn} ${num === page ? styles.pageBtnActive : ''}`}
            onClick={() => onPageChange(num)}
            aria-current={num === page ? 'page' : undefined}
          >
            {num}
          </button>
        ))}

        {end < pages && (
          <>
            {end < pages - 1 && <span className={styles.ellipsis}>…</span>}
            <button className={styles.pageBtn} onClick={() => onPageChange(pages)}>{pages}</button>
          </>
        )}

        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext && !canNext}
          aria-label="Next page"
          aria-disabled={!canNext}
        >
          <ChevronRight size={16} />
        </button>
        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(pages)}
          disabled={!canNext}
          aria-label="Last page"
          aria-disabled={!canNext}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
