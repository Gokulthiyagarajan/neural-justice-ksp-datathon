/**
 * CPNotifications — Executive Notifications Center
 *
 * Commissioner of Police command center page.
 * Notifications across alerts, intelligence, admin, and system categories.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bell, RefreshCw, AlertTriangle, Brain,
  Settings, Mail, CheckCheck, Clock,
} from 'lucide-react'
import { authHeaders } from '@/utils/authHeaders'
import { isDemoMode } from '@/services/demoData'
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton'
import { ErrorState } from '@/design-system/components/ErrorState'
import { EmptyState } from '@/design-system/components/EmptyState'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

type NotificationCategory = 'alert' | 'intelligence' | 'admin' | 'system'

interface NotificationItem {
  id: string
  title: string
  message: string
  category: NotificationCategory
  read: boolean
  critical: boolean
  timestamp: string
  source: string
  actionable: boolean
}

interface NotificationsSummary {
  total: number
  unread: number
  critical: number
  today: number
}

interface NotificationsData {
  summary: NotificationsSummary
  notifications: NotificationItem[]
  last_updated: string
}

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: any; color: string }> = {
  alert: { label: 'Alert', icon: AlertTriangle, color: '#EF4444' },
  intelligence: { label: 'Intelligence', icon: Brain, color: '#8B5CF6' },
  admin: { label: 'Admin', icon: Settings, color: '#3B82F6' },
  system: { label: 'System', icon: Bell, color: '#22C55E' },
}

const CATEGORY_ORDER: NotificationCategory[] = ['alert', 'intelligence', 'admin', 'system']

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function CPNotifications() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<NotificationsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      if (isDemoMode()) {
        const now = new Date()
        const notifications: NotificationItem[] = [
          { id: 'notif-001', title: 'Critical: Crime Spike Detected - Bengaluru Urban', message: 'AI system detected a 40% increase in chain snatching incidents in Koramangala zone over the past 72 hours.', category: 'alert', read: false, critical: true, timestamp: new Date(now.getTime() - 1800000).toISOString(), source: 'AI Early Warning', actionable: true },
          { id: 'notif-002', title: 'Intel Report: Suspected Terror Module', message: 'Intelligence input suggests possible radicalization activity in coastal districts. Coordination required with ATS.', category: 'intelligence', read: false, critical: true, timestamp: new Date(now.getTime() - 3600000).toISOString(), source: 'IB/SIB', actionable: true },
          { id: 'notif-003', title: 'Budget Utilization Report Available', message: 'Q4 budget utilization reports are now available for review. Deadline for submission is next Friday.', category: 'admin', read: false, critical: false, timestamp: new Date(now.getTime() - 7200000).toISOString(), source: 'Finance Wing', actionable: false },
          { id: 'notif-004', title: 'System Update: Risk Engine v2.1 Deployed', message: 'ML risk scoring model v2.1 has been deployed. Improved accuracy for repeat offender prediction.', category: 'system', read: true, critical: false, timestamp: new Date(now.getTime() - 14400000).toISOString(), source: 'IT Department', actionable: false },
          { id: 'notif-005', title: 'High: Overdue Investigation Alert', message: '15 cases across 8 districts have exceeded 30-day investigation deadline without updates.', category: 'alert', read: false, critical: true, timestamp: new Date(now.getTime() - 21600000).toISOString(), source: 'Compliance Monitor', actionable: true },
          { id: 'notif-006', title: 'Weather Alert: Heavy Rainfall Warning', message: 'IMD predicts heavy rainfall in coastal districts. Pre-position rescue teams as per flood SOP.', category: 'alert', read: false, critical: false, timestamp: new Date(now.getTime() - 28800000).toISOString(), source: 'IMD / State Disaster', actionable: true },
          { id: 'notif-007', title: 'New Intelligence: Organized Retail Theft Ring', message: 'Multi-district organized retail theft ring identified. Pattern analysis suggests 12+ locations affected.', category: 'intelligence', read: true, critical: false, timestamp: new Date(now.getTime() - 36000000).toISOString(), source: 'Crime Intel Unit', actionable: true },
          { id: 'notif-008', title: 'Promotion Orders Approved', message: 'Promotion orders for 48 officers across 5 ranks have been approved and published.', category: 'admin', read: true, critical: false, timestamp: new Date(now.getTime() - 43200000).toISOString(), source: 'Personnel Branch', actionable: false },
          { id: 'notif-009', title: 'Database Migration Complete', message: 'Legacy FIR database migration to new system completed successfully. No data loss reported.', category: 'system', read: true, critical: false, timestamp: new Date(now.getTime() - 86400000).toISOString(), source: 'IT Department', actionable: false },
          { id: 'notif-010', title: 'Medium: Prisoner Escort Request Pending', message: '3 prisoner escort requests pending approval for court appearances scheduled this week.', category: 'admin', read: false, critical: false, timestamp: new Date(now.getTime() - 93600000).toISOString(), source: 'Court Liaison', actionable: true },
          { id: 'notif-011', title: 'Traffic Pattern Anomaly Detected', message: 'Unusual traffic congestion pattern detected near Bengaluru-Mysuru corridor. Possible VIP movement or event.', category: 'alert', read: false, critical: false, timestamp: new Date(now.getTime() - 100800000).toISOString(), source: 'Traffic AI', actionable: false },
          { id: 'notif-012', title: 'Intel Sharing: Inter-State Vehicular Theft', message: 'Intelligence from Maharashtra Police regarding inter-state vehicle theft gang operating in northern districts.', category: 'intelligence', read: true, critical: false, timestamp: new Date(now.getTime() - 120960000).toISOString(), source: 'Inter-State Intel', actionable: true },
          { id: 'notif-013', title: 'Quarterly Performance Review Schedule', message: 'Quarterly performance review meetings to be scheduled with all District SPs during first week of next month.', category: 'admin', read: false, critical: false, timestamp: new Date(now.getTime() - 151200000).toISOString(), source: 'CP Secretariat', actionable: false },
          { id: 'notif-014', title: 'New Feature: Predictive Patrol Routes', message: 'Predictive patrol route optimization is now available in the GIS module. Test in Bengaluru Urban first.', category: 'system', read: false, critical: false, timestamp: new Date(now.getTime() - 172800000).toISOString(), source: 'Product Team', actionable: false },
          { id: 'notif-015', title: 'High: Social Media Monitoring Alert', message: 'Potential law and order situation brewing in Hubballi based on social media chatter analysis.', category: 'intelligence', read: false, critical: true, timestamp: new Date(now.getTime() - 259200000).toISOString(), source: 'Social Media Lab', actionable: true },
        ]
        setData({
          summary: {
            total: notifications.length,
            unread: notifications.filter(n => !n.read).length,
            critical: notifications.filter(n => n.critical).length,
            today: notifications.filter(n => new Date(n.timestamp).toDateString() === now.toDateString()).length,
          },
          notifications,
          last_updated: now.toISOString(),
        })
        setLastUpdated(now.toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/notifications', { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
    } catch {
      console.error('[CPNotifications] Fetch failed')
      setError('Unable to load notifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id))
  }, [])

  const markAllAsRead = useCallback(() => {
    if (data?.notifications) {
      setReadIds(new Set(data.notifications.map(n => n.id)))
    }
  }, [data])

  const filtered = useMemo(() => {
    if (!data?.notifications) return []
    return data.notifications.filter(n => {
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false
      if (showUnreadOnly && (readIds.has(n.id) || n.read)) return false
      return true
    })
  }, [data, categoryFilter, showUnreadOnly, readIds])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  if (loading) return <CPPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bell size={16} className="text-blue-400" />
            </div>
            <h1 className="text-sm font-bold text-blue-400">Notifications</h1>
          </div>
        </div>
        <div className="p-6"><ErrorState title="Unable to load notifications" description="Please try again. If the issue persists, contact support." onRetry={fetchData} retryLabel="Retry" /></div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Bell size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-blue-400">Notifications</h1>
            <p className="text-[10px] text-white/40">Alerts · Intelligence · Admin · System</p>
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
        <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total', value: summary.total, icon: <Bell size={12} />, color: 'text-blue-400' },
            { label: 'Unread', value: summary.unread, icon: <Mail size={12} />, color: 'text-amber-400' },
            { label: 'Critical', value: summary.critical, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Today', value: summary.today, icon: <Clock size={12} />, color: 'text-green-400' },
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">Category:</span>
              {(['all', ...CATEGORY_ORDER] as const).map(cat => {
                const meta = cat === 'all' ? { label: 'All', icon: Bell, color: '#3B82F6' } : CATEGORY_META[cat]
                const CatIcon = meta.icon
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                      categoryFilter === cat ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                    }`}>
                    <CatIcon size={10} />{meta.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer">
                <input type="checkbox" checked={showUnreadOnly}
                  onChange={e => setShowUnreadOnly(e.target.checked)}
                  className="accent-blue-500" />
                Unread only
              </label>
              <button onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 transition-colors">
                <CheckCheck size={10} />Mark all read
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Bell size={40} />}
              title="No notifications"
              description={showUnreadOnly ? 'All caught up! No unread notifications.' : 'No notifications match your filters.'}
            />
          ) : (
            <div className="space-y-1">
              {filtered.map(n => {
                const meta = CATEGORY_META[n.category]
                const CatIcon = meta.icon
                const isRead = readIds.has(n.id) || n.read
                return (
                  <div key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`flex items-start gap-3 bg-white/[0.02] rounded-xl border p-3 cursor-pointer transition-colors ${
                      isRead ? 'border-white/5' : 'border-blue-500/20 bg-blue-500/[0.02]'
                    } ${n.critical && !isRead ? 'border-red-500/30' : ''} hover:bg-white/[0.04]`}>
                    <div className="relative mt-0.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${meta.color}20` }}>
                        <CatIcon size={14} style={{ color: meta.color }} />
                      </div>
                      {!isRead && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-slate-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold ${isRead ? 'text-white/60' : 'text-white/80'}`}>
                          {n.title}
                        </span>
                        {n.critical && (
                          <span className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded text-[8px] font-medium">CRITICAL</span>
                        )}
                        {n.actionable && (
                          <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px]">Action</span>
                        )}
                        <span className="ml-auto text-[8px] text-white/30">{formatTimeAgo(n.timestamp)}</span>
                      </div>
                      <p className={`text-[10px] ${isRead ? 'text-white/40' : 'text-white/50'}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-white/30">{n.source}</span>
                        <span className="text-[8px] text-white/20">·</span>
                        <span className="text-[8px] text-white/30 capitalize">{n.category}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Category Breakdown</h3>
            <div className="space-y-2">
              {CATEGORY_ORDER.map(cat => {
                const count = data?.notifications.filter(n => n.category === cat).length || 0
                const unread = data?.notifications.filter(n => n.category === cat && !n.read && !readIds.has(n.id)).length || 0
                const meta = CATEGORY_META[cat]
                return (
                  <div key={cat} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/5">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                      <meta.icon size={11} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/70">{meta.label}</span>
                        <span className="text-[10px] text-white/50">{count}</span>
                      </div>
                      {unread > 0 && (
                        <span className="text-[8px] text-blue-400">{unread} unread</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">Critical Alerts</h3>
            <div className="space-y-2">
              {data?.notifications.filter(n => n.critical).slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-2 bg-red-500/5 rounded-lg px-2 py-1.5 border border-red-500/20">
                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-[10px] text-white/70 font-medium">{n.title}</p>
                    <p className="text-[8px] text-white/30">{formatTimeAgo(n.timestamp)}</p>
                  </div>
                </div>
              ))}
              {(!data?.notifications.some(n => n.critical)) && (
                <p className="text-[10px] text-green-400/60">No critical alerts</p>
              )}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Critical notifications require immediate attention. Auto-refreshes every 60s.
              Mark notifications as read to track acknowledgement status.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
