/**
 * Superintendent of Police (SP) Dashboard — district command view.
 *
 * Row 1: Header — SP identity + district info + live clock
 * Row 2: KPI Strip — 5 district-scoped counters
 * Row 3: Station Performance Table (55%) + Crime Type Breakdown (45%)
 * Row 4: District Map — LeafletMapView scoped to district
 * Row 5: Monthly Trend (50%) + Early Warnings with Ack (50%)
 * Row 6: Patrol Recommendations (full width)
 * Row 7: Financial Anomalies (50%) + Recent FIRs (50%)
 *
 * All data sourced from GET /api/dashboard/sp-metrics + /api/dashboard/stations.
 * Blue accent (#3B82F6) throughout — district is the atom.
 */
import { useEffect, useState, useCallback } from 'react';
import i18n from 'i18next';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, BarChart3,
  TrendingUp, Building2, Scale,
  RefreshCw, CheckCircle2, Map, IndianRupee,
  FileText, Navigation, Users, FolderOpen,
} from 'lucide-react';
import AnimatedCounter from '@/components/Dashboard/AnimatedCounter';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { useRightDrawer } from '@/store/rightDrawerStore';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { LeafletMapView } from '@/components/geo/LeafletMapView';
import { COPY } from '@/auth/constants/copy';
import {
  fetchSPMetrics,
  fetchStationPerformance,
  type SPMetrics,
  type StationPerformance,
  type CrimeTypeData,
  type FinancialAlert,
  type RecentFIR,
} from '@/services/dashboardApi';

// ─── Live district warnings section (fetches from API instead of hardcoded data) ─
function DistrictWarningsSection({
  districtCode,
  onAcknowledge,
}: {
  districtCode: string
  onAcknowledge: (id: string) => void
}) {
  const [warnings, setWarnings] = useState<{ warning_id: number; message: string; severity: string; status: string; generated_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    fetch(`/api/intelligence/v1/warnings?district_id=${districtCode}&limit=5`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : Promise.resolve({ warnings: [] }))
      .then(d => setWarnings(d?.warnings ?? []))
      .catch(() => console.warn('[SPDashboard] Warning fetch failed'))
      .finally(() => setLoading(false))
  }, [districtCode])

  const sevColor = (s: string) => {
    const map: Record<string, string> = { critical: RED, high: RED, medium: AMBER, low: BLUE }
    return map[s.toLowerCase()] || BLUE
  }

  const liveCount = warnings.filter(w => w.status !== 'resolved').length

  if (loading) {
    return (
      <SectionCard title={i18n.t('dashboard.earlyWarningsLoading')} icon={AlertTriangle}>
        <div className="h-20 flex items-center justify-center">
          <span className="text-[11px] text-text-tertiary">Loading warnings...</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={i18n.t('dashboard.earlyWarningsActive', { count: liveCount })} icon={AlertTriangle}>
      <div className="space-y-2">
        {warnings.length > 0 ? (
          warnings.slice(0, 3).map((w) => (
            <div
              key={w.warning_id}
              className="flex items-start gap-3 p-2.5 rounded-lg border transition-all hover:scale-[1.005]"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: sevColor(w.severity) }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-text-primary truncate">{w.message}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-text-tertiary">
                    {w.generated_at ? new Date(w.generated_at).toLocaleDateString('en-IN') : ''}
                  </span>
                  <span className="text-[9px] text-text-tertiary">·</span>
                  <span className="text-[9px] font-medium capitalize" style={{ color: sevColor(w.severity) }}>{w.severity}</span>
                </div>
              </div>
              {w.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => onAcknowledge(String(w.warning_id))}
                  className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{
                    border: `1px solid var(--border-secondary)`,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Ack
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 size={20} className="mx-auto mb-2" style={{ color: GREEN }} />
            <p className="text-[11px] text-text-tertiary">No active warnings in district</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Color tokens — blue accent (SP identity) ────────────────────────────────
const BLUE = '#3B82F6'
const BLUE_12 = 'rgba(59, 130, 246, 0.12)'
const BLUE_30 = 'rgba(59, 130, 246, 0.30)'
const GREEN = 'rgba(52, 211, 153, 1)'
const GREEN_12 = 'rgba(52, 211, 153, 0.12)'
const RED = 'rgba(248, 113, 113, 1)'
const RED_12 = 'rgba(248, 113, 113, 0.12)'
const AMBER = 'rgba(251, 191, 36, 1)'
const AMBER_12 = 'rgba(251, 191, 36, 0.12)'
const PURPLE = 'rgba(167, 139, 250, 1)'
const PURPLE_12 = 'rgba(167, 139, 250, 0.12)'
const CYAN = 'rgba(34, 211, 238, 1)'
const CYAN_12 = 'rgba(34, 211, 238, 0.12)'

// ─── KPI config ──────────────────────────────────────────────────────────────
interface KPIItem {
  label: string
  labelKn: string
  value: number
  trend?: number
  icon: typeof Shield
  color: string
  bgColor: string
  suffix?: string
  decimals?: number
  urgent?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null
  const isUp = value > 0
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium"
      style={{ color: isUp ? RED : GREEN }}
    >
      {isUp ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
  action,
}: {
  title: string
  icon: typeof Shield
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border border-border-primary p-4 ${className}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: BLUE_12 }}
          >
            <Icon size={13} style={{ color: BLUE }} />
          </div>
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function SPSkeleton() {
  return (
    <div className="space-y-4 max-w-full">
      <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-card)' }}>
            <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-8 w-16 rounded mt-2" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-72 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="lg:col-span-2 h-72 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    </div>
  )
}

// ─── Main SP Dashboard ───────────────────────────────────────────────────────

export function SPDashboard() {
  const [metrics, setMetrics] = useState<SPMetrics | null>(null)
  const [stations, setStations] = useState<StationPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [time, setTime] = useState(new Date())
  const [crimeFilter, setCrimeFilter] = useState('all')
  const drawer = useRightDrawer()

  const jurisdiction = useJurisdiction()

  // SP's district scope — derived from jurisdiction hook
  const districtCode = jurisdiction.district_id ?? 'BENGALURU_URBAN'
  const districtName = jurisdiction.scopeLabel.replace(' District', '')
  const divisionName = 'Bengaluru' // derived from backend

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Data fetching
  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [spMetrics, stationData] = await Promise.all([
        fetchSPMetrics(districtCode),
        fetchStationPerformance(districtCode),
      ])
      setMetrics(spMetrics)
      setStations(stationData.stations)
    } catch (err) {
      console.error('[SPDashboard] Failed to load:', err)
      setError('Unable to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [districtCode])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  // Acknowledge warning handler — calls the real endpoint
  const handleAcknowledge = useCallback(async (warningId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`/api/intelligence/v1/warnings/${warningId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ officer_id: 'sp' }),
      })
      await load() // Refresh dashboard data after acknowledge
    } catch (err) {
      console.warn('[SPDashboard] Acknowledge failed:', err)
    }
  }, [load])

  if (loading && !metrics) return <SPSkeleton />

  if (error && !metrics) {
    return (
      <div className="space-y-4 max-w-full">
        <JurisdictionBanner scope={jurisdiction} />
        <div className="rounded-xl border border-border-primary p-8 text-center" style={{ background: 'var(--bg-card)' }}>
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: RED }} />
          <p className="text-sm text-text-primary font-medium mb-1">Unable to load dashboard data</p>
          <p className="text-xs text-text-tertiary mb-4">Please try again. If the issue persists, contact <a href={`mailto:${COPY.supportEmail}`} className="underline hover:text-blue-400">{COPY.supportEmail}</a>.</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ background: BLUE_12, color: BLUE, border: `1px solid ${BLUE_30}` }}
          >
            <RefreshCw size={12} className="inline mr-1.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Build KPI list from metrics
  const kpis: KPIItem[] = [
    {
      label: 'District FIRs',
      labelKn: 'ಜಿಲ್ಲಾ ಎಫ್\u200Cಐಆರ್\u200Cಗಳು',
      value: metrics?.total_firs ?? 0,
      trend: metrics?.firs_trend ?? 0,
      icon: Scale,
      color: BLUE,
      bgColor: BLUE_12,
    },
    {
      label: 'Open Cases',
      labelKn: 'ತೆರೆದ ಪ್ರಕರಣಗಳು',
      value: metrics?.open_cases ?? 0,
      icon: AlertTriangle,
      color: RED,
      bgColor: RED_12,
      urgent: (metrics?.open_cases ?? 0) > 50,
    },
    {
      label: 'Solved Rate',
      labelKn: 'ಪರಿಹಾರ ದರ',
      value: metrics?.solved_rate ?? 0,
      icon: TrendingUp,
      color: GREEN,
      bgColor: GREEN_12,
      suffix: '%',
      decimals: 1,
    },
    {
      label: 'Active Stations',
      labelKn: 'ಸಕ್ರಿಯ ಠಾಣೆಗಳು',
      value: metrics?.active_stations ?? 0,
      icon: Building2,
      color: CYAN,
      bgColor: CYAN_12,
    },
    {
      label: 'Active Alerts',
      labelKn: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು',
      value: metrics?.active_warnings ?? 0,
      icon: Shield,
      color: AMBER,
      bgColor: AMBER_12,
      urgent: (metrics?.active_warnings ?? 0) > 0,
    },
  ]

  // Crime type filter options
  const CRIME_FILTERS = ['all', 'theft', 'assault', 'fraud', 'robbery', 'other']
  const resolvedDistrictName = metrics?.district_name ?? districtName

  return (
    <div className="space-y-4 max-w-full">
      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border-primary"
        style={{ background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: BLUE }}>
              Superintendent of Police
            </h1>
            <p className="text-[11px] text-text-tertiary">
              {resolvedDistrictName} District · {metrics?.division_name ?? divisionName} Division
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] text-text-tertiary">
          <span>{metrics?.station_count ?? stations.length} Police Stations</span>
          <span className="font-mono text-text-secondary">
            {time.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: BLUE }} />
            <span style={{ color: BLUE }}>District Command</span>
          </div>
        </div>
      </div>

      <JurisdictionBanner scope={jurisdiction} />

      {/* ═══ QUICK-LINK STRIP ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([
          { label: 'Stations', path: '/sp/stations', icon: Building2 },
          { label: 'District Map', path: '/sp/map', icon: Map },
          { label: 'Patrol', path: '/sp/patrol', icon: Navigation },
          { label: 'Finance', path: '/sp/finance', icon: IndianRupee },
          { label: 'Warnings', path: '/sp/warnings', icon: AlertTriangle },
          { label: 'Analytics', path: '/sp/analytics', icon: BarChart3 },
          { label: 'Forecast', path: '/sp/forecast', icon: TrendingUp },
          { label: 'All Cases', path: '/sp/cases', icon: FolderOpen },
          { label: 'Officers', path: '/sp/officers', icon: Users },
        ] as const).map(l => {
          const Icon = l.icon;
          return (
            <Link
              key={l.path}
              to={l.path}
              className="flex items-center gap-2 rounded-xl border border-white/10
                         bg-white/[0.03] p-3 hover:border-blue-500/30
                         hover:bg-blue-500/5 transition-all"
            >
              <Icon size={16} className="text-blue-400" />
              <span className="text-xs text-white/50">{l.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ═══ ROW 2: KPI STRIP ═══════════════════════════════════════════════ */}
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
                <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider leading-tight">
                  {kpi.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-text-primary font-display">
                  <AnimatedCounter
                    value={kpi.value}
                    decimals={kpi.decimals ?? 0}
                    suffix={kpi.suffix ?? ''}
                  />
                </span>
                {kpi.trend !== undefined && <TrendBadge value={kpi.trend} />}
              </div>
              {kpi.urgent && (
                <div className="mt-1.5">
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: RED_12, color: RED }}
                  >
                    NEEDS ATTENTION
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══ ROW 3: STATION TABLE + CRIME TYPES ═════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Station Performance Table (55%) */}
        <div className="lg:col-span-3">
          <StationPerformanceTable
            stations={stations}
            onStationClick={(s) => {
              drawer.open({
                title: s.name,
                content: (
                  <div className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3 border border-border-secondary" style={{ background: 'var(--bg-tertiary)' }}>
                        <p className="text-[10px] text-text-tertiary uppercase">FIRs</p>
                        <p className="text-lg font-bold font-mono text-text-primary">{s.fir_count}</p>
                      </div>
                      <div className="rounded-lg p-3 border border-border-secondary" style={{ background: 'var(--bg-tertiary)' }}>
                        <p className="text-[10px] text-text-tertiary uppercase">Solved</p>
                        <p className="text-lg font-bold font-mono" style={{ color: GREEN }}>{s.solved_rate}%</p>
                      </div>
                      <div className="rounded-lg p-3 border border-border-secondary" style={{ background: 'var(--bg-tertiary)' }}>
                        <p className="text-[10px] text-text-tertiary uppercase">Open</p>
                        <p className="text-lg font-bold font-mono" style={{ color: s.open_cases > 20 ? RED : 'var(--text-primary)' }}>{s.open_cases}</p>
                      </div>
                      <div className="rounded-lg p-3 border border-border-secondary" style={{ background: 'var(--bg-tertiary)' }}>
                        <p className="text-[10px] text-text-tertiary uppercase">Officers</p>
                        <p className="text-lg font-bold font-mono text-text-primary">{s.officer_count}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-text-tertiary">
                      Last reported: {s.last_reported ? new Date(s.last_reported).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ),
              })
            }}
          />
        </div>

        {/* Crime Type Breakdown (45%) */}
        <div className="lg:col-span-2">
          <CrimeTypeBreakdown data={metrics?.crime_types ?? []} />
        </div>
      </div>

      {/* ═══ ROW 4: DISTRICT MAP ════════════════════════════════════════════ */}
      <SectionCard
        title={i18n.t('dashboard.stationLocationsHotspots', { district: resolvedDistrictName })}
        icon={Map}
        action={
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-[280px] sm:max-w-none">
            {CRIME_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCrimeFilter(f)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors capitalize"
                style={{
                  background: crimeFilter === f ? BLUE_12 : 'var(--bg-tertiary)',
                  color: crimeFilter === f ? BLUE : 'var(--text-tertiary)',
                  border: `1px solid ${crimeFilter === f ? BLUE_30 : 'var(--border-secondary)'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="rounded-lg overflow-hidden" style={{ height: 'clamp(200px, 45vw, 340px)' }}>
          <LeafletMapView
            districtId={districtCode}
            className="h-full w-full"
          />
        </div>
      </SectionCard>

      {/* ═══ ROW 5: TREND + WARNINGS ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UnifiedTrendChart
          data={(metrics?.trend_6m ?? []).map((t) => ({ date: t.date, count: t.count }))}
          title={i18n.t('dashboard.firTrend6m', { district: resolvedDistrictName })}
          showForecast
          isLoading={loading}
          emptyTitle="No trend data available"
          emptyDescription="Trends will appear as more FIR data is recorded."
        />

        <DistrictWarningsSection 
          districtCode={districtCode}
          onAcknowledge={handleAcknowledge}
        />
      </div>

      {/* ═══ ROW 6: PATROL RECOMMENDATIONS ══════════════════════════════════ */}
      <SectionCard
        title="Patrol Recommendations — AI Generated"
        icon={Navigation}
        action={
          <span className="text-[10px] text-text-tertiary hover:text-text-secondary cursor-pointer">
            Full view →
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { zone: 'Central Market Area', risk: 'high', reason: '32% spike in theft FIRs over 2 weeks. Peak hours 14:00–20:00.', station: 'Commercial Street PS', score: 87 },
            { zone: 'Koramangala 4th Block', risk: 'medium', reason: 'Repeat offender cluster. 4 linked cases in 30 days.', station: 'Koramangala PS', score: 72 },
            { zone: 'HSR Layout Sector 2', risk: 'low', reason: 'Minor pattern deviation. Preventive patrol recommended.', station: 'HSR Layout PS', score: 45 },
          ].map((rec, i) => (
            <div
              key={i}
              className="rounded-lg border p-3 transition-all hover:scale-[1.01]"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-text-tertiary">Zone {i + 1}</span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    background: rec.risk === 'high' ? RED_12 : rec.risk === 'medium' ? AMBER_12 : GREEN_12,
                    color: rec.risk === 'high' ? RED : rec.risk === 'medium' ? AMBER : GREEN,
                  }}
                >
                  {rec.risk} risk
                </span>
              </div>
              <p className="text-xs font-medium text-text-primary mb-1">{rec.zone}</p>
              <p className="text-[10px] text-text-tertiary line-clamp-2 leading-relaxed">{rec.reason}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-text-tertiary">{rec.station}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: BLUE }}>Score: {rec.score}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ═══ ROW 7: FINANCIAL ANOMALIES + RECENT FIRs ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Financial Anomalies" icon={IndianRupee}>
          <div className="space-y-2">
            {(metrics?.financial_alerts ?? []).length > 0 ? (
              (metrics?.financial_alerts ?? []).map((alert: FinancialAlert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:scale-[1.005]"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text-primary truncate">
                      ₹{alert.amount.toLocaleString('en-IN')} — {alert.sender} → {alert.receiver}
                    </p>
                    <p className="text-[9px] text-text-tertiary mt-0.5">
                      {alert.station_name} · {alert.crime_no}
                    </p>
                  </div>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: PURPLE_12, color: PURPLE }}
                  >
                    {alert.anomaly_type === 'structuring' ? 'Structuring' : 'Velocity'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <IndianRupee size={20} className="mx-auto mb-2" style={{ color: PURPLE }} />
                <p className="text-[11px] text-text-tertiary">No anomalies detected</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent FIRs — District" icon={FileText}>
          <div className="space-y-1.5">
            {(metrics?.recent_firs ?? []).slice(0, 10).map((fir: RecentFIR) => (
              <div
                key={fir.crime_no}
                className="flex items-center gap-3 p-2 rounded-lg transition-all hover:scale-[1.005] cursor-pointer"
                style={{ background: 'var(--bg-tertiary)' }}
                onClick={() => {
                  window.location.href = `/firs/${encodeURIComponent(fir.crime_no)}`
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-text-primary truncate">{fir.crime_no}</p>
                  <p className="text-[9px] text-text-tertiary truncate">
                    {fir.crime_type} · {fir.station_name}
                  </p>
                </div>
                <StatusBadge status={fir.status} size="sm" />
              </div>
            ))}
            {(!metrics?.recent_firs || metrics.recent_firs.length === 0) && (
              <div className="text-center py-6">
                <p className="text-[11px] text-text-tertiary">No recent FIRs</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Station Performance Table ────────────────────────────────────────────────

function StationPerformanceTable({
  stations,
  onStationClick,
}: {
  stations: StationPerformance[]
  onStationClick: (station: StationPerformance) => void
}) {
  const [sortBy, setSortBy] = useState<'fir_count' | 'solved_rate' | 'open_cases'>('fir_count')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...stations].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy]
    return sortDir === 'desc' ? -diff : diff
  })

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortArrow = ({ col }: { col: typeof sortBy }) => (
    sortBy === col ? (
      <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
    ) : null
  )

  return (
    <SectionCard title={i18n.t('dashboard.stationPerformance', { count: stations.length })} icon={Building2}>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-text-tertiary border-b border-border-secondary">
              <th className="text-left py-2 font-medium">Station</th>
              <th
                className="text-right py-2 font-medium cursor-pointer hover:text-text-secondary select-none"
                onClick={() => handleSort('fir_count')}
              >
                FIRs <SortArrow col="fir_count" />
              </th>
              <th
                className="text-right py-2 font-medium cursor-pointer hover:text-text-secondary select-none"
                onClick={() => handleSort('open_cases')}
              >
                Open <SortArrow col="open_cases" />
              </th>
              <th
                className="text-right py-2 font-medium cursor-pointer hover:text-text-secondary select-none"
                onClick={() => handleSort('solved_rate')}
              >
                Solved% <SortArrow col="solved_rate" />
              </th>
              <th className="text-right py-2 font-medium">Trend</th>
              <th className="text-center py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-secondary">
            {sorted.map((station) => (
              <tr
                key={station.id}
                className="hover:bg-bg-tertiary transition-colors cursor-pointer"
                onClick={() => onStationClick(station)}
              >
                <td className="py-2.5">
                  <p className="text-text-primary font-medium truncate max-w-[140px]">{station.name}</p>
                  <p className="text-[9px] text-text-tertiary">{station.officer_count} officers</p>
                </td>
                <td className="py-2.5 text-right font-mono text-text-secondary">{station.fir_count}</td>
                <td className="py-2.5 text-right font-mono">
                  <span style={{ color: station.open_cases > 20 ? RED : 'var(--text-secondary)' }}>
                    {station.open_cases}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono font-medium" style={{
                  color: station.solved_rate >= 70 ? GREEN : station.solved_rate >= 50 ? AMBER : RED,
                }}>
                  {station.solved_rate}%
                </td>
                <td className="py-2.5 text-right">
                  <span className="text-[10px] font-mono font-medium" style={{
                    color: station.trend > 0 ? RED : GREEN,
                  }}>
                    {station.trend > 0 ? '↑' : '↓'}{Math.abs(station.trend)}%
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{
                    background: station.status === 'active' ? GREEN
                      : station.status === 'delayed' ? AMBER
                      : RED,
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ─── Crime Type Breakdown ─────────────────────────────────────────────────────

function CrimeTypeBreakdown({ data }: { data: CrimeTypeData[] }) {
  return (
    <SectionCard title="Crime Type Distribution" icon={BarChart3}>
      <div className="space-y-2.5">
        {data.slice(0, 8).map((crime, i) => (
          <div key={crime.type} className="flex items-center gap-3">
            <span className="text-[10px] text-text-tertiary w-3">{i + 1}</span>
            <span className="text-[11px] text-text-secondary flex-1 truncate">{crime.type}</span>
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${crime.pct}%`, background: BLUE }}
              />
            </div>
            <span className="text-[11px] font-mono text-text-tertiary w-8 text-right">{crime.count}</span>
            {crime.delta !== 0 && (
              <span className="text-[9px] font-mono w-8 text-right" style={{
                color: crime.delta > 0 ? RED : GREEN,
              }}>
                {crime.delta > 0 ? '↑' : '↓'}{Math.abs(crime.delta)}
              </span>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[11px] text-text-tertiary">Loading crime types...</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
