import * as React from 'react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardContent } from './Card';
import { Box } from './Box';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  footer?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  loading = false,
  error,
  onRetry,
  className,
  style,
  noPadding = false,
  footer,
}: ChartCardProps) {
  return (
    <Card variant="default" className={cn('h-full flex flex-col', className)} style={style}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardContent className={cn('flex-1', noPadding ? 'p-0' : '')}>
        {loading && (
          <Box as="div" className="flex-1 flex items-center justify-center min-h-[200px]">
            <Skeleton variant="card" />
          </Box>
        )}
        {error && (
          <Box as="div" className="flex flex-col items-center justify-center min-h-[200px] gap-3 p-4 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-nj-critical" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm text-text-secondary">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </Box>
        )}
        {!loading && !error && children}
      </CardContent>
      {footer && (
        <Box as="div" className={cn('border-t border-border-primary p-4 lg:p-5', noPadding ? 'px-0' : '')}>
          {footer}
        </Box>
      )}
    </Card>
  );
}

export interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function KPICard({
  label,
  value,
  change,
  changeLabel,
  trend = 'neutral',
  icon,
  iconBg = 'bg-nj-blue/10',
  iconColor = 'text-nj-blue',
  loading = false,
  prefix = '',
  suffix = '',
  className,
  style,
}: KPICardProps) {
  const trendColors = {
    up: 'text-nj-success',
    down: 'text-nj-critical',
    neutral: 'text-text-tertiary',
  };

  const trendIcons = {
    up: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    ),
    down: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    neutral: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <Card className={cn('p-4 lg:p-5', className)} style={style}>
        <Box as="div" className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <Box as="div" className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={28} />
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4 lg:p-5 card-hover-effect', className)} style={style}>
      <Box as="div" className="flex items-start justify-between gap-4">
        <Box as="div" className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-secondary truncate">{label}</p>
          <Box as="div" className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="heading-l font-bold text-text-primary tabular-nums">
              {prefix}{value}{suffix}
            </span>
            {change !== undefined && change !== null && (
              <Box as="span" className={cn('flex items-center gap-1 text-sm font-medium', trendColors[trend])}>
                {trendIcons[trend]}
                <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                {changeLabel && <span className="text-text-tertiary">{changeLabel}</span>}
              </Box>
            )}
          </Box>
        </Box>
        {icon && (
          <Box
            as="div"
            className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', iconBg, iconColor)}
            aria-hidden="true"
          >
            {icon}
          </Box>
        )}
      </Box>
    </Card>
  );
}

export interface StatChipProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  change?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'critical';
  className?: string;
}

export function StatChip({ label, value, trend, change, variant = 'default', className }: StatChipProps) {
  const variantStyles = {
    default: 'bg-bg-tertiary border border-border-primary',
    primary: 'bg-nj-blue/10 border border-nj-blue/20 text-nj-blue',
    success: 'bg-nj-success/10 border border-nj-success/20 text-nj-success',
    warning: 'bg-nj-warning/10 border border-nj-warning/20 text-nj-warning',
    critical: 'bg-nj-critical/10 border border-nj-critical/20 text-nj-critical',
  };

  const trendIcons = {
    up: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>,
    down: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>,
    neutral: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  };

  return (
    <Box
      as="div"
      className={cn(
        'flex flex-col items-start gap-1 px-3 py-2.5 rounded-[10px]',
        variantStyles[variant],
        className
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <Box as="div" className="flex items-baseline gap-1">
        <span className="font-bold text-text-primary tabular-nums">{value}</span>
        {change !== undefined && trend && (
          <span className={cn('flex items-center gap-0.5 text-xs font-medium', trend === 'up' ? 'text-nj-success' : trend === 'down' ? 'text-nj-critical' : 'text-text-tertiary')}>
            {trendIcons[trend]}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </Box>
    </Box>
  );
}