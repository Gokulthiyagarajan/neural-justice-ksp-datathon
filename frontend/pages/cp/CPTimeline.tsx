/**
 * CPTimeline — City Operations Timeline
 *
 * Commissioner of Police command center page.
 * Unified operational timeline showing all city events in chronological order:
 * FIR registrations, emergencies, patrols, AI alerts, warnings, arrests, etc.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Clock, RefreshCw, AlertTriangle, FileText, Bot, Shield, ShieldAlert,
  Building2, Truck, MapPin,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string
  type: 'fir_registration' | 'emergency' | 'patrol' | 'ai_alert' | 'warning' |
        'arrest' | 'inter_agency' | 'resource_movement'
  title: string
  district: string
  station: string
  timestamp: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  officer: string
  details: string
}

interface TimelineSummary {
  fir_registrations: number
  emergency_responses: number
  patrol_deployments: number
  ai_alerts: number
  warning_escalations: number
  resource_movements: number
  inter_agency: number
  arrests: number
}

interface TimelineData {
  total_events: number
  summary: TimelineSummary
  events: TimelineEvent[]
  timeline_markers: {
    time: string
    events: number
    peak_type: string
  }[]
  period_hours: number
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  fir_registration: '#3B82F6',
  emergency: '#EF4444',
  patrol: '#10B981',
  ai_alert: '#8B5CF6',
  warning: '#F97316',
  arrest: '#6366F1',
  inter_agency: '#06B6D4',
  resource_movement: '#F59E0B',
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3B82F6',
  low: '#22C55E',
  medium: '#F97316',
  high: '#F97316',
  critical: '#EF4444',
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSec < 60) return `${diffSec} sec ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`
  return `${Math.floor(diffSec / 86400)} day ago`
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPTimeline() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<TimelineData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<number>(24)

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)

      if (isDemoMode()) {
        const now = new Date()
        const demoEvents: TimelineEvent[] = [
          { id: 'tl-001', type: 'fir_registration', title: 'FIR Registered — Chain Snatching', district: 'Bengaluru Urban', station: 'Koramangala PS', timestamp: new Date(now.getTime() - 600000).toISOString(), severity: 'high', officer: 'SI Meena K.', details: 'Victim reported chain snatching near Market Area at 19:30. CCTV footage being reviewed. Accused description obtained.' },
          { id: 'tl-002', type: 'emergency', title: 'Emergency Response — Road Accident', district: 'Mysuru', station: 'MG Road PS', timestamp: new Date(now.getTime() - 1800000).toISOString(), severity: 'critical', officer: 'PI Ramesh', details: 'Multi-vehicle collision on Ring Road. 3 injured, traffic diverted. Ambulance dispatched. Investigation underway.' },
          { id: 'tl-003', type: 'patrol', title: 'Patrol Deployment — Market Sector', district: 'Bengaluru Urban', station: 'BTM Layout PS', timestamp: new Date(now.getTime() - 3600000).toISOString(), severity: 'info', officer: 'ASI Gopal', details: 'Routine patrol deployed to Market Sector. Focus on theft prevention during evening peak hours.' },
          { id: 'tl-004', type: 'ai_alert', title: 'AI Alert — Crime Pattern Detected', district: 'Belagavi', station: 'Belagavi City PS', timestamp: new Date(now.getTime() - 7200000).toISOString(), severity: 'medium', officer: 'System', details: 'ML model detected uptick in vehicle thefts along NH-4 corridor. 40% increase over baseline. Recommend increased patrol on highway stretch.' },
          { id: 'tl-005', type: 'warning', title: 'Escalation Warning — Overdue Investigation', district: 'Kalaburagi', station: 'Kalaburagi PS', timestamp: new Date(now.getTime() - 14400000).toISOString(), severity: 'high', officer: 'PI Shetty', details: 'FIR KSP-2026-035 (Burglary) overdue by 12 days. No case diary filed in 8 days. Escalated to ACP for review.' },
          { id: 'tl-006', type: 'arrest', title: 'Arrest Made — Repeat Offender', district: 'Bengaluru Urban', station: 'Indiranagar PS', timestamp: new Date(now.getTime() - 21600000).toISOString(), severity: 'high', officer: 'SI Venkatesh', details: 'Repeat offender Ravi Kumar apprehended in connection with 3 chain snatching cases. Weapon recovered. Remanded to judicial custody.' },
          { id: 'tl-007', type: 'inter_agency', title: 'Inter-Agency Coordination — Narcotics Raid', district: 'Bengaluru Urban', station: 'Whitefield PS', timestamp: new Date(now.getTime() - 28800000).toISOString(), severity: 'medium', officer: 'DCP Sharma', details: 'Joint operation with NCB and local task force. Raided 2 locations in Whitefield. 5 kg contraband seized. 4 suspects in custody.' },
          { id: 'tl-008', type: 'resource_movement', title: 'Resource Movement — Forensic Van Deployed', district: 'Mysuru', station: 'Kuvempunagar PS', timestamp: new Date(now.getTime() - 43200000).toISOString(), severity: 'info', officer: 'SI Priya', details: 'Mobile forensic van dispatched to Kuvempunagar crime scene. Expected to arrive within 30 mins. Evidence collection pending.' },
          { id: 'tl-009', type: 'fir_registration', title: 'FIR Registered — Cyber Fraud', district: 'Bengaluru Urban', station: 'Electronic City PS', timestamp: new Date(now.getTime() - 54000000).toISOString(), severity: 'medium', officer: 'SI Nagesh', details: 'Victim lost ₹2.3L to phishing scam. Bank account frozen. Cybercrime team notified for digital forensics.' },
          { id: 'tl-010', type: 'patrol', title: 'Patrol Deployment — Night Beat', district: 'Belagavi', station: 'Belagavi City PS', timestamp: new Date(now.getTime() - 64800000).toISOString(), severity: 'info', officer: 'ASI Kumar', details: 'Night beat patrol deployed to high-risk zones. 2 constables on foot patrol in Market Area. 1 PCR van on standby.' },
        ]

        setData({
          total_events: demoEvents.length,
          summary: {
            fir_registrations: 2,
            emergency_responses: 1,
            patrol_deployments: 2,
            ai_alerts: 1,
            warning_escalations: 1,
            resource_movements: 1,
            inter_agency: 1,
            arrests: 1,
          },
          events: demoEvents,
          timeline_markers: [
            { time: '00:00 – 04:00', events: 2, peak_type: 'patrol' },
            { time: '04:00 – 08:00', events: 1, peak_type: 'fir_registration' },
            { time: '08:00 – 12:00', events: 1, peak_type: 'inter_agency' },
            { time: '12:00 – 16:00', events: 2, peak_type: 'arrest' },
            { time: '16:00 – 20:00', events: 2, peak_type: 'emergency' },
            { time: '20:00 – 00:00', events: 2, peak_type: 'ai_alert' },
          ],
          period_hours: timeRange,
          last_updated: now.toISOString(),
        })
        setLastUpdated(now.toLocaleTimeString())
        return
      }

      const res = await fetch(`/api/cp/timeline?hours=${timeRange}`, { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPTimeline] Failed to fetch timeline data')
      if (isDemoMode()) {
        const now = new Date()
        setData({
          total_events: 0,
          summary: { fir_registrations: 0, emergency_responses: 0, patrol_deployments: 0, ai_alerts: 0, warning_escalations: 0, resource_movements: 0, inter_agency: 0, arrests: 0 },
          events: [],
          timeline_markers: [],
          period_hours: timeRange,
          last_updated: now.toISOString(),
        })
        setLastUpdated(now.toLocaleTimeString())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  useEffect(() => { fetchData() }, [fetchData, timeRange])

  useEffect(() => {
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ── Memoized data ───────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    if (!data) return []
    if (filterType === 'all') return [...data.events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return [...data.events]
      .filter(e => e.type === filterType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [data, filterType])

  // ── Build hour distribution for chart ───────────────────────────────────

  const hourDistribution = useMemo(() => {
    if (!data) return Array(24).fill(0)
    const hours = Array(24).fill(0)
    data.events.forEach(event => {
      const hour = new Date(event.timestamp).getHours()
      hours[hour]++
    })
    return hours
  }, [data])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Clock size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">City Operations Timeline</h1>
            <p className="text-[10px] text-white/40">Live operational feed · Last 24 hours · Auto-refresh every 60s</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-white/30">
              Updated: {lastUpdated}
            </span>
          )}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/60">Time range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={168}>1 week</option>
            </select>
          </div>
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

      {/* ─── KPI Summary ───────────────────────────────────────── */}
      {data?.summary && (
        <div className="grid grid-cols-8 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'FIRs', value: data.summary.fir_registrations, icon: <FileText size={12} />, color: '#3B82F6' },
            { label: 'Emergency', value: data.summary.emergency_responses, icon: <AlertTriangle size={12} />, color: '#EF4444' },
            { label: 'Patrol', value: data.summary.patrol_deployments, icon: <Building2 size={12} />, color: '#10B981' },
            { label: 'AI Alerts', value: data.summary.ai_alerts, icon: <Bot size={12} />, color: '#8B5CF6' },
            { label: 'Warnings', value: data.summary.warning_escalations, icon: <ShieldAlert size={12} />, color: '#F97316' },
            { label: 'Resources', value: data.summary.resource_movements, icon: <Truck size={12} />, color: '#F59E0B' },
            { label: 'Inter-Agency', value: data.summary.inter_agency, icon: <MapPin size={12} />, color: '#06B6D4' },
            { label: 'Arrests', value: data.summary.arrests, icon: <Shield size={12} />, color: '#6366F1' },
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

      {/* ─── Filter Chips ──────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all border ${
              filterType === 'all'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/95 border-white/10 text-white/50 hover:bg-white/5'
            }`}
          >
            All
          </button>
          {[
            'fir_registration', 'emergency', 'patrol', 'ai_alert', 'warning', 
            'arrest', 'inter_agency', 'resource_movement'
          ].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all border ${
                filterType === type
                  ? `bg-${TYPE_COLORS[type]}20 border-${TYPE_COLORS[type]}40 text-${TYPE_COLORS[type]}300`
                  : 'bg-slate-900/95 border-white/10 text-white/50 hover:bg-white/5'
              }`}
            >
              {type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Timeline ───────────────────────────────────────── */}
        <div className="flex-1 relative overflow-y-auto pr-4">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading timeline…</p>
              </div>
            </div>
          )}

          {/* Vertical timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-amber-400/20" />

          {/* Timeline events */}
          {filteredEvents.map((event, index) => {
            const hour = new Date(event.timestamp).getHours()
            const hourString = `${hour.toString().padStart(2, '0')}:00`
            const isFirstInHour = index === 0 || 
              new Date(filteredEvents[index - 1].timestamp).getHours() !== hour

            return (
              <div key={event.id} className="relative mb-6">
                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Time and type marker */}
                  <div className="flex items-start">
                    <div className="w-2 h-2 rounded-full" 
                         style={{ backgroundColor: TYPE_COLORS[event.type] }}
                    />
                    <div className="ml-1 mt-0.5">
                      <div className="text-[9px] text-white/40 font-mono">{hourString}</div>
                      {isFirstInHour && (
                        <div className="w-0.5 h-4 bg-amber-400/20 mt-1" />
                      )}
                    </div>
                  </div>

                  {/* Event card */}
                  <div className="flex-1 min-w-0 bg-white/[0.03] rounded-xl border border-white/10 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white/90">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-white/50">{event.district}</span>
                          <span className="w-0.5 h-4 bg-white/20 mx-1" />
                          <span className="text-[9px] text-white/50">{event.station}</span>
                        </div>
                        <p className="text-[10px] text-white/50 mt-1 line-clamp-2">{event.details}</p>
                        <div className="mt-2 flex items-center gap-2 text-[9px]">
                          <span className="text-white/40">Officer:</span>
                          <span className="font-medium text-white/80">{event.officer}</span>
                          <span className="text-white/40">⋅</span>
                          <span className="text-white/40">Time:</span>
                          <span className="text-white/80">{formatTime(event.timestamp)}</span>
                          <span className="text-white/40">⋅</span>
                          <span className="text-white/40">Age:</span>
                          <span className="text-amber-300">{timeAgo(event.timestamp)}</span>
                        </div>
                      </div>
                      {/* Severity badge */}
                      <div className="flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                          SEVERITY_COLORS[event.severity]
                        }20 text-${SEVERITY_COLORS[event.severity]}300`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Hour markers at bottom */}
          <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-400/10" />

          {/* Empty state */}
          {!data?.events.length && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
                <p className="text-sm text-white/60">No events in selected time range</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Hour Distribution Chart ──────────────────────── */}
        <div className="w-56 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="p-3 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-2">Hourly Distribution</h3>
            <div className="space-y-1">
              {hourDistribution.map((count, hour) => {
                const max = Math.max(...hourDistribution)
                return (
                  <div key={hour} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-[8px] text-amber-400 font-mono">
                        {hour.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-full h-2.5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-amber-400/60 rounded-full h-full" 
                           style={{ width: `${(count / Math.max(1, max)) * 100}%` }} />
                    </div>
                    <div className="w-4 text-[8px] text-white/40 text-right">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Event Type Breakdown  */}
          <div className="p-3 border-t border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-2">Event Types</h3>
            <div className="space-y-1.5">
              {[
                { label: 'FIRs', value: data?.summary.fir_registrations || 0, color: '#3B82F6' },
                { label: 'Emergency', value: data?.summary.emergency_responses || 0, color: '#EF4444' },
                { label: 'Patrol', value: data?.summary.patrol_deployments || 0, color: '#10B981' },
                { label: 'AI Alerts', value: data?.summary.ai_alerts || 0, color: '#8B5CF6' },
                { label: 'Warnings', value: data?.summary.warning_escalations || 0, color: '#F97316' },
                { label: 'Resources', value: data?.summary.resource_movements || 0, color: '#F59E0B' },
                { label: 'Inter-Agency', value: data?.summary.inter_agency || 0, color: '#06B6D4' },
                { label: 'Arrests', value: data?.summary.arrests || 0, color: '#6366F1' },
              ].map(({ label, value, color }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${color}40` }} />
                  <span className="text-[10px] text-white/50 flex-1">{label}</span>
                  <div className="w-10 bg-white/10 rounded-full h-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-amber-400/60 rounded-full h-full" 
                         style={{ width: `${Math.min((value / Math.max(...Object.values(data?.summary || {}))) * 200, 100)}%` }} />
                  </div>
                  <span className="w-8 text-[9px] text-white/40 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline markers */}
          <div className="p-3 border-t border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-2">Peak Hours</h3>
            <div className="space-y-1">
              {data?.timeline_markers.map((marker, i) => (
                <div key={i} className="flex justify-between text-[9px]">
                  <span>{marker.time}</span>
                  <span>{marker.events} events ({marker.peak_type.replace('_', ' ')})</span>
                </div>
              )) ?? (
                <div className="text-[10px] text-white/40 text-center py-2">
                  No peak data available
                </div>
              )}
            </div>
          </div>

          {/* AI Advisory  */}
          <div className="p-3 border-t border-white/10">
            <p className="text-[10px] text-white/30 leading-relaxed">
              🕐 Timeline updates every 60 seconds. Events sorted chronologically (newest first).
              AI confidence: high for FIR/emergency/arrest events, medium for predictions/warnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}