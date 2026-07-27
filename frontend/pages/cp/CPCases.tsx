/**
 * CPCases — State-wide Cases Overview
 *
 * Commissioner of Police command center page.
 * Shows all cases across the state with filtering by district, status, crime type.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderOpen, RefreshCw, AlertTriangle, Search,
  TrendingUp, Clock, CheckCircle2,
} from 'lucide-react'
import { authHeaders } from '@/utils/authHeaders'
import { isDemoMode } from '@/services/demoData'
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton'
import { ErrorState } from '@/design-system/components/ErrorState'
import { EmptyState } from '@/design-system/components/EmptyState'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

interface CaseItem {
  crime_no: string
  district: string
  station_name: string
  crime_type: string
  status: string
  days_open: number
  occurrence_date: string
  accused_name?: string
}

interface CasesSummary {
  total: number
  active: number
  under_investigation: number
  solved_rate: number
}

interface CasesData {
  summary: CasesSummary
  cases: CaseItem[]
  districts: string[]
  crime_types: string[]
  last_updated: string
}

const STATUS_COLORS: Record<string, string> = {
  registered: '#3B82F6',
  under_investigation: '#F97316',
  critical: '#EF4444',
  closed: '#22C55E',
  resolved: '#22C55E',
  chargesheeted: '#8B5CF6',
}

export function CPCases() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CasesData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      if (isDemoMode()) {
        const now = new Date()
        const districts = ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Shivamogga']
        const types = ['Theft', 'Robbery', 'Assault', 'Burglary', 'Cyber Fraud', 'Chain Snatching', 'Vehicle Theft', 'Murder']
        const statuses = ['registered', 'under_investigation', 'closed', 'chargesheeted', 'critical']
        const cases: CaseItem[] = Array.from({ length: 14 }, (_, i) => ({
          crime_no: `KSP-2026-${(200 - i).toString().padStart(3, '0')}`,
          district: districts[i % districts.length],
          station_name: `${districts[i % districts.length]} PS`,
          crime_type: types[i % types.length],
          status: statuses[i % statuses.length],
          days_open: Math.floor(Math.random() * 60) + 1,
          occurrence_date: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
          accused_name: ['Ravi Kumar', 'Suresh Patel', 'Mohan Reddy', 'Unknown', 'Anil Kumar', 'Priya Singh', 'Karthik S', 'Venkat Rao'][i % 8],
        }))
        setData({
          summary: {
            total: cases.length,
            active: cases.filter(c => c.status !== 'closed' && c.status !== 'resolved').length,
            under_investigation: cases.filter(c => c.status === 'under_investigation').length,
            solved_rate: 38.2,
          },
          cases,
          districts,
          crime_types: types,
          last_updated: now.toISOString(),
        })
        setLastUpdated(now.toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/cases', { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
    } catch {
      console.error('[CPCases] Fetch failed')
      setError('Unable to load cases')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  const filtered = useMemo(() => {
    if (!data?.cases) return []
    return data.cases.filter(c => {
      if (districtFilter !== 'all' && c.district !== districtFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (typeFilter !== 'all' && c.crime_type !== typeFilter) return false
      if (search && !c.crime_no.toLowerCase().includes(search.toLowerCase()) && !c.crime_type.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, districtFilter, statusFilter, typeFilter, search])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  if (loading) return <CPPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FolderOpen size={16} className="text-blue-400" />
            </div>
            <h1 className="text-sm font-bold text-blue-400">State-wide Cases</h1>
          </div>
        </div>
        <div className="p-6"><ErrorState title="Unable to load cases" description="Please try again. If the issue persists, contact support." onRetry={fetchData} retryLabel="Retry" /></div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FolderOpen size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-blue-400">State-wide Cases</h1>
            <p className="text-[10px] text-white/40">District · Status · Crime Type · Filters</p>
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
            { label: 'Total Cases', value: summary.total, icon: <FolderOpen size={12} />, color: 'text-blue-400' },
            { label: 'Active', value: summary.active, icon: <AlertTriangle size={12} />, color: 'text-amber-400' },
            { label: 'Under Investigation', value: summary.under_investigation, icon: <Clock size={12} />, color: 'text-orange-400' },
            { label: 'Solved Rate', value: `${summary.solved_rate}%`, icon: <CheckCircle2 size={12} />, color: 'text-green-400' },
            { label: 'Filtered', value: filtered.length, icon: <Search size={12} />, color: 'text-violet-400' },
            { label: 'Districts', value: data?.districts.length || 0, icon: <TrendingUp size={12} />, color: 'text-cyan-400' },
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
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
              <input type="text" placeholder="Search crime no. or type..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-[10px] bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-white/60 placeholder-white/20 focus:outline-none focus:border-blue-500/40" />
            </div>
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Districts</option>
              {data?.districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Status</option>
              {['registered', 'under_investigation', 'critical', 'chargesheeted', 'closed'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Types</option>
              {data?.crime_types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={40} />}
              title="No cases match your filters"
              description="Try adjusting district, status, or crime type filters"
            />
          ) : (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Crime No</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Station</th>
                    <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Type</th>
                    <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Days Open</th>
                    <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const statusColor = STATUS_COLORS[c.status] || '#666'
                    return (
                      <tr key={c.crime_no}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-blue-400">{c.crime_no}</td>
                        <td className="px-3 py-2.5 text-white/60">{c.district}</td>
                        <td className="px-3 py-2.5 text-white/50">{c.station_name}</td>
                        <td className="px-3 py-2.5 text-white/60">{c.crime_type}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {c.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <span className={c.days_open > 30 ? 'text-red-400 font-medium' : 'text-white/50'}>
                            {c.days_open}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/40">{c.occurrence_date}</td>
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
            <h3 className="text-xs font-bold text-blue-400 mb-3">Status Distribution</h3>
            <div className="space-y-2">
              {(['registered', 'under_investigation', 'critical', 'chargesheeted', 'closed'] as const).map(s => {
                const count = data?.cases.filter(c => c.status === s).length || 0
                const total = data?.cases.length || 1
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
            <h3 className="text-xs font-bold text-orange-400 mb-3">Overdue Cases (&gt;30 days)</h3>
            <div className="space-y-2">
              {data?.cases.filter(c => c.days_open > 30).slice(0, 8).map(c => (
                <div key={c.crime_no} className="flex items-start gap-2 bg-white/[0.03] rounded-lg px-2 py-1.5 border border-white/5">
                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-[10px] text-white/70 font-medium">{c.crime_no}</p>
                    <p className="text-[9px] text-white/40">{c.district} · {c.crime_type} · {c.days_open}d</p>
                  </div>
                </div>
              ))}
              {(!data?.cases.some(c => c.days_open > 30)) && (
                <p className="text-[10px] text-green-400/60">No overdue cases</p>
              )}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Cases exceeding 30 days without resolution are flagged as overdue.
              Auto-refreshes every 60s. Data sourced from state-wide FIR database.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
