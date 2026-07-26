import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '../utils/cn';

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ orientation = 'vertical', className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn(
      'flex gap-3',
      orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}
    {...props}
  />
));

RadioGroup.displayName = 'RadioGroup';

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
}

const sizeStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const dotSizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ size = 'md', label, description, className, id, value, ...props }, ref) => {
  const generatedId = React.useId();
  const itemId = id || generatedId;

  const control = (
    <RadioGroupPrimitive.Item
      ref={ref}
      id={itemId}
      value={value}
      className={cn(
        'aspect-square shrink-0 rounded-full border border-border-primary bg-bg-card',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nj-blue/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-nj-blue',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex h-full w-full items-center justify-center">
        <span className={cn('rounded-full bg-nj-blue', dotSizes[size])} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );

  if (!label && !description) return control;

  return (
    <div className="flex items-start gap-2.5">
      {control}
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={itemId}
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

RadioGroupItem.displayName = 'RadioGroupItem';
