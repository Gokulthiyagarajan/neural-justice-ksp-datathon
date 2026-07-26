import { AlertTriangle, Info, XCircle } from 'lucide-react';
import type { EarlyWarning } from '@/types';

interface AlertsPanelProps {
  alerts: EarlyWarning[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const severityConfig: Record<string, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'text-[var(--alert-red)]', bg: 'bg-[rgba(255,51,102,0.08)] border-[var(--alert-red)]', icon: XCircle },
  high: { color: 'text-[var(--alert-amber)]', bg: 'bg-[rgba(245,158,11,0.08)] border-[var(--alert-amber)]', icon: AlertTriangle },
  medium: { color: 'text-[var(--alert-amber)]', bg: 'bg-[rgba(245,158,11,0.08)] border-[var(--alert-amber)]', icon: Info },
  low: { color: 'text-[var(--accent-cyan)]', bg: 'bg-[rgba(0,212,255,0.08)] border-[var(--glass-border)]', icon: Info },
};

export function AlertsPanel({
  alerts,
  onAcknowledge,
  onResolve,
}: AlertsPanelProps) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity?.toLowerCase() as keyof typeof order] ?? 4) -
           (order[b.severity?.toLowerCase() as keyof typeof order] ?? 4);
  });

  const criticalCount = alerts.filter((a) => a.severity?.toLowerCase() === 'critical').length;

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Early Warnings</h3>
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: 'rgba(255, 51, 102, 0.12)', color: 'var(--alert-red)' }}>
            {criticalCount} critical
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-text-tertiary py-8 text-center">No active warnings</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {sorted.map((alert) => {
            const sev = alert.severity?.toLowerCase() || 'low';
            const config = severityConfig[sev] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div key={alert.warning_id} className={`rounded-lg border p-3 ${config.bg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium uppercase ${config.color}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-text-tertiary">{alert.type}</span>
                      </div>
                      <p className="text-sm text-text-primary">{alert.message}</p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {new Date(alert.generated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                {alert.status === 'active' && (
                  <div className="flex gap-2 mt-2 ml-6">
                    <button
                      onClick={() => onAcknowledge?.(alert.warning_id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-bg-card border border-border-primary text-text-secondary hover:bg-hover-bg transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => onResolve?.(alert.warning_id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-bg-card border border-border-primary text-text-secondary hover:bg-hover-bg transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                )}
                {alert.status !== 'active' && (
                  <span className="ml-6 text-xs text-text-tertiary capitalize">{alert.status}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
