import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'critical';
  indeterminate?: boolean;
  showLabel?: boolean;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantStyles = {
  default: 'bg-[var(--accent-cyan)]',
  success: 'bg-[var(--alert-green)]',
  warning: 'bg-[var(--alert-amber)]',
  critical: 'bg-[var(--alert-red)]',
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value = 0,
      max = 100,
      size = 'md',
      variant = 'default',
      indeterminate = false,
      showLabel = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div className="w-full">
        <ProgressPrimitive.Root
          ref={ref}
          value={indeterminate ? undefined : value}
          max={max}
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-bg-tertiary',
            sizeStyles[size],
            className
          )}
          style={style}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant],
              indeterminate && 'animate-progress-indeterminate w-1/3'
            )}
            style={indeterminate ? undefined : { width: `${pct}%` }}
          />
        </ProgressPrimitive.Root>
        {showLabel && !indeterminate && (
          <div className="mt-1 text-xs text-text-secondary tabular-nums">
            {Math.round(pct)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';
