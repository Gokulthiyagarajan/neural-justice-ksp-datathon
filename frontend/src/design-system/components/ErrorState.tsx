import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'error' | 'warning' | 'offline';
  className?: string;
  children?: ReactNode;
}

const VARIANT_STYLES = {
  error: {
    border: 'border-alert-red/25',
    bg: 'bg-alert-red/8',
    icon: 'text-alert-red',
    button: 'btn-danger',
  },
  warning: {
    border: 'border-signal-amber/25',
    bg: 'bg-signal-amber/8',
    icon: 'text-signal-amber',
    button: 'btn-secondary',
  },
  offline: {
    border: 'border-service-blue/25',
    bg: 'bg-service-blue/8',
    icon: 'text-service-blue',
    button: 'btn-secondary',
  },
} as const;

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Retry',
  variant = 'error',
  className,
  children,
}: ErrorStateProps) {
  const v = VARIANT_STYLES[variant];

  return (
    <div className={cn('panel-card border p-5', v.border, v.bg, className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('w-5 h-5 shrink-0 mt-0.5', v.icon)} aria-hidden />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-caption text-text-secondary mt-1">{description}</p>
          {children}
          {onRetry && (
            <button type="button" onClick={onRetry} className={cn('mt-3 inline-flex items-center gap-1.5', v.button)}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
