/**
 * CPDistricts — District Profiles & Intelligence
 *
 * Commissioner of Police command center page.
 * District demographics, crime rates, division breakdown.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Map, RefreshCw, Users, MapPin,
  Building2, Shield, AlertTriangle,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode, authHeaders, demoCPDistricts } from '@/services/demoData'

// ─── Types ────────────────────────────────────────────────────────────────

interface DistrictProfile {
  name: string
  population: number
  area_sqkm: number
  crime_rate_per_100k: number
  stations_count: number
  officers_per_100k: number
  literacy_rate: number
  urban_pct: number
  division: string
  headquarters: string
  border_districts: string[]
  key_issues: string[]
}

interface DivisionInfo {
  districts: number
  population: number
  crime_rate: number
}

export interface DistrictsData {
  summary: {
    total_districts: number
    total_population: number
    total_area_sqkm: number
    avg_crime_rate: number
  }
  districts: DistrictProfile[]
  crime_rate_distribution: Record<string, number>
  division_breakdown: Record<string, DivisionInfo>
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const CRIME_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
}

const DIVISION_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#06B6D4', '#A855F7', '#F59E0B']

// ─── Helpers ──────────────────────────────────────────────────────────────

function crimeBucket(rate: number): string {
  if (rate < 200) return 'low'
  if (rate < 400) return 'medium'
  if (rate < 600) return 'high'
  return 'critical'
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ─── Main Component ───────────────────────────────────────────────────────

export function CPDistricts() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<DistrictsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictProfile | null>(null)
  const [sortBy, setSortBy] = useState<'crime' | 'name' | 'population'>('crime')
  const [activeTab, setActiveTab] = useState<'districts' | 'divisions'>('districts')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        const demo = demoCPDistricts()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      const res = await fetch('/api/cp/districts', { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      }
    } catch {
      if (isDemoMode()) {
        const demo = demoCPDistricts()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
      console.error('[CPDistricts] Fetch failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Sorted districts ────────────────────────────────────────────────

  const sortedDistricts = useMemo(() => {
    if (!data?.districts) return []
    return [...data.districts].sort((a, b) => {
      if (sortBy === 'crime') return b.crime_rate_per_100k - a.crime_rate_per_100k
      if (sortBy === 'population') return b.population - a.population
      return a.name.localeCompare(b.name)
    })
  }, [data, sortBy])

  // ── Crime bar chart ─────────────────────────────────────────────────

  const maxCrimeRate = useMemo(() => {
    if (!data?.districts) return 1
    return Math.max(...data.districts.map(d => d.crime_rate_per_100k))
  }, [data])

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary
  const divisions = data?.division_breakdown ? Object.entries(data.division_breakdown) : []

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Map size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-violet-400">District Profiles</h1>
            <p className="text-[10px] text-white/40">31 districts · Demographics · Crime rates · Division breakdown</p>
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
            { label: 'Districts', value: summary.total_districts, icon: <Map size={12} />, color: 'text-violet-400' },
            { label: 'Population', value: formatPop(summary.total_population), icon: <Users size={12} />, color: 'text-blue-400' },
            { label: 'Area', value: `${(summary.total_area_sqkm / 1000).toFixed(0)}K km²`, icon: <MapPin size={12} />, color: 'text-green-400' },
            { label: 'Avg Crime Rate', value: summary.avg_crime_rate.toFixed(0), icon: <AlertTriangle size={12} />, color: 'text-amber-400' },
            { label: 'Divisions', value: divisions.length, icon: <Building2 size={12} />, color: 'text-cyan-400' },
            { label: 'Critical Rate', value: `${data?.crime_rate_distribution.critical || 0}`, icon: <Shield size={12} />, color: 'text-red-400' },
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
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-violet-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading district data…</p>
              </div>
            </div>
          )}

          {/* Tab toggle */}
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('districts')}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${activeTab === 'districts' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60'}`}>
              Districts
            </button>
            <button onClick={() => setActiveTab('divisions')}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${activeTab === 'divisions' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60'}`}>
              Divisions
            </button>
          </div>

          {activeTab === 'districts' && (
            <>
              {/* Sort controls */}
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span>Sort:</span>
                <button onClick={() => setSortBy('crime')} className={`px-2 py-0.5 rounded ${sortBy === 'crime' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60'}`}>Crime Rate</button>
                <button onClick={() => setSortBy('population')} className={`px-2 py-0.5 rounded ${sortBy === 'population' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60'}`}>Population</button>
                <button onClick={() => setSortBy('name')} className={`px-2 py-0.5 rounded ${sortBy === 'name' ? 'bg-violet-500/20 text-violet-400' : 'text-white/40 hover:text-white/60'}`}>Name</button>
              </div>

              {/* District cards */}
              {sortedDistricts.map((d, i) => {
                const isSelected = selectedDistrict?.name === d.name
                const bucket = crimeBucket(d.crime_rate_per_100k)
                const bucketColor = CRIME_COLORS[bucket]
                const barPct = maxCrimeRate > 0 ? (d.crime_rate_per_100k / maxCrimeRate) * 100 : 0

                return (
                  <button key={d.name}
                    onClick={() => setSelectedDistrict(isSelected ? null : d)}
                    className={`w-full bg-white/[0.03] rounded-xl border p-3 text-left transition-colors ${
                      isSelected ? 'border-violet-500/40' : 'border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-[10px] text-white/30">#{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-white/80">{d.name}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium capitalize"
                            style={{ backgroundColor: `${bucketColor}20`, color: bucketColor }}>
                            {bucket}
                          </span>
                          <span className="text-[9px] text-white/30">{d.division} div</span>
                        </div>
                        {/* Crime rate bar */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: bucketColor }} />
                          </div>
                          <span className="text-[10px] text-white/60 font-medium w-12 text-right">{d.crime_rate_per_100k}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-white/40">
                          <span>Pop: <span className="text-white/70">{formatPop(d.population)}</span></span>
                          <span>Stations: <span className="text-blue-300">{d.stations_count}</span></span>
                          <span>Officers/100k: <span className="text-white/60">{d.officers_per_100k}</span></span>
                          <span>Urban: <span className="text-white/60">{d.urban_pct}%</span></span>
                          <span>Literacy: <span className="text-green-300">{d.literacy_rate}%</span></span>
                        </div>
                        {isSelected && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                            <div>
                              <span className="text-[9px] text-white/40">HQ: </span>
                              <span className="text-[9px] text-white/60">{d.headquarters}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40">Border: </span>
                              <span className="text-[9px] text-white/60">{d.border_districts.join(', ')}</span>
                            </div>
                            {d.key_issues.length > 0 && (
                              <div>
                                <span className="text-[9px] text-white/40 block mb-0.5">Key Issues:</span>
                                <div className="flex flex-wrap gap-1">
                                  {d.key_issues.map((issue, j) => (
                                    <span key={j} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-300 rounded text-[9px]">{issue}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {activeTab === 'divisions' && (
            <div className="grid grid-cols-2 gap-3">
              {divisions.map(([name, info], i) => {
                const barPct = maxCrimeRate > 0 ? (info.crime_rate / maxCrimeRate) * 100 : 0
                const color = DIVISION_COLORS[i % DIVISION_COLORS.length]
                return (
                  <div key={name} className="bg-white/[0.03] rounded-xl border border-white/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-white/80">{name}</span>
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between"><span className="text-white/40">Districts</span><span className="text-white/70">{info.districts}</span></div>
                      <div className="flex justify-between"><span className="text-white/40">Population</span><span className="text-white/70">{formatPop(info.population)}</span></div>
                      <div className="flex justify-between"><span className="text-white/40">Crime Rate</span><span className="text-white/70">{info.crime_rate}</span></div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color }} />
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
          {/* Selected district detail */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-white/80 mb-2">{selectedDistrict ? selectedDistrict.name : 'District Detail'}</h3>
            {selectedDistrict ? (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Map size={14} className="text-violet-400" />
                  <span className="text-xs font-semibold text-white/80">{selectedDistrict.name}</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-white/40">Population</span><span className="text-white/70">{selectedDistrict.population.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Area</span><span className="text-white/70">{selectedDistrict.area_sqkm.toLocaleString()} km²</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Crime Rate</span><span className="text-white/70">{selectedDistrict.crime_rate_per_100k}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Stations</span><span className="text-blue-300">{selectedDistrict.stations_count}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Officers/100k</span><span className="text-white/70">{selectedDistrict.officers_per_100k}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Literacy</span><span className="text-green-300">{selectedDistrict.literacy_rate}%</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Urban</span><span className="text-white/70">{selectedDistrict.urban_pct}%</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Division</span><span className="text-violet-300">{selectedDistrict.division}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">HQ</span><span className="text-white/70">{selectedDistrict.headquarters}</span></div>
                  <div className="pt-1 border-t border-white/10">
                    <span className="text-white/40 block mb-0.5">Border Districts</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedDistrict.border_districts.map((bd, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-white/50">{bd}</span>
                      ))}
                    </div>
                  </div>
                  {selectedDistrict.key_issues.length > 0 && (
                    <div className="pt-1 border-t border-white/10">
                      <span className="text-white/40 block mb-0.5">Key Issues</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedDistrict.key_issues.map((issue, j) => (
                          <span key={j} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-300 rounded text-[9px]">{issue}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/30">Click a district to view its profile.</p>
            )}
          </div>

          {/* Crime Rate Distribution */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Crime Rate Distribution</h3>
            {data?.crime_rate_distribution && (
              <div className="space-y-1.5">
                {Object.entries(data.crime_rate_distribution).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CRIME_COLORS[k] || '#666' }} />
                    <span className="text-white/60 capitalize w-16">{k}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${summary ? (v / summary.total_districts) * 100 : 0}%`, backgroundColor: CRIME_COLORS[k] || '#666' }} />
                    </div>
                    <span className="text-white/40 w-4 text-right">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Division Summary */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-violet-400 mb-3">Division Summary</h3>
            <div className="space-y-2">
              {divisions.map(([name, info], i) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DIVISION_COLORS[i % DIVISION_COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/60">{name}</span>
                      <span className="text-white/40">{info.districts} dist</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-white/40">
                      <span>Pop: {formatPop(info.population)}</span>
                      <span>Crime: {info.crime_rate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ District profiles include demographics, crime rates per 100k, and key issues.
              Auto-refreshes every 60s. Data from census + police records.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}