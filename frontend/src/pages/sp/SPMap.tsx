/**
 * SP District Command Map — MapLibre GL with hotspots, stations, clustering
 * Route: /sp/map
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import maplibregl from 'maplibre-gl';

interface Hotspot {
  lat?: number;
  lng?: number;
  crime_type?: string;
  incident_count?: number;
  risk_level?: string;
}

interface Station {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  fir_count: number;
  solved_rate: number;
}

export function SPMap() {
  const user = useAuthStore(s => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [crimeFilter, setCrimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [hRes, sRes] = await Promise.all([
        fetch(`/api/geo/v1/map/hotspots?district_id=${user?.district_id ?? 'BENGALURU_URBAN'}&limit=100`,
          { headers: authHeaders() }),
        fetch(`/api/dashboard/stations?district_code=${user?.district_id ?? 'BENGALURU_URBAN'}`,
          { headers: authHeaders() }),
      ]);
      if (!hRes.ok || !sRes.ok) throw new Error('Failed to load map data');
      const h = await hRes.json();
      const s = await sRes.json();
      setHotspots(h?.hotspots ?? h ?? []);
      setStations(s?.stations ?? s ?? []);
    } catch (err) {
      console.warn('[SPMap] Fetch failed:', err);
      setError('Unable to load map data');
    } finally {
      setLoading(false);
    }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!containerRef.current || loading) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: 'District Command Map',
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#f0f2f5' } },
          { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.85 } },
        ],
      },
      center: [76.5, 13.5],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      // Hotspot clustering
      const filteredHotspots = crimeFilter === 'all'
        ? hotspots : hotspots.filter(h => h.crime_type?.toLowerCase() === crimeFilter);

      if (filteredHotspots.length) {
        map.addSource('hotspots', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: filteredHotspots.filter(h => h.lat && h.lng).map(h => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [h.lng!, h.lat!] },
              properties: { crime_type: h.crime_type, count: h.incident_count ?? 1, risk_level: h.risk_level ?? 'medium' },
            })),
          },
          cluster: true, clusterMaxZoom: 13, clusterRadius: 50,
        });
        map.addLayer({
          id: 'hs-clusters', type: 'circle', source: 'hotspots',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#3B82F6', 5, '#F59E0B', 10, '#EF4444'],
            'circle-radius': ['step', ['get', 'point_count'], 22, 5, 30, 10, 40],
            'circle-opacity': 0.75,
          },
        });
        map.addLayer({
          id: 'hs-count', type: 'symbol', source: 'hotspots',
          filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
          paint: { 'text-color': '#fff' },
        });
        map.addLayer({
          id: 'hs-point', type: 'circle', source: 'hotspots',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['match', ['get', 'risk_level'], 'high', '#EF4444', 'medium', '#F59E0B', '#22C55E'],
            'circle-radius': 8, 'circle-opacity': 0.85,
            'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5,
          },
        });
        map.on('click', 'hs-point', e => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`
            <div style="background:#1a1d2e;padding:10px;border-radius:8px;color:white">
              <p style="font-weight:600">${p.crime_type}</p>
              <p style="font-size:11px;color:#aaa">${p.count} incidents</p>
            </div>`).addTo(map);
        });
      }

      // Station markers
      stations.filter(s => s.lat && s.lng).forEach(s => {
        const color = s.solved_rate >= 70 ? '#22C55E' : s.solved_rate >= 50 ? '#F59E0B' : '#EF4444';
        const el = document.createElement('div');
        el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;cursor:pointer`;
        new maplibregl.Marker({ element: el })
          .setLngLat([s.lng!, s.lat!])
          .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`
            <div style="background:#1a1d2e;padding:8px 12px;border-radius:8px;color:white">
              <p style="font-weight:600;font-size:12px">${s.name}</p>
              <p style="font-size:11px;color:#aaa">${s.fir_count} FIRs · ${s.solved_rate}% solved</p>
            </div>`))
          .addTo(map);
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [hotspots, stations, crimeFilter, loading]);

  const CRIME_FILTERS = ['All', 'Theft', 'Assault', 'Fraud', 'Robbery', 'Other'];

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load map data" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <MapIcon size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-blue-400">District Command Map</h1>
            <p className="text-xs text-white/40">
              {user?.district_name ?? 'District'} · {hotspots.length} hotspots · {stations.length} stations
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {CRIME_FILTERS.map(f => (
            <button key={f} onClick={() => setCrimeFilter(f.toLowerCase())}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                crimeFilter === f.toLowerCase()
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden"
        style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
        {loading ? (
          <div className="h-full bg-white/5 animate-pulse flex items-center justify-center">
            <p className="text-xs text-white/30">Loading district map...</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>

      {/* Empty state when no data */}
      {!loading && hotspots.length === 0 && stations.length === 0 && (
        <EmptyState
          icon={<MapIcon size={40} />}
          title="No map data available"
          description="Hotspot and station data will appear once crimes are logged in this district."
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        {[
          ['#22C55E', 'High solve rate'],
          ['#F59E0B', 'Medium solve rate'],
          ['#EF4444', 'Low solve rate / High risk'],
          ['#3B82F6', 'Hotspot cluster'],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}
