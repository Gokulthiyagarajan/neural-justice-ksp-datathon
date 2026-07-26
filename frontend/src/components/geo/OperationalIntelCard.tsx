import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { postOpsIntel } from '@/api/geo';
import type { Hotspot, OpsIntelResponse, NearbyStation, SuggestedAction } from '@/types/geo';

interface IntelCardProps {
  hotspot: Hotspot;
  onClose: () => void;
  onGeneratePdf: (h: Hotspot) => void;
  onNotifyOfficer: (h: Hotspot) => void;
  onOpenCopilot: (h: Hotspot) => void;
  onOpenNetwork: (h: Hotspot) => void;
  onOpenTimeline: (h: Hotspot) => void;
  onLaunchCommander: (h: Hotspot) => void;
}

function RiskBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? 'bg-[var(--alert-red)]'
      : score >= 60
        ? 'bg-[var(--alert-amber)]'
        : score >= 40
          ? 'bg-[var(--alert-amber)]'
          : 'bg-[var(--alert-green)]';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-20">{label}</span>
      <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-text-primary w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

function StationListItem({ station }: { station: NearbyStation }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border-secondary last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{station.station_name}</p>
        <p className="text-xs text-text-tertiary">{station.officer_count} officers</p>
      </div>
      <span className="text-xs font-mono text-text-tertiary ml-2 whitespace-nowrap">{station.distance_km.toFixed(1)} km</span>
    </div>
  );
}

function ActionChecklist({ actions }: { actions: SuggestedAction[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  return (
    <div className="space-y-1">
      {actions.map((a) => {
        const isHigh = a.priority === 'high';
        return (
          <label key={a.id} className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked[a.id] ?? false}
              onChange={() => toggle(a.id)}
              className="mt-0.5 h-3 w-3 rounded border-border-primary focus:ring-[rgba(0,212,255,0.4)]" style={{ color: 'var(--accent-cyan)' }}
            />
            <span
              className={`text-xs leading-relaxed ${
                checked[a.id] ? 'line-through text-text-tertiary' : isHigh ? 'text-text-primary font-medium' : 'text-text-secondary'
              }`}
            >
              {a.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function OperationalIntelCard({
  hotspot,
  onClose,
  onGeneratePdf,
  onNotifyOfficer,
  onOpenCopilot,
  onOpenNetwork,
  onOpenTimeline,
  onLaunchCommander,
}: IntelCardProps) {
  const { t } = useTranslation();
  const [opsIntel, setOpsIntel] = useState<OpsIntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    postOpsIntel({
      lat: hotspot.lat,
      lng: hotspot.lng,
      crime_category: hotspot.crime_category ? [hotspot.crime_category] : [],
      risk_score: hotspot.risk_score,
      hotspot_id: hotspot.hotspot_id,
    })
      .then((res) => {
        if (!cancelled) {
          setOpsIntel(res.ops_intel);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load operational data');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [hotspot.lat, hotspot.lng, hotspot.risk_score, hotspot.crime_category, hotspot.hotspot_id]);

  const catColor = hotspot.crime_category === 'theft'
    ? 'bg-[rgba(245,158,11,0.1)] text-[var(--alert-amber)]'
    : hotspot.crime_category === 'assault' || hotspot.crime_category === 'murder'
      ? 'bg-[rgba(255,51,102,0.1)] text-[var(--alert-red)]'
      : hotspot.crime_category === 'cyber_crime'
        ? 'bg-[rgba(139,92,246,0.1)] text-[#8B5CF6]'
        : 'bg-[rgba(0,212,255,0.1)] text-[var(--accent-cyan)]';

  return (
    <div className="bg-bg-card rounded-xl shadow-xl border border-border-primary w-80 overflow-y-auto max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="sticky top-0 bg-bg-card z-10 border-b border-border-secondary px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1" aria-label={t('geo.closeOpsPanel')}>
          &larr; Back to list
        </button>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">{t('geo.opsIntel')}</span>
      </div>

      {/* Hotspot identity */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
            {hotspot.crime_category || 'Unknown'}
          </span>
          <span className="text-[10px] text-text-tertiary uppercase">{hotspot.hotspot_type}</span>
        </div>

        <RiskBar score={hotspot.risk_score} label={t('geo.riskScore')} />
        <RiskBar score={hotspot.confidence} label={t('geo.confidence')} />

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-text-tertiary">{t('geo.firCount')}</span>
          <span className="font-bold text-text-primary">{hotspot.fir_count ?? 0}</span>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="px-4 py-6 text-center text-xs text-text-tertiary" role="status">{t('geo.loadingOpsIntel')}</div>
      )}
      {error && (
        <div className="px-4 py-4">
          <p className="text-xs mb-2" style={{ color: 'var(--alert-red)' }}>Unable to load operational data. Please try again.</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              postOpsIntel({
                lat: hotspot.lat,
                lng: hotspot.lng,
                crime_category: hotspot.crime_category ? [hotspot.crime_category] : [],
                risk_score: hotspot.risk_score,
              })
                .then((res) => { setOpsIntel(res.ops_intel); setLoading(false); })
                .catch((e) => { setError(e instanceof Error ? e.message : 'Retry failed'); setLoading(false); });
            }}
            className="text-xs px-3 py-1 bg-bg-tertiary hover:bg-hover-bg rounded text-text-primary btn-press-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Operational data */}
      {!loading && !error && opsIntel && (
        <>
          {/* Nearby stations */}
          <div className="px-4 py-3 border-t border-border-secondary">
            <h3 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
              <span aria-hidden="true">&#x1F3E2;</span> Nearby Police Stations
            </h3>
            {opsIntel.nearby_stations.length === 0 ? (
              <p className="text-xs text-text-tertiary italic">{t('geo.noStationsNearby')}</p>
            ) : (
              <div className="max-h-32 overflow-y-auto">
                {opsIntel.nearby_stations.slice(0, 5).map((s) => (
                  <StationListItem key={s.station_id} station={s} />
                ))}
              </div>
            )}
          </div>

          {/* Patrol units */}
          <div className="px-4 py-3 border-t border-border-secondary">
            <h3 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
              <span aria-hidden="true">&#x1F6A8;</span> Patrol Units
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-text-tertiary">{t('geo.vehicle')}</span>
              <span className="text-text-primary font-medium text-right">{opsIntel.patrol_recommendation.vehicle}</span>
              <span className="text-text-tertiary">{t('geo.officers')}</span>
              <span className="text-text-primary font-medium text-right">{opsIntel.patrol_recommendation.officer_count}</span>
              <span className="text-text-tertiary">{t('geo.responseTime')}</span>
              <span className="text-text-primary font-medium text-right">~{opsIntel.response_time_min} min</span>
              <span className="text-text-tertiary">{t('geo.priority')}</span>
              <span className="text-right">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    opsIntel.patrol_recommendation.priority === 'High'
                      ? 'bg-[rgba(255,51,102,0.1)] text-[var(--alert-red)]'
                      : opsIntel.patrol_recommendation.priority === 'Medium'
                        ? 'bg-[rgba(245,158,11,0.1)] text-[var(--alert-amber)]'
                        : 'bg-[rgba(0,212,255,0.1)] text-[var(--accent-cyan)]'
                  }`}
                >
                  {opsIntel.patrol_recommendation.priority}
                </span>
              </span>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="px-4 py-3 border-t border-border-secondary">
            <h3 className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1">
              <span aria-hidden="true">&#x1F916;</span> AI Explanation
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">{opsIntel.ai_explanation}</p>
          </div>

          {/* Recommended Actions */}
          <div className="px-4 py-3 border-t border-border-secondary">
            <h3 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1">
              <span aria-hidden="true">&#x2705;</span> Recommended Actions
            </h3>
            <ActionChecklist actions={opsIntel.suggested_actions} />
          </div>
        </>
      )}

      {/* Partial display when only hotspot data is available (no ops intel) */}
      {!loading && !error && !opsIntel && (
        <div className="px-4 py-3 border-t border-border-secondary">
          <p className="text-xs text-text-secondary italic">
            {hotspot.ai_explanation || hotspot.ai_recommendation || 'No additional intelligence available.'}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="sticky bottom-0 bg-bg-tertiary border-t border-border-primary px-4 py-3 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <ActionButton label={t('geo.generatePdf')} onClick={() => onGeneratePdf(hotspot)} />
          <ActionButton label={t('geo.notifyOfficer')} onClick={() => onNotifyOfficer(hotspot)} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <ActionButton label={t('geo.copilot')} onClick={() => onOpenCopilot(hotspot)} />
          <ActionButton label={t('geo.networkTab')} onClick={() => onOpenNetwork(hotspot)} />
          <ActionButton label={t('geo.timelineTab')} onClick={() => onOpenTimeline(hotspot)} />
        </div>
        <button
          onClick={() => onLaunchCommander(hotspot)}
          className="w-full text-xs font-bold py-2 rounded-lg bg-gradient-to-r from-[rgba(255,51,102,0.8)] to-[var(--alert-red)] text-white hover:from-[rgba(255,51,102,0.6)] hover:to-[rgba(255,51,102,0.2)] transition-all shadow-lg flex items-center justify-center gap-2 btn-press" style={{ boxShadow: '0 10px 15px -3px rgba(255, 51, 102, 0.3)' }}
        >
          <span className="w-2 h-2 rounded-full bg-bg-card animate-pulse" />
          LAUNCH INCIDENT COMMANDER
        </button>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-[10px] font-medium px-2 py-1.5 rounded-lg bg-bg-card border border-border-primary text-text-primary hover:bg-hover-bg hover:border-border-primary transition-colors btn-press-sm"
    >
      {label}
    </button>
  );
}
