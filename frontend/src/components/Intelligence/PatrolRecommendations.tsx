import { MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/Common/StatusBadge';
import type { PatrolRecommendation } from '@/types';

interface PatrolRecommendationsProps {
  recommendations: PatrolRecommendation[];
  totalHours: number;
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function PatrolRecommendations({
  recommendations,
  totalHours,
}: PatrolRecommendationsProps) {
  const { t } = useTranslation();
  const sorted = [...recommendations].sort(
    (a, b) => (priorityOrder[a.priority?.toLowerCase()] ?? 3) - (priorityOrder[b.priority?.toLowerCase()] ?? 3)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-card rounded-xl border border-border-primary p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-cyan)' }}>{totalHours}</p>
          <p className="text-xs text-text-tertiary">{t('patrol.totalPatrolHours')}</p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-primary p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-cyan)' }}>{recommendations.length}</p>
          <p className="text-xs text-text-tertiary">{t('patrol.recommendationsCount')}</p>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-primary p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--alert-red)' }}>
            {recommendations.filter((r) => r.priority?.toLowerCase() === 'critical' || r.priority?.toLowerCase() === 'high').length}
          </p>
          <p className="text-xs text-text-tertiary">{t('patrol.highPriority')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((rec, i) => (
          <div
            key={i}
            className="bg-bg-card rounded-xl border border-border-primary p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={rec.priority} size="sm" />
                  <span className="text-xs font-mono text-text-tertiary">{rec.type}</span>
                </div>
                <p className="text-sm text-text-primary mb-2">{rec.reason}</p>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {rec.location.lat.toFixed(4)}, {rec.location.lng.toFixed(4)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rec.suggested_patrols} patrols
                  </span>
                </div>
                {rec.suggested_time_slots.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-text-tertiary" />
                    <div className="flex gap-1">
                      {rec.suggested_time_slots.map((slot) => (
                        <span
                          key={slot}
                          className="px-2 py-0.5 text-xs font-medium rounded-md" style={{ background: 'rgba(0, 212, 255, 0.08)', color: 'var(--accent-cyan)' }}
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-text-tertiary py-8">{t('patrol.noRecommendations')}</p>
        )}
      </div>
    </div>
  );
}
