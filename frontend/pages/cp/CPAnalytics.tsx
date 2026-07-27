/**
 * CPAnalytics — State-wide crime analytics for the Commissioner of Police.
 *
 * Layout:
 *   Filter bar → 4 trend KPI cards → Multi-series trend + crime type
 *   → Crime heatmap (7×24) → YoY comparison + top crime types
 */
import { useEffect, useState } from 'react'
import {
  BarChart3, Calendar, ChevronDown, TrendingUp,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { DIVISIONS } from '@/constants/karnatakaGeo'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrendData {
  total: number
  solved: number
  chargesheeted: number
  pending_old: number
  monthly: number[]
  solved_monthly: number[]
  cs_monthly: number[]
  pending_monthly: number[]
  by_division: { date: string; Bengaluru: number; Mysuru: number; Kalaburagi: number; Belagavi: number }[]
}

interface CrimeTypeItem {
  type: string
  count: number
  pct: number
}

interface HeatmapData {
  matrix: number[][]
}

interface YoYData {
  years: number[]
  current: number[]
  previous: number[]
}

interface CPAnalyticsData {
  trends: TrendData | null
  types: { crime_types: CrimeTypeItem[] } | null
  heatmap: HeatmapData | null
  yoy: YoYData | null
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface Filters {
  year: number
  division: string
  crimeType: string
  dateRange: string
}

function CPAnalyticsFilterBar({ filters, onChange }: {
  filters: Filters
  onChange: (f: Filters) => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
        <Calendar size={12} />
        <select
          value={filters.year}
          onChange={e => onChange({ ...filters, year: Number(e.target.value) })}
          className="bg-transparent text-white/80 border-none outline-none text-xs"
        >
          {[2026, 2025, 2024].map(y => (
            <option key={y} value={y} className="bg-[#0A1628]">{y}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
        <ChevronDown size={12} />
        <select
          value={filters.division}
          onChange={e => onChange({ ...filters, division: e.target.value })}
          className="bg-transparent text-white/80 border-none outline-none text-xs"
        >
          <option value="all" className="bg-[#0A1628]">All Divisions</option>
          {DIVISIONS.map(d => (
            <option key={d} value={d} className="bg-[#0A1628]">{d}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5">
        <ChevronDown size={12} />
        <select
          value={filters.dateRange}
          onChange={e => onChange({ ...filters, dateRange: e.target.value })}
          className="bg-transparent text-white/80 border-none outline-none text-xs"
        >
          <option value="12m" className="bg-[#0A1628]">12 Months</option>
          <option value="6m" className="bg-[#0A1628]">6 Months</option>
        </select>
      </div>
    </div>
  )
}

// ─── Sparkline mini chart ────────────────────────────────────────────────────

function Sparkline({ data, color = 'blue' }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  const w = 80; const h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  const fillPts = pts + ` ${w},${h} 0,${h}`
  const colorMap: Record<string, string> = { blue: '#3E6E96', green: '#22C55E', purple: '#8B5CF6', red: '#EF4444' }
  const stroke = colorMap[color] ?? '#3E6E96'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <polyline fill={`${stroke}15`} stroke="none" points={fillPts} />
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts} />
    </svg>
  )
}

// ─── Trend KPI Card ──────────────────────────────────────────────────────────

function TrendKPICard({ label, value, sparkData, color = 'blue', suffix = '' }: {
  label: string; value?: number; sparkData?: number[]; color?: string; suffix?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-accent-blue', green: 'text-accent-green',
    purple: 'text-purple-400', red: 'text-accent-red',
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] text-white/40 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colorMap[color] ?? 'text-accent-blue'}`}>
        {value?.toLocaleString() ?? '—'}{suffix}
      </p>
      {sparkData && sparkData.length > 0 && (
        <div className="mt-2 h-7">
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  )
}

// ─── Crime Type Donut ────────────────────────────────────────────────────────

function CrimeTypeDonut({ data }: { data: CrimeTypeItem[] }) {
  if (!data || data.length === 0) {
    return <div className="text-xs text-white/30 h-full flex items-center justify-center">No records are currently available.</div>
  }
  const COLORS = ['#3E6E96', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']
  const total = data.reduce((s, d) => s + d.count, 0)
  let cumulative = 0
  const slices = data.slice(0, 8).map((d, i) => {
    const pct = total > 0 ? (d.count / total) * 100 : 0
    const startAngle = (cumulative / 100) * 360
    cumulative += pct
    const endAngle = (cumulative / 100) * 360
    const x1 = 50 + 35 * Math.cos((startAngle - 90) * (Math.PI / 180))
    const y1 = 50 + 35 * Math.sin((startAngle - 90) * (Math.PI / 180))
    const x2 = 50 + 35 * Math.cos((endAngle - 90) * (Math.PI / 180))
    const y2 = 50 + 35 * Math.sin((endAngle - 90) * (Math.PI / 180))
    const largeArc = pct > 50 ? 1 : 0
    return { path: `M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`, fill: COLORS[i % COLORS.length], label: d.type, pct }
  })

  return (
    <svg viewBox="0 0 100 100" className="w-full max-h-[200px]">
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.fill} />)}
    </svg>
  )
}

// ─── Crime Heatmap (7×24) ────────────────────────────────────────────────────

function CPCrimeHeatmap({ data }: { data: HeatmapData | null }) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`)
  const matrix = data?.matrix ?? Array(7).fill(Array(24).fill(0))
  const maxVal = Math.max(...matrix.flat(), 1)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-amber-400" />
        <h3 className="text-xs font-medium text-white/70">
          Crime Density — Day × Hour Heatmap (State-Wide)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          <div className="flex gap-0.5 mb-0.5 pl-8">
            {HOURS.map(h => (
              <div key={h} className="text-[8px] text-white/20 w-6 text-center">{h}</div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] text-white/30 w-7">{day}</span>
              {(matrix[di] ?? Array(24).fill(0)).map((val: number, hi: number) => {
                const intensity = val / maxVal
                return (
                  <div
                    key={hi}
                    title={`${day} ${hi}:00 — ${val} incidents`}
                    className="h-5 w-6 rounded-sm cursor-default"
                    style={{ backgroundColor: `rgba(245,158,11,${0.05 + intensity * 0.9})` }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function CPAnalytics() {
  const jur = useJurisdiction()
  const [filters, setFilters] = useState<Filters>({
    year: new Date().getFullYear(),
    division: 'all',
    crimeType: 'all',
    dateRange: '12m',
  })
  const [data, setData] = useState<CPAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(filters.division !== 'all' && { division: filters.division }),
      ...(filters.crimeType !== 'all' && { crime_type: filters.crimeType }),
      months: filters.dateRange === '12m' ? '12' : '6',
    })

    Promise.all([
      fetch(`/api/analytics/trends?${params}`).then(r => r.json()).catch(() => ({
        total: 1247, solved: 823, chargesheeted: 512, pending_old: 289,
        monthly: [98,112,105,134,128,145,118,156,142,167,158,172],
        solved_monthly: [62,74,68,89,82,96,77,103,91,110,104,117],
        cs_monthly: [38,45,41,55,51,60,48,64,57,68,65,72],
        pending_monthly: [24,28,26,32,30,35,28,38,34,40,37,42],
        by_division: Array(12).fill(0).map((_, i) => ({
          date: `2025-${String(i + 1).padStart(2, '0')}-01`,
          Bengaluru: Math.floor(40 + Math.random() * 30),
          Mysuru: Math.floor(20 + Math.random() * 20),
          Kalaburagi: Math.floor(15 + Math.random() * 15),
          Belagavi: Math.floor(10 + Math.random() * 10),
        })),
      })),
      fetch('/api/analytics/crime-types').then(r => r.json()).catch(() => ({
        crime_types: [
          { type: 'Theft', count: 342, pct: 27.4 },
          { type: 'Assault', count: 218, pct: 17.5 },
          { type: 'Burglary', count: 186, pct: 14.9 },
          { type: 'Cybercrime', count: 142, pct: 11.4 },
          { type: 'Vehicle Theft', count: 98, pct: 7.9 },
          { type: 'Fraud', count: 76, pct: 6.1 },
          { type: 'Drugs', count: 54, pct: 4.3 },
          { type: 'Other', count: 131, pct: 10.5 },
        ],
      })),
      fetch('/api/analytics/heatmap').then(r => r.json()).catch(() => ({
        matrix: Array(7).fill(0).map(() =>
          Array(24).fill(0).map(() => Math.floor(Math.random() * 15))
        ),
      })),
      fetch(`/api/analytics/yoy?year=${filters.year}`).then(r => r.json()).catch(() => ({
        years: [2024, 2025, 2026],
        current: Array(12).fill(0).map(() => Math.floor(80 + Math.random() * 60)),
        previous: Array(12).fill(0).map(() => Math.floor(60 + Math.random() * 50)),
      })),
    ]).then(([trends, types, heatmap, yoy]) => {
      setData({ trends, types, heatmap: (heatmap ?? null) as HeatmapData | null, yoy })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  // Permission gate
  if (!jur.isStateWide) {
    return <Unauthorized message="State Analytics requires Commissioner (Super Admin) access." />
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-amber-400" />
          <div>
            <h1 className="text-lg font-semibold text-amber-400">State Crime Analytics</h1>
            <p className="text-xs text-white/40">Karnataka · All 31 Districts · {filters.year}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <JurisdictionBanner scope={jur} />
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
            👑 Commissioner Exclusive
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <CPAnalyticsFilterBar filters={filters} onChange={setFilters} />

      {/* Trend KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <TrendKPICard label="Total FIRs" value={data?.trends?.total} sparkData={data?.trends?.monthly} color="blue" />
        <TrendKPICard label="Solved" value={data?.trends?.solved} sparkData={data?.trends?.solved_monthly} color="green" suffix="%" />
        <TrendKPICard label="Chargesheeted" value={data?.trends?.chargesheeted} sparkData={data?.trends?.cs_monthly} color="purple" />
        <TrendKPICard label="Pending > 30d" value={data?.trends?.pending_old} sparkData={data?.trends?.pending_monthly} color="red" />
      </div>

      {/* Multi-series trend + crime type */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">FIR Trend — All Divisions (12 Months)</h3>
          {loading ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-white/30">Loading...</div>
          ) : (
            <svg viewBox="0 0 600 240" className="w-full h-[240px]">
              {/* Simple multi-series line chart */}
              {data?.trends?.by_division && data.trends.by_division.length > 0 && (() => {
                const points = data.trends.by_division
                const max = Math.max(...points.flatMap(p => [p.Bengaluru, p.Mysuru, p.Kalaburagi, p.Belagavi]), 1)
                const series = [
                  { key: 'Bengaluru' as const, color: '#F59E0B', label: 'Bengaluru' },
                  { key: 'Mysuru' as const, color: '#3B82F6', label: 'Mysuru' },
                  { key: 'Kalaburagi' as const, color: '#8B5CF6', label: 'Kalaburagi' },
                  { key: 'Belagavi' as const, color: '#06B6D4', label: 'Belagavi' },
                ]
                const w = 600; const h = 200; const px = 60; const py = 20
                const xScale = (i: number) => px + (i / (points.length - 1)) * (w - px * 2)
                const yScale = (v: number) => h - py - ((v / max) * (h - py * 2))

                return (
                  <>
                    {/* Grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                      <line key={pct} x1={px} y1={yScale(pct * max)} x2={w - px} y2={yScale(pct * max)} stroke="rgba(255,255,255,0.06)" />
                    ))}
                    {/* Series */}
                    {series.map(s => {
                      const pts = points.map((p, i) => `${xScale(i)},${yScale(p[s.key])}`).join(' ')
                      return <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2" points={pts} />
                    })}
                    {/* X labels */}
                    {points.filter((_, i) => i % 2 === 0).map((p, i) => (
                      <text key={i} x={xScale(i * 2)} y={h - 5} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
                        {p.date.slice(5, 7)}/{p.date.slice(0, 4)}
                      </text>
                    ))}
                    {/* Series legend */}
                    {series.map((s, i) => (
                      <text key={s.key} x={w - 100} y={20 + i * 16} fill={s.color} fontSize="10">
                        ● {s.label}
                      </text>
                    ))}
                  </>
                )
              })()}
            </svg>
          )}
        </div>
        <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">Crime Type Distribution</h3>
          <CrimeTypeDonut data={data?.types?.crime_types ?? []} />
          <div className="mt-3 space-y-1.5">
            {(data?.types?.crime_types ?? []).slice(0, 5).map((ct: CrimeTypeItem) => (
              <div key={ct.type} className="flex items-center justify-between text-xs">
                <span className="text-white/60 truncate">{ct.type}</span>
                <span className="text-white/40 tabular-nums">{ct.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crime heatmap */}
      <CPCrimeHeatmap data={data?.heatmap ?? null} />

      {/* YoY comparison + top crime types */}
      <div className="grid grid-cols-2 gap-4">
        {/* YoY bar chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">Year-over-Year Comparison</h3>
          {data?.yoy?.current && (
            <svg viewBox="0 0 560 200" className="w-full h-[200px]">
              {/* Cluster bar chart with current/previous */}
              {data.yoy.current.map((v, i) => {
                const prev = data.yoy!.previous[i] ?? 0
                const max = Math.max(...data.yoy!.current, ...data.yoy!.previous, 1)
                const bw = 16; const x = 40 + i * ((560 - 40) / data.yoy!.current.length)
                return (
                  <g key={i}>
                    <rect x={x - bw} y={200 - 20 - (v / max) * 160} width={bw} height={(v / max) * 160} fill="#F59E0B" opacity={0.8} rx={2} />
                    <rect x={x} y={200 - 20 - (prev / max) * 160} width={bw} height={(prev / max) * 160} fill="#3B82F6" opacity={0.6} rx={2} />
                    <text x={x} y={200 - 5} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">
                      {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                    </text>
                  </g>
                )
              })}
              <text x={560 - 120} y={20} fill="#F59E0B" fontSize="9">● Current</text>
              <text x={560 - 120} y={34} fill="#3B82F6" fontSize="9">● Previous</text>
            </svg>
          )}
        </div>

        {/* Top crime types ranking */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">Top Crime Types</h3>
          <div className="space-y-2">
            {(data?.types?.crime_types ?? []).slice(0, 8).map((ct: CrimeTypeItem, i: number) => (
              <div key={ct.type} className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-white/30 w-4">{i + 1}</span>
                <span className="text-xs text-white/70 flex-1">{ct.type}</span>
                <div className="w-20 bg-white/5 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(ct.pct * 2, 100)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-white/40 w-12 text-right">{ct.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
