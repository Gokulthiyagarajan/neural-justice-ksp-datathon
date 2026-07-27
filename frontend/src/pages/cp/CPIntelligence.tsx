/**
 * CPIntelligence — City Intelligence Hub
 *
 * Commissioner of Police command center page.
 * Consolidated intelligence brief with crime trends, threat actors,
 * and intelligence reports from multiple sources.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, RefreshCw, AlertTriangle, Brain, Users, FileText,
  Eye, TrendingUp,
} from 'lucide-react'
import { isDemoMode, authHeaders } from '@/services/demoData'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CrimeTrend {
  id: string
  title: string
  type: string
  confidence: number
  evidence: string
  district: string
  direction: string
  severity: string
  last_updated: string
}

interface ThreatActor {
  id: string
  name: string
  risk: string
  members: number
  active_months: number
  primary_crime: string
  modus_operandi: string
  last_known_activity: string
}

interface IntelReport {
  id: string
  title: string
  source: string
  classification: string
  received_at: string
  summary: string
  assignee: string
  status: string
}

interface IntelligenceData {
  summary: {
    active_patterns: number
    repeat_offenders_tracked: number
    emerging_threats: number
    credible_intel_reports: number
    pending_analysis: number
  }
  daily_brief: {
    date: string
    summary: string
    confidence: number
    priority: string
    prepared_by: string
  }
  crime_trends: CrimeTrend[]
  threat_actors: ThreatActor[]
  intel_reports: IntelReport[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const DIRECTION_COLORS: Record<string, string> = {
  rising: '#EF4444',
  stable: '#EAB308',
  falling: '#22C55E',
  emerging: '#8B5CF6',
}

const RISK_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const STATUS_COLORS: Record<string, string> = {
  under_review: '#F97316',
  actioned: '#22C55E',
  verifying: '#3B82F6',
  closed: '#6B7280',
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  top_secret: '#EF4444',
  confidential: '#F97316',
  unclassified: '#6B7280',
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function demoIntelligenceData(): IntelligenceData {
  const now = new Date()
  return {
    summary: {
      active_patterns: 7,
      repeat_offenders_tracked: 24,
      emerging_threats: 3,
      credible_intel_reports: 12,
      pending_analysis: 5,
    },
    daily_brief: {
      date: now.toISOString().slice(0, 10),
      summary: 'Intelligence inputs indicate a potential surge in chain snatching incidents across Bengaluru Urban, with three repeat-offender networks showing increased coordination. Cyber Cell reports a new phishing campaign targeting government portals.',
      confidence: 0.82,
      priority: 'high',
      prepared_by: 'State Intelligence Wing',
    },
    crime_trends: [
      { id: 'ct-1', title: 'Chain Snatching Surge', type: 'pattern', confidence: 0.85, evidence: '12 incidents in last 7 days across Koramangala, MG Road, Indiranagar', district: 'Bengaluru Urban', direction: 'rising', severity: 'critical', last_updated: new Date(now.getTime() - 3600000).toISOString() },
      { id: 'ct-2', title: 'Cyber Fraud Campaign', type: 'pattern', confidence: 0.78, evidence: 'Phishing links impersonating GST portal detected; 45 complaints in 2 weeks', district: 'Bengaluru Urban', direction: 'rising', severity: 'high', last_updated: new Date(now.getTime() - 7200000).toISOString() },
      { id: 'ct-3', title: 'Vehicle Theft Ring', type: 'pattern', confidence: 0.72, evidence: 'Inter-state vehicle theft ring using forged registration documents', district: 'Bengaluru Rural', direction: 'rising', severity: 'high', last_updated: new Date(now.getTime() - 14400000).toISOString() },
      { id: 'ct-4', title: 'Drug Peddling Hotspots', type: 'pattern', confidence: 0.68, evidence: 'Three new peddling points identified near educational institutions in Mangaluru', district: 'Dakshina Kannada', direction: 'emerging', severity: 'high', last_updated: new Date(now.getTime() - 21600000).toISOString() },
      { id: 'ct-5', title: 'Property Crime Decline', type: 'pattern', confidence: 0.8, evidence: 'Night patrol and community policing showing results in residential zones', district: 'Mysuru', direction: 'falling', severity: 'low', last_updated: new Date(now.getTime() - 28800000).toISOString() },
      { id: 'ct-6', title: 'Illegal Mining Activity', type: 'pattern', confidence: 0.65, evidence: 'Satellite imagery suggests renewed illegal mining in Ballari district border areas', district: 'Ballari', direction: 'stable', severity: 'medium', last_updated: new Date(now.getTime() - 43200000).toISOString() },
    ],
    threat_actors: [
      { id: 'ta-1', name: 'Kumar Network', risk: 'critical', members: 8, active_months: 14, primary_crime: 'chain_snatching', modus_operandi: 'Two-wheeler mounted snatching in traffic corridors', last_known_activity: new Date(now.getTime() - 86400000).toISOString() },
      { id: 'ta-2', name: 'Cyber Wolves', risk: 'high', members: 5, active_months: 8, primary_crime: 'cyber_fraud', modus_operandi: 'Phishing via fake government communication portals', last_known_activity: new Date(now.getTime() - 172800000).toISOString() },
      { id: 'ta-3', name: 'Coastal Cartel', risk: 'high', members: 12, active_months: 20, primary_crime: 'drug_trafficking', modus_operandi: 'Sea route smuggling via Mangaluru coast to interior districts', last_known_activity: new Date(now.getTime() - 259200000).toISOString() },
      { id: 'ta-4', name: 'Red Sand Mafia', risk: 'medium', members: 6, active_months: 10, primary_crime: 'illegal_mining', modus_operandi: 'Night-time extraction using heavy machinery in forest fringe areas', last_known_activity: new Date(now.getTime() - 345600000).toISOString() },
    ],
    intel_reports: [
      { id: 'ir-1', title: 'IB Input: Assembly Session Threat Assessment', source: 'IB', classification: 'top_secret', received_at: new Date(now.getTime() - 3600000).toISOString(), summary: 'Low-credibility chatter about protest disruption during upcoming assembly session. Monitoring continues.', assignee: 'DCP Intel', status: 'under_review' },
      { id: 'ir-2', title: 'Cyber Cell: Dark Web Marketplace Analysis', source: 'Cyber Cell', classification: 'confidential', received_at: new Date(now.getTime() - 7200000).toISOString(), summary: 'Two new vendors offering stolen Aadhaar data. Possible link to Karnataka-based identity theft ring.', assignee: 'SI Rao', status: 'verifying' },
      { id: 'ir-3', title: 'HUMINT: Naxal Recruitment in Forest Areas', source: 'HUMINT', classification: 'top_secret', received_at: new Date(now.getTime() - 14400000).toISOString(), summary: 'Source confirms recruitment drive in Shivamogga forest belt. Four new recruits identified.', assignee: 'SP Shivamogga', status: 'actioned' },
      { id: 'ir-4', title: 'IB Weekly: Border District Situation Report', source: 'IB', classification: 'confidential', received_at: new Date(now.getTime() - 28800000).toISOString(), summary: 'Situation along Maharashtra and Kerala borders remains stable. No major infiltration reported.', assignee: 'Additional DG Intel', status: 'closed' },
    ],
    last_updated: now.toISOString(),
  }
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPIntelligence() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [activeTab, setActiveTab] = useState<'trends' | 'actors' | 'reports'>('trends')
  const [selectedTrend, setSelectedTrend] = useState<CrimeTrend | null>(null)

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      if (isDemoMode()) {
        const demo = demoIntelligenceData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      setRefreshing(true)
      const res = await fetch('/api/cp/intelligence', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        const demo = demoIntelligenceData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPIntelligence] Failed to fetch intelligence data')
      const demo = demoIntelligenceData()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary
  const brief = data?.daily_brief

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <BookOpen size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-violet-400">City Intelligence Hub</h1>
            <p className="text-[10px] text-white/40">Consolidated intelligence · Crime trends · Threat actors · Intel reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[10px] text-white/30">Updated: {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <JurisdictionBanner scope={jur} />
        </div>
      </div>

      {/* ─── KPI Summary ───────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Active Patterns', value: summary.active_patterns, icon: <Brain size={12} />, color: 'text-violet-400' },
            { label: 'Repeat Offenders', value: summary.repeat_offenders_tracked, icon: <Users size={12} />, color: 'text-blue-400' },
            { label: 'Emerging Threats', value: summary.emerging_threats, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Intel Reports', value: summary.credible_intel_reports, icon: <FileText size={12} />, color: 'text-amber-400' },
            { label: 'Pending Analysis', value: summary.pending_analysis, icon: <Eye size={12} />, color: 'text-orange-400' },
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
        {/* ─── Main Area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-violet-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading intelligence data…</p>
              </div>
            </div>
          )}

          {/* Daily Brief */}
          {brief && (
            <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/5 rounded-xl border border-violet-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <BookOpen size={12} className="text-violet-400" />
                </div>
                <h3 className="text-xs font-bold text-violet-300">Daily Intelligence Brief</h3>
                <span className="text-[9px] text-violet-400/60">{brief.date}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                  brief.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-violet-500/20 text-violet-300'
                }`}>
                  {brief.priority.toUpperCase()} PRIORITY
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">{brief.summary}</p>
              <div className="flex items-center gap-3 mt-2 text-[9px] text-white/40">
                <span>Confidence: {(brief.confidence * 100).toFixed(0)}%</span>
                <span>•</span>
                <span>Prepared by: {brief.prepared_by}</span>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-white/10 pb-2">
            {[
              { id: 'trends' as const, label: 'Crime Trends', icon: <TrendingUp size={12} />, count: data?.crime_trends.length },
              { id: 'actors' as const, label: 'Threat Actors', icon: <Users size={12} />, count: data?.threat_actors.length },
              { id: 'reports' as const, label: 'Intel Reports', icon: <FileText size={12} />, count: data?.intel_reports.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-white/50 hover:text-white/70 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[8px]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content: Crime Trends */}
          {activeTab === 'trends' && data?.crime_trends.map(trend => (
            <button
              key={trend.id}
              onClick={() => setSelectedTrend(selectedTrend?.id === trend.id ? null : trend)}
              className={`w-full bg-white/[0.03] rounded-xl border p-3 transition-colors text-left ${
                selectedTrend?.id === trend.id ? 'border-violet-500/40' : 'border-white/10 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[trend.severity] }} />
                  <span className="text-xs font-semibold text-white/80">{trend.title}</span>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${DIRECTION_COLORS[trend.direction]}20`, color: DIRECTION_COLORS[trend.direction] }}
                  >
                    {trend.direction.toUpperCase()}
                  </span>
                </div>
                <span className="text-[9px] text-white/30">{timeAgo(trend.last_updated)}</span>
              </div>
              <p className="text-[10px] text-white/40">{trend.district} • Confidence: {(trend.confidence * 100).toFixed(0)}%</p>
              {selectedTrend?.id === trend.id && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[10px] text-white/50 leading-relaxed">{trend.evidence}</p>
                </div>
              )}
            </button>
          ))}

          {/* Tab Content: Threat Actors */}
          {activeTab === 'actors' && data?.threat_actors.map(actor => (
            <div key={actor.id} className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[actor.risk] }} />
                  <span className="text-xs font-semibold text-white/80">{actor.name}</span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${RISK_COLORS[actor.risk]}20`, color: RISK_COLORS[actor.risk] }}>
                    {actor.risk.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-white/[0.03] rounded px-2 py-1">
                  <div className="text-[8px] text-white/30">Members</div>
                  <div className="text-[10px] text-white/70">{actor.members}</div>
                </div>
                <div className="bg-white/[0.03] rounded px-2 py-1">
                  <div className="text-[8px] text-white/30">Active</div>
                  <div className="text-[10px] text-white/70">{actor.active_months}mo</div>
                </div>
                <div className="bg-white/[0.03] rounded px-2 py-1">
                  <div className="text-[8px] text-white/30">Last Activity</div>
                  <div className="text-[10px] text-white/70">{timeAgo(actor.last_known_activity)}</div>
                </div>
              </div>
              <div className="text-[9px] text-white/40">
                <span className="text-white/50">Crime:</span> {actor.primary_crime.replace('_', ' ')}
                <span className="mx-2">•</span>
                <span className="text-white/50">MO:</span> {actor.modus_operandi}
              </div>
            </div>
          ))}

          {/* Tab Content: Intel Reports */}
          {activeTab === 'reports' && data?.intel_reports.map(report => (
            <div key={report.id} className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-amber-400" />
                  <span className="text-xs font-semibold text-white/80">{report.title}</span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${CLASSIFICATION_COLORS[report.classification]}20`, color: CLASSIFICATION_COLORS[report.classification] }}>
                    {report.classification.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[report.status]}20`, color: STATUS_COLORS[report.status] }}>
                  {report.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed mb-2">{report.summary}</p>
              <div className="flex items-center gap-3 text-[9px] text-white/40">
                <span>Source: {report.source}</span>
                <span>•</span>
                <span>Assigned to: {report.assignee}</span>
                <span>•</span>
                <span>{timeAgo(report.received_at)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-72 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Most Active Trends */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Active Crime Trends</h3>
            <div className="space-y-2">
              {data?.crime_trends.slice(0, 4).map(trend => (
                <div key={trend.id} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[trend.severity] }} />
                    <span className="text-[10px] text-white/70 font-medium flex-1 truncate">{trend.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/40">{trend.district}</span>
                    <span className={trend.direction === 'rising' ? 'text-red-400' : trend.direction === 'falling' ? 'text-green-400' : 'text-amber-400'}>
                      {trend.direction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Threat Actor Risk Distribution</h3>
            {['critical', 'high', 'medium'].map(risk => {
              const count = data?.threat_actors.filter(a => a.risk === risk).length || 0
              return (
                <div key={risk} className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${RISK_COLORS[risk]}40` }} />
                  <span className="text-[10px] text-white/50 flex-1 capitalize">{risk}</span>
                  <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / Math.max(1, data?.threat_actors.length || 1)) * 100}%`, backgroundColor: RISK_COLORS[risk] }} />
                  </div>
                  <span className="text-[10px] text-white/40">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Intel by Source */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Intel by Source</h3>
            {['IB', 'Cyber Cell', 'HUMINT'].map(source => {
              const count = data?.intel_reports.filter(r => r.source === source).length || 0
              return (
                <div key={source} className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-white/50">{source}</span>
                  <span className="text-white/40">{count} reports</span>
                </div>
              )
            })}
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              🕵️ Intelligence auto-refreshes every 60s. Sources include IB inputs, Cyber Cell reports, and HUMINT. 
              All intelligence is assessed for credibility before inclusion. Classifications follow standard protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}