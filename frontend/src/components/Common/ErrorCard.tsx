import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  title?: string;
  message?: string;
  lastSync?: string;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'offline';
}

export function ErrorCard({
  title = 'Data Sync Paused',
  message = 'Unable to reach the intelligence engine.',
  lastSync,
  onRetry,
  type = 'error',
}: ErrorCardProps) {
  const colors = {
    error: { bg: 'bg-accent-red/5 border-accent-red/20', icon: 'text-accent-red', button: 'text-accent-red bg-accent-red/10 hover:bg-accent-red/20' },
    warning: { bg: 'bg-accent-amber/5 border-accent-amber/20', icon: 'text-accent-amber', button: 'text-accent-amber bg-accent-amber/10 hover:bg-accent-amber/20' },
    offline: { bg: 'bg-accent-blue/5 border-accent-blue/20', icon: 'text-accent-blue', button: 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20' },
  };
  const c = colors[type];

  return (
    <div className={`${c.bg} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${c.icon}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-xs text-text-secondary mt-0.5">{message}</p>
          {lastSync && (
            <p className="text-[10px] text-text-tertiary mt-1">{lastSync}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 text-xs font-medium rounded-lg transition-colors ${c.button}`}
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
