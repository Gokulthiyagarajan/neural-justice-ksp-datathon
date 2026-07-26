/**
 * CPCoordination — Inter-Agency Coordination
 *
 * Commissioner of Police command center page.
 * Joint operations, mutual aid requests, and agency contact directory.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, Shield, Handshake, Users, MapPin, Phone, Mail,
  Building2,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode, authHeaders } from '@/services/demoData'

// ─── Types ──────────────────────────────────────────────────────────────────

interface JurisdictionAgency {
  name: string
  type: string
  jurisdiction: string
  contact_person: string
  contact_phone: string
  last_contacted: string
}

interface JointOperation {
  operation: string
  agencies: string[]
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  start_date: string
  district: string
  lead_agency: string
  officers_involved: number
}

interface MutualAidRequest {
  requesting: string
  providing: string
  type: string
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  requested_date: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface CoordinationData {
  summary: {
    active_jurisdictions: number
    joint_operations: number
    mutual_aid_requests: number
    nodal_officers: number
  }
  jurisdictions: JurisdictionAgency[]
  joint_operations: JointOperation[]
  mutual_aid: MutualAidRequest[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OP_STATUS_COLORS: Record<string, string> = {
  planned: '#3B82F6',
  active: '#EF4444',
  completed: '#22C55E',
  cancelled: '#9CA3AF',
}

const AID_STATUS_COLORS: Record<string, string> = {
  pending: '#F97316',
  approved: '#3B82F6',
  rejected: '#EF4444',
  fulfilled: '#22C55E',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
}

const AGENCY_TYPE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#06B6D4', '#A855F7', '#F59E0B']

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Main Component ─────────────────────────────────────────────────────────

function demoCoordinationData(): CoordinationData {
  const now = new Date()
  const agencies: JurisdictionAgency[] = [
    { name: 'Karnataka State Police (KSP)', type: 'State Police', jurisdiction: 'Entire Karnataka', contact_person: 'DG&IGP Praveen Sood', contact_phone: '+91-80-2294-3200', last_contacted: new Date(now.getTime() - 86400000).toISOString() },
    { name: 'Bengaluru City Police (BCP)', type: 'City Police', jurisdiction: 'Bengaluru Urban', contact_person: 'CP B. Dayananda', contact_phone: '+91-80-2294-3100', last_contacted: new Date(now.getTime() - 43200000).toISOString() },
    { name: 'Government Railway Police (GRP)', type: 'Railway Police', jurisdiction: 'Railway Jurisdictions', contact_person: 'SP GRP Sharanappa', contact_phone: '+91-80-2678-4400', last_contacted: new Date(now.getTime() - 172800000).toISOString() },
    { name: 'Karnataka Forest Police', type: 'Forest Police', jurisdiction: 'Forest Areas', contact_person: 'DIG Forest Police', contact_phone: '+91-80-2235-4100', last_contacted: new Date(now.getTime() - 259200000).toISOString() },
    { name: 'Border Security Force (BSF)', type: 'Central Agency', jurisdiction: 'Border Areas', contact_person: 'Commandant BSF', contact_phone: '+91-80-2550-3200', last_contacted: new Date(now.getTime() - 345600000).toISOString() },
    { name: 'Narcotics Control Bureau (NCB)', type: 'Central Agency', jurisdiction: 'Drug Enforcement', contact_person: 'Zonal Director NCB', contact_phone: '+91-80-2670-2100', last_contacted: new Date(now.getTime() - 604800000).toISOString() },
    { name: 'Karnataka Lokayukta Police', type: 'Vigilance', jurisdiction: 'Anti-Corruption', contact_person: 'SP Lokayukta', contact_phone: '+91-80-2228-3100', last_contacted: new Date(now.getTime() - 432000000).toISOString() },
  ]
  const operations: JointOperation[] = [
    { operation: 'Operation Clean Streets', agencies: ['KSP', 'BCP'], status: 'active', start_date: new Date(now.getTime() - 604800000).toISOString(), district: 'Bengaluru Urban', lead_agency: 'BCP', officers_involved: 120 },
    { operation: 'Border Check Nadapu', agencies: ['KSP', 'BSF'], status: 'active', start_date: new Date(now.getTime() - 1209600000).toISOString(), district: 'Belagavi', lead_agency: 'KSP', officers_involved: 85 },
    { operation: 'Railway Anti-Theft Drive', agencies: ['KSP', 'GRP'], status: 'planned', start_date: new Date(now.getTime() + 604800000).toISOString(), district: 'Mysuru', lead_agency: 'GRP', officers_involved: 50 },
    { operation: 'Forest Drug Interdiction', agencies: ['KSP', 'Forest Police', 'NCB'], status: 'active', start_date: new Date(now.getTime() - 2592000000).toISOString(), district: 'Shivamogga', lead_agency: 'NCB', officers_involved: 35 },
    { operation: 'Festival Security Deployment', agencies: ['KSP', 'BCP', 'GRP'], status: 'planned', start_date: new Date(now.getTime() + 2592000000).toISOString(), district: 'Bengaluru Urban', lead_agency: 'KSP', officers_involved: 500 },
    { operation: 'Coastal Surveillance Op', agencies: ['KSP', 'Coast Guard'], status: 'completed', start_date: new Date(now.getTime() - 7776000000).toISOString(), district: 'Dakshina Kannada', lead_agency: 'KSP', officers_involved: 60 },
    { operation: 'Anti-Naxal Patrol', agencies: ['KSP', 'BSF'], status: 'active', start_date: new Date(now.getTime() - 5184000000).toISOString(), district: 'Dharwad', lead_agency: 'BSF', officers_involved: 120 },
  ]
  const aid: MutualAidRequest[] = [
    { requesting: 'KSP', providing: 'BSF', type: 'Personnel', status: 'approved', requested_date: new Date(now.getTime() - 172800000).toISOString(), priority: 'high' },
    { requesting: 'BCP', providing: 'KSP', type: 'Equipment', status: 'pending', requested_date: new Date(now.getTime() - 86400000).toISOString(), priority: 'critical' },
    { requesting: 'GRP', providing: 'BCP', type: 'Intelligence', status: 'fulfilled', requested_date: new Date(now.getTime() - 604800000).toISOString(), priority: 'medium' },
    { requesting: 'Forest Police', providing: 'KSP', type: 'Vehicles', status: 'pending', requested_date: new Date(now.getTime() - 43200000).toISOString(), priority: 'high' },
    { requesting: 'NCB', providing: 'KSP', type: 'Forensics', status: 'approved', requested_date: new Date(now.getTime() - 1209600000).toISOString(), priority: 'medium' },
    { requesting: 'KSP', providing: 'GRP', type: 'Cyber Support', status: 'pending', requested_date: new Date(now.getTime() - 21600000).toISOString(), priority: 'critical' },
    { requesting: 'BCP', providing: 'Lokayukta', type: 'Joint Investigation', status: 'rejected', requested_date: new Date(now.getTime() - 2592000000).toISOString(), priority: 'low' },
  ]
  return {
    summary: { active_jurisdictions: agencies.length, joint_operations: operations.length, mutual_aid_requests: aid.length, nodal_officers: 14 },
    jurisdictions: agencies,
    joint_operations: operations,
    mutual_aid: aid,
    last_updated: now.toISOString(),
  }
}

export function CPCoordination() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<CoordinationData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedOp, setSelectedOp] = useState<JointOperation | null>(null)
  const [activeTab, setActiveTab] = useState<'operations' | 'mutual_aid' | 'contacts'>('operations')
  const [sortOpsBy, setSortOpsBy] = useState<'date' | 'status' | 'district'>('date')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        const demo = demoCoordinationData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      const res = await fetch('/api/cp/coordination', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPCoordination] Failed to fetch coordination data')
      if (isDemoMode()) {
        const demo = demoCoordinationData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted operations ────────────────────────────────────────────────────

  const sortedOperations = useMemo(() => {
    if (!data?.joint_operations) return []
    return [...data.joint_operations].sort((a, b) => {
      if (sortOpsBy === 'date') return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      if (sortOpsBy === 'status') return a.status.localeCompare(b.status)
      return a.district.localeCompare(b.district)
    })
  }, [data, sortOpsBy])

  // ── Sorted mutual aid ────────────────────────────────────────────────────

  const sortedMutualAid = useMemo(() => {
    if (!data?.mutual_aid) return []
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return [...data.mutual_aid].sort((a, b) => {
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pb !== pa) return pb - pa
      return new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
    })
  }, [data])

  // ── Agency type breakdown ────────────────────────────────────────────────

  const agencyTypeBreakdown = useMemo(() => {
    if (!data?.jurisdictions) return []
    const counts: Record<string, number> = {}
    data.jurisdictions.forEach(j => { counts[j.type] = (counts[j.type] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [data])

  // ── Operation status distribution ────────────────────────────────────────

  const opStatusCounts = useMemo(() => {
    if (!data?.joint_operations) return {}
    return data.joint_operations.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [data])

  const totalOps = Object.values(opStatusCounts).reduce((a, b) => a + b, 0)

  // ── Recent activity ────────────────────────────────────────────────────

  const recentActivity = useMemo(() => {
    if (!data) return []
    const activities: Array<{ time: string; text: string; type: string }> = []
    data.joint_operations.slice(0, 5).forEach(op => {
      activities.push({ time: op.start_date, text: `${op.operation} — ${op.district}`, type: 'operation' })
    })
    data.mutual_aid.slice(0, 3).forEach(aid => {
      activities.push({ time: aid.requested_date, text: `${aid.requesting} → ${aid.providing} (${aid.type})`, type: 'aid' })
    })
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
  }, [data])

  // ── Render ────────────────────────────────────────────────────────────────

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
            <Handshake size={16} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-cyan-400">Inter-Agency Coordination</h1>
            <p className="text-[10px] text-white/40">Joint operations · Mutual aid · Agency contacts · Nodal officers</p>
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
        <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Active Jurisdictions', value: summary.active_jurisdictions, icon: <MapPin size={12} />, color: 'text-cyan-400' },
            { label: 'Joint Operations', value: summary.joint_operations, icon: <Shield size={12} />, color: 'text-emerald-400' },
            { label: 'Mutual Aid Requests', value: summary.mutual_aid_requests, icon: <Handshake size={12} />, color: 'text-amber-400' },
            { label: 'Nodal Officers', value: summary.nodal_officers, icon: <Users size={12} />, color: 'text-violet-400' },
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
        {/* ─── Left Panel ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading coordination data…</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/10">
            {[
              { id: 'operations', label: 'Joint Operations', icon: <Shield size={11} /> },
              { id: 'mutual_aid', label: 'Mutual Aid', icon: <Handshake size={11} /> },
              { id: 'contacts', label: 'Agency Contacts', icon: <Users size={11} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Joint Operations Tab ─────────────────────────────── */}
          {activeTab === 'operations' && (
            <>
              {/* Sort controls */}
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span>Sort:</span>
                <button onClick={() => setSortOpsBy('date')} className={`px-2 py-0.5 rounded ${sortOpsBy === 'date' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}`}>Date</button>
                <button onClick={() => setSortOpsBy('status')} className={`px-2 py-0.5 rounded ${sortOpsBy === 'status' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}`}>Status</button>
                <button onClick={() => setSortOpsBy('district')} className={`px-2 py-0.5 rounded ${sortOpsBy === 'district' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}`}>District</button>
              </div>

              {/* Operations table */}
              <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-400">Joint Operations</h3>
                  <span className="text-[9px] text-white/30">{sortedOperations.length} operations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Operation</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Lead Agency</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                        <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Start Date</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Agencies</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Officers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOperations.map((op) => (
                        <tr key={op.operation} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setSelectedOp(selectedOp?.operation === op.operation ? null : op)}>
                          <td className="px-3 py-2.5 text-white/80 font-medium truncate max-w-[180px]">{op.operation}</td>
                          <td className="px-3 py-2.5 text-white/60 truncate max-w-[120px]">{op.lead_agency}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[9px]">{op.district}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                              style={{ backgroundColor: `${OP_STATUS_COLORS[op.status]}20`, color: OP_STATUS_COLORS[op.status] }}>
                              {op.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/50">{formatDate(op.start_date)}</td>
                          <td className="px-3 py-2.5 text-right text-white/50">{op.agencies.length}</td>
                          <td className="px-3 py-2.5 text-right text-white/70">{op.officers_involved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected operation detail */}
              {selectedOp && (
                <div className="bg-white/[0.03] rounded-xl border border-cyan-500/30 p-3 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white/90">{selectedOp.operation}</h4>
                      <p className="text-[10px] text-white/40">Lead: {selectedOp.lead_agency} · District: {selectedOp.district}</p>
                    </div>
                    <button onClick={() => setSelectedOp(null)} className="text-white/30 hover:text-white/60">×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                      <div className="text-[9px] text-white/40">Status</div>
                      <div className="font-medium" style={{ color: OP_STATUS_COLORS[selectedOp.status] }}>{selectedOp.status.toUpperCase()}</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                      <div className="text-[9px] text-white/40">Start Date</div>
                      <div className="font-medium text-white/80">{formatDate(selectedOp.start_date)}</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                      <div className="text-[9px] text-white/40">Officers</div>
                      <div className="font-medium text-white/80">{selectedOp.officers_involved}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-white/40">Participating Agencies</span><span className="text-white/70">{selectedOp.agencies.length}</span></div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedOp.agencies.map((agency, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded text-[9px]">{agency}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Mutual Aid Tab ───────────────────────────────────── */}
          {activeTab === 'mutual_aid' && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400">Mutual Aid Requests</h3>
                <span className="text-[9px] text-white/30">{sortedMutualAid.length} requests</span>
              </div>
              <div className="divide-y divide-white/5">
                {sortedMutualAid.map((aid, i) => (
                  <div key={i} className="p-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white/80">{aid.requesting}</span>
                          <span className="text-white/40">→</span>
                          <span className="text-xs font-semibold text-emerald-300">{aid.providing}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-white/40">
                          <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-300 rounded">{aid.type}</span>
                          <span className="px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${PRIORITY_COLORS[aid.priority]}20`, color: PRIORITY_COLORS[aid.priority] }}>
                            {aid.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                          style={{ backgroundColor: `${AID_STATUS_COLORS[aid.status]}20`, color: AID_STATUS_COLORS[aid.status] }}>
                          {aid.status.toUpperCase()}
                        </span>
                        <p className="text-[9px] text-white/30 mt-0.5">{formatDate(aid.requested_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-white/40">
                      <span>Requesting: {aid.requesting}</span>
                      <span>Providing: {aid.providing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Agency Contacts Tab ──────────────────────────────── */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {data?.jurisdictions.map((agency, i) => (
                <div key={i} className="bg-white/[0.03] rounded-xl border border-white/10 p-3 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length]}20` }}>
                      <Building2 size={16} style={{ color: AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white/90">{agency.name}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                          style={{ backgroundColor: `${AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length]}20`, color: AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length] }}>
                          {agency.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 mb-2">Jurisdiction: {agency.jurisdiction}</p>
                      <div className="flex flex-wrap gap-3 text-[10px] text-white/50">
                        <span className="flex items-center gap-1"><MapPin size={10} />{agency.jurisdiction}</span>
                        <span className="flex items-center gap-1"><Users size={10} />{agency.contact_person}</span>
                        <span className="flex items-center gap-1"><Phone size={10} />{agency.contact_phone}</span>
                        <span className="flex items-center gap-1"><Mail size={10} />nodal.{agency.name.toLowerCase().replace(/\s+/g, '')}@ksp.gov.in</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/30">Last Contact</p>
                      <p className="text-[10px] text-white/60">{formatDate(agency.last_contacted)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Operation Status Distribution (Donut) */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Operation Status</h3>
            <div className="relative h-32 flex items-center justify-center mb-4">
              <svg width="128" height="128" viewBox="0 0 128 128">
                {Object.entries(opStatusCounts).map(([status, count], i) => {
                  const prevTotal = Object.values(opStatusCounts).slice(0, i).reduce((a, b) => a + b, 0)
                  const startAngle = (prevTotal / (totalOps || 1)) * 360 - 90
                  const endAngle = ((prevTotal + count) / (totalOps || 1)) * 360 - 90
                  const largeArc = count / (totalOps || 1) > 0.5 ? 1 : 0
                  const startX = 64 + 44 * Math.cos(startAngle * Math.PI / 180)
                  const startY = 64 + 44 * Math.sin(startAngle * Math.PI / 180)
                  const endX = 64 + 44 * Math.cos(endAngle * Math.PI / 180)
                  const endY = 64 + 44 * Math.sin(endAngle * Math.PI / 180)
                  const color = OP_STATUS_COLORS[status] || '#666'
                  return (
                    <path key={status}
                      d={`M${startX},${startY} A44,44 0 ${largeArc},1 ${endX},${endY}`}
                      fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                    />
                  )
                })}
              </svg>
              {totalOps > 0 && <div className="absolute text-center"><p className="text-xl font-bold text-white/90">{totalOps}</p><p className="text-[9px] text-white/40">Total</p></div>}
            </div>
            <div className="space-y-2">
              {Object.entries(opStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: OP_STATUS_COLORS[status] || '#666' }} />
                  <span className="text-[10px] text-white/60 capitalize w-16">{status}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${totalOps > 0 ? (count / totalOps) * 100 : 0}%`, backgroundColor: OP_STATUS_COLORS[status] || '#666' }} />
                  </div>
                  <span className="text-white/40 w-4 text-right">{count}</span>
                </div>
              ))}
              {totalOps === 0 && <p className="text-[10px] text-white/30 text-center">No operations</p>}
            </div>
          </div>

          {/* Agency Type Breakdown */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Agency Types</h3>
            <div className="space-y-2">
              {agencyTypeBreakdown.map(([type, count], i) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/60">{type}</span>
                      <span className="text-white/40">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${data?.jurisdictions ? (count / data.jurisdictions.length) * 100 : 0}%`, backgroundColor: AGENCY_TYPE_COLORS[i % AGENCY_TYPE_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.map((act, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: act.type === 'operation' ? '#EF4444' : '#F97316' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/60 truncate">{act.text}</p>
                    <p className="text-[9px] text-white/30">{formatDate(act.time)}</p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-[10px] text-white/30 text-center">No recent activity</p>}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4">
            <h3 className="text-xs font-bold text-cyan-400 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between"><span className="text-white/40">Active Joint Ops</span><span className="text-white/70">{data?.joint_operations.filter(o => o.status === 'active').length || 0}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Pending Mutual Aid</span><span className="text-amber-300">{data?.mutual_aid.filter(a => a.status === 'pending').length || 0}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Critical Priority</span><span className="text-red-300">{data?.mutual_aid.filter(a => a.priority === 'critical').length || 0}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Agencies on Record</span><span className="text-white/70">{data?.jurisdictions.length || 0}</span></div>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed mt-4">
              ⚠️ Coordination data auto-refreshes every 60s.
              Joint ops status: planned → active → completed/cancelled.
              Mutual aid flows: requesting → providing agency.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}