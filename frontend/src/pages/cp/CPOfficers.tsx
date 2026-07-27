/**
 * CPOfficers — Officer Command & Personnel Management
 *
 * Commissioner of Police command center page.
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, RefreshCw, AlertTriangle,
  Shield, BadgeCheck, UserPlus, Target,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ────────────────────────────────────────────────────────────────

interface RankCount {
  rank: string
  count: number
}

interface DistrictOfficers {
  district: string
  sanctioned: number
  deployed: number
  vacancies: number
  vacancy_rate_pct: number
  by_rank: RankCount[]
}

interface RecruitmentStage {
  stage: string
  count: number
  eta: string
}

interface VacancyAlert {
  district: string
  rank: string
  vacancies: number
  priority: 'critical' | 'high' | 'medium'
}

interface OfficersData {
  summary: {
    total_sanctioned: number
    total_deployed: number
    vacancy_rate_pct: number
    by_rank: Record<string, number>
  }
  by_district: DistrictOfficers[]
  recruitment_pipeline: RecruitmentStage[]
  vacancy_alerts: VacancyAlert[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
}

const RANK_ORDER = [
  'DGP', 'ADGP', 'IGP', 'DIG', 'SP', 'Addl_SP', 'DySP', 'PI', 'PSI', 'ASI', 'HC', 'PC'
]

// ─── Main Component ───────────────────────────────────────────────────────

export function CPOfficers() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<OfficersData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [sortBy, setSortBy] = useState<'district' | 'vacancies' | 'rate'>('vacancies')
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOfficers | null>(null)

  // ── Fetch data ──────────────────────────────────────────────────────

  const demoOfficersData: OfficersData = {
    summary: {
      total_sanctioned: 48500,
      total_deployed: 41200,
      vacancy_rate_pct: 15.1,
      by_rank: { DGP: 1, ADGP: 8, IGP: 15, DIG: 32, SP: 120, Addl_SP: 240, DySP: 380, PI: 1200, PSI: 4200, ASI: 5800, HC: 12500, PC: 16200 },
    },
    by_district: [
      { district: 'Bengaluru Urban', sanctioned: 8500, deployed: 7200, vacancies: 1300, vacancy_rate_pct: 15.3, by_rank: [{ rank: 'DGP', count: 0 }, { rank: 'ADGP', count: 2 }, { rank: 'IGP', count: 3 }, { rank: 'DIG', count: 5 }, { rank: 'SP', count: 18 }, { rank: 'Addl_SP', count: 35 }, { rank: 'DySP', count: 55 }, { rank: 'PI', count: 180 }, { rank: 'PSI', count: 650 }, { rank: 'ASI', count: 920 }, { rank: 'HC', count: 2200 }, { rank: 'PC', count: 3200 }] },
      { district: 'Bengaluru Rural', sanctioned: 3200, deployed: 2800, vacancies: 400, vacancy_rate_pct: 12.5, by_rank: [{ rank: 'SP', count: 8 }, { rank: 'Addl_SP', count: 15 }, { rank: 'DySP', count: 25 }, { rank: 'PI', count: 80 }, { rank: 'PSI', count: 280 }, { rank: 'ASI', count: 380 }, { rank: 'HC', count: 850 }, { rank: 'PC', count: 1150 }] },
      { district: 'Mysuru', sanctioned: 2800, deployed: 2500, vacancies: 300, vacancy_rate_pct: 10.7, by_rank: [{ rank: 'SP', count: 6 }, { rank: 'Addl_SP', count: 12 }, { rank: 'DySP', count: 20 }, { rank: 'PI', count: 65 }, { rank: 'PSI', count: 220 }, { rank: 'ASI', count: 310 }, { rank: 'HC', count: 720 }, { rank: 'PC', count: 950 }] },
      { district: 'Belagavi', sanctioned: 2600, deployed: 2150, vacancies: 450, vacancy_rate_pct: 17.3, by_rank: [{ rank: 'SP', count: 5 }, { rank: 'Addl_SP', count: 10 }, { rank: 'DySP', count: 18 }, { rank: 'PI', count: 55 }, { rank: 'PSI', count: 200 }, { rank: 'ASI', count: 280 }, { rank: 'HC', count: 650 }, { rank: 'PC', count: 850 }] },
      { district: 'Dakshina Kannada', sanctioned: 2400, deployed: 2100, vacancies: 300, vacancy_rate_pct: 12.5, by_rank: [{ rank: 'SP', count: 5 }, { rank: 'Addl_SP', count: 10 }, { rank: 'DySP', count: 16 }, { rank: 'PI', count: 50 }, { rank: 'PSI', count: 180 }, { rank: 'ASI', count: 250 }, { rank: 'HC', count: 600 }, { rank: 'PC', count: 800 }] },
      { district: 'Uttara Kannada', sanctioned: 1800, deployed: 1400, vacancies: 400, vacancy_rate_pct: 22.2, by_rank: [{ rank: 'SP', count: 4 }, { rank: 'Addl_SP', count: 8 }, { rank: 'DySP', count: 12 }, { rank: 'PI', count: 35 }, { rank: 'PSI', count: 120 }, { rank: 'ASI', count: 180 }, { rank: 'HC', count: 450 }, { rank: 'PC', count: 580 }] },
      { district: 'Shivamogga', sanctioned: 2000, deployed: 1700, vacancies: 300, vacancy_rate_pct: 15.0, by_rank: [{ rank: 'SP', count: 4 }, { rank: 'Addl_SP', count: 8 }, { rank: 'DySP', count: 14 }, { rank: 'PI', count: 42 }, { rank: 'PSI', count: 150 }, { rank: 'ASI', count: 210 }, { rank: 'HC', count: 520 }, { rank: 'PC', count: 700 }] },
      { district: 'Tumakuru', sanctioned: 1900, deployed: 1600, vacancies: 300, vacancy_rate_pct: 15.8, by_rank: [{ rank: 'SP', count: 4 }, { rank: 'Addl_SP', count: 8 }, { rank: 'DySP', count: 12 }, { rank: 'PI', count: 38 }, { rank: 'PSI', count: 140 }, { rank: 'ASI', count: 190 }, { rank: 'HC', count: 480 }, { rank: 'PC', count: 650 }] },
    ],
    recruitment_pipeline: [
      { stage: 'Written Exam (PSI)', count: 12500, eta: '2026-08' },
      { stage: 'Physical Endurance Test', count: 8400, eta: '2026-09' },
      { stage: 'Interview Round', count: 3200, eta: '2026-10' },
      { stage: 'Medical Verification', count: 1800, eta: '2026-11' },
      { stage: 'Training Academy (PC)', count: 2500, eta: '2026-12' },
    ],
    vacancy_alerts: [
      { district: 'Uttara Kannada', rank: 'HC', vacancies: 120, priority: 'critical' },
      { district: 'Belagavi', rank: 'PC', vacancies: 180, priority: 'critical' },
      { district: 'Bengaluru Urban', rank: 'PSI', vacancies: 85, priority: 'high' },
      { district: 'Tumakuru', rank: 'ASI', vacancies: 45, priority: 'high' },
      { district: 'Shivamogga', rank: 'HC', vacancies: 60, priority: 'medium' },
    ],
    last_updated: new Date().toISOString(),
  }

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        setData(demoOfficersData)
        setLastUpdated(new Date(demoOfficersData.last_updated).toLocaleTimeString())
        setLoading(false)
        setRefreshing(false)
        return
      }
      const res = await fetch('/api/cp/officers', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        setData(demoOfficersData)
        setLastUpdated(new Date(demoOfficersData.last_updated).toLocaleTimeString())
      }
    } catch {
      setData(demoOfficersData)
      setLastUpdated(new Date(demoOfficersData.last_updated).toLocaleTimeString())
      console.error('[CPOfficers] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted districts ────────────────────────────────────────────────

  const sortedDistricts = useMemo(() => {
    if (!data?.by_district) return []
    return [...data.by_district].sort((a, b) => {
      if (sortBy === 'district') return a.district.localeCompare(b.district)
      if (sortBy === 'vacancies') return b.vacancies - a.vacancies
      return b.vacancy_rate_pct - a.vacancy_rate_pct
    })
  }, [data, sortBy])

  // ── Render ──────────────────────────────────────────────────────────

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
            <Users size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">Officer Command</h1>
            <p className="text-[10px] text-white/40">Personnel · Vacancies · Recruitment · Deployment</p>
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
            { label: 'Sanctioned', value: summary.total_sanctioned.toLocaleString(), icon: <BadgeCheck size={12} />, color: 'text-amber-400' },
            { label: 'Deployed', value: summary.total_deployed.toLocaleString(), icon: <Users size={12} />, color: 'text-emerald-400' },
            { label: 'Vacancy Rate', value: `${summary.vacancy_rate_pct}%`, icon: <AlertTriangle size={12} />, color: summary.vacancy_rate_pct > 15 ? 'text-red-400' : 'text-amber-400' },
            { label: 'In Pipeline', value: data?.recruitment_pipeline.reduce((s, r) => s + r.count, 0) || 0, icon: <UserPlus size={12} />, color: 'text-blue-400' },
            { label: 'Critical Alerts', value: data?.vacancy_alerts.filter(a => a.priority === 'critical').length || 0, icon: <Target size={12} />, color: 'text-red-400' },
            { label: 'Ranks Tracked', value: Object.keys(summary.by_rank).length, icon: <Shield size={12} />, color: 'text-violet-400' },
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
        {/* District Table */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading personnel data…</p>
              </div>
            </div>
          )}

          {/* Sort controls */}
          <div className="flex items-center gap-2 mb-3 text-[10px] text-white/50">
            <span>Sort by:</span>
            <button onClick={() => setSortBy('district')} className={`px-2 py-0.5 rounded ${sortBy === 'district' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>District</button>
            <button onClick={() => setSortBy('vacancies')} className={`px-2 py-0.5 rounded ${sortBy === 'vacancies' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>Vacancies</button>
            <button onClick={() => setSortBy('rate')} className={`px-2 py-0.5 rounded ${sortBy === 'rate' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}>Vacancy %</button>
          </div>

          {/* District cards */}
          {sortedDistricts.map((d, i) => {
            const isSelected = selectedDistrict?.district === d.district
            const vacancyColor = d.vacancy_rate_pct > 20 ? '#EF4444' : d.vacancy_rate_pct > 10 ? '#F97316' : '#22C55E'
            return (
              <button
                key={d.district}
                onClick={() => setSelectedDistrict(isSelected ? null : d)}
                className={`w-full bg-white/[0.03] rounded-xl border p-3 mb-2 transition-colors text-left ${
                  isSelected ? 'border-amber-500/40' : 'border-white/10 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center text-[10px] text-white/30">#{i + 1}</div>
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke={vacancyColor} strokeWidth="3"
                        strokeDasharray={`${(d.vacancy_rate_pct / 30) * 96.2} 96.2`} strokeLinecap="round" transform="rotate(-90, 18, 18)" />
                      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fontSize="8" fill={vacancyColor} fontWeight="bold">{d.vacancy_rate_pct}%</text>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white/80">{d.district}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                        style={{ backgroundColor: `${vacancyColor}20`, color: vacancyColor }}>
                        {d.vacancies} vacancies
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-white/40">
                      <span>Sanctioned: <span className="text-white/70">{d.sanctioned}</span></span>
                      <span>Deployed: <span className="text-emerald-300">{d.deployed}</span></span>
                      <span>Rate: <span style={{ color: vacancyColor }}>{d.vacancy_rate_pct}%</span></span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-[9px] text-white/40 mb-1">By Rank</div>
                        <div className="flex flex-wrap gap-1">
                          {RANK_ORDER.map(r => d.by_rank.find(b => b.rank === r)).filter(Boolean).map((b, j) => (
                            <span key={j} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/50">
                              {b?.rank}: {b?.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Selected District Detail */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-white/80 mb-2">
              {selectedDistrict ? selectedDistrict.district : 'District Detail'}
            </h3>
            {selectedDistrict ? (
              (() => {
                const vc = selectedDistrict.vacancy_rate_pct > 20 ? '#EF4444' : selectedDistrict.vacancy_rate_pct > 10 ? '#F97316' : '#22C55E';
                return (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: vc }}>
                    <span className="text-xl font-bold" style={{ color: vc }}>{selectedDistrict.vacancy_rate_pct}%</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/80">{selectedDistrict.district}</div>
                    <div className="text-[10px] text-white/40">Vacancy Rate</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-white/40">Sanctioned</span><span className="text-white/70">{selectedDistrict.sanctioned}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Deployed</span><span className="text-emerald-300">{selectedDistrict.deployed}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Vacancies</span><span style={{ color: vc }}>{selectedDistrict.vacancies}</span></div>
                  <div className="pt-1 border-t border-white/10">
                    <span className="text-white/40 block mb-1">Rank Breakdown</span>
                    <div className="flex flex-wrap gap-1">
                      {RANK_ORDER.map(r => selectedDistrict.by_rank.find(b => b.rank === r)).filter(Boolean).map((b, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/50">
                          {b?.rank}: {b?.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
                );
              })()
            ) : (
              <p className="text-[10px] text-white/30">Click a district to view its personnel profile.</p>
            )}
          </div>

          {/* Rank Distribution Chart */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-3">State Rank Distribution</h3>
            {summary && (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                {RANK_ORDER.map(r => {
                  const count = summary.by_rank[r] || 0
                  const max = Math.max(...Object.values(summary.by_rank))
                  const pct = max > 0 ? (count / max) * 100 : 0
                  return count > 0 ? (
                    <div key={r} className="mb-1.5">
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span className="text-white/60">{r}</span>
                        <span className="text-white/70 font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* Vacancy Alerts */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-3">Vacancy Alerts</h3>
            <div className="space-y-2">
              {data?.vacancy_alerts.slice(0, 8).map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: PRIORITY_COLORS[alert.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/70">
                      <span className="font-medium">{alert.district}</span> — {alert.rank}
                    </p>
                    <p className="text-[9px] text-white/40">{alert.vacancies} vacancies · {alert.priority} priority</p>
                  </div>
                </div>
              ))}
              {!data?.vacancy_alerts.length && <p className="text-[10px] text-white/30">No critical vacancy alerts.</p>}
            </div>
          </div>

          {/* Recruitment Pipeline */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Recruitment Pipeline</h3>
            <div className="space-y-2">
              {data?.recruitment_pipeline.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-blue-500/20 text-blue-400">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/70">{stage.stage}</p>
                    <p className="text-[9px] text-white/40">{stage.count} candidates · ETA: {stage.eta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Vacancy rate &gt;15% flagged as critical. Auto-refreshes every 60s.
              Data sourced from HRMS + state police recruitment portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}