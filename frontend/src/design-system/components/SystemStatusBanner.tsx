import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/design-system/utils/cn';

export interface SystemStatusBannerProps {
  title?: string;
  message?: string | { message?: string; error?: string };
  lastSync?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  variant?: 'paused' | 'error' | 'warning';
  className?: string;
  showErrorDetails?: boolean;
}

/** Reusable system-status pattern for sync failures, paused jobs, etc. */
export function SystemStatusBanner({
  message,
  lastSync,
  onRetry,
  onDismiss,
  retryLabel,
  variant = 'paused',
  className,
  showErrorDetails = false,
}: SystemStatusBannerProps) {
  const { t } = useTranslation();
  const resolvedRetryLabel = retryLabel ?? t('systemStatus.retrySync', { defaultValue: 'Retry Sync' });
  const styles =
    variant === 'error'
      ? 'border-alert-red/30 bg-alert-red/8'
      : variant === 'warning'
        ? 'border-signal-amber/30 bg-signal-amber/8'
        : 'border-signal-amber/25 bg-signal-amber/6';

  const errorDetails = showErrorDetails && typeof message === 'object' ? message : null;
  const displayMessage = showErrorDetails && errorDetails?.message
    ? errorDetails.message
    : typeof message === 'object'
      ? message.message ?? message.error ?? ''
      : message;

  return (
    <div className={cn('panel-card border-l-4 p-4', styles, className)} role="status">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-signal-amber" aria-hidden />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">
            {variant === 'error'
              ? t('systemStatus.dataSyncError', { defaultValue: 'Data Sync Error' })
              : t('systemStatus.dataSyncPaused', { defaultValue: 'Data Sync Paused' })}
          </h4>
          <p className="text-caption text-text-secondary mt-0.5">{displayMessage}</p>
          {lastSync && (
            <p className="text-[10px] font-mono text-text-tertiary mt-1">
              {t('systemStatus.lastAttempt', { defaultValue: 'Last attempt:' })} {lastSync}
            </p>
          )}
          {errorDetails && errorDetails.error && (
            <pre className="text-[10px] font-mono text-text-tertiary mt-1 overflow-x-auto whitespace-pre-wrap">
              {errorDetails.error}
            </pre>
          )}
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-2">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              {resolvedRetryLabel}
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="btn-ghost btn-sm mt-2">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
