import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../utils/cn';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
}

const rootSizes = {
  sm: 'h-4 w-7',
  md: 'h-5 w-9',
  lg: 'h-6 w-11',
};

const thumbSizes = {
  sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
  md: 'h-4 w-4 data-[state=checked]:translate-x-4',
  lg: 'h-5 w-5 data-[state=checked]:translate-x-5',
};

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ size = 'md', label, description, className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const control = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,212,255,0.4)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[rgba(0,212,255,0.15)] data-[state=unchecked]:bg-bg-tertiary',
        rootSizes[size],
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block rounded-full shadow-sm ring-0',
          'transition-transform duration-200 data-[state=unchecked]:translate-x-0',
          thumbSizes[size]
        )}
        style={{ background: 'var(--text-primary)' }}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) return control;

  return (
    <div className="flex items-start gap-3">
      {control}
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={switchId}
            className="text-sm font-medium text-text-primary cursor-pointer"
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

Switch.displayName = 'Switch';
