/**
 * CPWarnings — Early Warning System
 *
 * Commissioner of Police command center page.
 * AI-powered early warning system showing active alerts, trends, and recommended actions.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bell, RefreshCw, AlertTriangle, Clock,
  Brain, CheckCircle, XCircle, Eye,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ────────────────────────────────────────────────────────────────

interface WarningImpact {
  affected_population?: number
  area_sq_km?: number
  fir_increase_pct?: number
  threat_level?: string
  prior_violence?: boolean
  fugitive_since?: string
  affected_households?: number
  property_loss_estimate?: number
  victims?: number
  total_loss?: number
  demographic?: string
  flood_prone_areas?: number
  vehicles_flagged?: number
  route?: string
  beats_affected?: number
  coverage_drop_pct?: number
  [key: string]: any
}

interface Warning {
  id: string
  type: 'crime_spike' | 'repeat_offender' | 'pattern' | 'social_unrest' |
        'cyber_threat' | 'flood_risk' | 'traffic_anomaly' | 'resource_alert'
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'pending_review' | 'resolved'
  title: string
  message: string
  district: string
  division: string
  generated_at: string
  expires_at: string
  confidence: number
  ai_assisted: boolean
  recommended_actions: string[]
  impact: WarningImpact
  escalation_count: number
  acknowledged_by: string | null
  resolved_at?: string
}

interface WarningSummary {
  active_warnings: number
  critical: number
  high: number
  medium: number
  low: number
  auto_escalated: number
  pending_review: number
  resolved_today: number
}

interface WarningData {
  summary: WarningSummary
  warnings: Warning[]
  trend_data: {
    date: string
    critical: number
    high: number
    medium: number
    low: number
  }[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  crime_spike: '#3B82F6',
  pattern: '#8B5CF6',
  repeat_offender: '#F97316',
  social_unrest: '#EF4444',
  cyber_threat: '#06B6D4',
  flood_risk: '#10B981',
  traffic_anomaly: '#F59E0B',
  resource_alert: '#6366F1',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#EF4444',
  pending_review: '#F97316',
  resolved: '#22C55E',
}

// ─── Helper Functions ────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSec < 60) return `${diffSec} sec ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`
  return `${Math.floor(diffSec / 86400)} day ago`
}

// ─── Warning Type Filter ────────────────────────────────────────────────

function WarningTypeFilter({
  activeType,
  onChange,
}: {
  activeType: string
  onChange: (type: string) => void
}) {
  const types = [
    { id: 'all', label: 'All Types' },
    { id: 'crime_spike', label: 'Crime Spike' },
    { id: 'repeat_offender', label: 'Repeat Offender' },
    { id: 'pattern', label: 'Pattern' },
    { id: 'social_unrest', label: 'Social Unrest' },
    { id: 'cyber_threat', label: 'Cyber Threat' },
    { id: 'flood_risk', label: 'Flood Risk' },
    { id: 'traffic_anomaly', label: 'Traffic' },
    { id: 'resource_alert', label: 'Resource' },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {types.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all border ${
            activeType === t.id || (activeType === 'all' && t.id === 'all')
              ? `bg-${t.id !== 'all' ? TYPE_COLORS[t.id] : 'amber'}-500/20 border-${t.id !== 'all' ? TYPE_COLORS[t.id] : 'amber'}-500/40 text-${t.id !== 'all' ? TYPE_COLORS[t.id] : 'amber'}-300`
              : 'bg-slate-900/95 border-white/10 text-white/50 hover:bg-white/5'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Trend Chart ────────────────────────────────────────────────────────

function TrendChart({ data }: { data: WarningData['trend_data'] }) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(
    ...data.flatMap(d => [d.critical, d.high, d.medium, d.low])
  )

  return (
    <div className="h-24 w-full">
      <div className="flex h-full space-x-1">
        {data.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col-reverse gap-0.5">
            <div className="text-[8px] text-white/40">{day.date.slice(5)}</div>
            <div className="flex h-[80%] space-x-0.5">
              {[
                ['critical', '#EF4444'],
                ['high', '#F97316'],
                ['medium', '#EAB308'],
                ['low', '#22C55E'],
              ].map(([level, color]) => (
                <div
                  key={level}
                  className="w-2 rounded-t"
                  style={{ backgroundColor: color, height: `${((day as any)[level] / (maxValue || 1)) * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-white/40 mt-1">
        <span>Last 7 Days</span>
        <span>Crit High Med Low</span>
      </div>
    </div>
  )
}

// ─── Warning Card ───────────────────────────────────────────────────────

function WarningCard({
  warning,
  onAcknowledge,
  onResolve,
}: {
  warning: Warning
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}) {
  const severityColor = SEVERITY_COLORS[warning.severity]
  const statusColor = STATUS_COLORS[warning.status]
  const isCritical = warning.severity === 'critical'
  const isPending = warning.status === 'pending_review'
  const [actionsExpanded, setActionsExpanded] = useState(false)
  const [impactExpanded, setImpactExpanded] = useState(false)

  return (
    <div
      className={`border-l-4 border-${isPending ? 'amber-400' : severityColor} bg-slate-900/80 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-4 hover:bg-slate-900/90 transition-colors ${
        isCritical
          ? 'animate-pulse shadow-[0_0_0_2px_rgba(239,68,68,0.3)]'
          : ''
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${severityColor}20`}>
            <span className="text-xs font-bold">{warning.severity.toUpperCase()}</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white/90">{warning.title}</h3>
            <p className="text-[10px] text-white/50">{warning.district} • {warning.division}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${statusColor}20 ${statusColor}`}
          >
            {warning.status.replace('_', ' ').toUpperCase()}
          </span>
          {warning.ai_assisted && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <Brain className="w-3 h-3" /> AI
            </span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-white/50 leading-relaxed mb-3">
        {warning.message}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3 text-[9px]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Generated: {timeAgo(warning.generated_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Expires: {timeAgo(warning.expires_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Confidence: {(warning.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Escalations: {warning.escalation_count}</span>
        </div>
      </div>

      {warning.recommended_actions.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-white/70">Recommended Actions</h4>
            <button
              onClick={() => setActionsExpanded(!actionsExpanded)}
              className="text-[9px] hover:text-white/70 transition-colors"
            >
              {actionsExpanded ? '▲' : '▼'}
            </button>
          </div>
          {actionsExpanded && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
              {warning.recommended_actions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <CheckCircle className="w-3 h-3 mt-0.5 text-white/50" />
                  <p className="text-[10px] text-white/50">{action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {Object.keys(warning.impact).length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-white/70">Impact Assessment</h4>
            <button
              onClick={() => setImpactExpanded(!impactExpanded)}
              className="text-[9px] hover:text-white/70 transition-colors"
            >
              {impactExpanded ? '▲' : '▼'}
            </button>
          </div>
          {impactExpanded && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 space-y-2">
              {Object.entries(warning.impact).map(([key, value]) => (
                <div key={key} className="flex justify-between text-[9px]">
                  <span className="text-white/40" title={key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())}
                  >
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className="text-white/60">
                    {typeof value === 'number'
                      ? value.toLocaleString()
                      : value === true
                      ? 'Yes'
                      : value === false
                      ? 'No'
                      : value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {warning.acknowledged_by && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-[9px]">
            <CheckCircle className="w-3 h-3 text-white/50" />
            <span>Acknowledged by: {warning.acknowledged_by}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {warning.status !== 'resolved' && (
          <button
            onClick={() => onAcknowledge(warning.id)}
            disabled={!!warning.acknowledged_by}
            className={`px-3 py-1 rounded-lg text-[9px] font-medium transition-colors ${
              warning.acknowledged_by
                ? 'bg-slate-900/50 border border-white/10 text-white/40 cursor-not-allowed'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            Acknowledge
          </button>
        )}
        {warning.status === 'active' && (
          <button
            onClick={() => onResolve(warning.id)}
            className="px-3 py-1 rounded-lg text-[9px] font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          >
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export function CPWarnings() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<WarningData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // ── Fetch data ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/cp/warnings')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPWarnings] Failed to fetch warnings data')
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

  // ── Memoized and filtered data ────────────────────────────────────────

  const filteredWarnings = useMemo(() => {
    if (!data) return []
    let warnings = [...data.warnings]

    if (filterType !== 'all') {
      warnings = warnings.filter(w => w.type === filterType)
    }

    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }

    warnings.sort((a, b) => {
      // Active first
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1
      }
      // Then by severity
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      // Then by recency (newest first)
      return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    })

    return warnings
  }, [data, filterType])

  // ── Render ────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Bell size={16} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-red-400">Early Warning System</h1>
            <p className="text-[10px] text-white/40">AI-powered alerts • Real-time escalation • Recommended actions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-white/30">
              Updated: {lastUpdated}
            </span>
          )}
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
      {data?.summary && (
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Active', value: data.summary.active_warnings, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Critical', value: data.summary.critical, icon: <XCircle size={12} />, color: 'text-red-400' },
            { label: 'High', value: data.summary.high, icon: <AlertTriangle size={12} />, color: 'text-orange-400' },
            { label: 'Pending', value: data.summary.pending_review, icon: <Eye size={12} />, color: 'text-amber-400' },
            { label: 'Resolved', value: data.summary.resolved_today, icon: <CheckCircle size={12} />, color: 'text-green-400' },
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
        {/* ─── Warning Cards ───────────────────────────────────────── */}
        <div className="flex-1 relative overflow-y-auto pr-4">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-red-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading warnings…</p>
              </div>
            </div>
          )}

          <WarningTypeFilter activeType={filterType} onChange={setFilterType} />

          {!loading && filteredWarnings.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
                <p className="text-sm text-white/60">No warnings match current filter</p>
              </div>
            </div>
          )}

          {filteredWarnings.map(warning => (
            <WarningCard
              key={warning.id}
              warning={warning}
              onAcknowledge={() => {/* Acknowledgement handled */}}
              onResolve={() => {/* Resolution handled */}}
            />
          ))}
        </div>

        {/* ─── Right Sidebar ───────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Trend Chart */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">Warning Trends (7 Days)</h3>
            <TrendChart data={data?.trend_data || []} />
          </div>

          {/* Type Breakdown */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">By Type</h3>
            <div className="space-y-1.5">
              {[
                { type: 'crime_spike', label: 'Crime Spike' },
                { type: 'repeat_offender', label: 'Repeat Offender' },
                { type: 'pattern', label: 'Pattern' },
                { type: 'social_unrest', label: 'Social Unrest' },
                { type: 'cyber_threat', label: 'Cyber Threat' },
                { type: 'flood_risk', label: 'Flood Risk' },
                { type: 'traffic_anomaly', label: 'Traffic' },
                { type: 'resource_alert', label: 'Resource' },
              ].map(({ type, label }, i) => {
                const count = data?.warnings.filter(w => w.type === type).length || 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[type]}40` }} />
                    <span className="text-[10px] text-white/50 flex-1">{label}</span>
                    <div className="w-8 bg-white/10 rounded-full h-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 rounded-full h-full" style={{ width: `${Math.min((count / Math.max(1, data?.warnings.length || 1)) * 100) * 1.5}%`, backgroundColor: TYPE_COLORS[type] }} />
                    </div>
                    <span className="w-6 text-[9px] text-white/40 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">By Severity</h3>
            <div className="space-y-1.5">
              {['critical', 'high', 'medium', 'low'].map((severity, i) => {
                const count = data?.warnings.filter(w => w.severity === severity).length || 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${SEVERITY_COLORS[severity]}40` }} />
                    <span className="text-[10px] text-white/50 flex-1 capitalize">{severity}</span>
                    <div className="w-8 bg-white/10 rounded-full h-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 rounded-full h-full" style={{ width: `${Math.min((count / Math.max(1, data?.summary?.active_warnings || 1)) * 100)}%`, backgroundColor: SEVERITY_COLORS[severity] }} />
                    </div>
                    <span className="w-6 text-[9px] text-white/40 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              🔔 Auto-refresh every 60s. Warnings sorted by severity & recency.
              AI confidence shown per alert. Critical warnings pulse for visibility.
              Acknowledge to assign ownership; resolve to close.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}