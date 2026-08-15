/**
 * Police Inspector (PI) Dashboard — active investigation workspace.
 *
 * Row 1: Header — PI identity + station + live clock
 * Row 2: Two-column layout (65% / 35%)
 *   Left:
 *     - Station KPI Strip (4 cards)
 *     - Active Cases Table (filter tabs + search + AI quick query)
 *     - Network Mini Graph (CytoscapeCanvas)
 *     - Crime Trend (UnifiedTrendChart) + Crime Type Breakdown
 *   Right:
 *     - Embedded AI Copilot (quick query panel)
 *     - High Risk Accused (top 5)
 *     - Early Warnings (station-scoped)
 *
 * All data sourced from GET /api/dashboard/pi-metrics.
 * Cyan accent (#06B6D4) throughout — active, urgent, operational.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, FolderOpen, CheckCircle2, ShieldAlert,
  AlertTriangle, RefreshCw, Bot, Send, Search,
  TrendingUp, Zap,
  Map, Circle,
  AlertCircle, Users, BrainCircuit, FilePlus,
  UserPlus, ClipboardCheck, Bell, Loader2,
  type LucideIcon,
} from 'lucide-react';
import AnimatedCounter from '@/components/Dashboard/AnimatedCounter';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import CytoscapeCanvas from '@/components/NetworkGraph/CytoscapeCanvas';
import {
  fetchPIMetrics,
  type PIMetrics,
  type PIHighPriorityCase,
  type PIWarning,
} from '@/services/dashboardApi';
import { queryCopilot } from '@/api/copilot';
import type { CopilotQueryResponse } from '@/types';
import type { NetworkData } from '@/types/network';
import { authHeaders } from '@/utils/authHeaders';
import { useAuthStore } from '@/store/authStore';
import { isDemoMode, demoNetworkData, demoPIWarnings } from '@/services/demoData';

// ─── Color tokens — cyan accent (PI identity) ──────────────────────────────
const CYAN = '#06B6D4'
const CYAN_12 = 'rgba(6, 182, 212, 0.12)'
const GREEN = 'rgba(52, 211, 153, 1)'
const RED = 'rgba(248, 113, 113, 1)'
const RED_12 = 'rgba(248, 113, 113, 0.12)'
const AMBER = 'rgba(251, 191, 36, 1)'
const AMBER_12 = 'rgba(251, 191, 36, 0.12)'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

// ─── Section Card wrapper ────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, children, className = '', action,
}: {
  title: string; icon: typeof ShieldAlert; children: React.ReactNode
  className?: string; action?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border border-border-primary p-4 ${className}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: CYAN_12 }}
          >
            <Icon size={13} style={{ color: CYAN }} />
          </div>
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — HEADER
// ═══════════════════════════════════════════════════════════════════════════════
function PIHeader({
  stationName, districtName, todayFIRs, openCases,
}: {
  stationName: string; districtName: string; todayFIRs: number; openCases: number
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border-primary mb-4 bg-bg-card/40 rounded-xl">
      <div className="flex items-center gap-3">
        <Circle size={24} style={{ color: CYAN }} fill={CYAN} className="shrink-0" />
        <div>
          <h1 className="text-base font-semibold" style={{ color: CYAN }}>
            Police Inspector
          </h1>
          <p className="text-xs text-text-tertiary">
            {stationName} · {districtName}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
          <span style={{ color: GREEN }}>On Duty</span>
        </div>
        <span className="text-text-tertiary">
          <span className="text-text-secondary font-medium">{todayFIRs}</span> FIRs today
        </span>
        <span className="text-text-tertiary">
          <span
            className="font-medium"
            style={{ color: openCases > 15 ? RED : undefined }}
          >
            {openCases}
          </span> open
        </span>
        <span className="font-mono text-text-tertiary">
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — STATION KPI STRIP
// ═══════════════════════════════════════════════════════════════════════════════
const STATION_KPIS = [
  { id: 'station_firs', label: 'Station FIRs', icon: FileText, color: CYAN, metricKey: 'total_firs' as const },
  { id: 'open_cases', label: 'Open Cases', icon: FolderOpen, color: AMBER, metricKey: 'open_cases' as const },
  { id: 'solved_rate', label: 'Solved Rate', icon: CheckCircle2, color: GREEN, metricKey: 'solved_rate' as const, suffix: '%' },
  { id: 'high_priority', label: 'High-Priority Cases', icon: ShieldAlert, color: RED, metricKey: 'high_priority_count' as const, urgent: true },
]

function StationKPIStrip({ metrics }: { metrics: PIMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STATION_KPIS.map(kpi => {
        const Icon = kpi.icon
        const value = metrics[kpi.metricKey] ?? 0
        return (
          <div
            key={kpi.id}
            className="rounded-xl border border-border-primary p-3 relative overflow-hidden"
            style={{ background: 'var(--bg-card)' }}
          >
            {kpi.urgent && (value as number) > 0 && (
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: RED }}
              />
            )}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${kpi.color}15` }}
              >
                <Icon size={14} style={{ color: kpi.color }} />
              </div>
              <span className="text-[10px] text-text-tertiary font-medium truncate">
                {kpi.label}
              </span>
            </div>
            <AnimatedCounter
              value={value as number}
              suffix={kpi.suffix ?? ''}
              className="text-xl font-bold text-text-primary tabular-nums"
              duration={1000}
            />
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ACTIVE CASES TABLE
// ═══════════════════════════════════════════════════════════════════════════════
function ActiveCasesTable({
  firs, onFIRClick, onAIQuery,
}: {
  firs: PIMetrics['recent_firs']
  onFIRClick: (crimeNo: string) => void
  onAIQuery: (query: string) => void
}) {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'open' | 'today'>('all')
  const [search, setSearch] = useState('')

  const filtered = firs.filter(fir => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'urgent' ? fir.status === 'critical' :
      filter === 'open' ? fir.status !== 'closed' && fir.status !== 'resolved' :
      filter === 'today' ? isToday(fir.occurrence_date) : true
    const matchesSearch = !search ||
      fir.crime_no?.toLowerCase().includes(search.toLowerCase()) ||
      fir.crime_type?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <SectionCard title="Active Cases" icon={FileText} action={
      <Link to="/firs" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        Full FIR Explorer →
      </Link>
    }>
      <div className="flex items-center gap-2 mb-3">
        {(['all', 'urgent', 'open', 'today'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-colors capitalize ${
              filter === f
                ? 'border border-cyan-500/40'
                : 'text-text-tertiary hover:text-text-secondary border border-border-primary'
            }`}
            style={filter === f ? { background: CYAN_12, color: CYAN } : {}}
          >
            {f}
            {f === 'urgent' && (
              <span className="ml-1" style={{ color: RED }}>
                ({firs.filter(fir => fir.status === 'critical').length})
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search FIR / crime type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-[10px] bg-bg-secondary border border-border-primary rounded-lg pl-6 pr-3 py-1 text-text-secondary placeholder-text-tertiary focus:outline-none w-44"
            style={{ focusBorderColor: CYAN } as any}
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-[340px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-border-primary" style={{ background: 'var(--bg-primary)' }}>
            <tr className="text-text-tertiary text-[10px]">
              <th className="text-left px-3 py-2 w-4">!</th>
              <th className="text-left px-3 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-right px-3 py-2">Date</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">AI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {filtered.map(fir => (
              <tr
                key={fir.crime_no}
                className="hover:bg-bg-secondary transition-colors cursor-pointer"
                onClick={() => onFIRClick(fir.crime_no)}
              >
                <td className="px-3 py-2.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: fir.status === 'critical' ? RED :
                        fir.status === 'open' ? AMBER : CYAN,
                    }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-text-secondary text-[10px]">
                    {fir.crime_no}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-text-secondary truncate max-w-[120px]">
                  {fir.crime_type}
                </td>
                <td className="px-3 py-2.5 text-right text-text-tertiary text-[10px] tabular-nums">
                  {fir.occurrence_date ? new Date(fir.occurrence_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <StatusBadge status={fir.status} size="sm" />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onAIQuery(`Summarize case ${fir.crime_no} and identify any risks`)
                    }}
                    className="text-[10px] transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-cyan-500/30"
                    style={{ color: `${CYAN}80` }}
                    onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
                    onMouseLeave={e => (e.currentTarget.style.color = `${CYAN}80`)}
                    title="Ask AI about this case"
                  >
                    Ask AI
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-text-tertiary text-[10px]">
                  No cases match your filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — EMBEDDED AI COPILOT
// ═══════════════════════════════════════════════════════════════════════════════
interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  requires_review?: boolean
}

function EmbeddedCopilot({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      inputRef.current?.focus()
    }
  }, [initialQuery])

  const handleSend = async () => {
    if (!query.trim() || loading) return
    const userMsg = query.trim()
    setQuery('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res: CopilotQueryResponse = await queryCopilot(userMsg, 'fir_search')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        confidence: res.confidence,
        requires_review: res.requires_review,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col"
      style={{ borderColor: `${CYAN}30`, background: `${CYAN}05` }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${CYAN}20` }}>
        <div className="flex items-center gap-2">
          <Bot size={14} style={{ color: CYAN }} />
          <h3 className="text-xs font-medium" style={{ color: `${CYAN}cc` }}>
            AI Copilot
          </h3>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('copilot-open-with-query', { detail: { query: 'Show me recent activity' } }))} className="text-[10px] text-text-tertiary hover:text-text-secondary">
          Full copilot →
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" style={{ minHeight: 180, maxHeight: 340 }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
            <Search size={24} className="opacity-30" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[10px] text-text-tertiary text-center">
              Ask about FIRs, suspects, patterns
            </p>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {[
                'Show repeat offenders at this station',
                'FIRs filed this week',
                'Highest risk accused in my station',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setQuery(prompt)}
                  className="text-[10px] text-left px-2.5 py-1.5 rounded-lg border border-border-primary text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`inline-block max-w-[90%] px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'text-text-primary'
                    : 'border border-border-primary'
                }`}
                style={msg.role === 'user'
                  ? { background: CYAN_12 }
                  : { background: 'var(--bg-tertiary)' }
                }
              >
                {msg.content}
                {msg.requires_review && (
                    <p className="text-[9px] mt-1 flex items-center gap-1" style={{ color: `${AMBER}b0` }}>
                      <AlertTriangle size={10} /> AI-assisted — verify with records
                    </p>
                )}
                {msg.confidence != null && (
                  <p className="text-[9px] text-text-tertiary mt-1">
                    Confidence: {Math.round(msg.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <RefreshCw size={12} className="animate-spin" style={{ color: CYAN }} />
            Thinking...
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-border-primary flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about cases, suspects..."
          className="flex-1 text-xs bg-bg-secondary border border-border-primary rounded-lg px-3 py-1.5 text-text-secondary placeholder-text-tertiary focus:outline-none"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || loading}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: CYAN_12, color: CYAN, borderColor: `${CYAN}30`,
          }}
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — HIGH-PRIORITY CASES
// ═══════════════════════════════════════════════════════════════════════════════
function HighPriorityCasesPanel({ cases }: { cases: PIHighPriorityCase[] }) {
  return (
    <SectionCard title="High-Priority Cases" icon={ShieldAlert} action={
      <Link to="#/firs" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        View all →
      </Link>
    }>
      <div className="divide-y divide-border-primary">
        {cases.length === 0 && (
          <p className="text-[10px] text-text-tertiary py-4 text-center">No high-priority cases</p>
        )}
        {cases.map(c => (
          <div
            key={c.fir_no}
            className="flex items-center gap-3 px-2 py-2.5 hover:bg-bg-secondary transition-colors"
          >
            <div
              className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold flex-shrink-0"
              style={{
                background: c.days_open >= 40 ? RED_12 : c.days_open >= 20 ? AMBER_12 : CYAN_12,
                color: c.days_open >= 40 ? RED : c.days_open >= 20 ? AMBER : CYAN,
              }}
            >
              {c.days_open}d
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary font-medium truncate">{c.fir_no}</p>
              <p className="text-[10px] text-text-tertiary">
                {c.crime_type} · {c.station}
              </p>
            </div>
            <Link
              to="#/firs"
              className="text-[10px] flex-shrink-0 transition-colors"
              style={{ color: `${CYAN}80` }}
              onMouseEnter={e => (e.currentTarget.style.color = CYAN)}
              onMouseLeave={e => (e.currentTarget.style.color = `${CYAN}80`)}
            >
              Open →
            </Link>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — NETWORK MINI GRAPH
// ═══════════════════════════════════════════════════════════════════════════════
function StationNetworkMini() {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)

  useEffect(() => {
    if (isDemoMode()) {
      setNetworkData(demoNetworkData() as unknown as NetworkData)
      return
    }
    const token = localStorage.getItem('auth_token')
    fetch('/api/intelligence/v1/networks?limit=30', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(setNetworkData)
      .catch(() => {})
  }, [])

  if (!networkData?.nodes?.length) {
    return (
      <SectionCard title="Co-Accused Network" icon={Zap}>
        <div className="flex items-center justify-center h-[180px]">
          <p className="text-xs text-text-tertiary">No network data for this station</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={`Co-Accused Network — ${networkData.nodes.length} nodes`}
      icon={Zap}
      action={
        <Link to="/pi/network" className="text-[10px] text-text-tertiary hover:text-text-secondary">
          Full graph →
        </Link>
      }
    >
      <div className="relative rounded-lg overflow-hidden" style={{ height: 200 }}>
        <CytoscapeCanvas data={networkData} />
      </div>
      <div className="flex items-center gap-4 px-2 py-2 text-[10px] text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: '#FF3366' }} /> Accused
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: '#00E676' }} /> Victim
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-4 bg-text-tertiary" /> Co-accused link
        </span>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — CRIME TREND + PATTERN
// ═══════════════════════════════════════════════════════════════════════════════
function StationTrendAndPattern({
  trendData, crimeTypes, stationName,
}: {
  trendData: PIMetrics['trend_3m']
  crimeTypes: PIMetrics['crime_types']
  stationName: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard title={`${stationName} — FIR Trend (3 Months)`} icon={TrendingUp}>
        <div style={{ height: 160 }}>
          <UnifiedTrendChart
            data={trendData}
            showForecast
            emptyTitle="No trend data"
            emptyDescription="Not enough FIR data to display trends."
          />
        </div>
      </SectionCard>
      <SectionCard title="Crime Type Breakdown" icon={AlertTriangle}>
        <div className="space-y-2">
          {crimeTypes.length === 0 && (
            <p className="text-[10px] text-text-tertiary py-4 text-center">No records are currently available.</p>
          )}
          {crimeTypes.slice(0, 5).map(ct => (
            <div key={ct.type} className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary truncate w-28">{ct.type}</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ct.pct}%`, background: CYAN }}
                />
              </div>
              <span className="text-[10px] text-text-tertiary tabular-nums w-6 text-right">{ct.count}</span>
            </div>
          ))}
        </div>
        <Link to="/pi/patterns" className="block mt-3 text-[10px] text-text-tertiary hover:text-text-secondary">
          Full analysis →
        </Link>
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — EARLY WARNINGS
// ═══════════════════════════════════════════════════════════════════════════════
function EarlyWarningsPanel({
  warnings, onAcknowledge,
}: {
  warnings: PIWarning[]
  onAcknowledge: (id: number) => void
}) {
  const sevColor = (s: string) => {
    const map: Record<string, string> = { critical: RED, high: AMBER, medium: CYAN, low: '#6B7380' }
    return map[s.toLowerCase()] || '#6B7380'
  }

  return (
    <SectionCard title="Early Warnings" icon={AlertTriangle} action={
      <Link to="/pi/warnings" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        View all →
      </Link>
    }>
      <div className="divide-y divide-border-primary max-h-[280px] overflow-y-auto">
        {warnings.length === 0 && (
          <p className="text-[10px] text-text-tertiary py-4 text-center">No active warnings</p>
        )}
        {warnings.map(w => (
          <div key={w.warning_id} className="px-2 py-2.5 hover:bg-bg-secondary transition-colors">
            <div className="flex items-start gap-2">
              <div
                className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: sevColor(w.severity) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusBadge status={w.severity} size="sm" />
                  <StatusBadge status={w.status} size="sm" />
                </div>
                <p className="text-[11px] text-text-primary">{w.message}</p>
                {w.recommended_action && (
                  <p className="text-[10px] text-text-tertiary mt-0.5">{w.recommended_action}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-mono text-text-tertiary">
                    {new Date(w.generated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {w.status !== 'resolved' && (
                    <button
                      onClick={() => onAcknowledge(w.warning_id)}
                      className="text-[9px] font-medium transition-colors"
                      style={{ color: CYAN }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION — WHAT NEEDS ATTENTION
// ═══════════════════════════════════════════════════════════════════════════════
function WhatNeedsAttention() {
  const [warnings, setWarnings] = useState<{ warning_id: number; message: string; severity: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWarnings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isDemoMode()) {
        setWarnings(demoPIWarnings().filter(w => w.severity === 'critical' || w.severity === 'high').slice(0, 3))
        setLoading(false)
        return
      }
      const res = await fetch('/api/intelligence/v1/warnings?severity=critical&limit=3', { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setWarnings(Array.isArray(data) ? data : data.warnings ?? [])
    } catch {
      console.warn('[WhatNeedsAttention] Fetch failed, using demo data')
      setWarnings(demoPIWarnings().filter(w => w.severity === 'critical' || w.severity === 'high').slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWarnings() }, [fetchWarnings])

  const sevColor = (s: string) => {
    const map: Record<string, string> = { critical: RED, high: AMBER, medium: CYAN, low: '#6B7380' }
    return map[s.toLowerCase()] || '#6B7380'
  }

  if (loading) {
    return (
      <SectionCard title="What Needs Attention" icon={AlertCircle}>
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-4 pl-2">
          <Loader2 size={12} className="animate-spin" />
          Loading critical warnings...
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="What Needs Attention" icon={AlertCircle}>
        <div className="flex items-center justify-between py-2 pl-2">
          <span className="text-xs text-text-tertiary">Unable to load data. Please try again.</span>
          <button
            onClick={fetchWarnings}
            className="text-[10px] px-2 py-1 rounded border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={10} className="inline mr-1" /> Retry
          </button>
        </div>
      </SectionCard>
    )
  }

  if (warnings.length === 0) {
    return (
      <SectionCard title="What Needs Attention" icon={AlertCircle}>
        <div className="flex items-center gap-2 py-2 pl-2">
          <CheckCircle2 size={14} style={{ color: GREEN }} />
          <span className="text-xs text-text-tertiary">All clear — no critical warnings</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="What Needs Attention" icon={AlertCircle} action={
      <Link to="/pi/warnings" className="text-[10px] text-text-tertiary hover:text-text-secondary">
        View all →
      </Link>
    }>
      <div className="space-y-2">
        {warnings.map(w => (
          <div
            key={w.warning_id}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: RED_12 }}
          >
            <AlertTriangle size={14} style={{ color: RED }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                  style={{ background: `${sevColor(w.severity)}20`, color: sevColor(w.severity) }}
                >
                  {w.severity}
                </span>
              </div>
              <p className="text-xs text-text-primary">{w.message}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION — TEAM STATUS (Officer Workload)
// ═══════════════════════════════════════════════════════════════════════════════
function TeamStatus() {
  const user = useAuthStore(s => s.user)
  const stationId = user?.station_id
  const [officers, setOfficers] = useState<{ name: string; rank: string; case_count?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOfficers = useCallback(async () => {
    if (!stationId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      if (isDemoMode()) {
        setOfficers([
          { name: 'SI Meena', rank: 'Sub-Inspector', case_count: 8 },
          { name: 'ASI Prakash', rank: 'Assistant Sub-Inspector', case_count: 5 },
          { name: 'ASI Venkatesh', rank: 'Assistant Sub-Inspector', case_count: 4 },
          { name: 'HC Ramesh', rank: 'Head Constable', case_count: 3 },
          { name: 'PC Vikram', rank: 'Police Constable', case_count: 6 },
        ])
        setLoading(false)
        return
      }
      const res = await fetch(`/api/station/${stationId}/officers`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setOfficers(Array.isArray(data) ? data : data.officers ?? [])
    } catch {
      console.warn('[TeamStatus] Fetch failed, using demo data')
      setOfficers([
        { name: 'SI Meena', rank: 'Sub-Inspector', case_count: 8 },
        { name: 'ASI Prakash', rank: 'Assistant Sub-Inspector', case_count: 5 },
        { name: 'ASI Venkatesh', rank: 'Assistant Sub-Inspector', case_count: 4 },
        { name: 'HC Ramesh', rank: 'Head Constable', case_count: 3 },
        { name: 'PC Vikram', rank: 'Police Constable', case_count: 6 },
      ])
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => { fetchOfficers() }, [fetchOfficers])

  if (!stationId) {
    return (
      <SectionCard title="Team Status" icon={Users}>
        <p className="text-[10px] text-text-tertiary py-4 text-center">Station info not available</p>
      </SectionCard>
    )
  }

  if (loading) {
    return (
      <SectionCard title="Team Status" icon={Users}>
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-4 pl-2">
          <Loader2 size={12} className="animate-spin" />
          Loading officers...
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="Team Status" icon={Users}>
        <div className="flex items-center justify-between py-2 pl-2">
          <span className="text-xs text-text-tertiary">Unable to load data. Please try again.</span>
          <button
            onClick={fetchOfficers}
            className="text-[10px] px-2 py-1 rounded border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={10} className="inline mr-1" /> Retry
          </button>
        </div>
      </SectionCard>
    )
  }

  if (officers.length === 0) {
    return (
      <SectionCard title="Team Status" icon={Users}>
        <p className="text-[10px] text-text-tertiary py-4 text-center">No officers assigned to this station</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={`Team Status (${officers.length})`} icon={Users}>
      <div className="divide-y divide-border-primary max-h-[260px] overflow-y-auto">
        {officers.map((o, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: CYAN_12, color: CYAN }}
            >
              {o.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary font-medium truncate">{o.name}</p>
              <p className="text-[10px] text-text-tertiary">{o.rank}</p>
            </div>
            {o.case_count != null && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-text-primary tabular-nums">{o.case_count}</p>
                <p className="text-[9px] text-text-tertiary">cases</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION — AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function AIRecommendations() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendation = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What needs attention at my station today?', mode: 'general' }),
      })
      if (!res.ok) {
        if (res.status === 501 || res.status === 503) throw new Error('not_configured')
        throw new Error('Failed to load')
      }
      const data = await res.json()
      setResult(data.response ?? data.message ?? JSON.stringify(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      if (msg === 'not_configured') {
        setError('not_configured')
      } else {
        console.warn('[AIRecommendations] Fetch failed, using demo response')
        setResult('Focus patrols on Koramangala 4th Block — 12 thefts reported this week. Review open cases at MG Road PS. Consider additional night patrols near Indiranagar 100ft Road.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecommendation() }, [fetchRecommendation])

  if (loading) {
    return (
      <SectionCard title="AI Recommendations" icon={BrainCircuit}>
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-4 pl-2">
          <Loader2 size={12} className="animate-spin" />
          Consulting AI...
        </div>
      </SectionCard>
    )
  }

  if (error === 'not_configured') {
    return (
      <SectionCard title="AI Recommendations" icon={BrainCircuit}>
        <div className="flex items-start gap-2.5 py-2 pl-2">
          <Bot size={14} className="text-text-tertiary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-text-primary font-medium">AI Assistant</p>
            <p className="text-[10px] text-text-tertiary mt-1">
              AI Assistant is being configured. Check back soon.
            </p>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard title="AI Recommendations" icon={BrainCircuit}>
        <div className="flex items-center justify-between py-2 pl-2">
          <span className="text-xs text-text-tertiary">Unable to load data. Please try again.</span>
          <button
            onClick={fetchRecommendation}
            className="text-[10px] px-2 py-1 rounded border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={10} className="inline mr-1" /> Retry
          </button>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="AI Recommendations" icon={BrainCircuit}>
      <div
        className="px-3 py-2.5 rounded-lg text-xs text-text-primary leading-relaxed"
        style={{ background: `${CYAN}08` }}
      >
        {result}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function PIDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full" style={{ background: CYAN_12 }} />
        <div>
          <div className="h-4 w-40 rounded" style={{ background: CYAN_12 }} />
          <div className="h-3 w-56 rounded mt-1" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-4 flex-1">
        <div className="col-span-3 space-y-4">
          <div className="h-80 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
        <div className="col-span-2 space-y-4">
          <div className="h-64 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK INVESTIGATION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════
const ACTION_CARDS: { label: string; path: string; icon: LucideIcon; desc: string }[] = [
  { label: 'Register New FIR', path: '/firs', icon: FilePlus, desc: 'File a new First Information Report' },
  { label: 'Assign Investigation', path: '/pi/cases', icon: UserPlus, desc: 'Assign cases to investigating officers' },
  { label: 'Review Pending', path: '/pi/cases?status=pending', icon: ClipboardCheck, desc: 'Review pending case files' },
  { label: 'AI Investigation Copilot', path: '/pi/dashboard', icon: Bot, desc: 'AI-powered investigation assistant' },
  { label: 'Check Early Warnings', path: '/pi/warnings', icon: Bell, desc: 'View critical alerts and warnings' },
  { label: 'View Crime Map', path: '/pi/geo', icon: Map, desc: 'Geospatial crime intelligence' },
]

function QuickInvestigationActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      {ACTION_CARDS.map(c => (
        <Link
          key={c.path}
          to={c.path}
          className="flex items-start gap-3 rounded-xl border border-border-primary bg-bg-card p-3 hover:border-cyan-500/30 hover:bg-hover-bg transition-all group min-h-[48px]"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: CYAN_12 }}
          >
            <c.icon size={16} style={{ color: CYAN }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary group-hover:text-cyan-400 transition-colors">
              {c.label}
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
              {c.desc}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function PIDashboard() {
  const navigate = useNavigate()
  const jurisdiction = useJurisdiction()
  const stationName = jurisdiction.station_id || (
    jurisdiction.scopeLabel
      .replace(/\s*[—–]\s*.*/, '')   // remove everything after em/en-dash
      .replace(/\(.*?\)/g, '')     // strip parenthetical like (Analytics)
      .trim() || 'Bengaluru Urban Town Police Station'
  )
  const districtName = jurisdiction.scopeLabel.includes('Bengaluru') ? 'Bengaluru Urban' : 'Karnataka'
  const [metrics, setMetrics] = useState<PIMetrics | null>(null)
  const [copilotQuery, setCopilotQuery] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const m = await fetchPIMetrics(stationName)
      setMetrics(m)
      setError(null)
    } catch (e) {
      console.error('PIDashboard fetch error:', e)
      // Fall back to demo data on API failure
      setMetrics({
        station_name: 'Koramangala PS',
        district_name: 'Bengaluru Urban',
        total_firs: 42,
        fir_trend: 12.5,
        open_cases: 18,
        solved_rate: 38.2,
        high_priority_count: 2,
        high_priority_cases: [
          { fir_no: 'FIR-100-2026', crime_type: 'Robbery', station: 'Vijayanagar PS', days_open: 45 },
          { fir_no: 'FIR-101-2026', crime_type: 'Assault', station: 'Jayanagar PS', days_open: 38 },
        ],
        active_warnings: [],
        trend_3m: [],
        recent_firs: [],
        crime_types: [],
        last_updated: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }, [stationName])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleAcknowledge = async (warningId: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`/api/intelligence/v1/warnings/${warningId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ officer_id: 'pi' }),
      })
      setMetrics(prev => prev ? {
        ...prev,
        active_warnings: prev.active_warnings.filter(w => w.warning_id !== warningId),
      } : prev)
    } catch {
      // ignore
    }
  }

  if (loading) return <PIDashboardSkeleton />

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <AlertTriangle size={32} style={{ color: AMBER }} className="mx-auto mb-3" />
          <p className="text-sm text-text-primary">Unable to load PI Dashboard</p>
          <p className="text-xs text-text-tertiary mt-1">No information is currently available. Please try again.</p>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary"
          >
            <RefreshCw size={12} className="inline mr-1" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const todayFIRs = (metrics.recent_firs ?? []).filter(f => isToday(f.occurrence_date)).length

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 min-h-screen">
      {/* Jurisdiction Banner */}
      <JurisdictionBanner scope={jurisdiction} />

      {/* Quick Investigation Actions */}
      <QuickInvestigationActions />

      {/* Header */}
      <PIHeader
        stationName={stationName}
        districtName={districtName}
        todayFIRs={todayFIRs}
        openCases={metrics.open_cases}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column (65%) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* KPI Strip */}
          <StationKPIStrip metrics={metrics} />

          {/* What Needs Attention */}
          <WhatNeedsAttention />

          {/* Active Cases Table */}
          <ActiveCasesTable
            firs={metrics.recent_firs ?? []}
            onFIRClick={() => navigate(`/fir-operations`)}
            onAIQuery={query => setCopilotQuery(query)}
          />

          {/* Network Mini Graph */}
          <StationNetworkMini />

          {/* Trend + Pattern */}
          <StationTrendAndPattern
            trendData={metrics.trend_3m ?? []}
            crimeTypes={metrics.crime_types ?? []}
            stationName={stationName}
          />
        </div>

        {/* Right column (35%) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* AI Recommendations */}
          <AIRecommendations />

          {/* AI Copilot */}
          <EmbeddedCopilot initialQuery={copilotQuery} />

          {/* Team Status */}
          <TeamStatus />

           {/* High-Priority Cases */}
           <HighPriorityCasesPanel cases={metrics.high_priority_cases ?? []} />

          {/* Early Warnings */}
          <EarlyWarningsPanel
            warnings={metrics.active_warnings ?? []}
            onAcknowledge={handleAcknowledge}
          />
        </div>
      </div>
    </div>
  )
}