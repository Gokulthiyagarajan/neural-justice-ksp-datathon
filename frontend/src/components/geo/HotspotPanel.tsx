import { useState, useEffect, useMemo } from 'react';
import { Flame, Navigation, ChevronRight, AlertTriangle, MapPin } from 'lucide-react';
import { getHotspots } from '@/api/geo';
import type { Hotspot } from '@/types/geo';
import { isDemoMode, demoGeoDashboard } from '@/services/demoData';

interface HotspotPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  onHotspotSelect?: (hotspot: Hotspot) => void;
  onNavigate?: (hotspot: Hotspot) => void;
  onDetail?: (hotspot: Hotspot) => void;
}

const hotspotTabs = [
  { key: 'all', label: 'All' },
  { key: 'current', label: 'Current' },
  { key: 'emerging', label: 'Emerging' },
  { key: 'predicted', label: 'Predicted' },
  { key: 'high_risk_street', label: 'High Risk' },
  { key: 'crime_cluster', label: 'Cluster' },
  { key: 'crime_spread', label: 'Spread' },
] as const;

function getRiskColor(score: number): string {
  if (score < 40) return 'var(--alert-green)';
  if (score < 60) return 'var(--alert-amber)';
  if (score < 80) return 'var(--alert-amber)';
  return 'var(--alert-red)';
}

export function HotspotPanel({ collapsed, onToggle, onHotspotSelect, onNavigate, onDetail }: HotspotPanelProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isDemoMode()) {
          const geo = demoGeoDashboard();
          setHotspots(geo.hotspots as any);
          setLoading(false);
          return;
        }
        const res = await getHotspots({ limit: 50 });
        setHotspots(res.hotspots);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return hotspots;
    return hotspots.filter((h) => h.hotspot_type === activeTab);
  }, [hotspots, activeTab]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.risk_score - a.risk_score),
    [filtered]
  );

  return (
    <div className="glass rounded-xl shadow-lg flex flex-col h-full">
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 border-b border-border-secondary shrink-0"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-text-primary">Hotspots</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--alert-amber)' }}>
            {hotspots.length}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <>
          <div className="flex gap-1 px-3 py-2 border-b border-border-secondary overflow-x-auto shrink-0">
            {hotspotTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap transition-colors btn-press-sm ${
                  activeTab === tab.key
                    ? 'bg-[rgba(245,158,11,0.1)] text-[var(--alert-amber)] font-medium'
                    : 'text-text-tertiary hover:bg-hover-bg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading && hotspots.length === 0 && (
              <div className="text-xs text-text-tertiary text-center py-8">Loading...</div>
            )}

            {!loading && sorted.length === 0 && (
              <div className="text-xs text-text-tertiary text-center py-8">No hotspots found</div>
            )}

            {sorted.map((hotspot) => (
              <div
                key={hotspot.hotspot_id}
                className="bg-bg-card border border-border-secondary rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onHotspotSelect?.(hotspot);
                  onDetail?.(hotspot);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${hotspot.crime_category} hotspot, risk score ${hotspot.risk_score}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onHotspotSelect?.(hotspot);
                    onDetail?.(hotspot);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {hotspot.crime_category}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate">{hotspot.location}</p>
                  </div>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded ml-2"
                    style={{
                      backgroundColor: getRiskColor(hotspot.risk_score) + '20',
                      color: getRiskColor(hotspot.risk_score),
                    }}
                  >
                    {hotspot.risk_score}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${hotspot.risk_score}%`,
                      backgroundColor: getRiskColor(hotspot.risk_score),
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    <span>{hotspot.fir_count} FIRs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    <span>{Math.round(hotspot.confidence * 100)}% confidence</span>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.(hotspot);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[rgba(0,212,255,0.15)] text-white rounded hover:bg-[rgba(0,212,255,0.25)] transition-colors btn-press-sm"
                    aria-label={`Navigate to ${hotspot.crime_category} hotspot`}
                  >
                    <Navigation className="w-2.5 h-2.5" aria-hidden="true" />
                    Patrol Here
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDetail?.(hotspot);
                    }}
                    className="flex-1 px-2 py-1 text-[10px] font-medium bg-bg-tertiary text-text-secondary rounded hover:bg-hover-bg transition-colors btn-press-sm"
                    aria-label={`Show details for ${hotspot.crime_category} hotspot`}
                  >
                    Show Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
