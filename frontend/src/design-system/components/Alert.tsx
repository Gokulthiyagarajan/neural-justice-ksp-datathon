import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';
import { IconButton } from './Button';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
  info: 'alert-info',
};

const variantIcons = {
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      description,
      dismissible = false,
      onDismiss,
      action,
      icon,
      className,
      style,
      children,
      role = 'alert',
      ...props
    },
    ref
  ) => {
    const defaultIcon = icon || variantIcons[variant];

    return (
      <Box
        ref={ref}
        as="div"
        role={role}
        className={cn(
          'alert',
          variantStyles[variant],
          className
        )}
        style={style}
        {...props}
      >
        <Box as="div" className="flex items-start gap-3">
          <Box as="div" className="flex-shrink-0 w-5 h-5" aria-hidden="true">
            {defaultIcon}
          </Box>
          <Box as="div" className="flex-1 min-w-0">
            {title && (
              <p className="font-medium text-sm">{title}</p>
            )}
            {description && (
              <p className={cn('text-sm mt-1', title && 'text-text-secondary')}>
                {description}
              </p>
            )}
            {children && (
              <Box as="div" className="mt-2 text-sm">
                {children}
              </Box>
            )}
            {action && (
              <Box as="div" className="mt-3">
                {action}
              </Box>
            )}
          </Box>
          {dismissible && (
            <IconButton
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="flex-shrink-0 text-text-tertiary hover:text-text-primary"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              }
            />
          )}
        </Box>
      </Box>
    );
  }
);

Alert.displayName = 'Alert';

export interface InlineAlertProps extends Omit<AlertProps, 'dismissible' | 'onDismiss'> {
  inline?: boolean;
}

export const InlineAlert = React.forwardRef<HTMLDivElement, InlineAlertProps>(
  ({ inline = false, className, style, ...props }, ref) => (
    <Alert
      ref={ref}
      className={cn(inline && 'inline-flex', className)}
      style={style}
      {...props}
    />
  )
);

InlineAlert.displayName = 'InlineAlert';