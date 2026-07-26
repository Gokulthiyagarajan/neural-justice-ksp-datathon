import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { getFirs } from '@/api/firs';
import { getHotspots } from '@/api/geo';
import type { FirCase } from '@/types';
import type { Hotspot, GeoCoordinates } from '@/types/geo';
import type { MapTheme } from './mapConfig';

export interface LeafletMapHandle {
  flyTo: (coords: GeoCoordinates, zoom?: number) => void;
  getMap: () => L.Map | null;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

interface LeafletMapViewProps {
  onHotspotClick?: (hotspot: Hotspot) => void;
  onLocationSelect?: (coords: GeoCoordinates) => void;
  onDoubleClick?: (coords: GeoCoordinates) => void;
  onContextMenu?: (coords: GeoCoordinates) => void;
  districtId?: string;
  className?: string;
  theme?: MapTheme;
}

const KARNATAKA_CENTER: GeoCoordinates = { lat: 15.0, lng: 76.5 };

// Karnataka bounding box — restricts panning and zooming
const KARNATAKA_BOUNDS: L.LatLngBoundsLiteral = [[11.5, 74.0], [18.5, 78.5]];

/**
 * Returns a raster-compatible tile URL for the given theme.
 * Leaflet doesn't support vector tiles natively, so we use:
 *   - dark:  CartoDB Dark Matter raster tiles (free, no key required)
 *   - light: OpenStreetMap standard raster tiles
 */
function getLeafletTileUrl(theme: MapTheme = 'dark'): string {
  return theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function getLeafletAttribution(theme: MapTheme = 'dark'): string {
  return theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
}

export const LeafletMapView = forwardRef<LeafletMapHandle, LeafletMapViewProps>(
  function LeafletMapView(
    { onHotspotClick, onLocationSelect, onDoubleClick, onContextMenu, districtId, className = '', theme = 'dark' },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const [mapReady, setMapReady] = useState(false);

    useImperativeHandle(ref, () => ({
      flyTo: (coords: GeoCoordinates, zoom = 14) => {
        mapRef.current?.flyTo([coords.lat, coords.lng], zoom);
      },
      getMap: () => mapRef.current,
      fitBounds: (bounds: [[number, number], [number, number]]) => {
        const latLngBounds = L.latLngBounds(
          [bounds[0][1], bounds[0][0]],
          [bounds[1][1], bounds[1][0]]
        );
        mapRef.current?.fitBounds(latLngBounds, { padding: [50, 50] });
      },
    }));

    // Initialize map on mount
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [KARNATAKA_CENTER.lat, KARNATAKA_CENTER.lng],
        zoom: 7,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: KARNATAKA_BOUNDS,
        maxBoundsViscosity: 0.85,
      });
      const tileUrl = getLeafletTileUrl(theme);
      const tileLayer = L.tileLayer(tileUrl, {
        attribution: getLeafletAttribution(theme),
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      tileLayerRef.current = tileLayer;

      const loadingTimeout = setTimeout(() => {
        setMapReady(true);
      }, 8000);

      map.whenReady(() => {
        setMapReady(true);
        if (loadingTimeout) clearTimeout(loadingTimeout);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        onLocationSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      map.on('dblclick', (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        onDoubleClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      map.on('contextmenu', (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        onContextMenu?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      return () => {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        map.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update tile layer when theme changes
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      // Remove old tile layer
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      // Add new tile layer with theme-appropriate tiles
      const tileUrl = getLeafletTileUrl(theme);
      const tileLayer = L.tileLayer(tileUrl, {
        attribution: getLeafletAttribution(theme),
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tileLayer;
    }, [theme]);

    useEffect(() => {
      if (!containerRef.current) return;
      const resize = () => mapRef.current?.invalidateSize();
      const ro = new ResizeObserver(() => {
        resize();
      });
      ro.observe(containerRef.current);
      window.addEventListener('resize', resize);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', resize);
      };
    }, []);

    useEffect(() => {
      if (!mapRef.current || !mapReady) return;
      const map = mapRef.current;

      const loadData = async () => {
        try {
          const [firRes, hotspotRes] = await Promise.all([
            getFirs({ limit: 500 }),
            getHotspots({ district_id: districtId, limit: 100 }),
          ]);

          const firCluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
          });

          firRes.results.forEach((fir: FirCase) => {
            const marker = L.circleMarker([fir.lat, fir.lng], {
              radius: 5,
              color: '#2D5F8A',
              fillColor: '#2D5F8A',
              fillOpacity: 0.4,
            });
            marker.bindTooltip(`${fir.crime_no} — ${fir.crime_head_name || 'Unknown'}`);
            firCluster.addLayer(marker);
          });

          map.addLayer(firCluster);

          const hotspotCluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 80,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
          });

          hotspotRes.hotspots.forEach((hotspot: Hotspot) => {
            const marker = L.circleMarker([hotspot.lat, hotspot.lng], {
              radius: 8,
              color: '#C41E3A',
              fillColor: '#C41E3A',
              fillOpacity: 0.5,
            });
            marker.on('click', () => onHotspotClick?.(hotspot));
            marker.bindTooltip(hotspot.crime_category);
            hotspotCluster.addLayer(marker);
          });

          map.addLayer(hotspotCluster);
        } catch {
          // map renders even if data load fails
        }
      };

      loadData();
    }, [mapReady, districtId, onHotspotClick, onLocationSelect]);

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary text-sm text-text-secondary z-10">
            Initializing map…
          </div>
        )}
      </div>
    );
  }
);
