import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  compound?: 'label-badge' | 'icon-label-badge';
  badge?: string | number;
  badgeVariant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
}

const baseStyles = 'btn inline-flex items-center justify-center gap-2 font-medium rounded-[12px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none';

const variantStyles = {
  primary: 'btn-md text-text-inverse bg-nj-info hover:bg-nj-info/80 focus:ring-nj-info/40 shadow-sm',
  secondary: 'btn-md text-accent-cyan bg-transparent border border-accent-cyan/20 hover:bg-accent-cyan/10 focus:ring-accent-cyan/20',
  outline: 'btn-md text-text-secondary bg-transparent border border-border-primary hover:bg-hover-bg hover:border-border-primary focus:ring-focus-ring',
  ghost: 'btn-md text-text-secondary bg-transparent hover:bg-hover-bg focus:ring-focus-ring',
  danger: 'btn-md text-text-inverse bg-nj-critical hover:bg-nj-critical/80 focus:ring-nj-critical/40 shadow-sm',
  success: 'btn-md text-text-inverse bg-nj-success hover:bg-nj-success/80 focus:ring-nj-success/40 shadow-sm',
};

const sizeStyles = {
  sm: 'btn-sm px-3 py-1.5 text-xs gap-1.5',
  md: 'btn-md px-4 py-2 text-sm',
  lg: 'btn-lg px-6 py-3 text-base',
  icon: 'btn-md w-9 h-9 p-0 justify-center',
};

const loadingStyles = 'relative !text-transparent';

const fullWidthStyles = 'w-full';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      compound,
      badge,
      badgeVariant = 'default',
      className,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const badgeStyles = {
      default: 'bg-bg-tertiary text-text-secondary border border-border-primary',
      critical: 'bg-[rgba(255,51,102,0.1)] text-[var(--alert-red)] border border-[rgba(255,51,102,0.2)]',
      warning: 'bg-[rgba(245,158,11,0.1)] text-[var(--alert-amber)] border border-[rgba(245,158,11,0.2)]',
      success: 'bg-[rgba(0,230,118,0.1)] text-[var(--alert-green)] border border-[rgba(0,230,118,0.2)]',
      info: 'bg-nj-info/10 text-nj-info border border-nj-info/20',
    };

    return (
      <Box
        ref={ref}
        as="button"
        type="button"
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && loadingStyles,
          fullWidth && fullWidthStyles,
          className
        )}
        style={style}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Box
            as="span"
            className="absolute w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && (
          <Box as="span" className="shrink-0" aria-hidden="true">
            {leftIcon}
          </Box>
        )}
        <Box as="span" className={cn('truncate', loading && 'invisible')}>
          {children}
        </Box>
        {!loading && rightIcon && (
          <Box as="span" className="shrink-0" aria-hidden="true">
            {rightIcon}
          </Box>
        )}
        {compound && badge && (
          <Box
            as="span"
            className={cn(
              'ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider',
              badgeStyles[badgeVariant]
            )}
            aria-label={`${badge} ${compound === 'label-badge' ? 'items' : ''}`}
          >
            {badge}
          </Box>
        )}
      </Box>
    );
  }
);

Button.displayName = 'Button';

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = 'horizontal', size = 'md', className, style, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="div"
      role="group"
      className={cn(
        'inline-flex items-center',
        orientation === 'horizontal' && 'space-x-2',
        orientation === 'vertical' && 'flex-col space-y-2',
        className
      )}
      style={style}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && typeof child.type === 'function' && 'displayName' in child.type && child.type.displayName === 'Button'
          ? React.cloneElement(child, { size } as any)
          : child
      )}
    </Box>
  )
);

ButtonGroup.displayName = 'ButtonGroup';

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  'aria-label': string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 'aria-label': ariaLabel, icon, size = 'md', className, style, ...props }, ref) => (
    <Button
      ref={ref}
      size={size === 'md' ? 'icon' : size}
      className={cn('p-0', className)}
      style={style}
      aria-label={ariaLabel}
      {...props}
    >
      <Box as="span" className={cn('shrink-0', size === 'sm' && 'w-4 h-4', size === 'md' && 'w-5 h-5', size === 'lg' && 'w-6 h-6')} aria-hidden="true">
        {icon}
      </Box>
    </Button>
  )
);

IconButton.displayName = 'IconButton';