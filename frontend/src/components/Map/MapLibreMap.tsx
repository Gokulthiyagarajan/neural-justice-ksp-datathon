/**
 * MapLibreMap — shared MapLibre GL JS wrapper with OSM raster tiles.
 * Uses Free & open OpenStreetMap tiles (no API key required).
 *
 * All CP pages should use this component as the base map.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { KARNATAKA_CENTER, KARNATAKA_BOUNDS } from '@/constants/karnatakaGeo'
import { getMapStyleUrl } from '@/components/geo/mapConfig'

export interface MapLibreMapProps {
  center?: [number, number]
  zoom?: number
  className?: string
  onMapReady?: (map: maplibregl.Map) => void
  children?: React.ReactNode
  /** Whether to show navigation controls */
  showNav?: boolean
  /** Restrict panning to Karnataka bounds */
  restrictBounds?: boolean
  /** Map theme: 'dark' (OpenFreeMap Dark Matter) or 'light' (OpenFreeMap Liberty) */
  theme?: 'dark' | 'light';
}

export function MapLibreMap({
  center = KARNATAKA_CENTER,
  zoom = 6.5,
  className = 'h-full w-full',
  onMapReady,
  children,
  showNav = true,
  restrictBounds = true,
  theme = 'dark',
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onMapReadyRef = useRef(onMapReady)
  onMapReadyRef.current = onMapReady
  const controlsAddedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setIsLoading(false);
    setHasError(false);
    onMapReadyRef.current?.(map)
  }, [])

  // Initialize map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    setIsLoading(true);
    setHasError(false);

    const styleUrl = getMapStyleUrl(theme);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      maxBounds: restrictBounds ? KARNATAKA_BOUNDS : undefined,
      attributionControl: true as unknown as false | maplibregl.AttributionControlOptions | undefined,
    })

    map.on('error', () => {
      setIsLoading(false);
      setHasError(true);
    });

    map.on('load', () => {
      if (showNav && !controlsAddedRef.current) {
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        controlsAddedRef.current = true;
      }
      handleMapReady(map);
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch style when theme changes — controls are preserved across setStyle calls
  // by MapLibre GL JS automatically, so we don't need to re-add them.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(getMapStyleUrl(theme));
  }, [theme]);

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A1628] z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-[rgba(245,158,11,0.2)] border-t-[#F59E0B] rounded-full animate-spin" />
            <span className="text-sm text-[#94A3B8]">Loading map…</span>
          </div>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A1628] z-10">
          <div className="text-center">
            <p className="text-sm text-[#EF4444] mb-2">Unable to load map data</p>
            <p className="text-xs text-[#94A3B8] mb-2">Please check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-[#F59E0B] hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div ref={containerRef} className={className} />
      {children}
    </div>
  )
}
