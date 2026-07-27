import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton'
import { MapLibreMap } from '@/components/Map/MapLibreMap'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface StationInfo {
  id: number
  name: string
  code: string
  district: string
  lat: number | null
  lng: number | null
  address: string
  inspector_name: string | null
  si_name: string | null
  phone: string | null
}

interface Officer {
  id: number
  name: string
  rank: string
}

interface NearbyFir {
  fir_id: string | number
  fir_number: string
  crime_type: string
  status: string
  severity: string
  lat: number
  lng: number
  days_open: number
}

const SEVERITY_MARKER_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#94A3B8',
}

const FIR_COLORS_DEMO = [
  '#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
]

function InfoRow({ label, value, mono, highlight }: {
  label: string; value?: string | null; mono?: boolean; highlight?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-white/30">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${
        highlight ? 'text-red-300 font-medium' : 'text-white/70'
      }`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function generateDemoFirs(stationLat: number, stationLng: number): NearbyFir[] {
  const firs: NearbyFir[] = []
  const types = ['Robbery', 'Theft', 'Assault', 'Burglary', 'Chain Snatching', 'Vehicle Theft']
  const statuses = ['open', 'under_investigation', 'closed', 'resolved']
  const severities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low']
  const count = Math.floor(Math.random() * 6) + 4

  for (let i = 1; i <= count; i++) {
    firs.push({
      fir_id: `demo-${i}`,
      fir_number: `KSP-2026-${String(10000 + i * 37).slice(0, 5)}`,
      crime_type: types[i % types.length],
      status: statuses[i % statuses.length],
      severity: severities[i % severities.length],
      lat: stationLat + (Math.random() - 0.5) * 0.03,
      lng: stationLng + (Math.random() - 0.5) * 0.03,
      days_open: Math.floor(Math.random() * 60) + 1,
    })
  }
  return firs
}

// ── Demo station data ────────────────────────────────────────────
function getDemoStation(): StationInfo {
  return {
    id: 1,
    name: 'Koramangala Police Station',
    code: 'KMG',
    district: 'Bengaluru Urban',
    lat: 12.9345,
    lng: 77.6133,
    address: 'No. 7, 1st Main Road, Koramangala Industrial Layout, Bengaluru - 560034',
    inspector_name: 'Inspector Kavya Sharma',
    si_name: 'SI Ramesh Kumar',
    phone: '080-25522300',
  };
}

function getDemoOfficers(): Officer[] {
  return [
    { id: 1, name: 'SI Ramesh Kumar', rank: 'Sub-Inspector' },
    { id: 2, name: 'ASI Prakash Gowda', rank: 'Assistant Sub-Inspector' },
    { id: 3, name: 'HC Mahesh Reddy', rank: 'Head Constable' },
    { id: 4, name: 'PC Vikram Singh', rank: 'Police Constable' },
    { id: 5, name: 'PC Sunita Patil', rank: 'Police Constable' },
    { id: 6, name: 'PC Deepak Rao', rank: 'Police Constable' },
  ];
}

export function PCStation() {
  const { user } = useAuthStore()
  const [station, setStation] = useState<StationInfo | null>(null)
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [nearbyFirs, setNearbyFirs] = useState<NearbyFir[]>([])
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!user?.station_id) {
      // No station assigned — show demo station
      const demo = getDemoStation()
      setStation(demo)
      setOfficers(getDemoOfficers())
      setNearbyFirs(generateDemoFirs(demo.lat ?? 12.93, demo.lng ?? 77.59))
      setLoading(false)
      return
    }
    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {}

    Promise.all([
      fetch(`/api/station/${user.station_id}`, { headers }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }),
      fetch(`/api/officer/${user.id}`, { headers }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      }).catch((e) => {
        console.warn('[PCStation] officer fetch failed:', e)
        return { officer: null }
      }),
    ])
      .then(([s, o]) => {
        const st = s?.station ?? s
        setStation(st)
        
        // Fetch station officers using the station_id from the officer record
        if (o?.officer?.station_id) {
          fetch(`/api/station/${o.officer.station_id}/officers`, { headers })
            .then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
              return r.json()
            })
            .then(officerData => {
              setOfficers(officerData?.officers ?? [])
            })
            .catch((e) => {
              console.warn('[PCStation] officer roster fetch failed:', e)
              setOfficers([])
            })
        } else {
          setOfficers([])
        }
        
        setLoading(false)

        // Generate demo FIRs near station if we have coordinates
        if (st?.lat && st?.lng) {
          setNearbyFirs(generateDemoFirs(st.lat, st.lng))
        }
      })
      .catch((e) => {
        console.warn('[PCStation] station fetch failed, using demo data:', e)
        const demo = getDemoStation()
        setStation(demo)
        setOfficers(getDemoOfficers())
        setNearbyFirs(generateDemoFirs(demo.lat ?? 12.93, demo.lng ?? 77.59))
        setLoading(false)
      })
  }, [user?.station_id, user?.id])

  // Add station marker pin reactively when both map and station data are ready
  const stationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const stationPopupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !station?.lat || !station?.lng) return

    // Remove previous marker/popup if station data changed (e.g. re-fetch)
    stationMarkerRef.current?.remove()
    stationPopupRef.current?.remove()

    const el = document.createElement('div')
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.borderRadius = '50%'
    el.style.background = '#2B4C7E'
    el.style.border = '3px solid #F59E0B'
    el.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.2), 0 0 12px rgba(245, 158, 11, 0.3)'
    el.style.cursor = 'pointer'

    el.addEventListener('click', () => {
      stationPopupRef.current?.remove()
      stationPopupRef.current = new maplibregl.Popup({ offset: 16 })
        .setLngLat([station.lng!, station.lat!])
        .setHTML(`
          <div style="background:#0F2040;border:1px solid #1A3358;border-radius:8px;
                      padding:10px 14px;color:#F8FAFC;font-family:sans-serif;min-width:180px">
            <p style="font-size:13px;font-weight:600;margin:0 0 4px;color:#F59E0B">
              ${station.name}
            </p>
            <p style="font-size:11px;margin:0 0 2px;color:#94A3B8">
              ${station.district} · ${station.code}
            </p>
            <p style="font-size:11px;margin:0;color:#94A3B8">
              📞 ${station.phone || '—'}
            </p>
          </div>
        `)
        .addTo(map)
    })

    stationMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([station.lng, station.lat])
      .addTo(map)

    return () => {
      stationMarkerRef.current?.remove()
      stationPopupRef.current?.remove()
    }
  }, [mapReady, station?.lat, station?.lng, station?.name, station?.district, station?.code, station?.phone])

  // Add FIR markers when map is ready and FIRs are loaded
  const handleMapReady = useCallback((map: maplibregl.Map) => {
    mapRef.current = map
    setMapReady(true)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || nearbyFirs.length === 0 || !station?.lat || !station?.lng) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Add FIR markers
    nearbyFirs.forEach((fir) => {
      const color = SEVERITY_MARKER_COLORS[fir.severity] || '#94A3B8'
      const el = document.createElement('div')
      el.style.width = '10px'
      el.style.height = '10px'
      el.style.borderRadius = '50%'
      el.style.background = color
      el.style.border = '2px solid #0A1628'
      el.style.boxShadow = '0 0 6px rgba(0,0,0,0.5)'
      el.style.cursor = 'pointer'
      el.title = `${fir.fir_number} · ${fir.crime_type}`

      el.addEventListener('click', () => {
        new maplibregl.Popup({ offset: 10, className: 'fir-popup' })
          .setLngLat([fir.lng, fir.lat])
          .setHTML(`
            <div style="background:#0F2040;border:1px solid #1A3358;border-radius:8px;
                        padding:10px 12px;color:#F8FAFC;font-family:sans-serif;min-width:150px">
              <p style="font-size:12px;font-weight:600;margin:0 0 4px;color:#F59E0B;font-family:monospace">
                ${fir.fir_number}
              </p>
              <p style="font-size:12px;margin:0 0 2px">${fir.crime_type}</p>
              <p style="font-size:11px;margin:0 0 2px;color:#94A3B8">
                Status: ${fir.status.replace(/_/g, ' ')} · ${fir.days_open} days
              </p>
              <span style="display:inline-block;background:${color}20;color:${color};
                          border:1px solid ${color}40;border-radius:4px;padding:1px 6px;
                          font-size:10px;font-weight:500;margin-top:4px">
                ${fir.severity.toUpperCase()}
              </span>
            </div>
          `)
          .addTo(map)
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([fir.lng, fir.lat])
        .addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  }, [nearbyFirs, mapReady, station?.lat, station?.lng])

  if (loading) return <PCPageSkeleton />

  if (!station) {
    return (
      <div className="flex flex-col gap-5 p-6 max-w-5xl mx-auto">
        <p className="text-sm text-white/40">Station data not available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-5xl mx-auto">
      {/* Station header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏛️</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">{station.name}</h1>
          <p className="text-xs text-white/40">
            {station.district ?? '—'} · {station.code ?? '—'} · {nearbyFirs.length} active FIRs nearby
          </p>
        </div>
      </div>

      {/* Map + info side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Map — takes 3/5 of the row */}
        {station.lat && station.lng && (
          <div className="lg:col-span-3 rounded-xl border border-white/10 overflow-hidden h-[300px] lg:h-[350px] relative">
            <MapLibreMap
              center={[station.lng, station.lat]}
              zoom={14}
              className="h-full w-full"
              showNav={true}
              restrictBounds={true}
              onMapReady={handleMapReady}
            />
            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3
                            bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg
                            border border-white/10 text-[10px] text-white/60 pointer-events-none">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-navy"
                      style={{ background: '#2B4C7E' }} />
                Station
              </span>
              {Object.entries(SEVERITY_MARKER_COLORS).map(([sev, col]) => (
                <span key={sev} className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info cards — takes 2/5 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Station details */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
              Station Details
            </p>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Address" value={station.address} />
              <InfoRow label="District" value={station.district} />
              <InfoRow label="Code" value={station.code} />
              <InfoRow label="Phone" value={station.phone} mono />
            </div>
          </div>

          {/* Key contacts */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
              Key Contacts
            </p>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Inspector" value={station.inspector_name} />
              <InfoRow label="Sub-Inspector" value={station.si_name} />
              <InfoRow label="Emergency" value="100" mono highlight />
              <InfoRow label="Women Helpline" value="1091" mono highlight />
            </div>
          </div>
        </div>
      </div>

      {/* Officers + Recent FIRs grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Duty roster */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
            Station Officers
          </p>
          {officers.length === 0 ? (
            <p className="text-xs text-white/30">Officer list not available</p>
          ) : (
            <div className="space-y-2">
              {officers.map(o => (
                <div key={o.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{o.name}</span>
                  <span className="text-white/40">{o.rank}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent FIRs in this area */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">
              Recent FIRs in Area
            </p>
            <span className="text-[10px] text-white/30">{nearbyFirs.length} incidents</span>
          </div>
          {nearbyFirs.length === 0 ? (
            <p className="text-xs text-white/30">No recent incidents</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {nearbyFirs.map((fir, i) => (
                <div
                  key={fir.fir_id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: FIR_COLORS_DEMO[i % FIR_COLORS_DEMO.length] }}
                    />
                    <span className="text-white/60 font-mono text-[10px] truncate">{fir.fir_number}</span>
                    <span className="text-white/70 truncate">{fir.crime_type}</span>
                  </div>
                  <span className="text-white/40 ml-2 flex-shrink-0">
                    {fir.days_open}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
