/**
 * Police Constable (PC) Dashboard — field officer daily duty.
 *
 * Row 1: Header — name + date + shift
 * Row 2: Daily Brief Card (greeting + open count)
 * Row 3: FIR Cards (card-per-FIR, not table) + Station Info
 * Row 4: Activity Feed (read-only)
 *
 * NO analytics. NO charts. NO AI. NO network. Absolute minimum data.
 * Slate accent (#64748B) throughout — grounded, practical, duty-focused.
 * Max width: max-w-4xl mx-auto.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, Building2, Clock, RefreshCw, AlertTriangle,
  ChevronRight, User, MapPin, Activity,
} from 'lucide-react';
import {
  fetchPCMetrics,
  type PCMetrics,
  type AssignedFIR,
} from '@/services/dashboardApi';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { useAuthStore } from '@/store/authStore';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';

// ─── PC Quick Links — navigate to sub-pages ────────────────────────────────
function PCQuickLinks() {
  const links = [
    { label: 'My Cases', path: '/pc/my-cases', emoji: '📋' },
    { label: 'My Station', path: '/pc/station', emoji: '🏛️' },
    { label: 'My Activity', path: '/pc/activity', emoji: '📊' },
    { label: 'Notifications', path: '/pc/notifications', emoji: '🔔' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {links.map(l => (
        <Link key={l.path} to={l.path}
          className="flex flex-col items-center gap-1.5 rounded-xl border
                     border-white/10 bg-white/[0.03] p-4 hover:border-white/20
                     hover:bg-white/5 transition-all">
          <span className="text-xl">{l.emoji}</span>
          <span className="text-xs text-white/60">{l.label}</span>
        </Link>
      ))}
    </div>
  )
}

// ─── Color tokens — slate accent (PC identity) ───────────────────────────────
const SLATE = '#64748B'
const SLATE_12 = 'rgba(100, 116, 139, 0.12)'
const GREEN = 'rgba(52, 211, 153, 1)'
const AMBER = 'rgba(251, 191, 36, 1)'

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — HEADER
// ═══════════════════════════════════════════════════════════════════════════════
function PCHeader({
  officerName, stationName, day, date, shift,
}: {
  officerName: string; stationName: string; day: string; date: string; shift: string
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border-primary mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔵</span>
        <div>
          <h1 className="text-base font-semibold" style={{ color: SLATE }}>
            Police Constable
          </h1>
          <p className="text-xs text-text-tertiary">
            {officerName} · {stationName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
          <span style={{ color: GREEN }}>{shift}</span>
        </div>
        <span className="text-text-tertiary">{day}, {date}</span>
        <span className="font-mono text-text-tertiary">
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — DAILY BRIEF CARD
// ═══════════════════════════════════════════════════════════════════════════════
function DailyBriefCard({ brief }: { brief: PCMetrics['daily_brief'] }) {
  return (
    <div
      className="rounded-xl border p-5 relative overflow-hidden"
      style={{
        borderColor: `${SLATE}30`,
        background: `linear-gradient(135deg, ${SLATE_12}, var(--bg-card))`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-text-primary">{brief.greeting}</p>
          <p className="text-sm text-text-secondary mt-1">{brief.message}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: SLATE }} />
            <span className="text-xs text-text-tertiary">{brief.shift}</span>
          </div>
          <p className="text-xs text-text-tertiary mt-1">{brief.day}</p>
        </div>
      </div>
      {/* Accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: SLATE }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — FIR CARDS (card-per-FIR, NOT a table)
// ═══════════════════════════════════════════════════════════════════════════════
function FIRCards({
  firs, onFIRClick,
}: {
  firs: AssignedFIR[]
  onFIRClick: (crimeNo: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: SLATE_12 }}
        >
          <FileText size={13} style={{ color: SLATE }} />
        </div>
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          My Cases ({firs.length})
        </h3>
      </div>

      {firs.length === 0 && (
        <div className="rounded-xl border border-border-primary p-8 text-center" style={{ background: 'var(--bg-card)' }}>
          <FileText size={24} className="mx-auto mb-2" style={{ color: SLATE, opacity: 0.4 }} />
          <p className="text-xs text-text-tertiary">No cases assigned to you today</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {firs.map(fir => (
          <FIRCard key={fir.crime_no} fir={fir} onClick={() => onFIRClick(fir.crime_no)} />
        ))}
      </div>
    </div>
  )
}

function FIRCard({ fir, onClick }: { fir: AssignedFIR; onClick: () => void }) {
  const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'registered': return AMBER
      case 'under_investigation': return '#3B82F6'
      case 'closed': case 'chargesheeted': case 'resolved': return GREEN
      default: return SLATE
    }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border-primary p-4 hover:border-slate-500/40 transition-all group"
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-medium text-text-primary">{fir.crime_no}</span>
            <StatusBadge status={fir.status} size="sm" />
          </div>
          <p className="text-xs text-text-secondary font-medium">{fir.crime_type}</p>
          {fir.brief_facts && (
            <p className="text-[10px] text-text-tertiary mt-1 line-clamp-2">{fir.brief_facts}</p>
          )}
        </div>
        <ChevronRight
          size={14}
          className="text-text-tertiary group-hover:text-text-secondary transition-colors mt-1 flex-shrink-0"
        />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-text-tertiary">
        {fir.occurrence_date && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {new Date(fir.occurrence_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
        <span
          className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
          style={{ background: `${statusColor(fir.status)}15`, color: statusColor(fir.status) }}
        >
          {fir.status.replace('_', ' ')}
        </span>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — STATION INFO
// ═══════════════════════════════════════════════════════════════════════════════
function StationInfoCard({ info }: { info: PCMetrics['station_info'] }) {
  return (
    <div
      className="rounded-xl border border-border-primary p-4"
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: SLATE_12 }}
        >
          <Building2 size={13} style={{ color: SLATE }} />
        </div>
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          Station Info
        </h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <MapPin size={12} className="text-text-tertiary flex-shrink-0" />
          <span className="text-text-secondary">{info.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Building2 size={12} className="text-text-tertiary flex-shrink-0" />
          <span className="text-text-secondary">{info.district}</span>
        </div>
        {info.address && info.address !== '—' && (
          <div className="flex items-center gap-2 text-xs">
            <MapPin size={12} className="text-text-tertiary flex-shrink-0" />
            <span className="text-text-tertiary">{info.address}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — ACTIVITY FEED (read-only)
// ═══════════════════════════════════════════════════════════════════════════════
function ActivityFeedCard({ feed }: { feed: PCMetrics['activity_feed'] }) {
  return (
    <div
      className="rounded-xl border border-border-primary p-4"
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: SLATE_12 }}
        >
          <Activity size={13} style={{ color: SLATE }} />
        </div>
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          Activity Feed
        </h3>
      </div>
      <div className="divide-y divide-border-primary max-h-[280px] overflow-y-auto">
        {feed.length === 0 && (
          <p className="text-[10px] text-text-tertiary py-4 text-center">No recent activity</p>
        )}
        {feed.map(entry => (
          <div key={entry.id} className="px-1 py-2.5">
            <div className="flex items-start gap-2">
              <div
                className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: SLATE }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-primary">
                  <span className="font-mono font-medium">{entry.crime_no}</span>
                  {' '}
                  <span className="text-text-tertiary">
                    {entry.old_status ? `${entry.old_status} → ` : ''}{entry.new_status}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-text-tertiary">
                  <User size={9} />
                  <span>{entry.changed_by}</span>
                  {entry.changed_at && (
                    <span className="font-mono">
                      {new Date(entry.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function PCDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full" style={{ background: SLATE_12 }} />
        <div>
          <div className="h-4 w-40 rounded" style={{ background: SLATE_12 }} />
          <div className="h-3 w-56 rounded mt-1" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
      <div className="h-28 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function PCDashboard() {
  const navigate = useNavigate()
  const jurisdiction = useJurisdiction()
  const user = useAuthStore((s) => s.user)
  const [metrics, setMetrics] = useState<PCMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      const m = await fetchPCMetrics(user.id)
      setMetrics(m)
      setError(null)
    } catch (e) {
      console.error('PCDashboard fetch error:', e)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <PCDashboardSkeleton />

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={32} style={{ color: AMBER }} className="mx-auto mb-3" />
          <p className="text-sm text-text-primary">Unable to load Dashboard</p>
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

  return (
    <div className="flex flex-col gap-4 p-6 min-h-screen max-w-4xl mx-auto">
      {/* Jurisdiction Banner */}
      <JurisdictionBanner scope={jurisdiction} />

      {/* Quick Links */}
      <PCQuickLinks />

      {/* Header */}
      <PCHeader
        officerName={metrics.officer_name}
        stationName={metrics.station_name}
        day={metrics.daily_brief.day}
        date={metrics.daily_brief.date}
        shift={metrics.daily_brief.shift}
      />

      {/* Daily Brief Card */}
      <DailyBriefCard brief={metrics.daily_brief} />

      {/* FIR Cards + Station Info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: FIR Cards */}
        <div>
          <FIRCards
            firs={metrics.assigned_firs}
            onFIRClick={(crimeNo) => navigate(`/firs/${crimeNo}`)}
          />
        </div>

        {/* Right: Station Info + Activity Feed */}
        <div className="flex flex-col gap-4">
          <StationInfoCard info={metrics.station_info} />
          <ActivityFeedCard feed={metrics.activity_feed} />
        </div>
      </div>
    </div>
  )
}
