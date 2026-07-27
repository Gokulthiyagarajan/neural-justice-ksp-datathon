/**
 * Settings — CP Configuration & System Settings
 *
 * Commissioner of Police command center page.
 * User management, integrations, notifications, audit logs.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, Users, Shield, Server, Database, HardDrive,
  Bell, Search, MoreHorizontal,
  Activity, CheckCircle2, Eye, Edit2,
} from 'lucide-react'
import { Settings as SettingsIcon } from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ────────────────────────────────────────────────────────────────

interface CPUser {
  id: string
  name: string
  role: string
  district: string
  last_login: string
  status: 'active' | 'inactive' | 'suspended'
}

interface Integration {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'maintenance'
  last_sync: string
  endpoint: string
}

interface NotificationPref {
  type: string
  enabled: boolean
  channels: string[]
  frequency: string
}

interface AuditLog {
  timestamp: string
  user: string
  action: string
  resource: string
  ip: string
}

interface SettingsData {
  summary: {
    total_users: number
    active_sessions: number
    api_calls_24h: number
    system_health: number
  }
  users: CPUser[]
  integrations: Integration[]
  notifications: NotificationPref[]
  audit_logs: AuditLog[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  inactive: '#9CA3AF',
  suspended: '#EF4444',
  healthy: '#22C55E',
  degraded: '#F97316',
  down: '#EF4444',
  maintenance: '#3B82F6',
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#EF4444',
  ADMIN: '#F97316',
  DCP: '#EAB308',
  ACP: '#3B82F6',
  INSPECTOR: '#8B5CF6',
  PSI: '#14B8A6',
  ASI: '#06B6D4',
  HC: '#A855F7',
  PC: '#EC4899',
  ANALYST: '#F59E0B',
  VIEWER: '#6B7280',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

// ─── Main Component ───────────────────────────────────────────────────────

export function Settings() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<SettingsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'integrations' | 'notifications' | 'audit'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/cp/settings')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[Settings] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Filtered users ────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    if (!data?.users) return []
    return data.users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [data, searchQuery, roleFilter])

  // ── Role distribution ─────────────────────────────────────────────────

  const roleDistribution = useMemo(() => {
    if (!data?.users) return []
    const counts: Record<string, number> = {}
    data.users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [data])

  // ── Recent config changes ─────────────────────────────────────────────

  const recentChanges = useMemo(() => {
    if (!data?.audit_logs) return []
    return data.audit_logs
      .filter(log => log.action.includes('config') || log.action.includes('setting') || log.action.includes('update'))
      .slice(0, 6)
  }, [data])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-600/20 flex items-center justify-center">
            <SettingsIcon size={16} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-400">Settings & Configuration</h1>
            <p className="text-[10px] text-white/40">Users · Integrations · Notifications · Audit trail</p>
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

      {/* KPI Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total Users', value: summary.total_users, icon: <Users size={12} />, color: 'text-blue-400' },
            { label: 'Active Sessions', value: summary.active_sessions, icon: <Activity size={12} />, color: 'text-green-400' },
            { label: 'API Calls (24h)', value: summary.api_calls_24h.toLocaleString(), icon: <Server size={12} />, color: 'text-amber-400' },
            { label: 'System Health', value: `${summary.system_health}%`, icon: <Shield size={12} />, color: summary.system_health >= 90 ? 'text-green-400' : summary.system_health >= 70 ? 'text-amber-400' : 'text-red-400' },
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading settings…</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/10">
            {[
              { id: 'users', label: 'User Management', icon: <Users size={11} /> },
              { id: 'integrations', label: 'Integrations', icon: <Server size={11} /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell size={11} /> },
              { id: 'audit', label: 'Audit Logs', icon: <Activity size={11} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeTab === tab.id ? 'bg-slate-600/30 text-white/90' : 'text-white/40 hover:text-white/60'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── User Management ─────────────────────────────────────── */}
          {activeTab === 'users' && (
            <>
              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-slate-400/50"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-slate-400/50"
                >
                  <option value="all">All Roles</option>
                  {['SUPER_ADMIN', 'ADMIN', 'DCP', 'ACP', 'INSPECTOR', 'PSI', 'ASI', 'HC', 'PC', 'ANALYST', 'VIEWER'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Users Table */}
              <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400">User Management</h3>
                  <span className="text-[9px] text-white/30">{filteredUsers.length} / {data?.users.length} users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">User</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Role</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                        <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Last Login</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const statusColor = STATUS_COLORS[u.status] || '#666'
                        const roleColor = ROLE_COLORS[u.role] || '#666'
                        return (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-2.5 text-white/80 font-medium">{u.name}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                                style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-white/50">{u.district}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                                {u.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-white/40">{formatRelative(u.last_login)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button className="p-1 text-white/30 hover:text-white/60 rounded" title="View"><Eye size={10} /></button>
                                <button className="p-1 text-white/30 hover:text-white/60 rounded" title="Edit"><Edit2 size={10} /></button>
                                <button className="p-1 text-white/30 hover:text-white/60 rounded" title="More"><MoreHorizontal size={10} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── Integrations ────────────────────────────────────────── */}
          {activeTab === 'integrations' && (
            <div className="grid grid-cols-2 gap-3">
              {data?.integrations.map((int, i) => {
                const statusColor = STATUS_COLORS[int.status] || '#666'
                return (
                  <div key={i} className="bg-white/[0.03] rounded-xl border border-white/10 p-4 hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${statusColor}20` }}>
                          {int.name.includes('API') ? <Server size={16} /> : int.name.includes('Database') ? <Database size={16} /> : <HardDrive size={16} />}
                        </div>
                        <span className="text-sm font-semibold text-white/90">{int.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium capitalize"
                        style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                        {int.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between"><span className="text-white/40">Endpoint</span><span className="text-white/60 truncate max-w-[140px]">{int.endpoint}</span></div>
                      <div className="flex justify-between"><span className="text-white/40">Last Sync</span><span className="text-white/60">{formatRelative(int.last_sync)}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ─── Notifications ───────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {data?.notifications.map((n, i) => (
                <div key={i} className="bg-white/[0.03] rounded-xl border border-white/10 p-3 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white/90 capitalize">{n.type.replace(/_/g, ' ')}</span>
                    <span className={`relative w-10 h-5 rounded-full transition-colors ${n.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${n.enabled ? 'translate-x-5' : ''}`} />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                    <div><span className="text-white/40 block">Channels</span><span className="text-white/70">{n.channels.join(', ')}</span></div>
                    <div><span className="text-white/40 block">Frequency</span><span className="text-white/70">{n.frequency}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[9px]">
                    {n.channels.map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Audit Logs ──────────────────────────────────────────── */}
          {activeTab === 'audit' && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400">Audit Trail</h3>
                <span className="text-[9px] text-white/30">{data?.audit_logs.length} events</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Timestamp</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">User</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Action</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Resource</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.audit_logs.slice(0, 50).map((log, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 text-white/40 font-mono">{formatDate(log.timestamp)}</td>
                        <td className="px-3 py-2.5 text-white/60">{log.user}</td>
                        <td className="px-3 py-2.5 text-white/80">{log.action}</td>
                        <td className="px-3 py-2.5 text-white/50">{log.resource}</td>
                        <td className="px-3 py-2.5 text-right text-white/30 font-mono">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Role Distribution Donut */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-slate-400 mb-3">Role Distribution</h3>
            {roleDistribution.length > 0 ? (
              <div className="flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {(() => {
                    const total = roleDistribution.reduce((s, [, c]) => s + c, 0)
                    const colors = ['#EF4444', '#F97316', '#EAB308', '#3B82F6', '#8B5CF6', '#14B8A6', '#06B6D4', '#A855F7', '#F59E0B', '#EC4899', '#6B7280']
                    let cum = 0
                    return roleDistribution.map(([role, count], i) => {
                      const prev = cum
                      cum += count
                      const startAngle = (prev / total) * 360 - 90
                      const endAngle = (cum / total) * 360 - 90
                      const largeArc = count / total > 0.5 ? 1 : 0
                      const startX = 50 + 35 * Math.cos(startAngle * Math.PI / 180)
                      const startY = 50 + 35 * Math.sin(startAngle * Math.PI / 180)
                      const endX = 50 + 35 * Math.cos(endAngle * Math.PI / 180)
                      const endY = 50 + 35 * Math.sin(endAngle * Math.PI / 180)
                      return (
                        <path key={role}
                          d={`M${startX},${startY} A35,35 0 ${largeArc},1 ${endX},${endY}`}
                          fill="none" stroke={colors[i % colors.length]} strokeWidth="10" strokeLinecap="round"
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="absolute text-center"><p className="text-lg font-bold text-white/90">{data?.users.length || 0}</p><p className="text-[9px] text-white/40">Total</p></div>
              </div>
            ) : (
              <p className="text-[10px] text-white/30 text-center py-8">No users</p>
            )}
            <div className="mt-3 space-y-1">
              {roleDistribution.map(([role, count]) => {
                const color = ROLE_COLORS[role] || '#666'
                const total = data?.users.length || 1
                return (
                  <div key={role} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-white/60">{role}</span>
                        <span className="text-white/40">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* System Health */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-slate-400 mb-3">System Health</h3>
            <div className="space-y-2">
              {[
                { label: 'API Gateway', status: 'healthy', icon: <Server size={10} /> },
                { label: 'Database', status: 'healthy', icon: <Database size={10} /> },
                { label: 'Auth Service', status: 'healthy', icon: <Shield size={10} /> },
                { label: 'Storage', status: 'healthy', icon: <HardDrive size={10} /> },
                { label: 'Signals', status: 'degraded', icon: <Activity size={10} /> },
              ].map((s) => {
                const color = STATUS_COLORS[s.status] || '#666'
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-[10px] text-white/60">{s.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium capitalize"
                      style={{ backgroundColor: `${color}20`, color }}>
                      {s.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Config Changes */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-slate-400 mb-3">Recent Config Changes</h3>
            <div className="space-y-2">
              {recentChanges.length > 0 ? (
                recentChanges.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.03] rounded-lg border border-white/5">
                    <CheckCircle2 size={12} className="mt-0.5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/70 truncate">{log.action} — {log.resource}</p>
                      <p className="text-[9px] text-white/40">{log.user} · {formatRelative(log.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-white/30">No recent changes</p>
              )}
            </div>
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ User roles determine access levels. SUPER_ADMIN has full access.
              Audit logs retained for 90 days. Auto-refreshes every 60s.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}