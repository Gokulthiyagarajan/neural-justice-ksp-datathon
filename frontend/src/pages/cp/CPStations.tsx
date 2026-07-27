/**
 * CPStations — Police Station Infrastructure Overview
 *
 * Commissioner of Police command center page.
 * Station capacity, condition, facilities, and infrastructure health.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2, RefreshCw, AlertTriangle, Shield, MapPin,
  Wrench, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode, authHeaders, demoCPStations } from '@/services/demoData'

// ─── Types ────────────────────────────────────────────────────────────────

interface StationInfo {
  name: string
  type: string
  capacity: number
  current_strength: number
  condition_score: number
  facilities: string[]
  last_inspection: string
}

interface DistrictStations {
  district: string
  stations: StationInfo[]
}

interface FacilityGap {
  station: string
  missing_facilities: string[]
  priority: string
}

interface InfrastructureAlert {
  station: string
  issue: string
  severity: string
  since: string
}

export interface StationsData {
  summary: {
    total: number
    urban: number
    rural: number
    metro: number
    avg_condition: number
    critical_count: number
  }
  by_district: DistrictStations[]
  condition_distribution: Record<string, number>
  facility_gaps: FacilityGap[]
  infrastructure_alerts: InfrastructureAlert[]
  last_updated: string
}

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  urban: '#3B82F6',
  rural: '#22C55E',
  metro: '#8B5CF6',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22C55E',
  good: '#3B82F6',
  fair: '#F97316',
  poor: '#EF4444',
  critical: '#DC2626',
}

const ALL_FACILITIES = ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Visitor_Room', 'Parking', 'Drone_Bay']

// ─── Main Component ───────────────────────────────────────────────────────

export function CPStations() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<StationsData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStations | null>(null)
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        const demo = demoCPStations()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      const res = await fetch('/api/cp/stations', { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        // API failed — fall back to demo data
        const demo = demoCPStations()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      // Network error — fall back to demo data
      const demo = demoCPStations()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  // ── Derived data ────────────────────────────────────────────────────

  const filteredDistricts = useMemo(() => {
    if (!data?.by_district) return []
    if (filterType === 'all') return data.by_district
    return data.by_district.map(d => ({
      ...d,
      stations: d.stations.filter(s => s.type === filterType),
    })).filter(d => d.stations.length > 0)
  }, [data, filterType])

  const conditionDonut = useMemo(() => {
    if (!data?.condition_distribution) return null
    const entries = Object.entries(data.condition_distribution)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    let acc = 0
    return entries.map(([k, v]) => {
      const pct = total > 0 ? (v / total) * 100 : 0
      const dashArray = `${(pct / 100) * 283} 283`
      const dashOffset = `${-(acc / 100) * 283}`
      acc += pct
      return { label: k, count: v, pct, dashArray, dashOffset, color: CONDITION_COLORS[k] || '#666' }
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
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-blue-400">Police Station Infrastructure</h1>
            <p className="text-[10px] text-white/40">Station capacity · Condition · Facilities · Infrastructure alerts</p>
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
        <div className="grid grid-cols-7 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Total Stations', value: summary.total, icon: <Building2 size={12} />, color: 'text-blue-400' },
            { label: 'Urban', value: summary.urban, icon: <MapPin size={12} />, color: 'text-blue-300' },
            { label: 'Rural', value: summary.rural, icon: <MapPin size={12} />, color: 'text-green-400' },
            { label: 'Metro', value: summary.metro, icon: <MapPin size={12} />, color: 'text-violet-400' },
            { label: 'Avg Condition', value: summary.avg_condition.toFixed(1), icon: <Shield size={12} />, color: summary.avg_condition >= 7 ? 'text-green-400' : 'text-amber-400' },
            { label: 'Critical', value: summary.critical_count, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Facility Gaps', value: data?.facility_gaps.length || 0, icon: <Wrench size={12} />, color: 'text-orange-400' },
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
                <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading station data…</p>
              </div>
            </div>
          )}

          {/* Infrastructure Alerts */}
          {data?.infrastructure_alerts && data.infrastructure_alerts.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <h3 className="text-xs font-bold text-red-400 mb-2">Infrastructure Alerts</h3>
              <div className="grid grid-cols-2 gap-2">
                {data.infrastructure_alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white/[0.02] rounded-lg px-2 py-1.5">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0"
                      style={{ color: SEVERITY_COLORS[alert.severity] || '#666' }} />
                    <div>
                      <p className="text-[10px] text-white/70 font-medium">{alert.station}</p>
                      <p className="text-[9px] text-white/40">{alert.issue}</p>
                      <p className="text-[8px] text-white/30">Since: {alert.since}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">Filter:</span>
            {['all', 'urban', 'rural', 'metro'].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                  filterType === t ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* District station lists */}
          {filteredDistricts.map(ds => (
            <div key={ds.district} className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setSelectedDistrict(selectedDistrict?.district === ds.district ? null : ds)}
                className="w-full px-3 py-2 border-b border-white/10 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400">{ds.district}</span>
                  <span className="text-[9px] text-white/30">{ds.stations.length} stations</span>
                </div>
                <span className="text-[9px] text-white/30">
                  Avg condition: {(ds.stations.reduce((s, st) => s + st.condition_score, 0) / ds.stations.length).toFixed(1)}
                </span>
              </button>
              {selectedDistrict?.district === ds.district && (
                <div className="p-2">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-2 py-1.5 text-[9px] text-white/40">Station</th>
                        <th className="text-center px-2 py-1.5 text-[9px] text-white/40">Type</th>
                        <th className="text-right px-2 py-1.5 text-[9px] text-white/40">Strength</th>
                        <th className="text-right px-2 py-1.5 text-[9px] text-white/40">Condition</th>
                        <th className="text-center px-2 py-1.5 text-[9px] text-white/40">Facilities</th>
                        <th className="text-right px-2 py-1.5 text-[9px] text-white/40">Inspected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ds.stations.map(st => {
                        const isSelected = selectedStation?.name === st.name
                        const condColor = st.condition_score >= 8 ? '#22C55E' : st.condition_score >= 6 ? '#3B82F6' : st.condition_score >= 4 ? '#F97316' : '#EF4444'
                        return (
                          <tr key={st.name}
                            onClick={() => setSelectedStation(isSelected ? null : st)}
                            className={`border-b border-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'}`}>
                            <td className="px-2 py-2 text-white/70 font-medium">{st.name}</td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-1.5 py-0.5 rounded-full text-[9px]"
                                style={{ backgroundColor: `${TYPE_COLORS[st.type] || '#666'}20`, color: TYPE_COLORS[st.type] || '#666' }}>
                                {st.type}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right text-white/60">{st.current_strength}/{st.capacity}</td>
                            <td className="px-2 py-2 text-right">
                              <span className="font-medium" style={{ color: condColor }}>{st.condition_score.toFixed(1)}</span>
                            </td>
                            <td className="px-2 py-2 text-center text-white/40">{st.facilities.length}/{ALL_FACILITIES.length}</td>
                            <td className="px-2 py-2 text-right text-white/40">{st.last_inspection}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Station detail */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-white/80 mb-2">{selectedStation ? selectedStation.name : 'Station Detail'}</h3>
            {selectedStation ? (
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={14} className="text-blue-400" />
                  <span className="text-[10px] text-white/70 font-medium">{selectedStation.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px]"
                    style={{ backgroundColor: `${TYPE_COLORS[selectedStation.type] || '#666'}20`, color: TYPE_COLORS[selectedStation.type] || '#666' }}>
                    {selectedStation.type}
                  </span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-white/40">Strength</span>
                    <span className="text-white/70">{selectedStation.current_strength} / {selectedStation.capacity}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (selectedStation.current_strength / selectedStation.capacity) * 100)}%`,
                      backgroundColor: selectedStation.current_strength > selectedStation.capacity ? '#EF4444' : '#22C55E'
                    }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Condition</span>
                    <span className="font-medium" style={{ color: selectedStation.condition_score >= 7 ? '#22C55E' : '#F97316' }}>
                      {selectedStation.condition_score.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Last Inspection</span>
                    <span className="text-white/60">{selectedStation.last_inspection}</span>
                  </div>
                  <div className="pt-1 border-t border-white/10">
                    <span className="text-white/40 block mb-1">Facilities ({selectedStation.facilities.length}/{ALL_FACILITIES.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {ALL_FACILITIES.map(f => {
                        const has = selectedStation.facilities.includes(f)
                        return (
                          <span key={f} className={`px-1 py-0.5 rounded text-[8px] ${has ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {has ? <CheckCircle size={8} className="inline mr-0.5" /> : <XCircle size={8} className="inline mr-0.5" />}
                            {f}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/30">Click a station to view its details.</p>
            )}
          </div>

          {/* Condition Donut */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">Condition Distribution</h3>
            {conditionDonut && (
              <div className="flex items-center gap-3">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  {conditionDonut.map((seg, i) => (
                    <circle key={i} cx="50" cy="50" r="45" fill="none" stroke={seg.color} strokeWidth="10"
                      strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset}
                      transform="rotate(-90, 50, 50)" />
                  ))}
                </svg>
                <div className="flex-1 space-y-1">
                  {conditionDonut.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-white/60 capitalize">{seg.label}</span>
                      <span className="text-white/40 ml-auto">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Facility Gaps */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-orange-400 mb-3">Facility Gaps</h3>
            <div className="space-y-2">
              {data?.facility_gaps.slice(0, 10).map((gap, i) => (
                <div key={i} className="bg-white/[0.03] rounded-lg px-2 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Wrench size={10} className="text-orange-400" />
                    <span className="text-[10px] text-white/70 font-medium">{gap.station}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gap.missing_facilities.map((f, j) => (
                      <span key={j} className="px-1 py-0.5 bg-red-500/10 text-red-300 rounded text-[8px]">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              ⚠️ Condition scores below 4.0 trigger automatic infrastructure upgrade requests.
              Auto-refreshes every 60s.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}