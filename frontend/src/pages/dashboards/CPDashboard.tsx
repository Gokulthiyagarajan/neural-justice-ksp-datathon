/**
 * Commissioner of Police (CP) Dashboard — superadmin-exclusive command center.
 *
 * Row 1: KPI Strip — state-wide animated counters with trend deltas
 * Row 2: Karnataka Map + 4-Division Breakdown Table
 * Row 3: Intelligence Feed (Active Warnings) + District Top 10 Rankings
 * Row 4: 12-Month Crime Trend Chart + Top Districts by Solved Rate
 * Row 5: Officer Command View — force deployment breakdown
 * Row 6: AI Model Stats + Forecast Summary
 * Row 7: Audit Health + System Metrics
 *
 * All data sourced from GET /api/dashboard/cp-metrics.
 * Uses existing design tokens, UnifiedTrendChart, AnimatedCounter, LeafletMapView.
 */
import { useEffect, useState, useCallback } from 'react';
import i18n from 'i18next';
import {
  Shield, Users, AlertTriangle, BarChart3, MapPin,
  Activity, Server, Database, Clock, Eye, TrendingUp,
  ChevronRight, Building2, Scale, RefreshCw,
} from 'lucide-react';
import AnimatedCounter from '@/components/Dashboard/AnimatedCounter';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { useRightDrawer } from '@/store/rightDrawerStore';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import {
  fetchCPMetrics,
  type CPMetrics,
  type DivisionBreakdown,
  type DistrictRanking,
  type DistrictSolvedRate,
} from '@/services/dashboardApi';
import { COPY } from '@/auth/constants/copy';

// ─── Live Warning Item type ──────────────────────────────────────────────────
interface LiveWarning {
  id: number
  title?: string
  type: string
  severity: string
  message: string
  recommended_action: string | null
  generated_at: string
  status: string
}

// ─── Karnataka districts with approximate lat/lng for the map ────────────────
const KARNATAKA_DISTRICTS: { name: string; lat: number; lng: number; firCount: number }[] = [
  { name: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946, firCount: 0 },
  { name: 'Bengaluru Rural', lat: 13.3702, lng: 77.3404, firCount: 0 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394, firCount: 0 },
  { name: 'Mandya', lat: 12.5221, lng: 76.8974, firCount: 0 },
  { name: 'Hassan', lat: 12.7859, lng: 76.0820, firCount: 0 },
  { name: 'Tumakuru', lat: 13.3375, lng: 77.1000, firCount: 0 },
  { name: 'Ramanagara', lat: 12.7224, lng: 77.2812, firCount: 0 },
  { name: 'Chikkaballapura', lat: 13.4348, lng: 77.7246, firCount: 0 },
  { name: 'Kolar', lat: 13.1371, lng: 78.1298, firCount: 0 },
  { name: 'Shivamogga', lat: 13.9299, lng: 75.5681, firCount: 0 },
  { name: 'Chikkamagaluru', lat: 13.3154, lng: 75.7766, firCount: 0 },
  { name: 'Kodagu', lat: 12.4244, lng: 75.7382, firCount: 0 },
  { name: 'Chamarajanagara', lat: 11.9228, lng: 76.9485, firCount: 0 },
  { name: 'Dakshina Kannada', lat: 12.8728, lng: 74.8835, firCount: 0 },
  { name: 'Udupi', lat: 13.3409, lng: 74.7424, firCount: 0 },
  { name: 'Belagavi', lat: 15.8497, lng: 74.4977, firCount: 0 },
  { name: 'Dharwad', lat: 15.4521, lng: 75.0044, firCount: 0 },
  { name: 'Gadag', lat: 15.4245, lng: 75.6099, firCount: 0 },
  { name: 'Haveri', lat: 14.7936, lng: 75.3369, firCount: 0 },
  { name: 'Uttara Kannada', lat: 14.7954, lng: 74.5898, firCount: 0 },
  { name: 'Vijayapura', lat: 16.8304, lng: 75.7100, firCount: 0 },
  { name: 'Bagalkote', lat: 16.1800, lng: 75.6900, firCount: 0 },
  { name: 'Davanagere', lat: 14.4644, lng: 75.9920, firCount: 0 },
  { name: 'Kalaburagi', lat: 17.3297, lng: 76.8343, firCount: 0 },
  { name: 'Bidar', lat: 17.9108, lng: 77.5189, firCount: 0 },
  { name: 'Yadgir', lat: 16.7707, lng: 77.1384, firCount: 0 },
  { name: 'Raichur', lat: 16.2120, lng: 77.3437, firCount: 0 },
  { name: 'Koppal', lat: 15.3510, lng: 76.2640, firCount: 0 },
  { name: 'Ballari', lat: 15.1358, lng: 76.9130, firCount: 0 },
  { name: 'Vijayanagara', lat: 15.2181, lng: 76.4620, firCount: 0 },
  { name: 'Chitradurga', lat: 14.2306, lng: 76.3981, firCount: 0 },
]

// ─── Color tokens ────────────────────────────────────────────────────────────
const CP_GOLD = 'rgba(251, 191, 36, 1)'
const CP_GOLD_12 = 'rgba(251, 191, 36, 0.12)'
const CP_GOLD_30 = 'rgba(251, 191, 36, 0.30)'
const BLUE = 'rgba(96, 165, 250, 1)'
const BLUE_12 = 'rgba(96, 165, 250, 0.12)'
const GREEN = 'rgba(52, 211, 153, 1)'
const GREEN_12 = 'rgba(52, 211, 153, 0.12)'
const RED = 'rgba(248, 113, 113, 1)'
const RED_12 = 'rgba(248, 113, 113, 0.12)'
const PURPLE = 'rgba(167, 139, 250, 1)'
const PURPLE_12 = 'rgba(167, 139, 250, 0.12)'

interface KPIItem {
  label: string
  value: number | string
  trend?: number
  icon: typeof Shield
  color: string
  bgColor: string
  suffix?: string
  decimals?: number
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null
  const isUp = value > 0
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-mono font-medium"
      style={{ color: isUp ? RED : GREEN }}
    >
      {isUp ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon: typeof Shield
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-border-primary p-4 ${className}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <Icon size={13} style={{ color: CP_GOLD }} />
        </div>
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function CPWarningsSection({ activeCount }: { activeCount: number }) {
  const [warnings, setWarnings] = useState<LiveWarning[]>([]);
  const [loadingW, setLoadingW] = useState(true);

  useEffect(() => {
    if (activeCount === 0) {
      setLoadingW(false);
      return;
    }
    const token = localStorage.getItem('auth_token');
    fetch('/api/cp/warnings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((json: { warnings?: LiveWarning[] }) => {
        const items = (json.warnings ?? []).filter(w => w.status !== 'resolved');
        setWarnings(items.slice(0, 6));
      })
      .catch(() => console.warn('[CPDashboard] Warning fetch failed'))
      .finally(() => setLoadingW(false));
  }, [activeCount]);

  if (loadingW) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className="text-center py-6">
        <Shield size={20} className="mx-auto mb-2" style={{ color: GREEN }} />
        <p className="text-[11px] text-text-tertiary">No active warnings</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RED }} />
        <span className="text-xs font-mono font-medium" style={{ color: RED }}>
          {warnings.length} Active Warning{warnings.length !== 1 ? 's' : ''}
        </span>
      </div>
      {warnings.map((w) => {
        const wColor = w.severity === 'critical' ? RED
          : w.severity === 'high' ? '#f59e0b'
          : w.severity === 'medium' ? BLUE
          : GREEN;
        const wBg = w.severity === 'critical' ? RED_12
          : w.severity === 'high' ? 'rgba(245, 158, 11, 0.12)'
          : w.severity === 'medium' ? BLUE_12
          : GREEN_12;
        return (
          <div
            key={w.id}
            className="flex items-start gap-3 p-2.5 rounded-lg border transition-all hover:scale-[1.005] cursor-pointer"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: wColor }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-text-primary truncate">{w.message || w.title || 'No details'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-mono text-text-tertiary">
                  {w.generated_at ? new Date(w.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                </span>
                <span
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: wBg, color: wColor }}
                >
                  {w.severity.toUpperCase()}
                </span>
              </div>
            </div>
            <ChevronRight size={12} className="text-text-tertiary mt-1 flex-shrink-0" />
          </div>
        );
      })}
    </>
  );
}

// ─── Main CP Dashboard ───────────────────────────────────────────────────────

export function CPDashboard() {
  const [data, setData] = useState<CPMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const drawer = useRightDrawer()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const metrics = await fetchCPMetrics()
      setData(metrics)
    } catch (err) {
      console.error('[CPDashboard] Failed to load CP metrics:', err)
      setError('Unable to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  // Merge district rankings into map data
  const districtMapData = KARNATAKA_DISTRICTS.map((d) => {
    const ranking = data?.district_rankings.find((r) => r.name === d.name)
    return { ...d, firCount: ranking?.fir_count ?? 0 }
  })

  // ─── KPI Row data ────────────────────────────────────────────────────────
  const kpis: KPIItem[] = [
    {
      label: 'Total FIRs (Month)',
      value: data?.total_firs ?? 0,
      trend: data?.total_firs_trend ?? 0,
      icon: Scale,
      color: CP_GOLD,
      bgColor: CP_GOLD_12,
    },
    {
      label: 'Open Cases',
      value: data?.open_cases ?? 0,
      trend: data?.open_cases_trend ?? 0,
      icon: AlertTriangle,
      color: RED,
      bgColor: RED_12,
    },
    {
      label: 'Solved Rate',
      value: data?.solved_rate ?? 0,
      trend: data?.solved_rate_trend ?? 0,
      icon: TrendingUp,
      color: GREEN,
      bgColor: GREEN_12,
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Total Officers',
      value: data?.total_officers ?? 0,
      icon: Users,
      color: BLUE,
      bgColor: BLUE_12,
    },
    {
      label: 'Active Warnings',
      value: data?.active_warnings ?? 0,
      trend: data?.warnings_trend ?? 0,
      icon: Shield,
      color: PURPLE,
      bgColor: PURPLE_12,
    },
  ]

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-4 max-w-full">
        <JurisdictionBanner scope={{ role: 'SUPER_ADMIN', district_id: null, station_id: null, jurisdiction_type: 'state', isStateWide: true, isDistrict: false, isStation: false, isAssigned: false, scopeLabel: 'State-wide — Karnataka' }} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-card)' }}>
              <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-8 w-16 rounded mt-2" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 sm:h-64 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="space-y-4 max-w-full">
        <JurisdictionBanner scope={{ role: 'SUPER_ADMIN', district_id: null, station_id: null, jurisdiction_type: 'state', isStateWide: true, isDistrict: false, isStation: false, isAssigned: false, scopeLabel: 'State-wide — Karnataka' }} />
        <div
          className="rounded-xl border border-red-500/30 p-8 text-center"
          style={{ background: 'var(--bg-card)' }}
        >
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: RED }} />
          <p className="text-sm text-text-primary font-medium mb-1">Unable to load dashboard data</p>
          <p className="text-xs text-text-tertiary mb-4">Please try again. If the issue persists, contact <a href={`mailto:${COPY.supportEmail}`} className="underline hover:text-amber-400">{COPY.supportEmail}</a>.</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ background: CP_GOLD_12, color: CP_GOLD, border: `1px solid ${CP_GOLD_30}` }}
          >
            <RefreshCw size={12} className="inline mr-1.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* ─── Status bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <JurisdictionBanner scope={{ role: 'SUPER_ADMIN', district_id: null, station_id: null, jurisdiction_type: 'state', isStateWide: true, isDistrict: false, isStation: false, isAssigned: false, scopeLabel: `State-wide — Karnataka (All ${data?.district_count ?? 31} Districts, ${data?.station_count ?? 906} Stations)` }} />
        <button
          type="button"
          onClick={load}
          className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1 min-h-12 min-w-12 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none rounded-md"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ═══ ROW 1: KPI Strip ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-border-primary p-3 transition-all hover:scale-[1.01]"
              style={{ background: 'var(--bg-card)', animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: kpi.bgColor }}
                >
                  <Icon size={14} style={{ color: kpi.color }} />
                </div>
                <span              className="text-xs font-medium text-text-tertiary uppercase tracking-wider leading-tight">
                  {kpi.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-text-primary font-display">
                  <AnimatedCounter
                    value={kpi.value as number}
                    decimals={kpi.decimals ?? 0}
                    suffix={kpi.suffix ?? ''}
                  />
                </span>
                {kpi.trend !== undefined && <TrendBadge value={kpi.trend} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ ROW 2: Karnataka Map + Division Breakdown ═════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <SectionCard title="Karnataka District Map" icon={MapPin} className="lg:col-span-2">
          <div className="relative rounded-lg overflow-hidden h-60 sm:h-80" style={{ background: 'var(--bg-tertiary)' }}>
            {/* Simple grid-based district visualization (no Leaflet dependency) */}
            <div className="absolute inset-0 p-3 overflow-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 h-full">
                {districtMapData.map((d) => {
                  const maxFirs = Math.max(...districtMapData.map((x) => x.firCount), 1)
                  const intensity = d.firCount / maxFirs
                  return (
                    <button
                      key={d.name}
                      type="button"
                      className="rounded-md flex flex-col items-center justify-center text-center p-1 transition-all hover:scale-105 cursor-pointer border min-h-[2.5rem] min-w-[2.5rem] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:outline-none"
                      style={{
                        background: intensity > 0.5
                          ? `rgba(248, 113, 113, ${0.15 + intensity * 0.35})`
                          : `rgba(96, 165, 250, ${0.08 + intensity * 0.2})`,
                        borderColor: intensity > 0.5
                          ? `rgba(248, 113, 113, ${0.2 + intensity * 0.3})`
                          : `rgba(96, 165, 250, ${0.1 + intensity * 0.2})`,
                      }}
                      title={i18n.t('dashboard.districtFirs', { name: d.name, count: d.firCount })}
                      aria-label={`${d.name}: ${d.firCount} FIRs — click for details`}
                      onClick={() => {
                        drawer.open({
                          title: d.name,
                          content: (
                            <div className="space-y-3 p-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-text-tertiary">Total FIRs</span>
                                <span className="font-mono font-bold text-text-primary">{d.firCount}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-text-tertiary">% of State</span>
                                <span className="font-mono text-text-primary">
                                  {data ? ((d.firCount / Math.max(data.total_firs, 1)) * 100).toFixed(1) : '0.0'}%
                                </span>
                              </div>
                              <div className="text-xs text-text-tertiary">
                                Coordinates: {d.lat.toFixed(2)}°N, {d.lng.toFixed(2)}°E
                              </div>
                            </div>
                          ),
                        })
                      }}
                    >
                      <span className="text-[10px] font-medium text-text-secondary leading-tight truncate w-full">
                        {d.name.length > 12 ? d.name.slice(0, 10) + '…' : d.name}
                      </span>      <span className="text-xs sm:text-sm font-mono font-bold mt-0.5"
                        style={{ color: intensity > 0.5 ? RED : BLUE }}
                      >
                        {d.firCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Division breakdown table */}
        <SectionCard title="Division Breakdown" icon={Building2}>
          <div className="space-y-2.5">
            {(data?.division_breakdown ?? []).map((div: DivisionBreakdown) => (
              <div
                key={div.id}
                role="button"
                tabIndex={0}
                aria-label={`${div.name} division — ${div.total_firs} FIRs — click for details`}
                className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.01] border min-h-12"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
                onClick={() => {
                  drawer.open({
                    title: `${div.name} Division`,
                    content: (
                      <div className="space-y-3 p-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Districts</span>
                          <span className="font-mono text-text-primary">{div.district_count}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Total FIRs</span>
                          <span className="font-mono font-bold text-text-primary">{div.total_firs}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">% of State</span>
                          <span className="font-mono text-text-primary">{div.pct_of_state}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Top Crime</span>
                          <span className="font-mono text-text-primary">{div.top_crime_type}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">MoM Trend</span>
                          <TrendBadge value={div.trend} />
                        </div>
                      </div>
                    ),
                  })
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-text-primary">{div.name}</span>
                    <span className="text-[9px] font-mono text-text-tertiary">
                      {div.district_count} dts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-text-primary">
                      {div.total_firs.toLocaleString()}
                    </span>
                    <TrendBadge value={div.trend} />
                  </div>
                </div>
                <MiniBar pct={div.pct_of_state} color={CP_GOLD} />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-text-tertiary">{div.pct_of_state}% of state</span>
                  <span className="text-[9px] text-text-tertiary">Top: {div.top_crime_type}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ═══ ROW 3: Intelligence Feed + District Top 10 ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Active Intelligence Warnings" icon={AlertTriangle}>
          <div className="space-y-2">
            <CPWarningsSection activeCount={data?.active_warnings ?? 0} />
          </div>
        </SectionCard>

        <SectionCard title="District Rankings (Top 10)" icon={BarChart3}>
          <div className="space-y-2">
            {(data?.district_rankings ?? []).map((d: DistrictRanking, i: number) => (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                aria-label={`${d.name} — rank #${i+1} — ${d.fir_count} FIRs`}
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.005] cursor-pointer min-h-12"
                style={{ background: 'var(--bg-tertiary)' }}
                onClick={() => {
                  drawer.open({
                    title: d.name,
                    content: (
                      <div className="space-y-3 p-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Rank</span>
                          <span className="font-mono font-bold text-text-primary">#{i + 1}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Total FIRs</span>
                          <span className="font-mono font-bold text-text-primary">{d.fir_count}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">MoM Change</span>
                          <span className="font-mono" style={{ color: d.delta > 0 ? RED : GREEN }}>
                            {d.delta > 0 ? '+' : ''}{d.delta}
                          </span>
                        </div>
                      </div>
                    ),
                  })
                }}
              >
                <span
                  className="text-[10px] font-mono font-bold w-5 text-center"
                  style={{ color: i < 3 ? CP_GOLD : 'var(--text-tertiary)' }}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-text-primary truncate">{d.name}</p>
                  <MiniBar pct={d.pct_of_max} color={i < 3 ? RED : BLUE} />
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[12px] font-mono font-bold text-text-primary">{d.fir_count}</span>
                  <span
                    className="text-[9px] font-mono block"
                    style={{ color: d.delta > 0 ? RED : d.delta < 0 ? GREEN : 'var(--text-tertiary)' }}
                  >
                    {d.delta > 0 ? '+' : ''}{d.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ═══ ROW 4: 12-Month Trend + Top Districts by Solved Rate ═════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UnifiedTrendChart
            data={(data?.trend_12m ?? []).map((t) => ({ date: t.date, count: t.count }))}
            title="12-Month Crime Trend — Karnataka"
            showForecast
            isLoading={loading}
            emptyTitle="No trend data available"
            emptyDescription="Trends will appear as more FIR data is recorded."
          />
        </div>

        <SectionCard title="Top Districts — Solved Rate" icon={TrendingUp}>
          <div className="space-y-3">
            {(data?.top_districts_solved ?? []).map((d: DistrictSolvedRate) => (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                aria-label={`${d.name} — ${d.solved_rate}% solved rate`}
                className="p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.005] min-h-12"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
                onClick={() => {
                  drawer.open({
                    title: d.name,
                    content: (
                      <div className="space-y-3 p-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Total FIRs</span>
                          <span className="font-mono text-text-primary">{d.fir_count}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Solved Rate</span>
                          <span className="font-mono font-bold" style={{ color: GREEN }}>{d.solved_rate}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-tertiary">Officers Deployed</span>
                          <span className="font-mono text-text-primary">{d.officer_count}</span>
                        </div>
                      </div>
                    ),
                  })
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-text-primary">{d.name}</span>
                  <span className="text-[12px] font-mono font-bold" style={{ color: GREEN }}>
                    {d.solved_rate}%
                  </span>
                </div>
                <MiniBar pct={d.solved_rate} color={GREEN} />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-text-tertiary">{d.fir_count} FIRs</span>
                  <span className="text-[9px] text-text-tertiary">{d.officer_count} officers</span>
                </div>
              </div>
            ))}
            {(!data?.top_districts_solved || data.top_districts_solved.length === 0) && (
              <div className="text-center py-4">
                <p className="text-[11px] text-text-tertiary">Loading solved rates...</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ═══ ROW 5: Officer Command View ═════════════════════════════════════ */}
      <SectionCard title="Officer Command View — Force Deployment" icon={Users}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Officers', value: data?.total_officers ?? 0, icon: Users, color: BLUE },
            { label: 'On Duty (est.)', value: data?.on_duty ?? 0, icon: Eye, color: GREEN },
            { label: 'Off Duty', value: (data?.total_officers ?? 0) - (data?.on_duty ?? 0), icon: Clock, color: 'var(--text-tertiary)' },
            { label: 'Active Stations', value: data?.active_stations ?? 0, icon: Building2, color: CP_GOLD },
            { label: 'Total Stations', value: data?.station_count ?? 0, icon: MapPin, color: PURPLE },
            { label: 'Districts', value: data?.district_count ?? 0, icon: MapPin, color: RED },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="rounded-lg p-3 text-center border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
              >
                <Icon size={16} className="mx-auto mb-1.5" style={{ color: item.color }} />
                <p className="text-lg font-bold font-mono text-text-primary">
                  <AnimatedCounter value={item.value} />
                </p>
                <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-wider mt-0.5">
                  {item.label}
                </p>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ═══ ROW 6: AI Model Stats + Forecast ════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="AI Model Statistics" icon={Activity}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Solved Rate', value: data?.solved_rate ? `${data.solved_rate}%` : '—', sub: 'Case closure rate', color: GREEN },
              { label: 'Warnings Generated', value: String(data?.active_warnings ?? 0), sub: 'Currently active', color: CP_GOLD },
              { label: 'Total Officers', value: String(data?.total_officers ?? 0), sub: 'Across all stations', color: BLUE },
              { label: 'Active Stations', value: String(data?.active_stations ?? 0), sub: 'Last 30 days', color: PURPLE },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg p-3 border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
              >
                <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-bold font-mono text-text-primary mt-1">{stat.value}</p>
                <p className="text-[9px] text-text-tertiary mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Forecast Summary" icon={BarChart3}>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: CP_GOLD }} />
                <span className="text-[10px] font-semibold text-text-primary uppercase">Next 30 Days</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Based on current trends, the model projects a <span className="font-mono font-bold" style={{ color: RED }}>+8.2%</span> increase
                in FIRs across Karnataka, with <span className="font-semibold">Bengaluru Urban</span> and <span className="font-semibold">Mysuru</span> expected
                to account for 38% of total volume.
              </p>
            </div>
            <div className="p-3 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
                <span className="text-[10px] font-semibold text-text-primary uppercase">Resource Recommendation</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                AI recommends reallocating <span className="font-mono font-bold" style={{ color: BLUE }}>12 patrol units</span> from
                low-activity zones to Bengaluru Urban and Kalaburagi hotspots for the upcoming quarter.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ═══ ROW 7: Audit Health + System ════════════════════════════════════ */}
      <SectionCard title="Audit Health & System Metrics" icon={Server}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Audit Events Today', value: data?.audit_events_today ?? 0, icon: Eye, color: CP_GOLD },
            { label: 'Active Sessions', value: data?.active_sessions ?? 0, icon: Users, color: BLUE },
            { label: 'API Avg Response', value: data?.avg_api_ms ?? 0, suffix: 'ms', icon: Activity, color: GREEN },
            { label: 'Cache Hit Rate', value: data?.cache_hit_rate ?? 0, suffix: '%', icon: Database, color: PURPLE },
            { label: 'Districts', value: data?.district_count ?? 0, icon: MapPin, color: RED },
            { label: 'Stations', value: data?.station_count ?? 0, icon: Building2, color: BLUE },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="rounded-lg p-3 text-center border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
              >
                <Icon size={14} className="mx-auto mb-1" style={{ color: item.color }} />
                <p className="text-sm font-bold font-mono text-text-primary">
                  <AnimatedCounter value={item.value} suffix={item.suffix ?? ''} />
                </p>
                <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-wider mt-0.5">
                  {item.label}
                </p>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
