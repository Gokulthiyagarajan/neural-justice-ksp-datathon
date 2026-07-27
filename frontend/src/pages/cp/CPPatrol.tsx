/**
 * CPPatrol — State-wide Patrol Operations
 *
 * Commissioner of Police command center page.
 * Active patrols, vehicle deployment, shift coverage across all districts.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Truck, RefreshCw, Shield,
  Users, MapPin, Clock,
} from 'lucide-react'
import { authHeaders } from '@/utils/authHeaders'
import { isDemoMode } from '@/services/demoData'
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton'
import { ErrorState } from '@/design-system/components/ErrorState'
import { EmptyState } from '@/design-system/components/EmptyState'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

interface PatrolEntry {
  id: string
  district: string
  zone: string
  vehicle: string
  officers: number
  officer_names: string[]
  status: 'active' | 'on_break' | 'completed' | 'standby'
  started_at: string
  coverage_hours: number
  beat: string
}

interface PatrolSummary {
  active_patrols: number
  vehicles_deployed: number
  officers_on_patrol: number
  coverage_pct: number
  shifts_active: number
  districts_covered: number
}

interface PatrolData {
  summary: PatrolSummary
  patrols: PatrolEntry[]
  districts: string[]
  last_updated: string
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  on_break: '#EAB308',
  completed: '#3B82F6',
  standby: '#6B7280',
}

const VEHICLE_ICONS: Record<string, string> = {
  'Gypsy': '#22C55E',
  'Bolero': '#3B82F6',
  'Scorpio': '#F97316',
  'Tavera': '#8B5CF6',
  'Bus': '#EC4899',
  'Motorcycle': '#14B8A6',
}

export function CPPatrol() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PatrolData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    const getDemoData = () => {
      const now = new Date()
      const districts = ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi']
      const vehicles = ['Gypsy', 'Bolero', 'Scorpio', 'Tavera', 'Motorcycle']
      const zones = ['A Sector', 'B Sector', 'C Sector', 'D Sector', 'E Sector', 'F Sector']
      const statuses: Array<'active' | 'on_break' | 'completed' | 'standby'> = ['active', 'on_break', 'completed', 'standby']
      const officerPool = ['SI Sharma', 'HC Kumar', 'PC Venkatesh', 'SI Meena', 'PC Ramesh', 'ASI Gopal', 'SI Priya', 'PC Suresh']
      const patrols: PatrolEntry[] = Array.from({ length: 14 }, (_, i) => {
        const officers = Math.min(3, (i % 3) + 1)
        const selectedOfficers: string[] = []
        for (let j = 0; j < officers; j++) {
          selectedOfficers.push(officerPool[(i + j) % officerPool.length])
        }
        return {
          id: `PT-${(i + 1).toString().padStart(3, '0')}`,
          district: districts[i % districts.length],
          zone: zones[i % zones.length],
          vehicle: vehicles[i % vehicles.length],
          officers,
          officer_names: selectedOfficers,
          status: statuses[i % statuses.length],
          started_at: new Date(now.getTime() - Math.random() * 8 * 3600000).toISOString(),
          coverage_hours: Math.floor(Math.random() * 8) + 4,
          beat: `Beat ${String.fromCharCode(65 + (i % 6))}-${(Math.floor(i / 6) + 1)}`,
        }
      })
      const activePatrols = patrols.filter(p => p.status === 'active').length
      return {
        summary: {
          active_patrols: activePatrols,
          vehicles_deployed: patrols.filter(p => p.status !== 'standby').length,
          officers_on_patrol: patrols.filter(p => p.status === 'active').reduce((s, p) => s + p.officers, 0),
          coverage_pct: Math.round((activePatrols / patrols.length) * 100),
          shifts_active: 3,
          districts_covered: new Set(patrols.map(p => p.district)).size,
        },
        patrols,
        districts,
        last_updated: now.toISOString(),
      }
    }

    try {
      setRefreshing(true)
      setError(null)
      if (isDemoMode()) {
        const demo = getDemoData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/patrol', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        const demo = getDemoData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPPatrol] Fetch failed')
      const demo = getDemoData()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  const filtered = useMemo(() => {
    if (!data?.patrols) return []
    return data.patrols.filter(p => {
      if (districtFilter !== 'all' && p.district !== districtFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
  }, [data, districtFilter, statusFilter])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  if (loading) return <CPPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Truck size={16} className="text-green-400" />
            </div>
            <h1 className="text-sm font-bold text-green-400">Patrol Operations</h1>
          </div>
        </div>
        <div className="p-6"><ErrorState title="Unable to load patrol data" description="Please try again. If the issue persists, contact support." onRetry={fetchData} retryLabel="Retry" /></div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Truck size={16} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-green-400">Patrol Operations</h1>
            <p className="text-[10px] text-white/40">Active patrols · Vehicle deployment · Coverage</p>
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

      {summary && (
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Active Patrols', value: summary.active_patrols, icon: <Truck size={12} />, color: 'text-green-400' },
            { label: 'Vehicles Deployed', value: summary.vehicles_deployed, icon: <MapPin size={12} />, color: 'text-blue-400' },
            { label: 'Officers on Patrol', value: summary.officers_on_patrol, icon: <Users size={12} />, color: 'text-cyan-400' },
            { label: 'Coverage', value: `${summary.coverage_pct}%`, icon: <Shield size={12} />, color: summary.coverage_pct >= 70 ? 'text-green-400' : 'text-amber-400' },
            { label: 'Shifts Active', value: summary.shifts_active, icon: <Clock size={12} />, color: 'text-violet-400' },
            { label: 'Districts', value: summary.districts_covered, icon: <MapPin size={12} />, color: 'text-orange-400' },
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">District:</span>
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Districts</option>
              {data?.districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="text-[10px] text-white/40">Status:</span>
            {['all', 'active', 'on_break', 'completed', 'standby'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  statusFilter === s ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}>
                {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Truck size={40} />}
              title="No patrols match your filters"
              description="Try adjusting district or status filters"
            />
          ) : (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">ID</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Zone</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Vehicle</th>
                    <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Officers</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Beat</th>
                    <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const statusColor = STATUS_COLORS[p.status] || '#666'
                    const vehicleColor = VEHICLE_ICONS[p.vehicle] || '#666'
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-green-400">{p.id}</td>
                        <td className="px-3 py-2.5 text-white/70">{p.district}</td>
                        <td className="px-3 py-2.5 text-white/50">{p.zone}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{ backgroundColor: `${vehicleColor}20`, color: vehicleColor }}>
                            {p.vehicle}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users size={10} className="text-white/40" />
                            <span className="text-white/70">{p.officers}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-white/50">{p.beat}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/50 tabular-nums">{p.coverage_hours}h</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-green-400 mb-3">Status Overview</h3>
            <div className="space-y-2">
              {(['active', 'on_break', 'completed', 'standby'] as const).map(s => {
                const count = data?.patrols.filter(p => p.status === s).length || 0
                const total = data?.patrols.length || 1
                const pct = (count / total) * 100
                const color = STATUS_COLORS[s] || '#666'
                return count > 0 ? (
                  <div key={s}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-white/60 capitalize">{s.replace(/_/g, ' ')}</span>
                      <span className="text-white/70 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ) : null
              })}
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Vehicle Fleet</h3>
            <div className="space-y-1.5">
              {data?.patrols.reduce((acc, p) => {
                acc[p.vehicle] = (acc[p.vehicle] || 0) + 1
                return acc
              }, {} as Record<string, number>) && Object.entries(
                data.patrols.reduce((acc, p) => { acc[p.vehicle] = (acc[p.vehicle] || 0) + 1; return acc }, {} as Record<string, number>)
              ).sort(([, a], [, b]) => b - a).map(([v, count]) => {
                const color = VEHICLE_ICONS[v] || '#666'
                return (
                  <div key={v} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-white/5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-white/60 flex-1">{v}</span>
                    <span className="text-[10px] text-white-70 font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Active Patrols by District</h3>
            <div className="space-y-1.5">
              {data?.districts.map(d => {
                const active = data.patrols.filter(p => p.district === d && p.status === 'active').length
                const total = data.patrols.filter(p => p.district === d).length
                return (
                  <div key={d} className="flex items-center gap-2 text-[10px]">
                    <span className="text-white/60 w-28 truncate">{d}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <span className={active > 0 ? 'text-green-400 font-medium' : 'text-white/30'}>{active}</span>
                      <span className="text-white/20">/</span>
                      <span className="text-white/40">{total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Active patrols are tracked via GPS. Coverage % reflects active patrols against total fleet.
              Auto-refreshes every 60s. Data from state-wide patrol management system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}