import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../utils/cn';

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'dir'> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'line' | 'enclosed' | 'soft' | 'pills';
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      defaultValue,
      value,
      onValueChange,
      orientation = 'horizontal',
      variant = 'line',
      className,
      style,
      children,
      ...props
    },
    ref
  ) => (
    <TabsPrimitive.Root
      ref={ref}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn('', className)}
      style={style}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  )
);

Tabs.displayName = 'Tabs';

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'enclosed' | 'soft' | 'pills';
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ variant = 'line', className, style, children, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 p-1',
        variant === 'line' && 'bg-transparent',
        variant === 'enclosed' && 'bg-bg-tertiary rounded-[12px]',
        variant === 'soft' && 'bg-transparent',
        variant === 'pills' && 'bg-transparent',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  disabled?: boolean;
  [key: string]: any;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled = false, className, style, children, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      disabled={disabled}
      className={cn(
        'tabs-trigger flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium',
        'rounded-[10px] transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-nj-blue/40 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'data-[state=active]:bg-bg-card data-[state=active]:shadow-card data-[state=active]:text-nj-blue',
        'data-[state=inactive]:text-text-secondary data-[state=inactive]:hover:bg-hover-bg data-[state=inactive]:hover:text-text-primary',
        'motion-reduce:transition-none',
        style
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'dir'> {
  value: string;
  forceMount?: boolean;
  [key: string]: any;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, forceMount, className, style, children, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      forceMount={forceMount ? true : undefined}
      className={cn(
        'tabs-content mt-4 animate-fade-in-up',
        'data-[state=active]:animate-fade-in-up',
        'data-[state=inactive]:animate-fade-out-down',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  )
);

TabsContent.displayName = 'TabsContent';