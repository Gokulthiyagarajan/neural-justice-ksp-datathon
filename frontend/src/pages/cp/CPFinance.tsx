/**
 * CPFinance — Budget & Finance
 *
 * Commissioner of Police command center page.
 * Budget utilization, procurement tracking, category breakdown across all districts.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Wallet, RefreshCw, TrendingUp, TrendingDown, ShoppingCart,
  CircleDollarSign, PieChart, Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DistrictBudget {
  district: string
  allocated: number
  spent: number
  utilization_pct: number
  status: string
}

interface CategoryBreakdown {
  category: string
  allocated: number
  spent: number
  utilization_pct: number
}

interface ProcurementItem {
  item: string
  quantity: number
  cost: number
  status: string
  eta: string
}

interface FinanceData {
  summary: {
    total_budget: number
    spent: number
    remaining: number
    utilization_pct: number
    avg_utilization_by_district: number
    pending_procurements: number
  }
  by_district: DistrictBudget[]
  by_category: CategoryBreakdown[]
  procurement: ProcurementItem[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  on_track: '#22C55E',
  on_track_green: '#22C55E',
  warning: '#F97316',
  critical: '#EF4444',
  completed: '#22C55E',
  in_progress: '#3B82F6',
  pending: '#EAB308',
  delayed: '#EF4444',
  approved: '#22C55E',
}

const CATEGORY_COLORS: Record<string, string> = {
  Personnel: '#3B82F6',
  Infrastructure: '#8B5CF6',
  Vehicles: '#F97316',
  Equipment: '#EC4899',
  Training: '#14B8A6',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}Cr`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toLocaleString()}`
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPFinance() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<FinanceData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [sortBy, setSortBy] = useState<'utilization' | 'name' | 'allocated'>('utilization')

  // ── Fetch data ──────────────────────────────────────────────────────────

  const demoFinanceData: FinanceData = {
    summary: {
      total_budget: 4250000000,
      spent: 2980000000,
      remaining: 1270000000,
      utilization_pct: 70.1,
      avg_utilization_by_district: 68.5,
      pending_procurements: 18,
    },
    by_district: [
      { district: 'Bengaluru Urban', allocated: 850000000, spent: 620000000, utilization_pct: 72.9, status: 'on_track' },
      { district: 'Bengaluru Rural', allocated: 320000000, spent: 225000000, utilization_pct: 70.3, status: 'on_track' },
      { district: 'Mysuru', allocated: 280000000, spent: 210000000, utilization_pct: 75.0, status: 'on_track' },
      { district: 'Belagavi', allocated: 260000000, spent: 185000000, utilization_pct: 71.2, status: 'on_track' },
      { district: 'Dakshina Kannada', allocated: 240000000, spent: 168000000, utilization_pct: 70.0, status: 'on_track' },
      { district: 'Uttara Kannada', allocated: 180000000, spent: 95000000, utilization_pct: 52.8, status: 'warning' },
      { district: 'Shivamogga', allocated: 200000000, spent: 145000000, utilization_pct: 72.5, status: 'on_track' },
      { district: 'Tumakuru', allocated: 190000000, spent: 132000000, utilization_pct: 69.5, status: 'on_track' },
    ],
    by_category: [
      { category: 'Personnel', allocated: 2100000000, spent: 1580000000, utilization_pct: 75.2 },
      { category: 'Infrastructure', allocated: 850000000, spent: 520000000, utilization_pct: 61.2 },
      { category: 'Vehicles', allocated: 420000000, spent: 310000000, utilization_pct: 73.8 },
      { category: 'Equipment', allocated: 380000000, spent: 260000000, utilization_pct: 68.4 },
      { category: 'Training', allocated: 500000000, spent: 310000000, utilization_pct: 62.0 },
    ],
    procurement: [
      { item: 'Police Patrol Vehicles (Bolero)', quantity: 120, cost: 144000000, status: 'in_progress', eta: '2026-08' },
      { item: 'Body Cameras', quantity: 500, cost: 25000000, status: 'approved', eta: '2026-07' },
      { item: 'Forensic Kits', quantity: 200, cost: 8000000, status: 'in_progress', eta: '2026-09' },
      { item: 'Station Furniture', quantity: 400, cost: 12000000, status: 'pending', eta: '2026-10' },
      { item: 'Radio Communication Sets', quantity: 80, cost: 16000000, status: 'delayed', eta: '2026-11' },
      { item: 'Desktop Computers', quantity: 300, cost: 18000000, status: 'approved', eta: '2026-07' },
      { item: 'Motorcycles for Patrol', quantity: 80, cost: 32000000, status: 'in_progress', eta: '2026-08' },
      { item: 'Traffic Signal Equipment', quantity: 50, cost: 7500000, status: 'pending', eta: '2026-12' },
    ],
    last_updated: new Date().toISOString(),
  }

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        setData(demoFinanceData)
        setLastUpdated(new Date(demoFinanceData.last_updated).toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/finance', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        setData(demoFinanceData)
        setLastUpdated(new Date(demoFinanceData.last_updated).toLocaleTimeString())
      }
    } catch {
      setData(demoFinanceData)
      setLastUpdated(new Date(demoFinanceData.last_updated).toLocaleTimeString())
      console.error('[CPFinance] Failed to fetch finance data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted districts ──────────────────────────────────────────────────

  const sortedDistricts = useMemo(() => {
    if (!data?.by_district) return []
    return [...data.by_district].sort((a, b) => {
      if (sortBy === 'utilization') return b.utilization_pct - a.utilization_pct
      if (sortBy === 'allocated') return b.allocated - a.allocated
      return a.district.localeCompare(b.district)
    })
  }, [data, sortBy])

  // ── Max utilization for bar scaling ───────────────────────────────────

  const maxUtilization = useMemo(() => {
    if (!data?.by_district) return 1
    return Math.max(...data.by_district.map(d => d.utilization_pct), 1)
  }, [data])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Wallet size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-blue-400">Budget & Finance</h1>
            <p className="text-[10px] text-white/40">Allocation · Utilization · Procurement · Category breakdown</p>
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
            { label: 'Total Budget', value: formatCurrency(summary.total_budget), icon: <CircleDollarSign size={12} />, color: 'text-blue-400' },
            { label: 'Spent', value: formatCurrency(summary.spent), icon: <TrendingUp size={12} />, color: 'text-amber-400' },
            { label: 'Remaining', value: formatCurrency(summary.remaining), icon: <TrendingDown size={12} />, color: 'text-green-400' },
            { label: 'Utilization', value: `${summary.utilization_pct.toFixed(1)}%`, icon: <PieChart size={12} />, color: 'text-cyan-400' },
            { label: 'Pending', value: summary.pending_procurements, icon: <Clock size={12} />, color: 'text-orange-400' },
            { label: 'District Avg', value: `${summary.avg_utilization_by_district.toFixed(1)}%`, icon: <TrendingUp size={12} />, color: 'text-violet-400' },
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
        {/* ─── Left: Charts & Tables ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading finance data…</p>
              </div>
            </div>
          )}

          {/* Budget Utilization by District — Horizontal Bar Chart */}
          <div className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-blue-400">Budget Utilization by District</h3>
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span>Sort:</span>
                <button onClick={() => setSortBy('utilization')} className={`px-2 py-0.5 rounded ${sortBy === 'utilization' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/60'}`}>Utilization</button>
                <button onClick={() => setSortBy('allocated')} className={`px-2 py-0.5 rounded ${sortBy === 'allocated' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/60'}`}>Allocated</button>
                <button onClick={() => setSortBy('name')} className={`px-2 py-0.5 rounded ${sortBy === 'name' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/60'}`}>Name</button>
              </div>
            </div>
            <div className="space-y-1.5">
              {sortedDistricts.map((d) => {
                const barPct = maxUtilization > 0 ? (d.utilization_pct / maxUtilization) * 100 : 0
                const barColor = d.utilization_pct >= 80 ? '#22C55E' : d.utilization_pct >= 60 ? '#EAB308' : d.utilization_pct >= 40 ? '#F97316' : '#EF4444'
                return (
                  <div key={d.district} className="flex items-center gap-2">
                    <span className="w-28 text-[10px] text-white/60 truncate text-right">{d.district}</span>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="w-10 text-[10px] text-white/50 text-right">{d.utilization_pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Procurement Tracker Table */}
          <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                <ShoppingCart size={12} />
                Procurement Tracker
              </h3>
              <span className="text-[9px] text-white/30">{data?.procurement.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Item</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Qty</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Cost</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.procurement.map((p, i) => {
                    const statusColor = STATUS_COLORS[p.status] || '#666'
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 text-white/70 font-medium">{p.item}</td>
                        <td className="px-3 py-2.5 text-right text-white/80">{p.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-white/80">{formatCurrency(p.cost)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/60">{p.eta}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Spending by Category</h3>
            <div className="space-y-3">
              {data?.by_category.map((cat) => {
                const catColor = CATEGORY_COLORS[cat.category] || '#666'
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: catColor }} />
                        <span className="text-[10px] text-white/70 font-medium">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-white/50">{formatCurrency(cat.spent)} / {formatCurrency(cat.allocated)}</span>
                        <span className="text-white/40 w-10 text-right">{cat.utilization_pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${cat.utilization_pct}%`, backgroundColor: catColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* District Budget List */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">District Budgets</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data?.by_district.map((d) => {
                const statusColor = STATUS_COLORS[d.status] || '#666'
                return (
                  <div key={d.district} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-white/70 font-medium truncate">{d.district}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap"
                          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                          {d.utilization_pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.utilization_pct}%`, backgroundColor: statusColor }} />
                      </div>
                      <div className="flex justify-between mt-0.5 text-[9px] text-white/30">
                        <span>{formatCurrency(d.spent)} / {formatCurrency(d.allocated)}</span>
                        <span className="capitalize">{d.status.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spending Breakdown Donut */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Spending Breakdown</h3>
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-36 h-36">
                {(() => {
                  if (!data?.by_category || data.by_category.length === 0) {
                    return <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  }
                  const totalSpent = data.by_category.reduce((s, c) => s + c.spent, 0)
                  if (totalSpent === 0) return <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  const circumference = 2 * Math.PI * 35
                  let offset = 0
                  return (
                    <>
                      {data.by_category.map((cat) => {
                        const pct = cat.spent / totalSpent
                        const dashLen = pct * circumference
                        const dashOffset = -offset
                        offset += dashLen
                        return (
                          <circle
                            key={cat.category}
                            cx="50" cy="50" r="35"
                            fill="none"
                            stroke={CATEGORY_COLORS[cat.category] || '#666'}
                            strokeWidth="10"
                            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90, 50, 50)"
                          />
                        )
                      })}
                      <circle cx="50" cy="50" r="25" fill="#0f172a" />
                      <text x="50" y="48" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
                        {formatCurrency(totalSpent)}
                      </text>
                      <text x="50" y="56" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.4)">total spent</text>
                    </>
                  )
                })()}
              </svg>
            </div>
            <div className="mt-3 space-y-1">
              {data?.by_category.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#666' }} />
                  <span className="text-white/60 flex-1">{cat.category}</span>
                  <span className="text-white/40">{formatCurrency(cat.spent)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Procurement Alerts */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Procurement Alerts</h3>
            <div className="space-y-2">
              {data?.procurement.filter(p => p.status === 'delayed' || p.status === 'pending').length === 0 ? (
                <div className="flex items-center gap-2 text-[10px] text-green-400/80">
                  <CheckCircle2 size={12} />
                  <span>No pending alerts</span>
                </div>
              ) : (
                data?.procurement.filter(p => p.status === 'delayed' || p.status === 'pending').map((p, i) => {
                  const isDelayed = p.status === 'delayed'
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                      isDelayed ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'
                    }`}>
                      <AlertTriangle size={12} className={`mt-0.5 flex-shrink-0 ${isDelayed ? 'text-red-400' : 'text-amber-400'}`} />
                      <div>
                        <p className="text-[10px] text-white/70 font-medium">{p.item}</p>
                        <p className="text-[9px] text-white/40">Qty: {p.quantity} · ETA: {p.eta}</p>
                        <span className={`text-[8px] font-medium capitalize ${isDelayed ? 'text-red-400' : 'text-amber-400'}`}>
                          {p.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Budget data sourced from state finance department records. Utilization % = spent/allocated × 100.
              Auto-refreshes every 60s. Procurement ETAs subject to change.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
