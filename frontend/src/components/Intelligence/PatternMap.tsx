import { AlertTriangle, MapPin, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CrimePattern } from '@/types';

interface PatternMapProps {
  patterns: CrimePattern[];
}

const severityColor: Record<string, string> = {
  cluster: 'bg-[rgba(139,92,246,0.08)] text-[#8B5CF6] border-[rgba(139,92,246,0.12)]',
  hotspot: 'bg-[rgba(255,51,102,0.08)] text-[var(--alert-red)] border-[rgba(255,51,102,0.12)]',
  spread: 'bg-[rgba(245,158,11,0.08)] text-[var(--alert-amber)] border-[rgba(245,158,11,0.12)]',
};

export function PatternMap({ patterns }: PatternMapProps) {
  const { t } = useTranslation();
  if (patterns.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-text-secondary mx-auto mb-3" />
        <p className="text-text-tertiary">{t('patterns.noPatterns')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patterns.map((p) => (
        <div
          key={p.pattern_id}
          className={`bg-bg-card rounded-xl border p-4 ${
            severityColor[p.pattern_type] || 'border-border-primary'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                  {p.pattern_type.replace(/_/g, ' ')}
                </span>
                {p.actionable && (
                  <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--alert-green)' }}>
                    <CheckCircle className="w-3 h-3" /> Actionable
                  </span>
                )}
              </div>
              {p.data.centroid && (
                <p className="text-xs text-text-tertiary flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" />
                  {p.data.centroid.lat.toFixed(4)}, {p.data.centroid.lng.toFixed(4)}
                </p>
              )}
              {p.data.case_count != null && (
                <p className="text-sm font-semibold text-text-primary">{p.data.case_count} related cases</p>
              )}
              {p.recommendation && (
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{p.recommendation}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
