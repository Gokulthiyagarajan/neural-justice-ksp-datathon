/**
 * Police Sub-Inspector (PSI) Dashboard — analytics desk.
 *
 * Row 1: Header — PSI identity + station + live clock
 * Row 2: KPI Strip — Station FIRs, My Assigned, Solved Rate, Active Hotspots
 * Row 3: Assigned FIRs Table (left 55%) + Crime Type Donut + Trend (right 45%)
 * Row 4: Hotspot Map (full width LeafletMapView)
 * Row 5: Seasonal Pattern Heatmap 7×4 (left 50%) + Emerging Threats Feed (right 50%)
 *         + Forecast Widget (below)
 *
 * NO AI Copilot. NO Network Analysis. Analytics focus.
 * Purple accent (#8B5CF6) throughout — analytical, observant, precise.
 */
import { useEffect, useState, useCallback } from 'react';
import i18n from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, FolderOpen, CheckCircle2, MapPin,
  AlertTriangle, RefreshCw, Search, TrendingUp, Calendar,
  Zap, Target,
} from 'lucide-react';
import AnimatedCounter from '@/components/Dashboard/AnimatedCounter';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { LeafletMapView } from '@/components/geo/LeafletMapView';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import {
  fetchPSIMetrics,
  type PSMetrics,
  type EmergingThreat,
} from '@/services/dashboardApi';

// ─── Color tokens — purple accent (PSI identity) ─────────────────────────────
const PURPLE = '#8B5CF6'
const PURPLE_12 = 'rgba(139, 92, 246, 0.12)'
const GREEN = 'rgba(52, 211, 153, 1)'
const RED = 'rgba(248, 113, 113, 1)'
const AMBER = 'rgba(251, 191, 36, 1)'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

// ─── Section Card wrapper ────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, children, className = '', action,
}: {
  title: string; icon: typeof AlertTriangle; children: React.ReactNode
  className?: string; action?: React.ReactNode
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
            style={{ background: PURPLE_12 }}
          >
            <Icon size={13} style={{ color: PURPLE }} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK LINK STRIP
// ═══════════════════════════════════════════════════════════════════════════════
const QUICK_LINKS = [
  { label: 'My Cases', path: '/psi/my-cases', icon: '📋' },
  { label: 'Crime Patterns', path: '/psi/patterns', icon: '🔍' },
  { label: 'Hotspot Map', path: '/psi/hotspots', icon: '🗺️' },
  { label: 'Forecast', path: '/psi/forecast', icon: '📈' },
  { label: 'Reports', path: '/psi/reports', icon: '📄' },
]

function PSIQuickLinks() {
  return (
    <div className="grid grid-cols-5 gap-3 mb-2">
      {QUICK_LINKS.map(l => (
        <Link
          key={l.path}
          to={l.path}
          className="flex flex-col items-center gap-1.5 rounded-xl border
                     border-white/10 bg-white/[0.03] p-3 hover:border-purple-500/30
                     hover:bg-purple-500/5 transition-all"
        >
          <span className="text-lg">{l.icon}</span>
          <span className="text-[10px] text-white/50 text-center">{l.label}</span>
        </Link>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — HEADER
// ═══════════════════════════════════════════════════════════════════════════════
function PSIHeader({
  stationName, districtName, totalFIRs, assignedFIRs,
}: {
  stationName: string; districtName: string; totalFIRs: number; assignedFIRs: number
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border-primary mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🟣</span>
        <div>
          <h1 className="text-base font-semibold" style={{ color: PURPLE }}>
            Police Sub-Inspector
          </h1>
          <p className="text-xs text-text-tertiary">
            Analytics Desk · {stationName} · {districtName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
          <span style={{ color: GREEN }}>On Duty</span>
        </div>
        <span className="text-text-tertiary">
          <span className="text-text-secondary font-medium">{totalFIRs}</span> Station FIRs
        </span>
        <span className="text-text-tertiary">
          <span className="font-medium" style={{ color: PURPLE }}>{assignedFIRs}</span> assigned
        </span>
        <span className="font-mono text-text-tertiary">
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — KPI STRIP
// ═══════════════════════════════════════════════════════════════════════════════
const STATION_KPIS = [
  { id: 'station_firs', label: 'Station FIRs', icon: FileText, color: PURPLE, metricKey: 'total_firs' as const },
  { id: 'assigned_firs', label: 'My Assigned', icon: FolderOpen, color: '#3B82F6', metricKey: 'assigned_firs' as const },
  { id: 'solved_rate', label: 'Solved Rate', icon: CheckCircle2, color: GREEN, metricKey: 'solved_rate' as const, suffix: '%' },
  { id: 'hotspots', label: 'Active Hotspots', icon: MapPin, color: RED, metricKey: 'active_hotspots' as const, urgent: true },
]

function PSIKPIStrip({ metrics }: { metrics: PSMetrics }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {STATION_KPIS.map(kpi => {
        const Icon = kpi.icon
        const value = metrics[kpi.metricKey] ?? 0
        return (
          <div
            key={kpi.id}
            className="rounded-xl border border-border-primary p-3 relative overflow-hidden"
            style={{ background: 'var(--bg-card)' }}
          >
            {kpi.urgent && (value as number) > 0 && (
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: RED }} />
            )}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}15` }}
              >
                <Icon size={14} style={{ color: kpi.color }} />
              </div>
              <span className="text-[10px] text-text-tertiary font-medium">{kpi.label}</span>
            </div>
            <AnimatedCounter
              value={value as number}
              suffix={kpi.suffix ?? ''}
              className="text-xl font-bold text-text-primary tabular-nums"
              duration={1000}
            />
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ASSIGNED FIRS TABLE
// ═══════════════════════════════════════════════════════════════════════════════
function AssignedFIRsTable({
  firs, onFIRClick,
}: {
  firs: PSMetrics['recent_firs']
  onFIRClick: (crimeNo: string) => void
}) {
  const [filter, setFilter] = useState<'all' | 'open' | 'today'>('all')
  const [search, setSearch] = useState('')

  const filtered = firs.filter(fir => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'open' ? fir.status !== 'closed' && fir.status !== 'resolved' && fir.status !== 'chargesheeted' :
      filter === 'today' ? isToday(fir.occurrence_date) : true
    const matchesSearch = !search ||
      fir.crime_no?.toLowerCase().includes(search.toLowerCase()) ||
      fir.crime_type?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <SectionCard title="Assigned FIRs" icon={FileText} action={
      <Link to="/fir-operations" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        Full FIR Explorer →
      </Link>
    }>
      <div className="flex items-center gap-2 mb-3">
        {(['all', 'open', 'today'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-colors capitalize ${
              filter === f
                ? 'border border-purple-500/40'
                : 'text-text-tertiary hover:text-text-secondary border border-border-primary'
            }`}
            style={filter === f ? { background: PURPLE_12, color: PURPLE } : {}}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search FIR / crime type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-[10px] bg-bg-secondary border border-border-primary rounded-lg pl-6 pr-3 py-1 text-text-secondary placeholder-text-tertiary focus:outline-none w-44"
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-[340px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-border-primary" style={{ background: 'var(--bg-primary)' }}>
            <tr className="text-text-tertiary text-[10px]">
              <th className="text-left px-3 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-right px-3 py-2">Date</th>
              <th className="text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {filtered.map(fir => (
              <tr
                key={fir.crime_no}
                className="hover:bg-bg-secondary transition-colors cursor-pointer"
                onClick={() => onFIRClick(fir.crime_no)}
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono text-text-secondary text-[10px]">{fir.crime_no}</span>
                </td>
                <td className="px-3 py-2.5 text-text-secondary truncate max-w-[140px]">{fir.crime_type}</td>
                <td className="px-3 py-2.5 text-right text-text-tertiary text-[10px] tabular-nums">
                  {fir.occurrence_date ? new Date(fir.occurrence_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <StatusBadge status={fir.status} size="sm" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-text-tertiary text-[10px]">
                  No FIRs match your filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — CRIME TYPE DONUT (pure CSS, no library)
// ═══════════════════════════════════════════════════════════════════════════════
const DONUT_COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1']

function CrimeTypeDonut({ crimeTypes }: { crimeTypes: PSMetrics['crime_types'] }) {
  const top = crimeTypes.slice(0, 6)
  const total = top.reduce((s, c) => s + c.count, 0) || 1
  let cumPct = 0

  // Build conic-gradient stops
  const stops: string[] = []
  top.forEach((ct, i) => {
    const start = cumPct
    cumPct += (ct.count / total) * 100
    stops.push(`${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${cumPct}%`)
  })
  if (cumPct < 100) {
    stops.push(`var(--bg-tertiary) ${cumPct}% 100%`)
  }
  const gradient = stops.join(', ')

  return (
    <SectionCard title="Crime Type Breakdown" icon={AlertTriangle}>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
          <div
            className="w-full h-full rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          />
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              top: 20, left: 20, right: 20, bottom: 20,
              background: 'var(--bg-card)',
            }}
          >
            <span className="text-lg font-bold text-text-primary tabular-nums">{total}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {top.map((ct, i) => (
            <div key={ct.type} className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-text-secondary truncate flex-1">{ct.type}</span>
              <span className="text-text-tertiary tabular-nums">{ct.count}</span>
            </div>
          ))}
        </div>
      </div>
      <Link to="/crime-patterns" className="block mt-3 text-[10px] text-text-tertiary hover:text-text-secondary">
        Full analysis →
      </Link>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SEASONAL PATTERN HEATMAP
// ═══════════════════════════════════════════════════════════════════════════════
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function SeasonalHeatmap({ data }: { data: PSMetrics['seasonal_data'] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  const getOpacity = (count: number) => {
    if (count === 0) return 0.05
    return 0.2 + (count / maxCount) * 0.8
  }

  // Group by week
  const weeks: Record<number, PSMetrics['seasonal_data']> = {}
  data.forEach(d => {
    if (!weeks[d.week]) weeks[d.week] = []
    weeks[d.week].push(d)
  })

  return (
    <SectionCard title="Seasonal Pattern (Last 4 Weeks)" icon={Calendar}>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pr-1">
            {DAYS.map(day => (
              <div key={day} className="h-5 flex items-center text-[9px] text-text-tertiary w-6">
                {day}
              </div>
            ))}
          </div>
          {/* Week columns */}
          {Object.keys(weeks).sort((a, b) => Number(a) - Number(b)).map(wk => (
            <div key={wk} className="flex flex-col gap-1">
              {DAYS.map((_, dayIdx) => {
                const cell = data.find(d => d.week === Number(wk) && d.day === dayIdx)
                const count = cell?.count ?? 0
                return (
                  <div
                    key={dayIdx}
                    className="h-5 w-5 rounded-sm transition-colors"
                    style={{
                      background: PURPLE,
                      opacity: getOpacity(count),
                    }}
                    title={i18n.t('dashboard.dayFirs', { day: DAYS[dayIdx], count })}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 text-[9px] text-text-tertiary">
          <span>Less</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(op => (
            <div
              key={op}
              className="h-3 w-3 rounded-sm"
              style={{ background: PURPLE, opacity: op }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — FORECAST WIDGET
// ═══════════════════════════════════════════════════════════════════════════════
function ForecastWidget({ forecast }: { forecast: PSMetrics['forecast_30d'] }) {
  if (!forecast.length) return null

  const avgPredicted = Math.round(forecast.reduce((s, f) => s + f.predicted, 0) / forecast.length)
  const totalPredicted = Math.round(forecast.reduce((s, f) => s + f.predicted, 0))

  return (
    <SectionCard title="30-Day Forecast" icon={Target} action={
      <Link to="/forecast" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        Full forecast →
      </Link>
    }>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <AnimatedCounter
            value={totalPredicted}
            className="text-2xl font-bold tabular-nums"
            duration={1200}
          />
          <span className="text-[10px] text-text-tertiary">Predicted FIRs</span>
        </div>
        <div className="flex flex-col items-center">
          <AnimatedCounter
            value={avgPredicted}
            className="text-2xl font-bold tabular-nums"
            duration={1200}
          />
          <span className="text-[10px] text-text-tertiary">Daily Avg</span>
        </div>
        <div className="flex-1 h-16">
          <UnifiedTrendChart
            data={forecast.map(f => ({ date: f.date, count: Math.round(f.predicted) }))}
            emptyTitle=""
            emptyDescription=""
          />
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — EMERGING THREATS FEED
// ═══════════════════════════════════════════════════════════════════════════════
function EmergingThreatsFeed({ threats }: { threats: EmergingThreat[] }) {
  const sevColor = (s: string) => {
    const map: Record<string, string> = { critical: RED, high: AMBER, medium: PURPLE, low: '#6B7380' }
    return map[s.toLowerCase()] || '#6B7380'
  }

  return (
    <SectionCard title="Emerging Threats" icon={Zap} action={
      <Link to="/early-warnings" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        View all →
      </Link>
    }>
      <div className="divide-y divide-border-primary max-h-[320px] overflow-y-auto">
        {threats.length === 0 && (
          <p className="text-[10px] text-text-tertiary py-4 text-center">No emerging threats</p>
        )}
        {threats.map(t => (
          <div key={t.id} className="px-2 py-2.5 hover:bg-bg-secondary transition-colors">
            <div className="flex items-start gap-2">
              <div
                className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: sevColor(t.severity) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusBadge status={t.severity} size="sm" />
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <p className="text-[11px] text-text-primary">{t.message}</p>
                {t.recommended_action && (
                  <p className="text-[10px] text-text-tertiary mt-0.5">{t.recommended_action}</p>
                )}
                <span className="text-[9px] font-mono text-text-tertiary">
                  {new Date(t.generated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function PSIDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full" style={{ background: PURPLE_12 }} />
        <div>
          <div className="h-4 w-48 rounded" style={{ background: PURPLE_12 }} />
          <div className="h-3 w-60 rounded mt-1" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-80 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-80 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
      </div>
      <div className="h-64 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-48 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIDashboard() {
  const navigate = useNavigate()
  const jurisdiction = useJurisdiction()
  // Station name: use jurisdiction.station_id (exact DB value) when available,
  // otherwise extract a clean name from scopeLabel by stripping suffixes.
  const stationName = jurisdiction.station_id || (
    jurisdiction.scopeLabel
      .replace(/\s*[—–]\s*.*/, '')   // remove everything after em/en-dash
      .replace(/\(.*?\)/g, '')     // strip parenthetical like (Analytics)
      .trim() || 'Bengaluru Urban Town Police Station'
  )
  const districtName = jurisdiction.scopeLabel.includes('Bengaluru') ? 'Bengaluru Urban' : 'Karnataka'
  const [metrics, setMetrics] = useState<PSMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const m = await fetchPSIMetrics(stationName)
      setMetrics(m)
      setError(null)
    } catch (e) {
      console.error('PSIDashboard fetch error:', e)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [stationName])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <PSIDashboardSkeleton />

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={32} style={{ color: AMBER }} className="mx-auto mb-3" />
          <p className="text-sm text-text-primary">Unable to load PSI Dashboard</p>
          <p className="text-xs text-text-tertiary mt-1">No information is currently available. Please try again.</p>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary"
          >
            <RefreshCw size={12} className="inline mr-1" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen">
      {/* Quick Link Strip */}
      <PSIQuickLinks />

      {/* Jurisdiction Banner */}
      <JurisdictionBanner scope={jurisdiction} />

      {/* Header */}
      <PSIHeader
        stationName={stationName}
        districtName={districtName}
        totalFIRs={metrics.total_firs}
        assignedFIRs={metrics.assigned_firs}
      />

      {/* Row 2: KPI Strip */}
      <PSIKPIStrip metrics={metrics} />

      {/* Row 3: Assigned FIRs + Crime Type + Trend */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Assigned FIRs Table (55%) */}
        <div className="col-span-7">
          <AssignedFIRsTable
            firs={metrics.recent_firs}
            onFIRClick={() => navigate('/fir-operations')}
          />
        </div>
        {/* Right: Crime Type Donut + Trend (45%) */}
        <div className="col-span-5 flex flex-col gap-4">
          <CrimeTypeDonut crimeTypes={metrics.crime_types} />
          <SectionCard title={i18n.t('dashboard.stationTrend3m', { station: stationName })} icon={TrendingUp}>
            <div style={{ height: 140 }}>
              <UnifiedTrendChart
                data={metrics.trend_3m}
                showForecast
                emptyTitle="No trend data"
                emptyDescription="Not enough FIRs for trend"
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Row 4: Hotspot Map (full width) */}
      <SectionCard title="Crime Hotspot Map" icon={MapPin}>
        <div className="rounded-lg overflow-hidden" style={{ height: 280 }}>
          <LeafletMapView districtId="BENGALURU_URBAN" />
        </div>
        {metrics.hotspot_points.length > 0 && (
          <div className="flex items-center gap-4 mt-2 text-[10px] text-text-tertiary">
            <span>{metrics.hotspot_points.length} hotspot(s) detected</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: RED }} /> High density
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> Medium
            </span>
          </div>
        )}
      </SectionCard>

      {/* Row 5: Seasonal Heatmap + Emerging Threats */}
      <div className="grid grid-cols-2 gap-4">
        <SeasonalHeatmap data={metrics.seasonal_data} />
        <EmergingThreatsFeed threats={metrics.emerging_threats} />
      </div>

      {/* Row 6: Forecast */}
      <ForecastWidget forecast={metrics.forecast_30d} />
    </div>
  )
}
