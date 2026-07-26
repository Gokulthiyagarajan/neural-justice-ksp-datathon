import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../utils/cn';
import { Check, ChevronRight } from 'lucide-react';

interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger?: React.ReactNode;
}

export const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ children, trigger, className, style, ...props }, ref) => (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Portal>
        {trigger && (
          <DropdownMenuPrimitive.Trigger asChild>
            {trigger}
          </DropdownMenuPrimitive.Trigger>
        )}
        <DropdownMenuPrimitive.Content
          ref={ref}
          className={cn(
            'dropdown-menu z-50 min-w-[180px] bg-bg-card border border-border-primary rounded-[12px] shadow-lg p-1.5',
            'data-[state=open]:animate-fade-in-scale',
            'data-[state=closed]:animate-fade-out-scale',
            'origin-top-right',
            className
          )}
          style={style}
          {...props}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
);

DropdownMenu.displayName = 'DropdownMenu';

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  shortcut?: string;
  disabled?: boolean;
  [key: string]: any;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ inset, shortcut, disabled, className, style, children, onClick, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      disabled={disabled}
      onClick={(e) => { if (!disabled) onClick?.(e); }}
      className={cn(
        'dropdown-menu-item w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary',
        'rounded-[8px] transition-colors',
        'hover:bg-hover-bg focus:bg-hover-bg focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        inset && 'pl-8',
        className
      )}
      style={style}
      {...props}
    >
      {children}
      {shortcut && (
        <span className="ml-auto text-xs text-text-tertiary font-mono">{shortcut}</span>
      )}
    </DropdownMenuPrimitive.Item>
  )
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

interface DropdownMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  [key: string]: any;
}

export const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ checked, className, style, children, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      checked={checked}
      className={cn(
        'dropdown-menu-item w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary',
        'rounded-[8px] transition-colors',
        'hover:bg-hover-bg focus:bg-hover-bg focus:outline-none',
        className
      )}
      style={style}
      {...props}
    >
      <DropdownMenuPrimitive.ItemIndicator className="flex items-center justify-center text-nj-blue">
        <Check className="w-4 h-4" aria-hidden="true" />
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
);

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

interface DropdownMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const DropdownMenuRadioGroup = React.forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
  ({ value, onValueChange, children, className, style, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioGroup
      ref={ref}
      className={className}
      style={style}
      value={value}
      onValueChange={onValueChange}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.RadioGroup>
  )
);

DropdownMenuRadioGroup.displayName = 'DropdownMenuRadioGroup';

interface DropdownMenuRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  [key: string]: any;
}

export const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ value, className, style, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      value={value}
      className={cn(
        'dropdown-menu-item w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary',
        'rounded-[8px] transition-colors',
        'hover:bg-hover-bg focus:bg-hover-bg focus:outline-none',
        className
      )}
      style={style}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="flex items-center justify-center text-nj-blue">
        <Check className="w-4 h-4" aria-hidden="true" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  )
);

DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('h-px bg-border-primary my-1.5', className)}
      style={style}
      {...props}
    />
  )
);

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ inset, className, style, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider', inset && 'pl-8', className)}
      style={style}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  )
);

DropdownMenuLabel.displayName = 'DropdownMenuLabel';

interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  children: React.ReactNode;
}

export const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ inset, children, className, style, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'dropdown-menu-item w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-text-primary',
        'rounded-[8px] transition-colors',
        'hover:bg-hover-bg focus:bg-hover-bg focus:outline-none',
        inset && 'pl-8',
        className
      )}
      style={style}
      {...props}
    >
      {children}
      <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  )
);

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

interface DropdownMenuSubContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, style, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'dropdown-menu z-50 min-w-[180px] bg-bg-card border border-border-primary rounded-[12px] shadow-lg p-1.5',
        'data-[state=open]:animate-fade-in-scale',
        'data-[state=closed]:animate-fade-out-scale',
        'origin-left-top',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.SubContent>
  )
);

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';
