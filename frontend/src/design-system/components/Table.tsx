import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';
import { SkeletonTable } from './Skeleton';
import { Button } from './Button';
import { Flex } from './Box';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: React.ReactNode, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function DataTable<T>({
  columns,
  data,
  keyAccessor,
  loading = false,
  emptyMessage = 'No records are currently available.',
  emptyIcon,
  onRowClick,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  striped = true,
  hoverable = true,
  bordered = true,
  compact = false,
  className,
  style,
}: DataTableProps<T>) {

  const handleSelectAll = () => {
    if (selectedKeys.size === data.length) {
      onSelectionChange?.(new Set());
    } else {
      onSelectionChange?.(new Set(data.map(keyAccessor)));
    }
  };

  const isAllSelected = data.length > 0 && selectedKeys.size === data.length;
  const isIndeterminate = selectedKeys.size > 0 && selectedKeys.size < data.length;

  const selectAllRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    if (sortColumn === columnKey) {
      onSort(columnKey, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

  if (loading) {
    return (
      <Box as="div" className="overflow-x-auto rounded-[12px] border border-border-primary">
        <SkeletonTable rows={5} columns={columns.length} />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box
        as="div"
        className={cn('card p-6 sm:p-8 md:p-10 lg:p-12 text-center', className)}
        style={style}
      >
        <Box as="div" className="mx-auto w-12 h-12 sm:w-14 md:w-16 rounded-full bg-nj-blue/10 flex items-center justify-center mb-4 text-nj-blue">
          {emptyIcon || (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </Box>
        <p className="text-sm sm:text-base text-text-secondary">{emptyMessage}</p>
      </Box>
    );
  }

  return (
    <Box
      as="div"
      className={cn('overflow-x-auto rounded-[12px] border border-border-primary', className)}
      style={style}
    >
      <table className="w-full border-collapse" role="grid">
        <thead>
          <tr className={cn('border-b border-border-primary', bordered && 'bg-bg-tertiary/50')}>
            {selectable && (
              <th
                className={cn(
                  'p-2 sm:p-3 md:p-4 text-left font-medium text-text-secondary text-xs sm:text-sm',
                  'w-10 sm:w-12 shrink-0',
                  compact && 'py-1.5 sm:py-2'
                )}
                scope="col"
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded border-border-primary text-nj-blue focus:ring-nj-blue focus:ring-1 sm:focus:ring-2"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'p-2 sm:p-3 md:p-4 font-medium text-text-secondary text-xs sm:text-sm',
                  'text-left',
                  column.align && `text-${column.align}`,
                  column.sortable && 'cursor-pointer select-none hover:text-nj-blue transition-colors',
                  compact && 'py-1.5 sm:py-2',
                  column.headerClassName
                )}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                onClick={() => column.sortable && handleSort(column.key)}
                aria-sort={
                  sortColumn === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <Flex as="div" className="items-center gap-1">
                  <span className="truncate">{column.header}</span>
                  {column.sortable && sortColumn === column.key && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className={cn(
                        'transition-transform w-3 h-3',
                        sortDirection === 'asc' && 'rotate-180'
                      )}
                      aria-hidden="true"
                    >
                      <path d="M4.646 7.646a.5.5 0 01.708 0L8 10.293l2.646-2.647a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 010-.708z" />
                    </svg>
                  )}
                </Flex>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rowKey = keyAccessor(row);
            const isSelected = selectedKeys.has(rowKey);

            return (
              <tr
                key={rowKey}
                className={cn(
                  'transition-colors',
                  bordered && 'border-b border-border-primary/50',
                  striped && rowKey && `data-[row-index="${rowKey}"]:bg-bg-tertiary/30`,
                  hoverable && 'hover:bg-hover-bg',
                  onRowClick && 'cursor-pointer',
                  isSelected && 'bg-nj-blue/5',
                  compact && 'data-[row-index]:py-1'
                )}
                onClick={() => onRowClick?.(row)}
                data-row-index={rowKey}
                style={
                  {
                    ...(rowKey && { '--row-index': rowKey }),
                  } as React.CSSProperties
                }
              >
                {selectable && (
                  <td className={cn('p-2 sm:p-3 md:p-4 w-10 sm:w-12 shrink-0', compact && 'py-1.5 sm:py-2')}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newKeys = new Set(selectedKeys);
                        if (e.target.checked) {
                          newKeys.add(rowKey);
                        } else {
                          newKeys.delete(rowKey);
                        }
                        onSelectionChange?.(newKeys);
                      }}
                      className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded border-border-primary text-nj-blue focus:ring-nj-blue focus:ring-1 sm:focus:ring-2"
                      aria-label={`Select row ${rowKey}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'p-2 sm:p-3 md:p-4 text-xs sm:text-sm',
                      column.align && `text-${column.align}`,
                      compact && 'py-1.5 sm:py-2',
                      column.className
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    {column.render
                      ? column.render(column.accessor(row), row)
                      : column.accessor(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {pagination && (
        <Box
          as="div"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 border-t border-border-primary bg-bg-tertiary/30"
        >
          <Box as="div" className="text-xs sm:text-sm text-text-tertiary text-center sm:text-left">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {
              Math.min(pagination.page * pagination.pageSize, pagination.total)
            } of {
              pagination.total
            } results
          </Box>
          <Flex as="div" className="flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Select
              value={pagination.pageSize}
              onValueChange={(v) => pagination.onPageSizeChange(Number(v))}
              className="w-full sm:w-[120px] md:w-[140px] text-xs sm:text-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
            </Select>
            <Flex as="div" className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
                className="w-8 h-8"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Button>
              <span className="text-xs sm:text-sm text-text-secondary min-w-[2.5rem] sm:min-w-[3rem] text-center">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                aria-label="Next page"
                className="w-8 h-8"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

DataTable.displayName = 'DataTable';

export { DataTable };

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('input w-auto appearance-none pr-8 bg-no-repeat bg-right', 'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E")]', className)}
      onChange={(e) => {
        const value = e.target.value;
        onValueChange?.(value);
        onChange?.(e);
      }}
      {...props}
    />
  )
);
Select.displayName = 'Select';

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ children, ...props }, ref) => (
    <option ref={ref} {...props}>{children}</option>
  )
);
SelectItem.displayName = 'SelectItem';