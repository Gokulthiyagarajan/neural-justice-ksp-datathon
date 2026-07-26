import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variants = {
  default: 'card bg-bg-card border border-border-primary shadow-card',
  elevated: 'card bg-bg-card border border-border-primary shadow-lg',
  outlined: 'card bg-bg-card border-2 border-border-primary shadow-none',
  interactive: 'card bg-bg-card border border-border-primary shadow-card cursor-pointer hover:border-nj-blue/30 hover:shadow-card-hover motion-reduce:transition-none',
};

const paddings = {
  none: '',
  sm: 'p-2 sm:p-3',
  md: 'p-3 sm:p-4 md:p-4 lg:p-5',
  lg: 'p-4 sm:p-5 md:p-5 lg:p-6',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hover = false,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => (
    <Box
      ref={ref}
      as="div"
      className={cn(
        variants[variant],
        paddings[padding],
        hover && variant !== 'interactive' && 'card-hover-effect',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Box>
  )
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, avatar, className, style, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="div"
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      style={style}
      {...props}
    >
      <div className="flex items-start gap-3 min-w-0">
        {avatar && (
          <Box
            as="div"
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-nj-info/10 flex items-center justify-center"
            aria-hidden="true"
          >
            {avatar}
          </Box>
        )}
        <div className="min-w-0">
          <h3 className={cn('font-semibold text-text-primary truncate text-sm sm:text-base md:text-lg', avatar ? '' : 'heading-s sm:heading-m')}
            style={avatar ? undefined : { fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className={cn('text-xs sm:text-sm text-text-tertiary mt-0.5', avatar ? '' : 'caption sm:body')}
              style={avatar ? undefined : { fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <Box as="div" className="flex-shrink-0" aria-hidden="true">
          {action}
        </Box>
      )}
      {children}
    </Box>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, style, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="div"
      className={cn('', className)}
      style={style}
      {...props}
    >
      {children}
    </Box>
  )
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
  align?: 'start' | 'center' | 'end' | 'between';
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ divider = true, align = 'end', className, style, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="div"
      className={cn(
        'flex items-center gap-2 mt-4 pt-3',
        divider && 'border-t border-border-primary',
        align === 'start' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Box>
  )
);

CardFooter.displayName = 'CardFooter';