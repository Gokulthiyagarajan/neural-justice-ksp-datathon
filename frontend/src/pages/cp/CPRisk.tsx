/**
 * CPRisk — Risk Assessment & District Intelligence
 *
 * Commissioner of Police command center page.
 * District-level risk scoring and factor analysis across all divisions.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Minus,
  Shield, Brain, Crosshair,
} from 'lucide-react'
import { isDemoMode, authHeaders } from '@/services/demoData'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DistrictScore {
  district: string
  score: number
  bucket: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'falling'
  top_factors: string[]
  fir_growth_pct: number
  patrol_coverage_pct: number
}

interface RiskFactor {
  factor: string
  weight: number
  high_risk_districts: number
}

interface RiskData {
  summary: {
    high_risk_districts: number
    medium_risk_districts: number
    low_risk_districts: number
    overall_state_risk_index: number
    rising_trend_districts: number
    falling_trend_districts: number
  }
  district_scores: DistrictScore[]
  factor_breakdown: RiskFactor[]
  recommendations: string[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BUCKET_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F97316',
  low: '#22C55E',
}

const TREND_COLORS: Record<string, string> = {
  rising: '#EF4444',
  stable: '#EAB308',
  falling: '#22C55E',
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function demoRiskData(): RiskData {
  const now = new Date()
  return {
    summary: {
      high_risk_districts: 3,
      medium_risk_districts: 5,
      low_risk_districts: 4,
      overall_state_risk_index: 52.4,
      rising_trend_districts: 4,
      falling_trend_districts: 3,
    },
    district_scores: [
      { district: 'Ballari', score: 78, bucket: 'high', trend: 'rising', top_factors: ['illegal_mining', 'political_violence', 'armed_robbery', 'land_disputes'], fir_growth_pct: 18.5, patrol_coverage_pct: 62 },
      { district: 'Kalaburagi', score: 72, bucket: 'high', trend: 'rising', top_factors: ['communal_tensions', 'illegal_mining', 'land_grabbing', 'border_smuggling'], fir_growth_pct: 15.2, patrol_coverage_pct: 58 },
      { district: 'Bengaluru Urban', score: 68, bucket: 'high', trend: 'rising', top_factors: ['cybercrime_surge', 'chain_snatching', 'vehicle_theft', 'traffic_violations'], fir_growth_pct: 12.8, patrol_coverage_pct: 75 },
      { district: 'Mangaluru (Dakshina Kannada)', score: 62, bucket: 'medium', trend: 'rising', top_factors: ['coastal_smuggling', 'drug_peddling', 'cybercrime'], fir_growth_pct: 8.4, patrol_coverage_pct: 68 },
      { district: 'Mysuru', score: 55, bucket: 'medium', trend: 'stable', top_factors: ['tourist_targeted_theft', 'drug_trafficking', 'chain_snatching'], fir_growth_pct: 3.2, patrol_coverage_pct: 72 },
      { district: 'Belagavi', score: 52, bucket: 'medium', trend: 'stable', top_factors: ['border_smuggling', 'communal_tensions', 'vehicle_theft'], fir_growth_pct: 1.5, patrol_coverage_pct: 65 },
      { district: 'Dharwad', score: 48, bucket: 'medium', trend: 'falling', top_factors: ['naxal_influence', 'vehicle_theft', 'forest_crime'], fir_growth_pct: -2.8, patrol_coverage_pct: 60 },
      { district: 'Shivamogga', score: 42, bucket: 'low', trend: 'falling', top_factors: ['forest_crime', 'wildlife_poaching', 'naxal_influence'], fir_growth_pct: -5.2, patrol_coverage_pct: 55 },
      { district: 'Tumakuru', score: 38, bucket: 'low', trend: 'falling', top_factors: ['gold_smuggling_route', 'cattle_theft', 'border_crime'], fir_growth_pct: -4.1, patrol_coverage_pct: 58 },
      { district: 'Hassan', score: 35, bucket: 'low', trend: 'stable', top_factors: ['coffee_estate_crime', 'road_accidents', 'property_crime'], fir_growth_pct: 0.8, patrol_coverage_pct: 63 },
      { district: 'Udupi', score: 32, bucket: 'low', trend: 'falling', top_factors: ['coastal_security', 'tourist_safety', 'petty_theft'], fir_growth_pct: -3.5, patrol_coverage_pct: 70 },
      { district: 'Bengaluru Rural', score: 45, bucket: 'medium', trend: 'stable', top_factors: ['inter_district_vehicle_theft', 'land_disputes', 'property_crime'], fir_growth_pct: 2.1, patrol_coverage_pct: 57 },
    ],
    factor_breakdown: [
      { factor: 'Organized Crime Presence', weight: 28, high_risk_districts: 6 },
      { factor: 'FIR Density per Capita', weight: 22, high_risk_districts: 5 },
      { factor: 'Patrol Coverage Gap', weight: 18, high_risk_districts: 7 },
      { factor: 'Socioeconomic Stress', weight: 17, high_risk_districts: 4 },
      { factor: 'Recidivism Rate', weight: 15, high_risk_districts: 5 },
    ],
    recommendations: [
      'Deploy additional 200 constables to Ballari and Kalaburagi to address rising crime rates and improve patrol coverage below 60%.',
      'Establish dedicated cybercrime units in Bengaluru Urban and Mangaluru — two districts accounting for 65% of state cyber fraud complaints.',
      'Launch joint inter-state patrols along Maharashtra and Kerala borders to curb smuggling and vehicle theft ring operations.',
    ],
    last_updated: now.toISOString(),
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPRisk() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<RiskData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictScore | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      if (isDemoMode()) {
        const demo = demoRiskData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      setRefreshing(true)
      const res = await fetch('/api/cp/risk', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        const demo = demoRiskData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPRisk] Failed to fetch risk data')
      const demo = demoRiskData()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted districts ──────────────────────────────────────────────────

  const sortedDistricts = useMemo(() => {
    if (!data?.district_scores) return []
    return [...data.district_scores].sort((a, b) =>
      sortBy === 'score' ? b.score - a.score : a.district.localeCompare(b.district)
    )
  }, [data, sortBy])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-orange-400">Risk Assessment & District Intelligence</h1>
            <p className="text-[10px] text-white/40">District risk scores · Factor analysis · Patrol coverage · Trends</p>
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
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'State Risk Index', value: summary.overall_state_risk_index.toFixed(1), icon: <Crosshair size={12} />, color: 'text-orange-400' },
            { label: 'High Risk', value: summary.high_risk_districts, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Medium Risk', value: summary.medium_risk_districts, icon: <AlertTriangle size={12} />, color: 'text-amber-400' },
            { label: 'Low Risk', value: summary.low_risk_districts, icon: <Shield size={12} />, color: 'text-green-400' },
            { label: 'Rising Trend', value: summary.rising_trend_districts, icon: <TrendingUp size={12} />, color: 'text-red-400' },
            { label: 'Falling Trend', value: summary.falling_trend_districts, icon: <TrendingDown size={12} />, color: 'text-green-400' },
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
        {/* ─── District List ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-orange-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading risk data…</p>
              </div>
            </div>
          )}

          {/* Sort controls */}
          <div className="flex items-center gap-2 mb-3 text-[10px] text-white/50">
            <span>Sort by:</span>
            <button onClick={() => setSortBy('score')} className={`px-2 py-0.5 rounded ${sortBy === 'score' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:text-white/60'}`}>Risk Score</button>
            <button onClick={() => setSortBy('name')} className={`px-2 py-0.5 rounded ${sortBy === 'name' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:text-white/60'}`}>District Name</button>
          </div>

          {/* District risk cards */}
          {sortedDistricts.map((ds, i) => {
            const isSelected = selectedDistrict?.district === ds.district
            return (
              <button
                key={ds.district}
                onClick={() => setSelectedDistrict(isSelected ? null : ds)}
                className={`w-full bg-white/[0.03] rounded-xl border p-3 mb-2 transition-colors text-left ${
                  isSelected ? 'border-orange-500/40' : 'border-white/10 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-6 text-center text-[10px] text-white/30">#{i + 1}</div>

                  {/* Risk gauge */}
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke={BUCKET_COLORS[ds.bucket]} strokeWidth="3"
                        strokeDasharray={`${(ds.score / 100) * 96.2} 96.2`} strokeLinecap="round" transform="rotate(-90, 18, 18)" />
                      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fontSize="9" fill={BUCKET_COLORS[ds.bucket]} fontWeight="bold">{ds.score}</text>
                    </svg>
                  </div>

                  {/* District info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white/80">{ds.district}</span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full`}
                        style={{ backgroundColor: `${BUCKET_COLORS[ds.bucket]}20`, color: BUCKET_COLORS[ds.bucket] }}>
                        {ds.bucket.toUpperCase()}
                      </span>
                      <span style={{ color: TREND_COLORS[ds.trend] }}>
                        {ds.trend === 'rising' ? <TrendingUp size={10} /> : ds.trend === 'falling' ? <TrendingDown size={10} /> : <Minus size={10} />}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-white/40">
                      <span>FIR growth: <span className={ds.fir_growth_pct > 0 ? 'text-red-300' : 'text-green-300'}>{ds.fir_growth_pct > 0 ? '+' : ''}{ds.fir_growth_pct}%</span></span>
                      <span>Patrol coverage: {ds.patrol_coverage_pct}%</span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-[9px] text-white/40 mb-1">Top risk factors:</div>
                        <div className="flex flex-wrap gap-1">
                          {ds.top_factors.map((f, j) => (
                            <span key={j} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/50">
                              {f.replace(/_/g, ' ')}
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

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Selected district details */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-white/80 mb-2">
              {selectedDistrict ? selectedDistrict.district : 'District Detail'}
            </h3>
            {selectedDistrict ? (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: BUCKET_COLORS[selectedDistrict.bucket] }}>
                    <span className="text-xl font-bold" style={{ color: BUCKET_COLORS[selectedDistrict.bucket] }}>{selectedDistrict.score}</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/80">{selectedDistrict.district}</div>
                    <div className="text-[10px] text-white/40">Risk Score / 100</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${BUCKET_COLORS[selectedDistrict.bucket]}20`, color: BUCKET_COLORS[selectedDistrict.bucket] }}>
                        {selectedDistrict.bucket.toUpperCase()}
                      </span>
                      <span style={{ color: TREND_COLORS[selectedDistrict.trend] }} className="text-[9px] capitalize">{selectedDistrict.trend}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-white/40">FIR Growth</span>
                    <span className={selectedDistrict.fir_growth_pct > 0 ? 'text-red-300' : 'text-green-300'}>
                      {selectedDistrict.fir_growth_pct > 0 ? '+' : ''}{selectedDistrict.fir_growth_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Patrol Coverage</span>
                    <span className="text-white/70">{selectedDistrict.patrol_coverage_pct}%</span>
                  </div>
                  <div>
                    <span className="text-white/40 block mb-1">Risk Factors</span>
                    {selectedDistrict.top_factors.map((f, j) => (
                      <span key={j} className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/50 mr-1 mb-1">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/30">Click a district to view its risk profile.</p>
            )}
          </div>

          {/* Factor Breakdown */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-orange-400 mb-3">Risk Factor Weights</h3>
            <div className="space-y-2">
              {data?.factor_breakdown.map((factor, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] text-white/60">{factor.factor}</span>
                      <span className="text-[9px] text-white/40">{factor.weight}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400/60 rounded-full" style={{ width: `${factor.weight}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-orange-400 mb-3">AI Recommendations</h3>
            <div className="space-y-2">
              {data?.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Brain size={12} className="mt-0.5 text-orange-400 flex-shrink-0" />
                  <p className="text-[10px] text-white/50 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Advisory */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Risk scores calculated from FIR density, patrol coverage, organized crime presence, and socioeconomic factors.
              Auto-refreshes every 60s. Scores range 0 (safe) to 100 (critical).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}