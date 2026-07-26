import { Shield, ShieldAlert, CheckCircle2, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import type { EarlyWarning } from '@/types';
import { isActiveWarning } from '@/utils/formatStatus';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { useTranslation } from 'react-i18next';

interface WarningPanelProps {
  warnings: EarlyWarning[];
  districtCount?: number;
  caseCount?: number;
  isLoading?: boolean;
}

const severityConfig: Record<string, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'text-alert-red', bg: 'bg-alert-red/5 border-alert-red/20', icon: ShieldAlert },
  high: { color: 'text-signal-amber', bg: 'bg-signal-amber/5 border-signal-amber/20', icon: AlertTriangle },
  medium: { color: 'text-service-blue', bg: 'bg-service-blue/5 border-service-blue/20', icon: Info },
  low: { color: 'text-text-tertiary', bg: 'bg-bg-tertiary border-border-primary', icon: Info },
};

export default function WarningPanel({ warnings, districtCount = 3, caseCount = 60, isLoading }: WarningPanelProps) {
  const { t } = useTranslation();
  const activeWarnings = warnings.filter((w) => isActiveWarning(w.status));
  const sorted = [...activeWarnings].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity?.toLowerCase()] ?? 4) - (order[b.severity?.toLowerCase()] ?? 4);
  });

  const statusLabel =
    sorted.length > 0
      ? t('warningPanel.activeCount', { count: sorted.length })
      : t('warningPanel.allClear');

  if (isLoading) {
    return (
      <div className="panel-card p-4 animate-pulse">
        <div className="h-4 w-40 bg-bg-tertiary rounded mb-4" />
        <div className="h-3 w-full bg-bg-tertiary rounded mb-2" />
        <div className="h-3 w-3/4 bg-bg-tertiary rounded" />
      </div>
    );
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-primary">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-service-blue" aria-hidden />
          <span className="text-xs font-semibold text-text-primary font-display">{t('warningPanel.title')}</span>
        </div>
        <p className="text-[10px] font-mono text-text-tertiary">
          {t('warningPanel.scanSummary', {
            districts: districtCount,
            cases: caseCount,
            status: statusLabel,
          })}
        </p>
      </div>

      <div className="divide-y divide-border-secondary max-h-[280px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-verified-green/60" aria-hidden />
            <p className="text-xs text-text-tertiary">{t('warningPanel.empty')}</p>
            <p className="text-[10px] font-mono text-text-tertiary/60 mt-1">
              {t('warningPanel.lastScan', { time: new Date().toLocaleTimeString() })}
            </p>
          </div>
        ) : (
          sorted.map((w, idx) => {
            const sev = w.severity?.toLowerCase() || 'low';
            const config = severityConfig[sev] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div key={w.warning_id || `w-${idx}`} className={`px-4 py-2.5 ${config.bg} hover:bg-current/10 transition-colors duration-200`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <StatusBadge status={w.severity} size="sm" />
                      <StatusBadge status={w.status} size="sm" />
                    </div>
                    <p className="text-xs text-text-primary font-medium">{w.message}</p>
                    {w.recommended_action && (
                      <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{w.recommended_action}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-text-tertiary/60">
                        {new Date(w.generated_at).toLocaleString()}
                      </span>
                      <span className="text-text-tertiary/30" aria-hidden>·</span>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/firs?q=${encodeURIComponent(w.entity_name || '')}`;
                        }}
                        className="text-[10px] font-medium text-service-blue hover:text-accent-cyan transition-colors inline-flex items-center gap-0.5"
                      >
                        {t('warningPanel.openInvestigation')} <ExternalLink className="w-2 h-2" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
