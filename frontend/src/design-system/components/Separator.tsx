import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../utils/cn';

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  label?: React.ReactNode;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      orientation = 'horizontal',
      decorative = true,
      label,
      className,
      style,
      ...props
    },
    ref
  ) => {
    if (label && orientation === 'horizontal') {
      return (
        <div
          className={cn('flex items-center gap-3', className)}
          style={style}
        >
          <SeparatorPrimitive.Root
            decorative
            orientation="horizontal"
            className="h-px flex-1 bg-border-primary"
          />
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {label}
          </span>
          <SeparatorPrimitive.Root
            decorative
            orientation="horizontal"
            className="h-px flex-1 bg-border-primary"
          />
        </div>
      );
    }

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'shrink-0 bg-border-primary',
          orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';
