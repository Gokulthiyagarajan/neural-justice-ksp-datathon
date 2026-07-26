import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { CRIME_TYPE_COLORS } from './mapConfig';

interface LegendProps {
  visibleLayers: Record<string, boolean>;
}

export function Legend({ visibleLayers }: LegendProps) {
  const { t } = useTranslation();
  const showFir = visibleLayers['fir-points'] ?? true;
  const showHeatmap = visibleLayers['density-heatmap'] ?? true;
  const showHotspots = visibleLayers['hotspot-points'] ?? true;

  if (!showFir && !showHeatmap && !showHotspots) return null;

  return (
    <div className="glass-floating px-3 py-2.5 space-y-2 min-w-[140px] max-w-[180px] max-h-[min(50vh,320px)] overflow-y-auto">
      <div className="flex items-center gap-1.5 sticky top-0 bg-bg-secondary/95 backdrop-blur-sm pb-1 z-10">
        <MapPin className="w-3.5 h-3.5 text-service-blue" aria-hidden />
        <span className="text-xs font-semibold text-text-primary font-display">{t('geo.legend')}</span>
      </div>

      {showFir && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-console text-text-tertiary mb-1">{t('geo.firTypes')}</p>
          <div className="space-y-0.5">
            {Object.entries(CRIME_TYPE_COLORS)
              .filter(([k]) => k !== 'default')
              .map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                  <span className="text-[11px] text-text-secondary capitalize">{type}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {showHeatmap && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-console text-text-tertiary mb-1">{t('geo.density')}</p>
          <div
            className="h-3 w-full rounded-sm"
            style={{ background: 'linear-gradient(to right, var(--color-service-blue), var(--color-signal-amber), var(--color-alert-red))' }}
            aria-hidden
          />
          <div className="flex justify-between text-[10px] font-mono text-text-tertiary mt-0.5">
            <span>{t('geo.low')}</span>
            <span>{t('geo.high')}</span>
          </div>
        </div>
      )}

      {showHotspots && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-console text-text-tertiary mb-1">Risk</p>
          <div className="space-y-0.5">
            {[
              { label: 'Low (<40)', color: 'var(--color-verified-green)' },
              { label: 'Medium (40–60)', color: 'var(--color-service-blue)' },
              { label: 'High (60–80)', color: 'var(--color-signal-amber)' },
              { label: 'Critical (>80)', color: 'var(--color-alert-red)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} aria-hidden />
                <span className="text-[11px] text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
