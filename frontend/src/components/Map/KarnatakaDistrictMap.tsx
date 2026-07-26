/**
 * KarnatakaDistrictMap — MapLibre-powered district heatmap for the CP Dashboard.
 *
 * Renders circle markers at each district center, sized/colored by FIR count.
 * Clicking a district fires onDistrictClick. Hover shows a popup with FIR stats.
 */
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DISTRICT_CENTERS, KARNATAKA_CENTER, KARNATAKA_BOUNDS } from '@/constants/karnatakaGeo'

export interface DistrictData {
  district_id: number
  district_name: string
  fir_count: number
  division: string
}

interface KarnatakaDistrictMapProps {
  districtData: DistrictData[]
  onDistrictClick: (district: DistrictData) => void
  className?: string
}

export function KarnatakaDistrictMap({
  districtData,
  onDistrictClick,
  className = 'h-full w-full',
}: KarnatakaDistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
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
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          paint: { 'raster-opacity': 0.3 },
        }],
      },
      center: KARNATAKA_CENTER,
      zoom: 6.2,
      maxBounds: KARNATAKA_BOUNDS,
    })

    map.on('load', () => {
      const maxFIR = Math.max(...districtData.map(d => d.fir_count), 1)

      districtData.forEach(district => {
        const center = DISTRICT_CENTERS[district.district_name]
        if (!center) return

        const intensity = district.fir_count / maxFIR
        const color = intensity > 0.7 ? '#EF4444' :
                      intensity > 0.4 ? '#F59E0B' : '#22C55E'
        const radius = 8 + intensity * 20

        const sourceId = `district-${district.district_id}`
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: center },
            properties: {
              district_name: district.district_name,
              fir_count: district.fir_count,
              division: district.division,
              district_id: district.district_id,
            },
          },
        })

        map.addLayer({
          id: sourceId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': radius,
            'circle-color': color,
            'circle-opacity': 0.7,
            'circle-stroke-color': color,
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 1,
          },
        })

        map.on('click', sourceId, () => onDistrictClick(district))
        map.on('mouseenter', sourceId, () => {
          map.getCanvas().style.cursor = 'pointer'
          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            className: 'district-popup',
          })
            .setLngLat(center)
            .setHTML(`
              <div style="background:#1a1d2e;border:1px solid rgba(255,255,255,0.15);
                          border-radius:8px;padding:10px 14px;color:white;font-family:sans-serif;
                          min-width:160px">
                <p style="font-size:13px;font-weight:600;margin:0 0 4px">${district.district_name}</p>
                <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0 0 6px">${district.division} Division</p>
                <p style="font-size:18px;font-weight:700;color:${color};margin:0">${district.fir_count.toLocaleString()}</p>
                <p style="font-size:10px;color:rgba(255,255,255,0.4);margin:2px 0 0">FIRs this month</p>
              </div>
            `)
            .addTo(map)
        })
        map.on('mouseleave', sourceId, () => {
          map.getCanvas().style.cursor = ''
          if (popupRef.current) popupRef.current.remove()
        })
      })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [districtData, onDistrictClick])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className} />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2
                      bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg
                      border border-white/10 text-[10px] text-white/60">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
          Low
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
          High
        </span>
      </div>
    </div>
  )
}
