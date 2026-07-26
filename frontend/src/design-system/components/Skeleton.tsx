import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  spacing?: number;
  animate?: boolean;
}

const skeletonBase = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded';

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width = '100%',
      height,
      lines,
      spacing = 8,
      animate = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    if (lines && lines > 1) {
      return (
        <Box
          ref={ref}
          as="div"
          className={cn('flex flex-col gap-2', className)}
          style={style}
          {...props}
        >
          {Array.from({ length: lines }).map((_, i) => (
            <Box
              key={i}
              as="div"
              className={cn(
                skeletonBase,
                animate && 'animate-skeleton',
                i === lines - 1 && 'w-3/4'
              )}
              style={{
                width: i === lines - 1 && typeof width === 'number' ? `${width * 0.75}px` : width,
                height: height || '1rem',
                ...(i > 0 ? { marginTop: spacing } : {}),
              }}
            />
          ))}
        </Box>
      );
    }

    return (
      <Box
        ref={ref}
        as="div"
        className={cn(
          skeletonBase,
          variant === 'circular' && 'rounded-full',
          variant === 'rectangular' && 'rounded-[10px]',
          variant === 'card' && 'rounded-[16px]',
          animate && 'animate-skeleton',
          className
        )}
        style={{
          width,
          height: height || (variant === 'text' ? '1rem' : undefined),
          borderRadius: variant === 'card' ? 'var(--radius-lg)' : undefined,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export const SkeletonCard = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, style, ...props }, ref) => (
    <Box
      ref={ref}
      as="div"
      className={cn('card p-4 lg:p-5 space-y-4', className)}
      style={style}
      {...props}
    >
      <Box as="div" className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <Box as="div" className="flex-1 space-y-2">
          <Skeleton width="40%" height={20} />
          <Skeleton width="60%" height={14} />
        </Box>
      </Box>
      <Skeleton width="100%" height={100} variant="rectangular" />
      <Box as="div" className="flex items-center gap-2">
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
        <Skeleton width={100} height={14} />
      </Box>
    </Box>
  )
);

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonTable = React.forwardRef<HTMLTableElement, { rows?: number; columns?: number; className?: string; style?: React.CSSProperties }>(
  ({ rows = 5, columns = 4, className, style, ...props }, ref) => (
    <Box
      ref={ref}
      as="table"
      className={cn('w-full border-collapse', className)}
      style={style}
      {...props}
    >
      <thead>
        <tr className="border-b border-border-primary">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="text-left p-3 font-medium text-text-secondary">
              <Skeleton width={i === 0 ? 120 : 80} height={16} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border-primary/50">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="p-3">
                <Skeleton
                  width={colIndex === 0 ? 100 : 80}
                  height={16}
                  variant="text"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Box>
  )
);

SkeletonTable.displayName = 'SkeletonTable';