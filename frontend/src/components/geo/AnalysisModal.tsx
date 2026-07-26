import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, Shield, Download } from 'lucide-react';
import { getLocationAnalysis } from '@/api/geo';
import type { GeoCoordinates, LocationAnalysis } from '@/types/geo';

interface AnalysisModalProps {
  coords: GeoCoordinates | null;
  onClose: () => void;
}

export function AnalysisModal({ coords, onClose }: AnalysisModalProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<LocationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    getLocationAnalysis(coords)
      .then(setAnalysis)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [coords]);

  if (!coords) return null;

  const riskColorMap: Record<string, string> = {
    Low: 'var(--alert-green)',
    Medium: 'var(--alert-amber)',
    High: 'var(--alert-amber)',
    Critical: 'var(--alert-red)',
  };

  function getRiskLevel(score: number): keyof typeof riskColorMap {
    if (score < 40) return 'Low';
    if (score < 60) return 'Medium';
    if (score < 80) return 'High';
    return 'Critical';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            <h3 className="text-base font-semibold text-text-primary">{t('geo.locationAnalysis')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover-bg">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="bg-bg-tertiary rounded-lg p-2.5 text-center">
            <p className="text-xs text-text-tertiary font-mono">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-[rgba(0,212,255,0.15)] border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">{t('geo.analyzingLocation')}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255, 51, 102, 0.1)', borderColor: 'rgba(255, 51, 102, 0.15)', color: 'var(--alert-red)' }}>{error}</div>
          )}

          {analysis && !loading && (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-bg-tertiary rounded-lg p-2.5">
                  <span className="text-text-tertiary block mb-0.5">{t('geo.crimeHistory30d')}</span>
                  <span className="font-medium text-text-primary text-base">
                    {analysis.crime_history_30d}
                  </span>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-2.5">
                  <span className="text-text-tertiary block mb-0.5">{t('geo.riskScore')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-text-primary text-base">
                      {analysis.risk_score}
                    </span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: (riskColorMap[analysis.risk_level] || '#EAB308') + '20',
                        color: riskColorMap[analysis.risk_level] || '#EAB308',
                      }}
                    >
                      {analysis.risk_level}
                    </span>
                  </div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-2.5">
                  <span className="text-text-tertiary block mb-0.5">{t('geo.nearbyHotspots1km')}</span>
                  <span className="font-medium text-text-primary text-base">
                    {analysis.nearby_hotspots_1km.length}
                  </span>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-2.5">
                  <span className="text-text-tertiary block mb-0.5">{t('geo.responseTime')}</span>
                  <span className="font-medium text-text-primary text-base">
                    ~{analysis.response_time_estimate_min} min
                  </span>
                </div>
              </div>

              <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 255, 0.05)', borderColor: 'rgba(0, 212, 255, 0.15)' }}>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                  Pattern Analysis
                </p>
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{analysis.pattern_analysis}</p>
              </div>

              <div className="rounded-lg p-3" style={{ background: 'rgba(0, 230, 118, 0.05)', borderColor: 'rgba(0, 230, 118, 0.15)' }}>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--alert-green)' }}>
                  Women Safety Assessment
                </p>
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{analysis.women_safety_assessment}</p>
              </div>

              {analysis.nearby_hotspots_1km.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-primary mb-2">{t('geo.nearbyHotspots')}</p>
                  <div className="space-y-1">
                    {analysis.nearby_hotspots_1km.slice(0, 5).map((h) => {
                      const rl = getRiskLevel(h.risk_score);
                      return (
                        <div key={h.hotspot_id} className="flex items-center justify-between text-xs bg-bg-tertiary rounded px-2 py-1.5">
                          <span className="text-text-primary">{h.crime_category}</span>
                          <span className="font-medium" style={{ color: riskColorMap[rl] }}>
                            Score {h.risk_score}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-bg-tertiary rounded-lg p-3">
                <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  AI Summary
                </p>
                <p className="text-xs text-text-primary leading-relaxed">{analysis.ai_summary}</p>
                <p className="text-[10px] text-text-tertiary mt-1 italic">
                  Review status: Unreviewed — This analysis requires human verification
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border-primary bg-bg-tertiary rounded-b-xl">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <span className="text-[10px] flex items-center gap-1 ml-auto" style={{ color: 'var(--alert-amber)' }}>
            <Shield className="w-3 h-3" />
            Unreviewed
          </span>
        </div>
      </div>
    </div>
  );
}
