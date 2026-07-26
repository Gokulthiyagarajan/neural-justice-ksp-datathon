/**
 * CPOrders — Executive Orders & Directives
 *
 * Commissioner of Police command center page.
 * Shows orders/directives issued by CP to districts and units.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ScrollText, RefreshCw, AlertTriangle,
  CheckCircle2, Target, Flag,
} from 'lucide-react'
import { authHeaders } from '@/utils/authHeaders'
import { isDemoMode } from '@/services/demoData'
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton'
import { ErrorState } from '@/design-system/components/ErrorState'
import { EmptyState } from '@/design-system/components/EmptyState'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

interface OrderItem {
  id: string
  title: string
  description: string
  issued_to: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'completed' | 'overdue' | 'cancelled'
  date: string
  due_date: string
  category: string
}

interface OrdersSummary {
  total: number
  active: number
  completed: number
  overdue: number
}

interface OrdersData {
  summary: OrdersSummary
  orders: OrderItem[]
  last_updated: string
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3B82F6',
  completed: '#22C55E',
  overdue: '#EF4444',
  cancelled: '#6B7280',
}

export function CPOrders() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OrdersData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      if (isDemoMode()) {
        const now = new Date()
        const orders: OrderItem[] = [
          { id: 'ORD-2026-001', title: 'Strengthen Night Patrols in Bengaluru Urban', description: 'Increase night patrol frequency across all stations to counter rising chain snatching incidents', issued_to: 'All DCPs, Bengaluru Urban', priority: 'critical', status: 'active', date: new Date(now.getTime() - 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10), category: 'Operations' },
          { id: 'ORD-2026-002', title: 'Cyber Crime Cell Expansion', description: 'Establish dedicated cyber crime cells in 5 new districts with trained personnel', issued_to: 'IGP Hqrs, DIT', priority: 'high', status: 'active', date: new Date(now.getTime() - 172800000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10), category: 'Infrastructure' },
          { id: 'ORD-2026-003', title: 'Quarterly Firearms Inspection', description: 'All stations to complete quarterly firearms inspection and submit reports', issued_to: 'All District SPs', priority: 'high', status: 'active', date: new Date(now.getTime() - 259200000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10), category: 'Administration' },
          { id: 'ORD-2026-004', title: 'Traffic Decongestion Plan - MG Road Corridor', description: 'Implement revised traffic plan for MG Road corridor during peak hours', issued_to: 'DCP Traffic, Bengaluru', priority: 'medium', status: 'completed', date: new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10), category: 'Traffic' },
          { id: 'ORD-2026-005', title: 'Body Camera Procurement', description: 'Expedite procurement of 2000 body cameras for field officers', issued_to: 'Procurement Wing, Finance', priority: 'critical', status: 'overdue', date: new Date(now.getTime() - 45 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 10), category: 'Procurement' },
          { id: 'ORD-2026-006', title: 'Community Policing Initiative', description: 'Launch community policing program in 10 high-crime areas with weekly meetings', issued_to: 'DCP Community Affairs', priority: 'medium', status: 'active', date: new Date(now.getTime() - 10 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 21 * 86400000).toISOString().slice(0, 10), category: 'Community' },
          { id: 'ORD-2026-007', title: 'Anti-Narcotics Drive', description: 'Coordinate with Excise Dept for intensified anti-narcotics operations in coastal districts', issued_to: 'IGP Coastal Range, NCB Liaison', priority: 'high', status: 'active', date: new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10), category: 'Operations' },
          { id: 'ORD-2026-008', title: 'Women Safety Audit', description: 'Conduct safety audit of all police stations for women-friendly infrastructure', issued_to: 'All District SPs, W&J Wing', priority: 'medium', status: 'completed', date: new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() - 15 * 86400000).toISOString().slice(0, 10), category: 'Administration' },
          { id: 'ORD-2026-009', title: 'Flood Response Preparedness', description: 'Pre-position rescue teams and equipment in flood-prone districts ahead of monsoon', issued_to: 'DCP Operations, Civil Defence', priority: 'critical', status: 'active', date: new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10), due_date: new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10), category: 'Emergency' },
        ]
        setData({
          summary: {
            total: orders.length,
            active: orders.filter(o => o.status === 'active').length,
            completed: orders.filter(o => o.status === 'completed').length,
            overdue: orders.filter(o => o.status === 'overdue').length,
          },
          orders,
          last_updated: now.toISOString(),
        })
        setLastUpdated(now.toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/orders', { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
    } catch {
      console.error('[CPOrders] Fetch failed')
      setError('Unable to load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  const filtered = useMemo(() => {
    if (!data?.orders) return []
    return data.orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false
      return true
    })
  }, [data, statusFilter, priorityFilter])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  if (loading) return <CPPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <ScrollText size={16} className="text-amber-400" />
            </div>
            <h1 className="text-sm font-bold text-amber-400">Executive Orders</h1>
          </div>
        </div>
        <div className="p-6"><ErrorState title="Unable to load orders" description="Please try again. If the issue persists, contact support." onRetry={fetchData} retryLabel="Retry" /></div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <ScrollText size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">Executive Orders</h1>
            <p className="text-[10px] text-white/40">Directives · Priority · Status · Compliance</p>
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
            { label: 'Total Orders', value: summary.total, icon: <ScrollText size={12} />, color: 'text-amber-400' },
            { label: 'Active', value: summary.active, icon: <Flag size={12} />, color: 'text-blue-400' },
            { label: 'Completed', value: summary.completed, icon: <CheckCircle2 size={12} />, color: 'text-green-400' },
            { label: 'Overdue', value: summary.overdue, icon: <AlertTriangle size={12} />, color: summary.overdue > 0 ? 'text-red-400' : 'text-white/40' },
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
            <span className="text-[10px] text-white/40">Status:</span>
            {['all', 'active', 'completed', 'overdue'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  statusFilter === s ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="text-[10px] text-white/40 ml-2">Priority:</span>
            {['all', 'critical', 'high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  priorityFilter === p ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}>
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={40} />}
              title="No orders match your filters"
              description="Try adjusting status or priority filters"
            />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map(order => {
                const priorityColor = PRIORITY_COLORS[order.priority] || '#666'
                const statusColor = STATUS_COLORS[order.status] || '#666'
                const isOverdue = order.status === 'overdue'
                return (
                  <div key={order.id}
                    className={`bg-white/[0.03] rounded-xl border p-3 transition-colors ${
                      isOverdue ? 'border-red-500/30' : 'border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${priorityColor}20` }}>
                        <Target size={14} style={{ color: priorityColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-white/80">{order.title}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${priorityColor}20`, color: priorityColor }}>
                            {order.priority}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 mb-1">{order.description}</p>
                        <div className="flex items-center gap-3 text-[9px] text-white/40">
                          <span>📋 {order.id}</span>
                          <span>👤 {order.issued_to}</span>
                          <span>📅 {order.date}</span>
                          <span>⏰ Due: {order.due_date}</span>
                          <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px]">{order.category}</span>
                        </div>
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
            <h3 className="text-xs font-bold text-amber-400 mb-3">Priority Breakdown</h3>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                const count = data?.orders.filter(o => o.priority === p).length || 0
                const total = data?.orders.length || 1
                const pct = (count / total) * 100
                const color = PRIORITY_COLORS[p] || '#666'
                return count > 0 ? (
                  <div key={p}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-white/60 capitalize">{p}</span>
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
            <h3 className="text-xs font-bold text-blue-400 mb-3">By Category</h3>
            <div className="space-y-1.5">
              {data?.orders.reduce((acc, o) => {
                acc[o.category] = (acc[o.category] || 0) + 1
                return acc
              }, {} as Record<string, number>) && Object.entries(
                data.orders.reduce((acc, o) => { acc[o.category] = (acc[o.category] || 0) + 1; return acc }, {} as Record<string, number>)
              ).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2 text-[10px]">
                  <span className="text-white/60 flex-1">{cat}</span>
                  <span className="text-white/70 font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Overdue orders are escalated to the CP's office automatically.
              Auto-refreshes every 60s. Track compliance via SP dashboards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
