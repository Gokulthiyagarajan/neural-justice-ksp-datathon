import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/store/authStore';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { Search, Bot, MapPin, Target } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';
import { isDemoMode, demoPatternData } from '@/services/demoData';

interface Hotspot {
  id: string;
  name: string;
  risk_score: number;
  incident_count: number;
  latitude?: number;
  longitude?: number;
  crime_types?: string[];
}

interface MOGroup {
  crimeType: string;
  count: number;
  items: any[];
}

export function PIPatterns() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'temporal' | 'hotspots' | 'modus_operandi'>('temporal')
  const [trendData, setTrendData] = useState<any[]>([])
  const [emergingPatterns, setEmergingPatterns] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [moData, setMoData] = useState<MOGroup[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // In demo mode, return sample pattern data immediately
      if (isDemoMode()) {
        const demo = demoPatternData();
        setTrendData(demo.trends.trends ?? []);
        setEmergingPatterns(demo.emerging.threats ?? []);
        setHotspots((demo.clusters.clusters ?? []).map((c: any, i: number) => ({
          id: `hs-demo-${i}`, name: c.area || `Zone ${i + 1}`, risk_score: c.density === 'high' ? 80 : 55,
          incident_count: c.crime_count || 0, crime_types: [c.dominant_crime_type || 'Unknown'],
        })));
        const grouped: Record<string, any[]> = {};
        for (const p of (demo.emerging.threats ?? [])) {
          const type = p.pattern_type || 'Unknown';
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push(p);
        }
        setMoData(Object.entries(grouped).map(([crimeType, items]) => ({ crimeType, count: items.length, items })));
        setLoading(false);
        return;
      }
      const [trendsRes, patternsRes] = await Promise.all([
        fetch(`/api/analytics/trends?station_id=${user?.station_id}&days=180`,
          { headers: authHeaders() }).then(r => r.json().catch(() => ({}))),
        fetch(`/api/intelligence/v1/patterns?pattern_type=emerging&days=90&station_id=${user?.station_id}`,
          { headers: authHeaders() }).then(r => r.json().catch(() => ({}))),
      ])
      setTrendData(trendsRes?.trends ?? trendsRes?.trend ?? [])
      const rawPatterns = patternsRes?.patterns ?? patternsRes?.threats ?? []
      // Flatten pattern.data into top-level fields for table rendering
      const flattened = rawPatterns.map((p: any) => ({
        ...p.data,
        pattern_type: p.data?.pattern_type || p.pattern_type || 'Unknown',
        type: p.data?.type || p.pattern_type || 'Unknown',
        location: p.data?.location || p.data?.primary_location || p.data?.centroid?.lat ? `${p.data.centroid.lat}, ${p.data.centroid.lng}` : '—',
        primary_location: p.data?.primary_location || p.data?.location || '—',
        trend: p.data?.trend || p.data?.change_ratio ? `+${Math.round(p.data.change_ratio * 100)}%` : undefined,
        confidence: p.data?.confidence || (p.actionable ? 85 : 60),
        risk_level: p.data?.severity || p.data?.risk_level || (p.actionable ? 'high' : 'medium'),
        description: p.data?.description || p.recommendation || 'Pattern detected',
        id: p.data?.id || p.data?.crime_type || Math.random().toString(36).slice(2),
      }))
      setEmergingPatterns(flattened)

      fetch(`/api/geo/v1/map/hotspots?district_id=${user?.district_id}`, { headers: authHeaders() })
        .then(r => r.json().catch(() => ({})))
        .then(d => setHotspots(d?.hotspots ?? d ?? []))
        .catch(() => console.warn('[PIPatterns] Hotspot fetch failed'))

      const grouped: Record<string, any[]> = {}
      for (const p of flattened) {
        const type = p.pattern_type || p.type || 'Unknown'
        if (!grouped[type]) grouped[type] = []
        grouped[type].push(p)
      }
      setMoData(Object.entries(grouped).map(([crimeType, items]) => ({ crimeType, count: items.length, items })))
    } catch (e) {
      console.warn('[PIPatterns] Patterns fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [user?.station_id, user?.district_id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <PIPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-text-primary" />
          <div>
            <h1 className="text-base font-semibold text-service-blue">Crime Patterns & Intelligence</h1>
            <p className="text-xs text-text-tertiary">{user?.station_name} · Station Crime Intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { toast.info('This feature is under development and will be available soon.'); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-hover-bg text-cyan-300 border border-border-primary hover:bg-cyan-500/30 transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-primary pb-2">
        {[
          { id: 'temporal', label: 'Temporal Analysis' },
          { id: 'hotspots', label: 'Hotspots & Heatmaps' },
          { id: 'modus_operandi', label: 'Modus Operandi' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-xs px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-hover-bg text-cyan-300 border border-border-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-hover-bg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'temporal' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-xl border border-border-primary bg-bg-card p-4">
              <h3 className="text-xs font-medium text-text-primary mb-3">6-Month Crime Trend vs Baseline</h3>
              <div className="h-64">
                <UnifiedTrendChart
                  data={trendData}
                  showForecast={true}
                  emptyTitle="No trend data"
                  emptyDescription="Not enough FIRs for trend"
                />
              </div>
            </div>

            <div className="col-span-1 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-service-blue" />
                <h3 className="text-xs font-medium text-service-blue">AI Recommendations</h3>
              </div>
              <div className="space-y-3 flex-1">
                <div className="p-3 rounded-lg bg-bg-card border border-border-primary">
                  <p className="text-xs text-text-primary">Increase patrol on 100ft Road between 18:00 and 22:00.</p>
                  <p className="text-[10px] text-text-tertiary mt-1">Based on chain snatching pattern</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-card border border-border-primary">
                  <p className="text-xs text-text-primary">Review recent cyber fraud FIRs for common bank accounts.</p>
                  <p className="text-[10px] text-text-tertiary mt-1">Spike detected in digital crimes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-primary bg-bg-card p-4 mt-2">
            <h3 className="text-xs font-medium text-text-primary mb-3">Emerging Crime Patterns</h3>
            <table className="w-full text-xs">
              <thead className="border-b border-border-primary">
                <tr className="text-text-tertiary text-[10px]">
                  <th className="text-left py-2">Pattern Type</th>
                  <th className="text-left py-2">Primary Location</th>
                  <th className="text-right py-2">Trend</th>
                  <th className="text-right py-2">AI Confidence</th>
                  <th className="text-center py-2">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary">
                {emergingPatterns.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-center text-text-tertiary">No emerging patterns detected</td></tr>
                ) : (
                  emergingPatterns.map((p: any, i: number) => (
                    <tr key={p.id ?? i} className="hover:bg-hover-bg transition-colors">
                      <td className="py-2.5 text-text-primary">{p.pattern_type || p.type || 'Unknown'}</td>
                      <td className="py-2.5 text-text-secondary">{p.location || p.primary_location || '—'}</td>
                      <td className="py-2.5 text-right text-alert-red tabular-nums">{p.trend || (p.confidence ? `+${p.confidence}%` : '—')}</td>
                      <td className="py-2.5 text-right text-text-secondary tabular-nums">{p.confidence ? `${p.confidence}%` : '—'}</td>
                      <td className="py-2.5 text-center"><StatusBadge status={p.risk_level || p.risk || 'medium'} size="sm" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'hotspots' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-alert-red" /> High-Risk Hotspots
            </h3>
            {hotspots.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">No hotspot data available for this district</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {hotspots.slice(0, 10).map((h, i) => (
                  <div key={h.id || i} className="p-3 rounded-lg border border-border-primary bg-hover-bg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-primary">{h.name || `Hotspot ${i + 1}`}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        h.risk_score >= 80 ? 'bg-red-500/20 text-red-400' :
                        h.risk_score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>{h.risk_score}</span>
                    </div>
                    <p className="text-[10px] text-text-tertiary">{h.incident_count} incidents</p>
                    {h.crime_types && h.crime_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {h.crime_types.map((ct, ci) => (
                          <span key={ci} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-card text-text-tertiary">{ct}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'modus_operandi' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-service-blue" /> Modus Operandi by Crime Type
            </h3>
            {moData.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">No MO patterns available</p>
            ) : (
              <div className="space-y-4">
                {moData.map((group, gi) => (
                  <div key={gi}>
                    <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">{group.count}</span>
                      {group.crimeType}
                    </h4>
                    <div className="space-y-2 ml-4">
                      {group.items.slice(0, 5).map((item: any, ii: number) => (
                        <div key={ii} className="p-2.5 rounded-lg border border-border-secondary bg-hover-bg">
                          <p className="text-xs text-text-primary">{item.description || item.pattern_type || 'Pattern detected'}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-text-tertiary">
                            {item.location && <span>📍 {item.location}</span>}
                            {item.confidence && <span>Confidence: {item.confidence}%</span>}
                            {item.detected_at && <span>{new Date(item.detected_at).toLocaleDateString('en-IN')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
