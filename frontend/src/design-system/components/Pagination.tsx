import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  size?: 'sm' | 'md';
}

const DOTS = '...';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function usePaginationRange(
  page: number,
  totalPages: number,
  siblingCount: number
): (number | string)[] {
  return React.useMemo(() => {
    const totalPageNumbers = siblingCount * 2 + 5;
    if (totalPageNumbers >= totalPages) return range(1, totalPages);

    const leftSibling = Math.max(page - siblingCount, 1);
    const rightSibling = Math.min(page + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftRange = range(1, 3 + 2 * siblingCount);
      return [...leftRange, DOTS, totalPages];
    }
    if (showLeftDots && !showRightDots) {
      const rightRange = range(totalPages - (2 + 2 * siblingCount), totalPages);
      return [1, DOTS, ...rightRange];
    }
    return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, totalPages];
  }, [page, totalPages, siblingCount]);
}

const NavButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size: 'sm' | 'md' }
> = ({ size, className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center justify-center rounded-[8px] border border-border-primary bg-bg-card',
      'text-text-secondary transition-colors',
      'hover:bg-hover-bg hover:text-text-primary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nj-blue/40',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-card',
      size === 'sm' ? 'h-8 min-w-8 px-2 text-xs' : 'h-9 min-w-9 px-2.5 text-sm',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  (
    {
      page,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    const paginationRange = usePaginationRange(page, totalPages, siblingCount);

    if (totalPages <= 1) return null;

    return (
      <nav
        ref={ref}
        aria-label={t('common.pagination')}
        className={cn('flex items-center gap-1', className)}
        {...props}
      >
        {showFirstLast && (
          <NavButton
            size={size}
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label={t('common.firstPage')}
          >
            «
          </NavButton>
        )}
        <NavButton
          size={size}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label={t('common.previousPage')}
        >
          ‹
        </NavButton>

        {paginationRange.map((item, index) => {
          if (item === DOTS) {
            return (
              <span
                key={`dots-${index}`}
                className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-text-tertiary"
              >
                {DOTS}
              </span>
            );
          }
          const pageNum = item as number;
          const isActive = pageNum === page;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center justify-center rounded-[8px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nj-blue/40',
                size === 'sm' ? 'h-8 min-w-8 px-2 text-xs' : 'h-9 min-w-9 px-2.5 text-sm',
                isActive
                  ? 'bg-nj-blue text-white'
                  : 'border border-border-primary bg-bg-card text-text-secondary hover:bg-hover-bg hover:text-text-primary'
              )}
            >
              {pageNum}
            </button>
          );
        })}

        <NavButton
          size={size}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label={t('common.nextPage')}
        >
          ›
        </NavButton>
        {showFirstLast && (
          <NavButton
            size={size}
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label={t('common.lastPage')}
          >
            »
          </NavButton>
        )}
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';
