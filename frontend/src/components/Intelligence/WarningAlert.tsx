import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { EarlyWarning } from '@/types';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { useTranslation } from 'react-i18next';

interface WarningAlertProps {
  warnings: EarlyWarning[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string, note: string) => void;
}

const severityBorder: Record<string, string> = {
  critical: 'border-l-alert-red',
  high: 'border-l-signal-amber',
  medium: 'border-l-service-blue',
  low: 'border-l-border-primary',
};

export function WarningAlert({ warnings, onAcknowledge, onResolve }: WarningAlertProps) {
  const { t } = useTranslation();

  if (warnings.length === 0) {
    return (
      <div className="panel-card p-8 text-center">
        <ShieldCheck className="w-10 h-10 text-verified-green mx-auto mb-3" aria-hidden />
        <p className="text-sm font-medium text-text-primary">{t('earlyWarnings.noActiveTitle', { defaultValue: 'All clear' })}</p>
        <p className="text-caption text-text-tertiary mt-1">{t('earlyWarnings.allClear')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.map((w) => (
        <WarningCard
          key={w.warning_id}
          warning={w}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}

function WarningCard({
  warning,
  onAcknowledge,
  onResolve,
}: {
  warning: EarlyWarning;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string, note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const resolved = warning.status === 'resolved';
  const acknowledged = warning.status === 'acknowledged' || resolved;
  const sev = warning.severity?.toLowerCase() || 'medium';

  return (
    <div className={`panel-card border-l-4 p-4 ${severityBorder[sev] || severityBorder.medium}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={warning.type} size="sm" />
            <StatusBadge status={warning.severity} size="sm" />
            <StatusBadge status={warning.status} size="sm" />
          </div>
          <p className="text-sm text-text-primary">{warning.message}</p>
          <p className="text-xs text-text-tertiary mt-1">
            <span className="font-medium">{t('earlyWarnings.details')}:</span> {warning.recommended_action}
          </p>
          <p className="text-[10px] font-mono text-text-tertiary mt-1">
            {new Date(warning.generated_at).toLocaleString()}
          </p>

          {!resolved && (
            <div className="mt-3 space-y-2">
              <label htmlFor={`resolution-note-${warning.warning_id}`} className="sr-only">
                {t('earlyWarnings.details')}
              </label>
              <textarea
                id={`resolution-note-${warning.warning_id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`${t('earlyWarnings.details')} (optional)`}
                rows={2}
                className="input text-xs"
              />
              <div className="flex flex-wrap gap-2">
                {!acknowledged && (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(warning.warning_id)}
                    className="btn-secondary btn-sm"
                  >
                    {t('earlyWarnings.acknowledge')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onResolve(warning.warning_id, note)}
                  className="btn-primary btn-sm"
                >
                  {t('earlyWarnings.resolve')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
