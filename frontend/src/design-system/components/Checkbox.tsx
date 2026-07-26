import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../utils/cn';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
}

const sizeStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ size = 'md', label, description, className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  const control = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={checkboxId}
      className={cn(
        'peer shrink-0 rounded-[4px] border border-border-primary bg-bg-card',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nj-blue/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-nj-blue data-[state=checked]:border-nj-blue',
        'data-[state=indeterminate]:bg-nj-blue data-[state=indeterminate]:border-nj-blue',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        {props.checked === 'indeterminate' ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label && !description) return control;

  return (
    <div className="flex items-start gap-2.5">
      {control}
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-text-primary cursor-pointer leading-tight"
          >
            {label}
          </label>
        )}
        {description && (
          <span className="text-xs text-text-secondary">{description}</span>
        )}
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
