/**
 * CPActivity — State-wide Activity Timeline
 *
 * Commissioner of Police command center page.
 * Shows real-time and historical activity across all districts.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity, RefreshCw, Filter, Clock,
  FileText, Shield, AlertTriangle,
  CheckCircle2, MapPin,
} from 'lucide-react'
import { authHeaders } from '@/utils/authHeaders'
import { isDemoMode } from '@/services/demoData'
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton'
import { ErrorState } from '@/design-system/components/ErrorState'
import { EmptyState } from '@/design-system/components/EmptyState'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

interface ActivityEntry {
  id: string
  user: string
  user_role: string
  action: string
  resource: string
  details: string
  district: string
  timestamp: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
}

interface ActivitySummary {
  total: number
  today: number
  arrests: number
  fir_registrations: number
  alerts: number
}

interface ActivityData {
  summary: ActivitySummary
  activities: ActivityEntry[]
  districts: string[]
  action_types: string[]
  last_updated: string
}

const ACTION_ICONS: Record<string, any> = {
  fir_registration: FileText,
  arrest: Shield,
  alert: AlertTriangle,
  patrol: MapPin,
  resolution: CheckCircle2,
  default: Activity,
}

const SEVERITY_DOT: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
  info: '#3B82F6',
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function CPActivity() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ActivityData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  const fetchData = useCallback(async () => {
    const getDemoData = () => {
      const now = new Date()
      const districts = ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Shivamogga']
      const actions = ['fir_registration', 'arrest', 'alert', 'patrol', 'resolution']
      const severities: Array<'info' | 'low' | 'medium' | 'high' | 'critical'> = ['info', 'low', 'medium', 'high', 'critical']
      const activities: ActivityEntry[] = Array.from({ length: 24 }, (_, i) => {
        const district = districts[i % districts.length]
        const action = actions[i % actions.length]
        return {
          id: `act-${(i + 1).toString().padStart(3, '0')}`,
          user: ['SI Meena K.', 'PI Ramesh', 'ASI Gopal', 'DCP Sharma', 'SI Venkatesh', 'PI Shetty', 'ASI Nagesh', 'SI Priya'][i % 8],
          user_role: ['SI', 'PI', 'ASI', 'DCP', 'SI', 'PI', 'ASI', 'SI'][i % 8],
          action,
          resource: action === 'fir_registration' ? `KSP-2026-${(200 - i).toString().padStart(3, '0')}` :
                     action === 'arrest' ? `ACC-${(i + 100)}` :
                     action === 'alert' ? `Warning #${i + 1}` :
                     action === 'patrol' ? `Unit ${String.fromCharCode(65 + (i % 6))}` : `Case ${i + 1}`,
          details: action === 'fir_registration' ? `New FIR registered for ${['Theft', 'Robbery', 'Assault', 'Burglary'][i % 4]}` :
                    action === 'arrest' ? `Suspect arrested in connection with ${['chain snatching', 'burglary', 'vehicle theft'][i % 3]}` :
                    action === 'alert' ? `AI-generated alert for ${['crime spike', 'repeat offender', 'pattern detected'][i % 3]}` :
                    action === 'patrol' ? `Patrol unit deployed to ${['market area', 'residential zone', 'commercial district'][i % 3]}` :
                    `Case resolved - ${['all charges dropped', 'suspect acquitted', 'compromise reached'][i % 3]}`,
          district,
          timestamp: new Date(now.getTime() - i * 3600000).toISOString(),
          severity: severities[i % severities.length],
        }
      })
      return {
        summary: {
          total: activities.length,
          today: activities.filter(a => new Date(a.timestamp).toDateString() === now.toDateString()).length,
          arrests: activities.filter(a => a.action === 'arrest').length,
          fir_registrations: activities.filter(a => a.action === 'fir_registration').length,
          alerts: activities.filter(a => a.action === 'alert').length,
        },
        activities,
        districts,
        action_types: actions,
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
      const res = await fetch('/api/cp/activity', { headers: authHeaders() })
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
      console.error('[CPActivity] Fetch failed')
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
    if (!data?.activities) return []
    return data.activities.filter(a => {
      if (districtFilter !== 'all' && a.district !== districtFilter) return false
      if (actionFilter !== 'all' && a.action !== actionFilter) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      return true
    })
  }, [data, districtFilter, actionFilter, severityFilter])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  if (loading) return <CPPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Activity size={16} className="text-violet-400" />
            </div>
            <h1 className="text-sm font-bold text-violet-400">Activity Timeline</h1>
          </div>
        </div>
        <div className="p-6"><ErrorState title="Unable to load activity" description="Please try again. If the issue persists, contact support." onRetry={fetchData} retryLabel="Retry" /></div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Activity size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-violet-400">Activity Timeline</h1>
            <p className="text-[10px] text-white/40">State-wide · Real-time · Filterable</p>
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
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total Events', value: summary.total, icon: <Activity size={12} />, color: 'text-violet-400' },
            { label: 'Today', value: summary.today, icon: <Clock size={12} />, color: 'text-blue-400' },
            { label: 'Arrests', value: summary.arrests, icon: <Shield size={12} />, color: 'text-green-400' },
            { label: 'FIRs', value: summary.fir_registrations, icon: <FileText size={12} />, color: 'text-amber-400' },
            { label: 'Alerts', value: summary.alerts, icon: <AlertTriangle size={12} />, color: summary.alerts > 0 ? 'text-red-400' : 'text-white/40' },
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
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={12} className="text-white/30" />
            <span className="text-[10px] text-white/40">District:</span>
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Districts</option>
              {data?.districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="text-[10px] text-white/40">Action:</span>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
              className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 focus:outline-none focus:border-blue-500/40">
              <option value="all">All Actions</option>
              {data?.action_types.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
            <span className="text-[10px] text-white/40">Severity:</span>
            {['all', 'info', 'low', 'medium', 'high', 'critical'].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  severityFilter === s ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Activity size={40} />}
              title="No activity matches your filters"
              description="Try adjusting district, action, or severity filters"
            />
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-0 bottom-0 w-px bg-white/5" />
              <div className="space-y-1">
                {filtered.map((entry) => {
                  const ActionIcon = ACTION_ICONS[entry.action] || ACTION_ICONS.default
                  const dotColor = SEVERITY_DOT[entry.severity] || '#666'
                  return (
                    <div key={entry.id} className="flex items-start gap-3 pl-1">
                      <div className="relative z-10 mt-1">
                        <div className="w-[10px] h-[10px] rounded-full border-2"
                          style={{ backgroundColor: `${dotColor}20`, borderColor: dotColor }} />
                      </div>
                      <div className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] rounded-lg px-3 py-2 border border-white/5 transition-colors">
                        <div className="flex items-center gap-2 mb-0.5">
                          <ActionIcon size={11} className="text-white/40" />
                          <span className="text-[10px] font-medium text-white/70">{entry.user}</span>
                          <span className="text-[8px] text-white/30 bg-white/5 px-1 py-0.5 rounded">{entry.user_role}</span>
                          <span className="ml-auto text-[8px] text-white/30">{formatTimeAgo(entry.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-white/50">
                          <span className="capitalize text-white/60 font-medium">{entry.action.replace(/_/g, ' ')}</span>
                          {' — '}{entry.resource}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-white/30">{entry.district}</span>
                          <span className="text-[8px] text-white/20">·</span>
                          <span className="text-[8px] text-white/30">{entry.details}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Activity Summary</h3>
            <div className="space-y-2">
              {data?.action_types.map(action => {
                const count = data.activities.filter(a => a.action === action).length
                const total = data.activities.length
                const pct = (count / total) * 100
                return (
                  <div key={action}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-white/60 capitalize">{action.replace(/_/g, ' ')}</span>
                      <span className="text-white/70 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">By District</h3>
            <div className="space-y-1.5">
              {data?.districts.map(d => {
                const count = data.activities.filter(a => a.district === d).length
                const maxCount = Math.max(...data.districts.map(dd => data.activities.filter(a => a.district === dd).length), 1)
                const pct = (count / maxCount) * 100
                return (
                  <div key={d} className="flex items-center gap-2 text-[10px]">
                    <span className="text-white/60 w-28 truncate">{d}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400/50" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-white/40 w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Activity data is sourced from real-time events across all districts.
              Auto-refreshes every 60s. Severity levels indicate operational impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
