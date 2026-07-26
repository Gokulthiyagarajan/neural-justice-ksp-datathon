import { User, MapPin, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BehaviorProfile } from '@/types';

interface BehaviorProfileProps {
  data: BehaviorProfile;
}

export function BehaviorProfile({ data }: BehaviorProfileProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="bg-bg-card rounded-xl border border-border-primary p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 212, 255, 0.08)' }}>
            <User className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{data.accused_name}</h3>
            <p className="text-xs text-text-tertiary font-mono">{data.accused_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: 'var(--accent-cyan)' }}>{data.total_cases}</p>
            <p className="text-[10px] text-text-tertiary">{t('profiles.totalCases')}</p>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: 'var(--accent-cyan)' }}>{data.operating_radius_km} km</p>
            <p className="text-[10px] text-text-tertiary">{t('profiles.operatingRadius')}</p>
          </div>
          <div className="bg-bg-tertiary rounded-lg p-3 text-center">
            <p className="text-lg font-bold capitalize" style={{ color: 'var(--accent-cyan)' }}>{data.escalation_pattern}</p>
            <p className="text-[10px] text-text-tertiary">{t('profiles.escalation')}</p>
          </div>
        </div>
      </div>

      {data.preferred_crime_types.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3">{t('profiles.preferredCrimeTypes')}</h4>
          <div className="space-y-2">
            {data.preferred_crime_types.map((c) => (
              <div key={c.crime_head} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-32 truncate">{c.crime_head}</span>
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ background: 'rgba(0, 212, 255, 0.15)', width: `${Math.round(c.proportion * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-text-tertiary w-10 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.known_associates && data.known_associates.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} /> Known Associates
          </h4>
          <div className="space-y-1">
            {data.known_associates.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between text-xs bg-bg-tertiary rounded px-3 py-2"
              >
                <span className="text-text-primary">{a.name}</span>
                <span className="text-text-tertiary">{a.shared_cases} shared cases</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.risk_factors && data.risk_factors.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--alert-red)' }} /> Risk Factors
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.risk_factors.map((f) => (
              <span
                key={f.factor}
                className="px-2.5 py-1 text-xs rounded-full" style={{ background: 'rgba(255, 51, 102, 0.08)', color: 'var(--alert-red)', borderColor: 'rgba(255, 51, 102, 0.12)' }}
              >
                {f.factor}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: 'rgba(0, 212, 255, 0.08)', borderColor: 'var(--glass-border)' }}>
        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
          AI Assessment
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--accent-cyan)' }}>{data.explanation}</p>
        {data.primary_area && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent-cyan)' }}>
            <MapPin className="w-3 h-3" /> Primary area: {data.primary_area}
          </p>
        )}
      </div>
    </div>
  );
}
