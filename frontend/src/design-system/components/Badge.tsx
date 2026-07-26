import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'live' | 'active' | 'critical' | 'high' | 'medium' | 'low' | 'draft' | 'resolved' | 'info' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variants = {
  live: 'badge-live',
  active: 'badge-active',
  critical: 'badge-critical',
  high: 'bg-alert-amber/10 text-alert-amber border-alert-amber/20',
  medium: 'bg-nj-info/10 text-nj-info border-nj-info/20',
  low: 'badge-success',
  draft: 'badge-draft',
  resolved: 'badge-resolved',
  info: 'bg-nj-info/10 text-nj-info border-nj-info/20',
  warning: 'bg-alert-amber/10 text-alert-amber border-alert-amber/20',
  success: 'bg-nj-success/10 text-nj-success border-nj-success/20',
};

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
  md: 'text-[11px] px-2 py-0.5 gap-1',
  lg: 'text-xs px-2.5 py-1 gap-1.5',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'draft',
      size = 'md',
      dot = false,
      removable = false,
      onRemove,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => (
    <Box
      as="span"
      ref={ref}
      className={cn(
        'badge inline-flex items-center',
        'uppercase tracking-wider font-semibold rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      style={style}
      {...props}
    >
      {dot && (
        <Box
          as="span"
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'live' && 'bg-nj-success animate-pulse',
            variant === 'active' && 'bg-nj-info',
            variant === 'critical' && 'bg-nj-critical',
            variant === 'high' && 'bg-alert-amber',
            variant === 'medium' && 'bg-nj-info',
            variant === 'low' && 'bg-nj-success',
            variant === 'draft' && 'bg-text-tertiary',
            variant === 'resolved' && 'bg-nj-success',
          )}
        />
      )}
      <span className="truncate">{children}</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-[rgba(255,255,255,0.1)]',
            'transition-colors focus:outline-none focus:ring-1 focus:ring-black/10'
          )}
          aria-label={`Remove ${children}`}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      )}
    </Box>
  )
);

Badge.displayName = 'Badge';

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'active' | 'warning' | 'critical' | 'inactive' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
}

const statusDotStyles = {
  active: 'bg-[var(--alert-green)]',
  warning: 'bg-[var(--alert-amber)]',
  critical: 'bg-[var(--alert-red)]',
  inactive: 'bg-text-tertiary',
  pending: 'bg-nj-info',
};

const statusDotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  (
    {
      status = 'inactive',
      size = 'md',
      pulse = false,
      label,
      className,
      style,
      ...props
    },
    ref
  ) => (
    <Box
      as="span"
      ref={ref}
      className={cn(
        'status-dot inline-flex rounded-full shrink-0',
        statusDotStyles[status],
        statusDotSizes[size],
        className
      )}
      style={style}
      {...props}
    >
      {pulse && status === 'active' && (
        <Box
          as="span"
          className="absolute inset-0 rounded-full bg-[var(--alert-green)] animate-ping opacity-75"
          aria-hidden="true"
        />
      )}
      {label && <span className="sr-only">{label}</span>}
    </Box>
  )
);

StatusDot.displayName = 'StatusDot';