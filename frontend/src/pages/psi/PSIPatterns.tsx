import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, TrendingUp, Target, Zap,
} from 'lucide-react';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { PSIPageSkeleton } from '@/components/psi/PSIPageSkeleton';
import { isDemoMode, demoPatternData } from '@/services/demoData';

const PURPLE = '#8B5CF6';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Section Card Wrapper ──────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, children, className = '',
}: {
  title: string; icon: typeof AlertTriangle; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-400"><Icon size={14} /></span>
        <h3 className="text-xs font-medium text-white/70">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSI PATTERNS MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIPatterns() {
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState('3m');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // In demo mode, skip backend calls and use sample data
      if (isDemoMode()) {
        setData(demoPatternData());
        setLoading(false);
        return;
      }
      const [seasonal, emerging, clusters, trends] = await Promise.all([
        fetch(`/api/intelligence/v1/patterns?pattern_type=seasonal&days=${dateRange === '3m' ? 90 : 180}`, { headers: authHeaders() }).then((r) => r.json().catch(() => { console.warn('[PSIPatterns] seasonal parse error'); return {}; })),
        fetch(`/api/intelligence/v1/patterns?pattern_type=emerging&days=7`, { headers: authHeaders() }).then((r) => r.json().catch(() => { console.warn('[PSIPatterns] emerging parse error'); return {}; })),
        fetch(`/api/intelligence/v1/patterns?pattern_type=cluster&days=${dateRange === '3m' ? 90 : 180}`, { headers: authHeaders() }).then((r) => r.json().catch(() => { console.warn('[PSIPatterns] clusters parse error'); return {}; })),
        fetch(`/api/analytics/trends?days=${dateRange === '3m' ? 90 : 180}`, { headers: authHeaders() }).then((r) => r.json().catch(() => { console.warn('[PSIPatterns] trends parse error'); return {}; })),
      ]);
      setData({ seasonal, emerging, clusters, trends });
    } catch (e) {
      console.warn('[PSIPatterns] partial fetch error:', e);
      // Fall back to demo data
      setData(demoPatternData());
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PSIPageSkeleton />;

  const matrix = data?.seasonal?.matrix ?? Array.from({ length: 7 }, () => Array(24).fill(0));
  const maxVal = Math.max(...(matrix.flat() as number[]), 1);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-base font-semibold" style={{ color: PURPLE }}>Crime Pattern Analysis</h1>
            <p className="text-xs text-white/40">Station-scoped · AI-assisted detection</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['3m', '6m'].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                dateRange === r
                  ? 'text-purple-300 border border-purple-500/40'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}
              style={dateRange === r ? { background: 'rgba(139,92,246,0.12)' } : {}}
            >
              {r === '3m' ? '3 Months' : '6 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Peak Crime Hour', value: data?.seasonal?.peak_hour ?? '—', icon: '⏰' },
          { label: 'Peak Crime Day', value: data?.seasonal?.peak_day ?? '—', icon: '📅' },
          { label: 'Crime Clusters', value: data?.clusters?.total ?? 0, icon: '🎯' },
          {
            label: 'Emerging Threats', value: data?.emerging?.threats?.length ?? 0, icon: '⚠',
            urgent: (data?.emerging?.threats?.length ?? 0) > 0,
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border p-4 bg-white/[0.03] ${
              k.urgent ? 'border-red-500/30' : 'border-white/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{k.icon}</span>
              <span className="text-[10px] text-white/40">{k.label}</span>
            </div>
            <p className={`text-xl font-bold ${k.urgent ? 'text-red-400' : 'text-purple-300'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Heatmap + trend */}
      <div className="grid grid-cols-2 gap-4">
        {/* Day × Hour heatmap */}
        <SectionCard title="Crime Density — Day × Hour" icon={AlertTriangle}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 360 }}>
              <div className="flex gap-0.5 mb-1 pl-6">
                {Array.from({ length: 24 }, (_, i) => i).filter((_, i) => i % 3 === 0).map((h) => (
                  <div key={h} className="text-[8px] text-white/20" style={{ width: 42, textAlign: 'center' }}>
                    {h}h
                  </div>
                ))}
              </div>
              {DAYS.map((day, di) => (
                <div key={day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="text-[9px] text-white/30" style={{ width: 20 }}>{day.slice(0, 2)}</span>
                  {(matrix[di] ?? Array(24).fill(0)).map((val: number, hi: number) => {
                    const intensity = val / maxVal;
                    return (
                      <div
                        key={hi}
                        title={`${day} ${hi}:00 — ${val} incidents`}
                        className="h-5 rounded-sm flex-1"
                        style={{ backgroundColor: `rgba(139,92,246,${0.05 + intensity * 0.85})` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Trend chart */}
        <SectionCard title="Crime Type Trend" icon={TrendingUp}>
          <div style={{ height: 200 }}>
            <UnifiedTrendChart
              data={data?.trends?.trends ?? []}
              emptyTitle="No trend data"
              emptyDescription="Not enough data for trend analysis"
            />
          </div>
        </SectionCard>
      </div>

      {/* Cluster results */}
      <SectionCard title="Crime Clusters Detected" icon={Target}>
        {(data?.clusters?.clusters ?? []).length === 0 ? (
          <p className="text-xs text-white/30">No significant clusters detected in this period</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(data?.clusters?.clusters ?? []).slice(0, 6).map((c: any, i: number) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-medium text-white/80 mb-1">{c.area ?? `Cluster ${i + 1}`}</p>
                <p className="text-[10px] text-white/40">{c.crime_count ?? 0} incidents</p>
                <p className="text-[10px] text-white/40">{c.dominant_crime_type ?? ''}</p>
                <span className={`mt-2 text-[10px] px-1.5 py-0.5 rounded-full inline-block ${
                  c.density === 'high' ? 'bg-red-500/20 text-red-400' :
                  c.density === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {c.density ?? 'low'} density
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Emerging threats */}
      <SectionCard title="Emerging Threats — AI Detected" icon={Zap}
        className="border-purple-500/20 bg-purple-500/5">
        {(data?.emerging?.threats ?? []).length === 0 ? (
          <p className="text-xs text-white/30">No emerging threats detected</p>
        ) : (
          <div className="space-y-3">
            {(data?.emerging?.threats ?? []).map((t: any, i: number) => (
              <div key={i} className="flex items-start gap-3 border-l-2 border-purple-500/40 pl-3">
                <div>
                  <p className="text-xs text-white/80 font-medium">{t.pattern_type}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{t.description}</p>
                  <p className="text-[9px] text-white/30 mt-1">
                    {t.detected_at ? new Date(t.detected_at).toLocaleDateString('en-IN') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
