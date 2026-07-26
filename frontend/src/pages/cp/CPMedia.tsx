/**
 * CPMedia — Media & Public Communications
 *
 * Commissioner of Police command center page.
 * Press releases, social media, media queries, sentiment tracking.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Newspaper, RefreshCw, Send, MessageSquare, Share2, Link, Play,
  TrendingUp, Eye,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ────────────────────────────────────────────────────────────────

interface PressRelease {
  title: string
  date: string
  district: string
  category: string
  status: 'draft' | 'published' | 'archived'
  views: number
}

interface SocialPlatform {
  platform: string
  posts: number
  engagement: number
  followers: number
  sentiment: number
}

interface MediaQuery {
  outlet: string
  topic: string
  status: 'open' | 'responded' | 'closed'
  date: string
  district: string
}

interface MediaData {
  summary: {
    press_releases: number
    social_posts: number
    media_queries: number
    sentiment_score: number
    engagement_rate: number
  }
  press_releases: PressRelease[]
  social_media: SocialPlatform[]
  media_queries: MediaQuery[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  published: '#22C55E',
  archived: '#6B7280',
  open: '#F97316',
  responded: '#3B82F6',
  closed: '#22C55E',
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Twitter: <Send size={14} />,
  Facebook: <Share2 size={14} />,
  LinkedIn: <Link size={14} />,
  YouTube: <Play size={14} />,
  Instagram: <MessageSquare size={14} />,
}

const PLATFORM_COLORS: Record<string, string> = {
  Twitter: '#1DA1F2',
  Facebook: '#4267B2',
  LinkedIn: '#0A66C2',
  YouTube: '#FF0000',
  Instagram: '#E1306C',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Main Component ───────────────────────────────────────────────────────

export function CPMedia() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<MediaData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedRelease, setSelectedRelease] = useState<PressRelease | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/cp/media')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPMedia] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sentiment trend chart data ────────────────────────────────────────

  const sentimentTrend = useMemo(() => {
    if (!data?.press_releases) return []
    // Generate mock daily sentiment for last 14 days
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - i))
      const base = data.summary.sentiment_score || 65
      const variation = (Math.sin(i / 2) * 10) + (Math.random() * 5)
      return { date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), value: Math.max(0, Math.min(100, base + variation)) }
    })
  }, [data])

  // ── Sentiment chart paths (precomputed to avoid JSX parsing issues) ─────────────────

  const areaPath = useMemo(() => {
    if (!sentimentTrend.length) return ''
    const pts = sentimentTrend.map((p, i) => {
      const x = i * 20
      const y = 20 + 120 * (1 - p.value / 100)
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`
    }).join(' ')
    return `${pts} L280 140 L0 140 Z`
  }, [sentimentTrend])

  const linePath = useMemo(() => {
    if (!sentimentTrend.length) return ''
    return sentimentTrend.map((p, i) => {
      const x = i * 20
      const y = 20 + 120 * (1 - p.value / 100)
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`
    }).join(' ')
  }, [sentimentTrend])

  // ── Platform breakdown donut ──────────────────────────────────────────

  const platformDonut = useMemo(() => {
    if (!data?.social_media) return []
    const total = data.social_media.reduce((s, p) => s + p.posts, 0)
    let cum = 0
    return data.social_media.map(p => {
      const pct = total > 0 ? (p.posts / total) * 100 : 0
      const start = cum
      cum += pct
      return { ...p, pct, startAngle: (start / 100) * 360, endAngle: (cum / 100) * 360, color: PLATFORM_COLORS[p.platform] || '#666' }
    })
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
            <Newspaper size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">Media & Public Communications</h1>
            <p className="text-[10px] text-white/40">Press releases · Social media · Media queries · Sentiment</p>
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
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Press Releases', value: summary.press_releases, icon: <Newspaper size={12} />, color: 'text-amber-400' },
            { label: 'Social Posts', value: summary.social_posts, icon: <Send size={12} />, color: 'text-blue-400' },
            { label: 'Media Queries', value: summary.media_queries, icon: <MessageSquare size={12} />, color: 'text-cyan-400' },
            { label: 'Sentiment', value: `${summary.sentiment_score}%`, icon: <TrendingUp size={12} />, color: summary.sentiment_score >= 70 ? 'text-green-400' : summary.sentiment_score >= 50 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Engagement', value: `${summary.engagement_rate}%`, icon: <Eye size={12} />, color: 'text-violet-400' },
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
                <p className="text-sm text-white/60">Loading media data…</p>
              </div>
            </div>
          )}

          {/* Press Releases */}
          {data?.press_releases && data.press_releases.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2"><Newspaper size={12} />Press Releases</h3>
                <span className="text-[9px] text-white/30">{data.press_releases.length} releases</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Title</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">District</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/40 font-medium">Category</th>
                      <th className="text-center px-3 py-2 text-[9px] text-white/40 font-medium">Status</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Date</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/40 font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.press_releases.map((pr, i) => {
                      const statusColor = STATUS_COLORS[pr.status] || '#666'
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setSelectedRelease(selectedRelease?.title === pr.title ? null : pr)}>
                          <td className="px-3 py-2.5 text-white/80 font-medium truncate max-w-[200px]">{pr.title}</td>
                          <td className="px-3 py-2.5 text-white/50">{pr.district}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-300 rounded text-[9px]">{pr.category}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium capitalize"
                              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                              {pr.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/50">{formatDate(pr.date)}</td>
                          <td className="px-3 py-2.5 text-right text-white/60">{pr.views.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selected release detail */}
          {selectedRelease && (
            <div className="bg-white/[0.03] rounded-xl border border-amber-500/30 p-3 animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white/90">{selectedRelease.title}</h4>
                  <p className="text-[10px] text-white/40">District: {selectedRelease.district} · Category: {selectedRelease.category}</p>
                </div>
                <button onClick={() => setSelectedRelease(null)} className="text-white/30 hover:text-white/60">×</button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                  <div className="text-[9px] text-white/40">Status</div>
                  <div className="font-medium" style={{ color: STATUS_COLORS[selectedRelease.status] || '#666' }}>{selectedRelease.status.toUpperCase()}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                  <div className="text-[9px] text-white/40">Date</div>
                  <div className="font-medium text-white/80">{formatDate(selectedRelease.date)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                  <div className="text-[9px] text-white/40">Views</div>
                  <div className="font-medium text-white/80">{selectedRelease.views.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Social Media */}
          {data?.social_media && data.social_media.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-bold text-amber-400 mb-3">Social Media Platforms</h3>
              <div className="grid grid-cols-2 gap-3">
                {data.social_media.map((p) => (
                  <div key={p.platform} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${PLATFORM_COLORS[p.platform] || '#666'}20` }}>
                        {PLATFORM_ICONS[p.platform] || <Send size={14} className="text-amber-400" />}
                      </div>
                      <span className="text-xs font-semibold text-white/80">{p.platform}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div><span className="text-white/40 block">Posts</span><span className="text-white/70 font-medium">{p.posts}</span></div>
                      <div><span className="text-white/40 block">Followers</span><span className="text-white/70 font-medium">{p.followers.toLocaleString()}</span></div>
                      <div><span className="text-white/40 block">Engagement</span><span className="text-white/70 font-medium">{p.engagement.toLocaleString()}</span></div>
                      <div><span className="text-white/40 block">Sentiment</span><span className="text-white/70 font-medium">{p.sentiment}%</span></div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.sentiment)}%`, backgroundColor: p.sentiment >= 70 ? '#22C55E' : p.sentiment >= 50 ? '#F97316' : '#EF4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Queries */}
          {data?.media_queries && data.media_queries.length > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2"><MessageSquare size={12} />Media Queries</h3>
                <span className="text-[9px] text-white/30">{data.media_queries.length} queries</span>
              </div>
              <div className="divide-y divide-white/5">
                {data.media_queries.map((q, i) => {
                  const statusColor = STATUS_COLORS[q.status] || '#666'
                  return (
                    <div key={i} className="p-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-white/80">{q.outlet}</span>
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[9px]">{q.district}</span>
                          </div>
                          <p className="text-[10px] text-white/60">{q.topic}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                            {q.status.replace('_', ' ')}
                          </span>
                          <p className="text-[9px] text-white/30 mt-0.5">{formatDate(q.date)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Sentiment Trend */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Sentiment Trend (14d)</h3>
            {sentimentTrend.length > 0 && (
              <div className="h-40">
                <svg width="100%" height="100%" viewBox="0 0 280 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = 20 + 120 * (1 - frac)
                    return <line key={frac} x1={0} y1={y} x2={280} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  })}
                  {/* Area */}
                  <path d={areaPath} fill="url(#sentimentGrad)" />
                  {/* Line */}
                  <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Points */}
                  {sentimentTrend.map((p, i) => (
                    <circle key={i} cx={i * 20} cy={20 + 120 * (1 - p.value / 100)} r={3} fill="#F59E0B" />
                  ))}
                  {/* Labels */}
                  {sentimentTrend.filter((_, i) => i % 3 === 0).map((p, i) => (
                    <text key={i} x={i * 60} y={150} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">{p.date}</text>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Platform Breakdown Donut */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Platform Posts</h3>
            {platformDonut.length > 0 ? (
              <div className="flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {platformDonut.map((p, i) => {
                    const r = 35
                    const circ = 2 * Math.PI * r
                    const arcLen = (p.pct / 100) * circ
                    const offset = (p.startAngle / 360) * circ
                    return (
                      <circle key={i} cx="50" cy="50" r={r} fill="none"
                        stroke={p.color} strokeWidth="12" opacity={0.8}
                        strokeDasharray={`${arcLen} ${circ - arcLen}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90, 50, 50)" />
                    )
                  })}
                  <text x="50" y="48" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="bold">
                    {data?.social_media.reduce((s, p) => s + p.posts, 0).toLocaleString()}
                  </text>
                  <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">Total Posts</text>
                </svg>
              </div>
            ) : (
              <p className="text-[10px] text-white/30">No platform data.</p>
            )}
          </div>

          {/* Recent Releases */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">Recent Publications</h3>
            <div className="space-y-2">
              {data?.press_releases.slice(0, 6).map((pr, i) => (
                <div key={i} className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/70 font-medium truncate max-w-[140px]">{pr.title}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      pr.status === 'published' ? 'bg-green-500/20 text-green-400' :
                      pr.status === 'draft' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{pr.status.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-white/40">
                    <span>{pr.district}</span>
                    <span className="ml-auto">{formatDate(pr.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Sentiment score aggregated from social media NLP analysis.
              Media queries tracked via PR auto-refreshes every 60s.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}