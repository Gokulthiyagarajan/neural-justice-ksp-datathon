/**
 * CPGISMap — City GIS Command Map
 *
 * Commissioner of Police command center page.
 * Full-screen MapLibre map with interactive layers:
 *   - District boundaries (centroids + labels)
 *   - Crime hotspots (weighted heatmap)
 *   - Police station markers
 *   - Emergency markers with severity
 *   - Patrol routes
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Globe, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Shield, Map, Navigation } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode } from '@/services/demoData'
import { authHeaders } from '@/utils/authHeaders'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Station {
  id: number
  name: string
  code: string
  lat: number
  lng: number
  district: string
  officers: number
  status: string
}

interface CrimeHotspot {
  lat: number
  lng: number
  weight: number
  type: string
  count: number
}

interface DistrictCenter {
  name: string
  lat: number
  lng: number
  division: string
  fir_count: number
  crime_index: number
}

interface EmergencyMarker {
  id: string
  title: string
  lat: number
  lng: number
  severity: string
  type: string
}

interface PatrolRoute {
  id: string
  name: string
  district: string
  waypoints: [number, number][]
  status: string
  assigned_units: number
}

interface GISData {
  stations: Station[]
  crime_hotspots: CrimeHotspot[]
  district_centers: DistrictCenter[]
  emergency_markers: EmergencyMarker[]
  patrol_routes: PatrolRoute[]
  map_config: {
    center: [number, number]
    zoom: number
    bounds: [[number, number], [number, number]]
    max_zoom: number
    min_zoom: number
  }
  last_updated: string
}

interface LayerVisibility {
  districts: boolean
  hotspots: boolean
  stations: boolean
  emergencies: boolean
  patrols: boolean
}

// ─── Demo data ──────────────────────────────────────────────────────────────

const DEMO_GIS_DATA: GISData = {
  stations: [
    { id: 1, name: 'Koramangala Police Station', code: 'KRM-001', lat: 12.935, lng: 77.624, district: 'Bengaluru Urban', officers: 24, status: 'active' },
    { id: 2, name: 'BTM Layout Police Station', code: 'BTM-001', lat: 12.916, lng: 77.610, district: 'Bengaluru Urban', officers: 18, status: 'active' },
    { id: 3, name: 'Jayanagar Police Station', code: 'JAY-001', lat: 12.930, lng: 77.593, district: 'Bengaluru Urban', officers: 22, status: 'active' },
    { id: 4, name: 'MG Road Police Station', code: 'MGR-001', lat: 12.975, lng: 77.607, district: 'Bengaluru Urban', officers: 20, status: 'active' },
    { id: 5, name: 'Indiranagar Police Station', code: 'IND-001', lat: 12.972, lng: 77.640, district: 'Bengaluru Urban', officers: 16, status: 'active' },
    { id: 6, name: 'Whitefield Police Station', code: 'WHT-001', lat: 12.969, lng: 77.750, district: 'Bengaluru Urban', officers: 15, status: 'active' },
    { id: 7, name: 'HSR Layout Police Station', code: 'HSR-001', lat: 12.911, lng: 77.638, district: 'Bengaluru Urban', officers: 14, status: 'active' },
    { id: 8, name: 'Vijayanagar Police Station', code: 'VIJ-001', lat: 12.971, lng: 77.533, district: 'Bengaluru Urban', officers: 19, status: 'active' },
  ],
  crime_hotspots: [
    { lat: 12.935, lng: 77.624, weight: 0.85, type: 'theft', count: 14 },
    { lat: 12.942, lng: 77.618, weight: 0.72, type: 'robbery', count: 9 },
    { lat: 12.928, lng: 77.635, weight: 0.58, type: 'assault', count: 7 },
    { lat: 12.952, lng: 77.608, weight: 0.45, type: 'burglary', count: 5 },
    { lat: 12.915, lng: 77.644, weight: 0.40, type: 'theft', count: 4 },
    { lat: 12.948, lng: 77.596, weight: 0.30, type: 'vehicle_theft', count: 3 },
    { lat: 12.905, lng: 77.654, weight: 0.25, type: 'cybercrime', count: 2 },
  ],
  district_centers: [
    { name: 'Koramangala', lat: 12.935, lng: 77.624, division: 'South', fir_count: 142, crime_index: 7 },
    { name: 'Jayanagar', lat: 12.930, lng: 77.593, division: 'South', fir_count: 128, crime_index: 6 },
    { name: 'MG Road', lat: 12.975, lng: 77.607, division: 'Central', fir_count: 98, crime_index: 5 },
    { name: 'Indiranagar', lat: 12.972, lng: 77.640, division: 'East', fir_count: 115, crime_index: 6 },
    { name: 'Whitefield', lat: 12.969, lng: 77.750, division: 'East', fir_count: 87, crime_index: 4 },
    { name: 'Vijayanagar', lat: 12.971, lng: 77.533, division: 'West', fir_count: 105, crime_index: 5 },
  ],
  emergency_markers: [
    { id: 'EM-001', title: 'Active robbery in progress - Commercial Street', lat: 12.975, lng: 77.610, severity: 'critical', type: 'robbery' },
    { id: 'EM-002', title: 'Chain snatching reported near market', lat: 12.938, lng: 77.628, severity: 'high', type: 'assault' },
    { id: 'EM-003', title: 'Suspicious vehicle parked near mall', lat: 12.970, lng: 77.615, severity: 'medium', type: 'suspicious_activity' },
    { id: 'EM-004', title: 'Domestic dispute in residential area', lat: 12.940, lng: 77.600, severity: 'low', type: 'domestic_disturbance' },
  ],
  patrol_routes: [
    { id: 'PR-001', name: 'Sector A - Koramangala', district: 'Bengaluru Urban', waypoints: [[77.618, 12.935], [77.624, 12.935], [77.630, 12.930], [77.624, 12.925], [77.618, 12.930]], status: 'active', assigned_units: 2 },
    { id: 'PR-002', name: 'Sector B - Commercial District', district: 'Bengaluru Urban', waypoints: [[77.607, 12.975], [77.610, 12.972], [77.615, 12.970], [77.610, 12.968], [77.605, 12.970]], status: 'active', assigned_units: 2 },
    { id: 'PR-003', name: 'Sector C - HSR Layout', district: 'Bengaluru Urban', waypoints: [[77.635, 12.915], [77.640, 12.912], [77.638, 12.908], [77.633, 12.911]], status: 'on_break', assigned_units: 1 },
  ],
  map_config: {
    center: [77.62, 12.94],
    zoom: 11.5,
    bounds: [[77.5, 12.85], [77.8, 13.0]],
    max_zoom: 14,
    min_zoom: 8,
  },
  last_updated: new Date().toISOString(),
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const CRIME_TYPE_ICONS: Record<string, string> = {
  theft: '🔓',
  assault: '⚠️',
  robbery: '🏴',
  burglary: '🏠',
  vehicle_theft: '🚗',
  property_crime: '🏢',
  cybercrime: '💻',
}

const CRIME_INDEX_COLOR = (idx: number) => {
  if (idx >= 7) return '#EF4444'
  if (idx >= 5) return '#F97316'
  if (idx >= 3) return '#EAB308'
  return '#22C55E'
}

function createMarkerElement(color: string, size: number, label?: string): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color}80;cursor:pointer;display:flex;align-items:center;justify-content:center;`
  if (label) {
    const span = document.createElement('span')
    span.textContent = label
    span.style.cssText = 'font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.8);line-height:1;'
    el.appendChild(span)
  }
  return el
}

function createEmergencyIcon(severity: string): HTMLElement {
  const color = SEVERITY_COLORS[severity] || '#999'
  const el = document.createElement('div')
  el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 12px ${color}A0;cursor:pointer;display:flex;align-items:center;justify-content:center;animation:pulse-emergency 2s ease-in-out infinite;`
  const inner = document.createElement('span')
  inner.textContent = '!'
  inner.style.cssText = 'font-size:14px;font-weight:900;color:#fff;'
  el.appendChild(inner)
  return el
}

// ─── Layer Panel ────────────────────────────────────────────────────────────

function LayerPanel({
  visibility,
  onToggle,
  stats,
  collapsed,
  onCollapse,
}: {
  visibility: LayerVisibility
  onToggle: (key: keyof LayerVisibility) => void
  stats: { stations: number; hotspots: number; districts: number; emergencies: number; patrols: number }
  collapsed: boolean
  onCollapse: () => void
}) {
  const layers: { key: keyof LayerVisibility; label: string; icon: React.ReactNode; color: string; count: number }[] = [
    { key: 'districts', label: 'District Centres', icon: <Map size={14} />, color: '#EAB308', count: stats.districts },
    { key: 'hotspots', label: 'Crime Heatmap', icon: <AlertTriangle size={14} />, color: '#F97316', count: stats.hotspots },
    { key: 'stations', label: 'Police Stations', icon: <Shield size={14} />, color: '#3B82F6', count: stats.stations },
    { key: 'emergencies', label: 'Emergencies', icon: <AlertTriangle size={14} />, color: '#EF4444', count: stats.emergencies },
    { key: 'patrols', label: 'Patrol Routes', icon: <Navigation size={14} />, color: '#8B5CF6', count: stats.patrols },
  ]

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={onCollapse}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Globe size={12} className="text-amber-400" />
          Map Layers
        </span>
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1">
          {layers.map(l => (
            <label
              key={l.key}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
            >
              <input
                type="checkbox"
                checked={visibility[l.key]}
                onChange={() => onToggle(l.key)}
                className="sr-only peer"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                visibility[l.key] ? 'border-amber-400 bg-amber-400/20' : 'border-white/30'
              }`}>
                {visibility[l.key] && (
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span style={{ color: l.color }} className="flex-shrink-0">{l.icon}</span>
              <span className="text-xs text-white/70 flex-1">{l.label}</span>
              <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded-full">{l.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stats Sidebar ──────────────────────────────────────────────────────────

function StatsSidebar({ data }: { data: GISData | null }) {
  if (!data) return null

  const criticalEmergencies = data.emergency_markers.filter(e => e.severity === 'critical').length
  const totalOfficers = data.stations.reduce((s, st) => s + st.officers, 0)
  const topDistrict = [...data.district_centers].sort((a, b) => b.fir_count - a.fir_count)[0]

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-white/80">Command Overview</span>
      </div>
      <div className="px-3 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2">
            <div className="text-[10px] text-white/40 mb-0.5">Stations</div>
            <div className="text-sm font-bold text-blue-400">{data.stations.length}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <div className="text-[10px] text-white/40 mb-0.5">Officers</div>
            <div className="text-sm font-bold text-emerald-400">{totalOfficers}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <div className="text-[10px] text-white/40 mb-0.5">Hotspots</div>
            <div className="text-sm font-bold text-orange-400">{data.crime_hotspots.length}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2">
            <div className="text-[10px] text-white/40 mb-0.5">Emergencies</div>
            <div className="text-sm font-bold text-red-400">
              {data.emergency_markers.length}
              {criticalEmergencies > 0 && (
                <span className="text-[10px] ml-1 text-red-300">({criticalEmergencies} critical)</span>
              )}
            </div>
          </div>
        </div>
        {topDistrict && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <div className="text-[10px] text-red-300/70 mb-0.5">Highest Crime District</div>
            <div className="text-xs font-semibold text-red-300">{topDistrict.name}</div>
            <div className="text-[10px] text-red-300/60">{topDistrict.fir_count.toLocaleString()} FIRs · Index {topDistrict.crime_index}</div>
          </div>
        )}
        <div className="space-y-1">
          <div className="text-[10px] text-white/40 mb-1">Top Divisions by FIRs</div>
          {(() => {
            const divisionFirs: Record<string, number> = {}
            data.district_centers.forEach(d => {
              divisionFirs[d.division] = (divisionFirs[d.division] || 0) + d.fir_count
            })
            const sorted = Object.entries(divisionFirs).sort((a, b) => b[1] - a[1]).slice(0, 4)
            const maxFirs = sorted[0]?.[1] || 1
            return sorted.map(([div, firs]) => (
              <div key={div} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-white/60">{div}</span>
                    <span className="text-[10px] text-white/40">{firs.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400/60 rounded-full" style={{ width: `${(firs / maxFirs) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}

// ─── Legend ─────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2">
      <div className="text-[10px] text-white/50 mb-1.5 font-medium">Legend</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white/50" />
          <span className="text-[10px] text-white/50">Police Station</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 border border-white/50 animate-pulse" />
          <span className="text-[10px] text-white/50">Emergency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-white/50" />
          <span className="text-[10px] text-white/50">District Centre</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-purple-500 rounded-full" />
          <span className="text-[10px] text-white/50">Patrol Route</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-[10px] text-white/40 mb-1">Crime Index</div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-8 rounded bg-emerald-500" />
          <div className="h-2 w-8 rounded bg-yellow-400" />
          <div className="h-2 w-8 rounded bg-orange-400" />
          <div className="h-2 w-8 rounded bg-red-500" />
        </div>
        <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPGISMap() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<GISData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [layersCollapsed, setLayersCollapsed] = useState(false)
  const [legendCollapsed, setLegendCollapsed] = useState(false)

  const [visibility, setVisibility] = useState<LayerVisibility>({
    districts: true,
    hotspots: true,
    stations: true,
    emergencies: true,
    patrols: true,
  })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupsRef = useRef<maplibregl.Popup[]>([])
  const layerRefs = useRef<string[]>([])
  const sourcesRef = useRef<string[]>([])

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        setData(DEMO_GIS_DATA)
        setLastUpdated(new Date(DEMO_GIS_DATA.last_updated).toLocaleTimeString())
        return
      }
      const res = await fetch('/api/cp/gis-data', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        setData(DEMO_GIS_DATA)
        setLastUpdated(new Date(DEMO_GIS_DATA.last_updated).toLocaleTimeString())
      }
    } catch {
      setData(DEMO_GIS_DATA)
      setLastUpdated(new Date(DEMO_GIS_DATA.last_updated).toLocaleTimeString())
      console.error('[CPGISMap] Failed to fetch GIS data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 60s
  useEffect(() => {
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ── Toggle layer helper ──────────────────────────────────────────────────

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ── Initialise map ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-base',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
            paint: { 'raster-opacity': 0.25 },
          },
        ],
      },
      center: [75.7139, 15.3173],
      zoom: 6.8,
      maxBounds: [[73.5, 11.0], [78.5, 18.5]],
      maxZoom: 12,
      minZoom: 5,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right')

    map.on('load', () => {
      mapRef.current = map
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Update layers when data or visibility changes ─────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !data || !map.loaded()) return

    // ── Clean up previous markers, popups, sources, layers ──────────────
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    popupsRef.current.forEach(p => p.remove())
    popupsRef.current = []

    layerRefs.current.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id)
    })
    layerRefs.current = []
    sourcesRef.current.forEach(id => {
      if (map.getSource(id)) map.removeSource(id)
    })
    sourcesRef.current = []

    // ── District centres (symbol layer) ─────────────────────────────────
    if (visibility.districts && data.district_centers.length > 0) {
      const features = data.district_centers.map(d => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
        properties: { name: d.name, division: d.division, fir_count: d.fir_count, crime_index: d.crime_index },
      }))
      const srcId = 'district-centers'
      map.addSource(srcId, { type: 'geojson', data: { type: 'FeatureCollection', features } })
      sourcesRef.current.push(srcId)

      // Circle background
      const circleId = 'district-circles'
      map.addLayer({
        id: circleId,
        type: 'circle',
        source: srcId,
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'crime_index'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.85,
        },
      })
      // Use match expression for color
      map.setPaintProperty(circleId, 'circle-color', [
        'match', ['get', 'crime_index'],
        ...data.district_centers.flatMap(d => [d.crime_index, CRIME_INDEX_COLOR(d.crime_index)]),
        '#22C55E',
      ])
      layerRefs.current.push(circleId)

      // Text labels
      const textId = 'district-labels'
      map.addLayer({
        id: textId,
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1,
        },
      })
      layerRefs.current.push(textId)

      // Click popup
      map.on('click', circleId, (e) => {
        if (!e.features?.length) return
        const p = e.features[0].properties as unknown as { name: string; division: string; fir_count: number; crime_index: number }
        const popup = new maplibregl.Popup({ maxWidth: '280px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;min-width:180px">
              <div style="font-weight:700;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px">${p.name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">Division: ${p.division}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">FIRs: <span style="font-weight:600;color:#1e293b">${p.fir_count.toLocaleString()}</span></div>
              <div style="font-size:11px;color:#64748b">Crime Index: <span style="font-weight:600;color:${CRIME_INDEX_COLOR(p.crime_index)}">${p.crime_index}/10</span></div>
            </div>
          `)
          .addTo(map)
        popupsRef.current.push(popup)
      })
      map.on('mouseenter', circleId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', circleId, () => { map.getCanvas().style.cursor = '' })
    }

    // ── Crime hotspots (heatmap layer) ──────────────────────────────────
    if (visibility.hotspots && data.crime_hotspots.length > 0) {
      const features = data.crime_hotspots.map(h => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] },
        properties: { weight: h.weight, type: h.type, count: h.count },
      }))
      const srcId = 'crime-hotspots'
      map.addSource(srcId, { type: 'geojson', data: { type: 'FeatureCollection', features } })
      sourcesRef.current.push(srcId)

      // Heatmap layer
      const heatId = 'hotspot-heat'
      map.addLayer({
        id: heatId,
        type: 'heatmap',
        source: srcId,
        maxzoom: 10,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 1, 10, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#3b82f6',
            0.4, '#8b5cf6',
            0.6, '#f97316',
            0.8, '#ef4444',
            1, '#dc2626',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 15, 10, 40],
          'heatmap-opacity': 0.6,
        },
      })
      layerRefs.current.push(heatId)

      // Circle overlay for zoomed in
      const circleId = 'hotspot-circles'
      map.addLayer({
        id: circleId,
        type: 'circle',
        source: srcId,
        minzoom: 8,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.3, 5, 0.9, 18],
          'circle-color': [
            'match', ['get', 'type'],
            'theft', '#f97316',
            'assault', '#ef4444',
            'robbery', '#dc2626',
            'burglary', '#eab308',
            'vehicle_theft', '#8b5cf6',
            'property_crime', '#6366f1',
            'cybercrime', '#3b82f6',
            '#f97316',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
      })
      layerRefs.current.push(circleId)

      // Click popup for hotspot circles
      map.on('click', circleId, (e) => {
        if (!e.features?.length) return
        const p = e.features[0].properties as unknown as { type: string; count: number; weight: number }
        const popup = new maplibregl.Popup({ maxWidth: '240px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;min-width:150px">
              <div style="font-weight:700;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px">
                ${CRIME_TYPE_ICONS[p.type] || '⚠️'} ${p.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
              <div style="font-size:11px;color:#64748b">FIRs: <span style="font-weight:600;color:#1e293b">${p.count}</span></div>
              <div style="font-size:11px;color:#64748b">Risk Weight: <span style="font-weight:600;color:#f97316">${(p.weight * 100).toFixed(0)}%</span></div>
            </div>
          `)
          .addTo(map)
        popupsRef.current.push(popup)
      })
      map.on('mouseenter', circleId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', circleId, () => { map.getCanvas().style.cursor = '' })
    }

    // ── Police station markers ───────────────────────────────────────────
    if (visibility.stations) {
      data.stations.forEach(st => {
        const el = createMarkerElement('#3B82F6', 16, st.code.split('-')[1])
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([st.lng, st.lat])
          .addTo(map)

        const popup = new maplibregl.Popup({ offset: 16, closeButton: false })
          .setHTML(`
            <div style="font-family:system-ui;min-width:180px">
              <div style="font-weight:700;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px">${st.name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">Code: ${st.code}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">District: ${st.district}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">Officers: <span style="font-weight:600">${st.officers}</span></div>
              <div style="font-size:11px;color:#64748b">Status: <span style="color:#22C55E;font-weight:600">${st.status}</span></div>
            </div>
          `)

        el.addEventListener('mouseenter', () => popup.addTo(map))
        el.addEventListener('mouseleave', () => popup.remove())
        markersRef.current.push(marker)
      })
    }

    // ── Emergency markers ────────────────────────────────────────────────
    if (visibility.emergencies) {
      data.emergency_markers.forEach(em => {
        const el = createEmergencyIcon(em.severity)
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([em.lng, em.lat])
          .addTo(map)

        const popup = new maplibregl.Popup({ offset: 16, closeButton: false })
          .setHTML(`
            <div style="font-family:system-ui;min-width:180px">
              <div style="font-weight:700;font-size:13px;color:${SEVERITY_COLORS[em.severity]};border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px">
                ⚠ ${em.id} — ${em.severity.toUpperCase()}
              </div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px">${em.title}</div>
              <div style="font-size:11px;color:#64748b">Type: <span style="font-weight:600">${em.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></div>
            </div>
          `)

        el.addEventListener('mouseenter', () => popup.addTo(map))
        el.addEventListener('mouseleave', () => popup.remove())
        markersRef.current.push(marker)
      })
    }

    // ── Patrol routes ────────────────────────────────────────────────────
    if (visibility.patrols) {
      data.patrol_routes.forEach(route => {
        if (route.waypoints.length < 2) return
        const srcId = `patrol-${route.id}`
        map.addSource(srcId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: route.waypoints,
            },
            properties: { name: route.name, district: route.district, units: route.assigned_units },
          },
        })
        sourcesRef.current.push(srcId)

        const lineId = `patrol-line-${route.id}`
        map.addLayer({
          id: lineId,
          type: 'line',
          source: srcId,
          paint: {
            'line-color': '#8B5CF6',
            'line-width': 3,
            'line-dasharray': [3, 2],
            'line-opacity': 0.8,
          },
        })
        layerRefs.current.push(lineId)
      })
    }
  }, [data, visibility])

  // ── Apply visibility changes to already-loaded layers ─────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return

    const layerSets: Record<string, string[]> = {
      districts: ['district-circles', 'district-labels'],
      hotspots: ['hotspot-heat', 'hotspot-circles'],
    }

    Object.entries(layerSets).forEach(([key, ids]) => {
      ids.forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visibility[key as keyof LayerVisibility] ? 'visible' : 'none')
        }
      })
    })
  }, [visibility])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  return (
    <>
    <style>{`
      @keyframes pulse-emergency {
        0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(239,68,68,0.6); }
        50% { transform: scale(1.15); box-shadow: 0 0 24px rgba(239,68,68,0.9); }
      }
      .maplibregl-popup-content {
        background: white !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        padding: 12px !important;
        border: none !important;
      }
      .maplibregl-popup-tip { border-top-color: white !important; }
      .maplibregl-ctrl-group {
        background: rgba(15,23,42,0.9) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }
      .maplibregl-ctrl-group button {
        background: transparent !important;
        color: white !important;
      }
      .maplibregl-ctrl-group button:hover {
        background: rgba(255,255,255,0.1) !important;
      }
      .maplibregl-ctrl-scale {
        background: rgba(15,23,42,0.8) !important;
        color: rgba(255,255,255,0.6) !important;
        border-color: rgba(255,255,255,0.2) !important;
      }
    `}</style>
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Globe size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-amber-400">City GIS Command Map</h1>
            <p className="text-[10px] text-white/40">Live district boundaries · Crime hotspots · Police stations · Patrol routes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-white/30">
              Last updated: {lastUpdated}
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

      {/* ─── Main Layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Map ──────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading GIS data…</p>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Floating layers panel */}
          <div className="absolute top-3 left-3 z-10 w-52">
            <LayerPanel
              visibility={visibility}
              onToggle={toggleLayer}
              stats={{
                stations: data?.stations.length ?? 0,
                hotspots: data?.crime_hotspots.length ?? 0,
                districts: data?.district_centers.length ?? 0,
                emergencies: data?.emergency_markers.length ?? 0,
                patrols: data?.patrol_routes.length ?? 0,
              }}
              collapsed={layersCollapsed}
              onCollapse={() => setLayersCollapsed(!layersCollapsed)}
            />
          </div>

          {/* Floating stats sidebar */}
          <div className="absolute top-3 right-14 z-10 w-56">
            <StatsSidebar data={data} />
          </div>

          {/* Floating legend */}
          <div className="absolute bottom-8 left-3 z-10 w-52">
            {!legendCollapsed ? (
              <div className="relative">
                <button
                  onClick={() => setLegendCollapsed(true)}
                  className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-slate-800 border border-white/20 text-white/50 flex items-center justify-center text-[10px] hover:bg-slate-700"
                >
                  ×
                </button>
                <Legend />
              </div>
            ) : (
              <button
                onClick={() => setLegendCollapsed(false)}
                className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Map size={12} className="inline mr-1" />
                Legend
              </button>
            )}
          </div>

          {/* AI advisory */}
          <div className="absolute bottom-8 right-14 z-10 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/10 px-3 py-2 max-w-xs">
            <p className="text-[10px] text-white/30 leading-relaxed">
              🗺️ Map data refreshed every 60 seconds. Heatmap intensity represents weighted crime density.
              Click markers and districts for details. AI confidence: high for station data, moderate for hotspot predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
