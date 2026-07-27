/**
 * CPAudit — Audit & Compliance
 *
 * Commissioner of Police command center page.
 * Audit logs, findings, compliance scores, overdue tracking.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ListChecks, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Shield, FileText, Building2,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ────────────────────────────────────────────────────────────────

interface AuditRecord {
  title: string
  type: string
  district: string
  status: 'planned' | 'in_progress' | 'completed' | 'overdue'
  auditor: string
  start_date: string
  end_date: string
  findings: number
}

interface Finding {
  audit: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'deferred'
  due_date: string
}

interface DistrictCompliance {
  district: string
  score: number
  status: 'compliant' | 'needs_review' | 'non_compliant'
  last_audit: string
}

interface AuditData {
  summary: {
    total_audits: number
    completed: number
    in_progress: number
    overdue: number
    compliance_score: number
    findings_count: number
  }
  audits: AuditRecord[]
  findings: Finding[]
  compliance_by_district: DistrictCompliance[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planned: '#3B82F6',
  in_progress: '#F97316',
  completed: '#22C55E',
  overdue: '#EF4444',
  open: '#EF4444',
  in_progress_finding: '#F97316',
  resolved: '#22C55E',
  deferred: '#9CA3AF',
  compliant: '#22C55E',
  needs_review: '#EAB308',
  non_compliant: '#EF4444',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F97316',
  low: '#3B82F6',
}

const AUDIT_TYPE_COLORS: Record<string, string> = {
  financial: '#3B82F6',
  operational: '#8B5CF6',
  security: '#EF4444',
  personnel: '#14B8A6',
  procurement: '#F97316',
  it: '#EC4899',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Main Component ───────────────────────────────────────────────────────

export function CPAudit() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<AuditData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null)
  const [activeTab, setActiveTab] = useState<'audits' | 'findings' | 'compliance'>('audits')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'district'>('date')

  const demoAuditData: AuditData = {
    summary: {
      total_audits: 128,
      completed: 82,
      in_progress: 32,
      overdue: 14,
      compliance_score: 74,
      findings_count: 245,
    },
    audits: [
      { title: 'Q2 Financial Audit — Bengaluru Urban', type: 'Financial', district: 'Bengaluru Urban', status: 'completed', auditor: 'AG Karnataka', start_date: '2026-04-01', end_date: '2026-05-15', findings: 12 },
      { title: 'Annual Operational Review — Mysuru', type: 'Operational', district: 'Mysuru', status: 'completed', auditor: 'DIGP Admin', start_date: '2026-03-10', end_date: '2026-04-20', findings: 8 },
      { title: 'Security Compliance — Belagavi', type: 'Security', district: 'Belagavi', status: 'in_progress', auditor: 'Security Wing', start_date: '2026-06-01', end_date: '2026-07-30', findings: 15 },
      { title: 'Personnel Audit — Dakshina Kannada', type: 'Personnel', district: 'Dakshina Kannada', status: 'overdue', auditor: 'Establishment', start_date: '2026-02-01', end_date: '2026-03-15', findings: 22 },
      { title: 'Procurement Review — Uttara Kannada', type: 'Procurement', district: 'Uttara Kannada', status: 'overdue', auditor: 'Procurement Cell', start_date: '2026-01-15', end_date: '2026-03-01', findings: 18 },
      { title: 'IT Systems Audit — State HQ', type: 'IT', district: 'Bengaluru Urban', status: 'in_progress', auditor: 'IT Wing', start_date: '2026-06-15', end_date: '2026-08-15', findings: 25 },
      { title: 'Q1 Financial Reconciliation', type: 'Financial', district: 'State-wide', status: 'completed', auditor: 'AG Karnataka', start_date: '2026-01-01', end_date: '2026-02-28', findings: 9 },
      { title: 'Police Station Infrastructure Audit', type: 'Operational', district: 'Shivamogga', status: 'planned', auditor: 'Works Division', start_date: '2026-08-01', end_date: '2026-09-30', findings: 0 },
    ],
    findings: [
      { audit: 'Q2 Financial Audit — Bengaluru Urban', severity: 'critical', category: 'Financial Irregularity', description: 'Discrepancy of ₹2.3Cr in confidential funds — supporting vouchers missing', status: 'open', due_date: '2026-07-15' },
      { audit: 'Security Compliance — Belagavi', severity: 'high', category: 'Infrastructure', description: 'Armoury access logs incomplete for 14 days in May 2026', status: 'in_progress', due_date: '2026-08-01' },
      { audit: 'Personnel Audit — Dakshina Kannada', severity: 'critical', category: 'Personnel', description: '22 unauthorised absences recorded in Q1 — no prior approval on file', status: 'open', due_date: '2026-06-30' },
      { audit: 'Procurement Review — Uttara Kannada', severity: 'high', category: 'Procurement', description: 'Tender for vehicle procurement awarded without competitive bidding', status: 'open', due_date: '2026-07-01' },
      { audit: 'IT Systems Audit — State HQ', severity: 'medium', category: 'IT Security', description: '12 user accounts with dormant access privileges not revoked in 6 months', status: 'in_progress', due_date: '2026-08-30' },
      { audit: 'Q1 Financial Reconciliation', severity: 'low', category: 'Documentation', description: 'Minor classification errors in 3 budget heads — reconciled', status: 'resolved', due_date: '2026-03-15' },
      { audit: 'Annual Operational Review — Mysuru', severity: 'medium', category: 'Operational', description: 'Vehicle log maintenance found inadequate across 4 stations', status: 'resolved', due_date: '2026-05-01' },
      { audit: 'Q2 Financial Audit — Bengaluru Urban', severity: 'high', category: 'Compliance', description: '3 procurement orders exceeding delegated financial powers', status: 'open', due_date: '2026-07-30' },
    ],
    compliance_by_district: [
      { district: 'Bengaluru Urban', score: 72, status: 'needs_review', last_audit: '2026-05-15' },
      { district: 'Bengaluru Rural', score: 78, status: 'needs_review', last_audit: '2026-04-20' },
      { district: 'Mysuru', score: 85, status: 'compliant', last_audit: '2026-04-20' },
      { district: 'Belagavi', score: 55, status: 'non_compliant', last_audit: '2026-03-10' },
      { district: 'Dakshina Kannada', score: 62, status: 'non_compliant', last_audit: '2026-03-15' },
      { district: 'Uttara Kannada', score: 48, status: 'non_compliant', last_audit: '2026-03-01' },
      { district: 'Shivamogga', score: 80, status: 'compliant', last_audit: '2026-02-28' },
      { district: 'Tumakuru', score: 76, status: 'needs_review', last_audit: '2026-04-10' },
    ],
    last_updated: new Date().toISOString(),
  }

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        setData(demoAuditData)
        setLastUpdated(new Date(demoAuditData.last_updated).toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/audit', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      if (isDemoMode()) {
        setData(demoAuditData)
        setLastUpdated(new Date(demoAuditData.last_updated).toLocaleTimeString())
      }
      console.error('[CPAudit] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted audits ──────────────────────────────────────────────────────

  const sortedAudits = useMemo(() => {
    if (!data?.audits) return []
    return [...data.audits].sort((a, b) => {
      if (sortBy === 'date') return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return a.district.localeCompare(b.district)
    })
  }, [data, sortBy])

  // ── Sorted findings ────────────────────────────────────────────────────

  const sortedFindings = useMemo(() => {
    if (!data?.findings) return []
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return [...data.findings].sort((a, b) => {
      const sa = severityOrder[a.severity]
      const sb = severityOrder[b.severity]
      if (sb !== sa) return sb - sa
      return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    })
  }, [data])

  // ── Compliance score distribution ──────────────────────────────────────

  const complianceDistribution = useMemo(() => {
    if (!data?.compliance_by_district) return { compliant: 0, needs_review: 0, non_compliant: 0 }
    return data.compliance_by_district.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, { compliant: 0, needs_review: 0, non_compliant: 0 })
  }, [data])

  // ── Findings by severity ──────────────────────────────────────────────

  const findingsBySeverity = useMemo(() => {
    if (!data?.findings) return { critical: 0, high: 0, medium: 0, low: 0 }
    return data.findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1
      return acc
    }, { critical: 0, high: 0, medium: 0, low: 0 })
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
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <ListChecks size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">Audit & Compliance</h1>
            <p className="text-[10px] text-white/40">Audit records · Findings tracker · District compliance · Overdue alerts</p>
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
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total Audits', value: summary.total_audits, icon: <FileText size={12} />, color: 'text-amber-400' },
            { label: 'Completed', value: summary.completed, icon: <CheckCircle2 size={12} />, color: 'text-green-400' },
            { label: 'In Progress', value: summary.in_progress, icon: <Clock size={12} />, color: 'text-amber-400' },
            { label: 'Overdue', value: summary.overdue, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Compliance', value: `${summary.compliance_score}%`, icon: <Shield size={12} />, color: summary.compliance_score >= 80 ? 'text-green-400' : summary.compliance_score >= 60 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Findings', value: summary.findings_count, icon: <ListChecks size={12} />, color: 'text-violet-400' },
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
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading audit data…</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/10">
            {[
              { id: 'audits', label: 'Audits', icon: <FileText size={11} /> },
              { id: 'findings', label: 'Findings', icon: <ListChecks size={11} /> },
              { id: 'compliance', label: 'Compliance', icon: <Shield size={11} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeTab === tab.id ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Audits Tab ─────────────────────────────────────────── */}
          {activeTab === 'audits' && (
            <>
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span>Sort:</span>
                <button onClick={() => setSortBy('date')} className={`px-2 py-0.5 rounded ${sortBy === 'date' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>Date</button>
                <button onClick={() => setSortBy('status')} className={`px-2 py-0.5 rounded ${sortBy === 'status' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>Status</button>
                <button onClick={() => setSortBy('district')} className={`px-2 py-0.5 rounded ${sortBy === 'district' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>District</button>
              </div>

              <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-400">Audit Records</h3>
                  <span className="text-[9px] text-white/30">{sortedAudits.length} audits</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Audit Title</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Type</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                        <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                        <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Auditor</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Start Date</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">End Date</th>
                        <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Findings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAudits.map((audit) => {
                        const isSelected = selectedAudit?.title === audit.title
                        const statusColor = STATUS_COLORS[audit.status] || '#666'
                        const typeColor = AUDIT_TYPE_COLORS[audit.type.toLowerCase()] || '#666'
                        return (
                          <tr key={audit.title} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-amber-500/10' : ''}`}
                            onClick={() => setSelectedAudit(isSelected ? null : audit)}>
                            <td className="px-3 py-2.5 text-white/80 font-medium truncate max-w-[180px]">{audit.title}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${typeColor}20`, color: typeColor }}>
                                {audit.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[9px]">{audit.district}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                                {audit.status.toUpperCase().replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-white/60 truncate max-w-[100px]">{audit.auditor}</td>
                            <td className="px-3 py-2.5 text-right text-white/50">{formatDate(audit.start_date)}</td>
                            <td className="px-3 py-2.5 text-right text-white/50">{formatDate(audit.end_date)}</td>
                            <td className="px-3 py-2.5 text-right text-white/70">{audit.findings}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected audit detail */}
              {selectedAudit && (
                <div className="bg-white/[0.03] rounded-xl border border-amber-500/30 p-3 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white/90">{selectedAudit.title}</h4>
                      <p className="text-[10px] text-white/40">Type: {selectedAudit.type} · District: {selectedAudit.district}</p>
                    </div>
                    <button onClick={() => setSelectedAudit(null)} className="text-white/30 hover:text-white/60">×</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'Status', value: selectedAudit.status.toUpperCase().replace('_', ' '), color: STATUS_COLORS[selectedAudit.status] },
                      { label: 'Auditor', value: selectedAudit.auditor, color: 'text-white/80' },
                      { label: 'Start', value: formatDate(selectedAudit.start_date), color: 'text-white/80' },
                      { label: 'End', value: formatDate(selectedAudit.end_date), color: 'text-white/80' },
                    ].map((f, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                        <div className="text-[9px] text-white/40">{f.label}</div>
                        <div className={`font-medium ${f.color}`}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Findings Tab ───────────────────────────────────────── */}
          {activeTab === 'findings' && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400">Findings Tracker</h3>
                <span className="text-[9px] text-white/30">{sortedFindings.length} findings</span>
              </div>
              <div className="divide-y divide-white/5">
                {sortedFindings.map((finding, i) => (
                  <div key={i} className="p-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white/80">{finding.audit}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium capitalize"
                            style={{ backgroundColor: `${SEVERITY_COLORS[finding.severity]}20`, color: SEVERITY_COLORS[finding.severity] }}>
                            {finding.severity.toUpperCase()}
                          </span>
                          <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-300 rounded text-[9px]">{finding.category}</span>
                        </div>
                        <p className="text-[10px] text-white/50">{finding.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                          style={{ backgroundColor: `${STATUS_COLORS[finding.status] || '#666'}20`, color: STATUS_COLORS[finding.status] || '#666' }}>
                          {finding.status.toUpperCase().replace('_', ' ')}
                        </span>
                        <p className="text-[9px] text-white/30 mt-0.5">Due: {formatDate(finding.due_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Compliance Tab ─────────────────────────────────────── */}
          {activeTab === 'compliance' && (
            <div className="space-y-3">
              {data?.compliance_by_district.map((d, i) => {
                const statusColor = STATUS_COLORS[d.status] || '#666'
                return (
                  <div key={i} className="bg-white/[0.03] rounded-xl border border-white/10 p-3 hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${statusColor}20` }}>
                        <Building2 size={16} style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white/90">{d.district}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {d.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: statusColor }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white/90">{d.score}%</div>
                        <div className="text-[9px] text-white/30">Last: {formatDate(d.last_audit)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Compliance Distribution Donut */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Compliance Distribution</h3>
            {(() => {
              const totalDist = Object.values(complianceDistribution).reduce((a, b) => a + b, 0)
              return (
                <div className="relative h-32 flex items-center justify-center mb-4">
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    {(() => {
                      if (totalDist === 0) return <circle cx="64" cy="64" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      const colors = { compliant: '#22C55E', needs_review: '#EAB308', non_compliant: '#EF4444' }
                      let cum = 0
                      return Object.entries(complianceDistribution).map(([status, count]) => {
                        const prev = cum
                        cum += count
                        const startAngle = (prev / totalDist) * 360 - 90
                        const endAngle = (cum / totalDist) * 360 - 90
                        const largeArc = count / totalDist > 0.5 ? 1 : 0
                        const startX = 64 + 44 * Math.cos(startAngle * Math.PI / 180)
                        const startY = 64 + 44 * Math.sin(startAngle * Math.PI / 180)
                        const endX = 64 + 44 * Math.cos(endAngle * Math.PI / 180)
                        const endY = 64 + 44 * Math.sin(endAngle * Math.PI / 180)
                        return (
                          <path key={status}
                            d={`M${startX},${startY} A44,44 0 ${largeArc},1 ${endX},${endY}`}
                            fill="none" stroke={colors[status as keyof typeof colors] || '#666'} strokeWidth="12" strokeLinecap="round"
                          />
                        )
                      })
                    })()}
                  </svg>
                  {totalDist > 0 && (
                    <div className="absolute text-center"><p className="text-xl font-bold text-white/90">{totalDist}</p><p className="text-[9px] text-white/40">Districts</p></div>
                  )}
                </div>
              )
            })()}
            <div className="space-y-2">
              {Object.entries(complianceDistribution).map(([status, count]) => {
                const totalDist = Object.values(complianceDistribution).reduce((a, b) => a + b, 0)
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#666' }} />
                    <span className="text-[10px] text-white/60 capitalize w-24">{status.replace('_', ' ')}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${totalDist > 0 ? (count / totalDist) * 100 : 0}%`, backgroundColor: STATUS_COLORS[status] || '#666' }} />
                    </div>
                    <span className="text-white/40 w-4 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Findings by Severity */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Findings by Severity</h3>
            <div className="space-y-2">
              {Object.entries(findingsBySeverity).map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] || '#666' }} />
                  <span className="text-[10px] text-white/60 capitalize w-16">{sev}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Object.values(findingsBySeverity).reduce((a, b) => a + b, 0) > 0 ? (count / Object.values(findingsBySeverity).reduce((a, b) => a + b, 0)) * 100 : 0}%`, backgroundColor: SEVERITY_COLORS[sev] || '#666' }} />
                  </div>
                  <span className="text-white/40 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Alerts */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">Overdue Alerts</h3>
            <div className="space-y-2">
              {data?.audits.filter(a => a.status === 'overdue').slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <AlertTriangle size={12} className="mt-0.5 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/70 font-medium truncate">{a.title}</p>
                    <p className="text-[9px] text-white/40">{a.district} · {formatDate(a.end_date)}</p>
                  </div>
                </div>
              ))}
              {!data?.audits.some(a => a.status === 'overdue') && (
                <div className="flex items-center gap-2 text-[10px] text-green-400/80">
                  <CheckCircle2 size={12} />
                  <span>No overdue audits</span>
                </div>
              )}
            </div>
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Compliance score = (compliant districts / total) × 100.{' '}
              Findings severity: critical {'>'} high {'>'} medium {'>'} low.{' '}
              Auto-refreshes every 60s.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}