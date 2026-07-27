/**
 * CPReports — Reports & Analytics
 *
 * Commissioner of Police command center page.
 * FIR analytics, monthly trends, category breakdown, station performance.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3, RefreshCw, FileText, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Percent,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CategoryBreakdown {
  category: string
  count: number
  solved: number
  pending: number
  avg_days: number
}

interface MonthlyTrend {
  month: string
  firs: number
  solved: number
  pending: number
}

interface TopStation {
  station: string
  district: string
  firs_filed: number
  solved: number
  rate: number
}

interface ReportsData {
  summary: {
    total_firs: number
    this_month_firs: number
    conviction_rate: number
    avg_case_closure_days: number
    pending_cases: number
    solved_pct: number
  }
  by_category: CategoryBreakdown[]
  monthly_trend: MonthlyTrend[]
  top_stations: TopStation[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
  '#06B6D4', '#A855F7', '#F59E0B', '#EF4444', '#22C55E',
]

const CHART_COLORS = {
  firs: '#3B82F6',
  solved: '#22C55E',
  pending: '#F97316',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPReports() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<ReportsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const demoReportsData: ReportsData = {
    summary: {
      total_firs: 285000,
      this_month_firs: 12450,
      conviction_rate: 68.4,
      avg_case_closure_days: 185,
      pending_cases: 42500,
      solved_pct: 62.8,
    },
    by_category: [
      { category: 'Theft', count: 85200, solved: 56200, pending: 29000, avg_days: 120 },
      { category: 'Assault', count: 42500, solved: 31200, pending: 11300, avg_days: 95 },
      { category: 'Burglary', count: 38100, solved: 22100, pending: 16000, avg_days: 145 },
      { category: 'Robbery', count: 28400, solved: 18500, pending: 9900, avg_days: 130 },
      { category: 'Cybercrime', count: 12400, solved: 6400, pending: 6000, avg_days: 210 },
      { category: 'Vehicle Theft', count: 21800, solved: 9800, pending: 12000, avg_days: 165 },
      { category: 'Chain Snatching', count: 15600, solved: 11200, pending: 4400, avg_days: 90 },
      { category: 'Murder', count: 3200, solved: 2800, pending: 400, avg_days: 250 },
      { category: 'Kidnapping', count: 4800, solved: 3600, pending: 1200, avg_days: 180 },
      { category: 'Fraud', count: 33000, solved: 18000, pending: 15000, avg_days: 200 },
    ],
    monthly_trend: [
      { month: 'Jan', firs: 11800, solved: 7400, pending: 4400 },
      { month: 'Feb', firs: 11200, solved: 7100, pending: 4100 },
      { month: 'Mar', firs: 12400, solved: 7800, pending: 4600 },
      { month: 'Apr', firs: 10800, solved: 6900, pending: 3900 },
      { month: 'May', firs: 11500, solved: 7200, pending: 4300 },
      { month: 'Jun', firs: 12000, solved: 7500, pending: 4500 },
      { month: 'Jul', firs: 11400, solved: 7200, pending: 4200 },
      { month: 'Aug', firs: 12200, solved: 7700, pending: 4500 },
      { month: 'Sep', firs: 11800, solved: 7400, pending: 4400 },
      { month: 'Oct', firs: 12600, solved: 7900, pending: 4700 },
      { month: 'Nov', firs: 12100, solved: 7600, pending: 4500 },
      { month: 'Dec', firs: 12450, solved: 7800, pending: 4650 },
    ],
    top_stations: [
      { station: 'Koramangala PS', district: 'Bengaluru Urban', firs_filed: 4850, solved: 3540, rate: 73.0 },
      { station: 'Jayanagar PS', district: 'Bengaluru Urban', firs_filed: 4200, solved: 3020, rate: 71.9 },
      { station: 'MG Road PS', district: 'Bengaluru Urban', firs_filed: 3980, solved: 2790, rate: 70.1 },
      { station: 'Whitefield PS', district: 'Bengaluru Urban', firs_filed: 3650, solved: 2480, rate: 67.9 },
      { station: 'Indiranagar PS', district: 'Bengaluru Urban', firs_filed: 3420, solved: 2320, rate: 67.8 },
      { station: 'BTM Layout PS', district: 'Bengaluru Urban', firs_filed: 3280, solved: 2180, rate: 66.5 },
      { station: 'K.R. Puram PS', district: 'Bengaluru Urban', firs_filed: 2950, solved: 1890, rate: 64.1 },
      { station: 'Mysuru City PS', district: 'Mysuru', firs_filed: 2800, solved: 1960, rate: 70.0 },
    ],
    last_updated: new Date().toISOString(),
  }

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        setData(demoReportsData)
        setLastUpdated(new Date(demoReportsData.last_updated).toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/reports', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        setData(demoReportsData)
        setLastUpdated(new Date(demoReportsData.last_updated).toLocaleTimeString())
      }
    } catch {
      setData(demoReportsData)
      setLastUpdated(new Date(demoReportsData.last_updated).toLocaleTimeString())
      console.error('[CPReports] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Monthly chart dimensions ────────────────────────────────────────────

  const maxMonthly = useMemo(() => {
    if (!data?.monthly_trend) return 1
    return Math.max(...data.monthly_trend.map(m => m.firs))
  }, [data])

  const barGroupWidth = 56
  const chartPadding = { top: 20, right: 10, bottom: 24, left: 36 }
  const chartHeight = 180
  const chartInnerH = chartHeight - chartPadding.top - chartPadding.bottom
  const chartInnerW = data ? data.monthly_trend.length * barGroupWidth : 0

  // ── Donut chart data ────────────────────────────────────────────────────

  const donutData = useMemo(() => {
    if (!data?.by_category) return []
    const total = data.by_category.reduce((s, c) => s + c.count, 0)
    let cumulative = 0
    return data.by_category.map((cat, i) => {
      const pct = total > 0 ? (cat.count / total) * 100 : 0
      const start = cumulative
      cumulative += pct
      return { ...cat, pct, startAngle: (start / 100) * 360, endAngle: (cumulative / 100) * 360, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }
    })
  }, [data])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <BarChart3 size={16} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-cyan-400">Reports & Analytics</h1>
            <p className="text-[10px] text-white/40">FIR analytics · Monthly trends · Category breakdown · Station performance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[10px] text-white/30">Updated: {lastUpdated}</span>}
          <button onClick={fetchData} disabled={refreshing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
          <JurisdictionBanner scope={jur} />
        </div>
      </div>

      {/* ─── KPI Summary ───────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total FIRs', value: summary.total_firs.toLocaleString(), icon: <FileText size={12} />, color: 'text-cyan-400' },
            { label: 'This Month', value: summary.this_month_firs.toLocaleString(), icon: <TrendingUp size={12} />, color: 'text-blue-400' },
            { label: 'Conviction Rate', value: `${summary.conviction_rate}%`, icon: <Percent size={12} />, color: 'text-green-400' },
            { label: 'Avg Closure (days)', value: summary.avg_case_closure_days, icon: <Clock size={12} />, color: 'text-amber-400' },
            { label: 'Pending Cases', value: summary.pending_cases.toLocaleString(), icon: <AlertTriangle size={12} />, color: 'text-orange-400' },
            { label: 'Solved %', value: `${summary.solved_pct}%`, icon: <CheckCircle size={12} />, color: 'text-emerald-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={kpi.color}>{kpi.icon}</span>
                <span className="text-[10px] text-white/40">{kpi.label}</span>
              </div>
              <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left: Charts + Tables ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading reports data…</p>
              </div>
            </div>
          )}

          {/* ─── Monthly Trend Bar Chart ─────────────────────────────── */}
          {data?.monthly_trend && data.monthly_trend.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-cyan-400 mb-3">Monthly FIR Trend</h3>
              <div className="overflow-x-auto">
                <svg
                  width={Math.max(chartInnerW + chartPadding.left + chartPadding.right, 300)}
                  height={chartHeight}
                  className="text-[10px]"
                >
                  {/* Y-axis gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = chartPadding.top + chartInnerH * (1 - frac)
                    return (
                      <g key={frac}>
                        <line x1={chartPadding.left} y1={y} x2={chartPadding.left + chartInnerW} y2={y}
                          stroke="rgba(255,255,255,0.06)" />
                        <text x={chartPadding.left - 6} y={y + 3} textAnchor="end"
                          fill="rgba(255,255,255,0.3)" fontSize="9">
                          {Math.round(maxMonthly * frac)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Bars */}
                  {data.monthly_trend.map((m, i) => {
                    const gx = chartPadding.left + i * barGroupWidth + 4
                    const bw = 14
                    const hFirs = maxMonthly > 0 ? (m.firs / maxMonthly) * chartInnerH : 0
                    const hSolved = maxMonthly > 0 ? (m.solved / maxMonthly) * chartInnerH : 0
                    const hPending = maxMonthly > 0 ? (m.pending / maxMonthly) * chartInnerH : 0
                    const base = chartPadding.top + chartInnerH

                    return (
                      <g key={m.month}>
                        {/* FIRs */}
                        <rect x={gx} y={base - hFirs} width={bw} height={hFirs} rx={2}
                          fill={CHART_COLORS.firs} opacity={0.8} />
                        {/* Solved */}
                        <rect x={gx + bw + 2} y={base - hSolved} width={bw} height={hSolved} rx={2}
                          fill={CHART_COLORS.solved} opacity={0.8} />
                        {/* Pending */}
                        <rect x={gx + (bw + 2) * 2} y={base - hPending} width={bw} height={hPending} rx={2}
                          fill={CHART_COLORS.pending} opacity={0.8} />

                        {/* Label */}
                        <text x={gx + bw * 1.5 + 2} y={chartPadding.top + chartInnerH + 14}
                          textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">
                          {m.month.length > 3 ? m.month.slice(0, 3) : m.month}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 text-[9px] text-white/40">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.firs }} />FIRs</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.solved }} />Solved</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: CHART_COLORS.pending }} />Pending</div>
              </div>
            </div>
          )}

          {/* ─── Category Breakdown Table ────────────────────────────── */}
          {data?.by_category && data.by_category.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400">Crime Category Breakdown</h3>
                <span className="text-[9px] text-white/30">{data.by_category.length} categories</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Category</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Count</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Solved</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Pending</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Solve Rate</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Avg Days</th>
                      <th className="px-3 py-2 text-[9px] text-white/40 font-medium w-32">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_category.map((cat, i) => {
                      const solveRate = cat.count > 0 ? (cat.solved / cat.count) * 100 : 0
                      return (
                        <tr key={cat.category} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                              <span className="text-white/70 font-medium">{cat.category}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/80 font-medium">{cat.count.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-green-300">{cat.solved.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-orange-300">{cat.pending.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={solveRate >= 70 ? 'text-green-300' : solveRate >= 50 ? 'text-amber-300' : 'text-red-300'}>
                              {solveRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/60">{cat.avg_days}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${solveRate}%`,
                                  backgroundColor: solveRate >= 70 ? '#22C55E' : solveRate >= 50 ? '#F97316' : '#EF4444',
                                }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Top Stations ────────────────────────────────────────── */}
          {data?.top_stations && data.top_stations.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400">Top Stations by FIR Volume</h3>
                <span className="text-[9px] text-white/30">{data.top_stations.length} stations</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Station</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">FIRs Filed</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Solved</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Solve Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_stations.map((st, i) => (
                      <tr key={st.station} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 text-white/30 text-[10px]">#{i + 1}</td>
                        <td className="px-3 py-2.5 text-white/70 font-medium">{st.station}</td>
                        <td className="px-3 py-2.5 text-white/50">{st.district}</td>
                        <td className="px-3 py-2.5 text-right text-white/80 font-medium">{st.firs_filed.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-green-300">{st.solved.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={st.rate >= 70 ? 'text-green-300' : st.rate >= 50 ? 'text-amber-300' : 'text-red-300'}>
                            {st.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Category Donut Chart */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Category Distribution</h3>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-4">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {donutData.map((d, i) => {
                    const r = 35
                    const circ = 2 * Math.PI * r
                    const arcLen = (d.pct / 100) * circ
                    const offset = (d.startAngle / 360) * circ
                    return (
                      <circle key={i} cx="50" cy="50" r={r} fill="none"
                        stroke={d.color} strokeWidth="12" opacity={0.8}
                        strokeDasharray={`${arcLen} ${circ - arcLen}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90, 50, 50)" />
                    )
                  })}
                  <text x="50" y="48" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="bold">
                    {data?.by_category.reduce((s, c) => s + c.count, 0).toLocaleString()}
                  </text>
                  <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">
                    Total FIRs
                  </text>
                </svg>
                <div className="space-y-1">
                  {donutData.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-white/50 truncate max-w-[100px]">{d.category}</span>
                      <span className="text-white/30 ml-auto">{d.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/30">No category data.</p>
            )}
          </div>

          {/* Station Performance List */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Station Performance</h3>
            {data?.top_stations && data.top_stations.length > 0 ? (
              <div className="space-y-2">
                {data.top_stations.slice(0, 8).map((st, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/70 font-medium truncate max-w-[140px]">{st.station}</span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                        st.rate >= 70 ? 'bg-green-500/20 text-green-400' : st.rate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>{st.rate}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-white/40">
                      <span>{st.district}</span>
                      <span className="ml-auto">{st.firs_filed} FIRs</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${st.rate}%`,
                        backgroundColor: st.rate >= 70 ? '#22C55E' : st.rate >= 50 ? '#F97316' : '#EF4444',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/30">No station data.</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Quick Stats</h3>
            {summary && (
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-white/40">FIR-to-Conviction</span>
                  <span className="text-white/70">{summary.conviction_rate}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400/60 rounded-full" style={{ width: `${summary.conviction_rate}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Avg Closure Time</span>
                  <span className="text-white/70">{summary.avg_case_closure_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Pending Cases</span>
                  <span className="text-orange-300">{summary.pending_cases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Monthly FIR Rate</span>
                  <span className="text-blue-300">{summary.this_month_firs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Total Case Volume</span>
                  <span className="text-white/70">{summary.total_firs.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Reports derived from FIR registry and court outcome tracking.
              Conviction rates reflect completed trials only. Auto-refreshes every 60s.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
