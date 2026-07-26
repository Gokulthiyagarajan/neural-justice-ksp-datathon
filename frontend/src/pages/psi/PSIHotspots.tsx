import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PSIPageSkeleton } from '@/components/psi/PSIPageSkeleton';
import { useAuthStore } from '@/store/authStore';
import { isDemoMode, demoHotspots } from '@/services/demoData';

const PURPLE = '#8B5CF6';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Hotspot {
  id?: string;
  lng: number;
  lat: number;
  crime_type?: string;
  incident_count?: number;
  risk_level?: string;
  area_name?: string;
}

const CRIME_FILTERS = ['All', 'Theft', 'Assault', 'Fraud', 'Robbery', 'Other'];

// ═══════════════════════════════════════════════════════════════════════════════
// PSI HOTSPOTS MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIHotspots() {
  const user = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [crimeFilter, setCrimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In demo mode, return sample hotspots immediately
      if (isDemoMode()) {
        setHotspots(demoHotspots());
        setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/geo/v1/map/hotspots?district_id=${user?.district_id ?? user?.station_id ?? 'BENGALURU_URBAN'}&limit=50`,
        { headers: authHeaders() },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[PSIHotspots] API returned', res.status, body);
        setHotspots([]);
        setError(body ? `Server returned ${res.status}: ${body.slice(0, 120)}` : 'No hotspot data available.');
        return;
      }
      const body = await res.text();
      if (!body || body.trim().length === 0) {
        setHotspots([]);
        setError('Empty response received from server');
        return;
      }
      const d = JSON.parse(body);
      // Correct endpoint wraps hotspots in { status: 'ok', data: { hotspots: [...] }, metadata }
      const items = d?.data?.hotspots ?? d?.hotspots ?? [];
      if (!Array.isArray(items)) {
        setHotspots([]);
        setError('Unexpected response format from server');
        return;
      }
      setHotspots(items);
    } catch (e) {
      // Fallback to demo data on any fetch failure
      console.warn('[PSIHotspots] fetch failed, using demo data:', e);
      setHotspots(demoHotspots());
    } finally {
      setLoading(false);
    }
  }, [user?.station_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build and refresh map when hotspots load
  useEffect(() => {
    if (!containerRef.current || loading) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const first = hotspots.find((h) => h.lat && h.lng);
    const center: [number, number] = first ? [first.lng, first.lat] : [77.6, 12.97];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: 'Hotspot Map',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#f0f2f5' },
        }, {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          paint: { 'raster-opacity': 0.85 },
        }],
      },
      center,
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      const filtered = crimeFilter === 'all'
        ? hotspots
        : hotspots.filter((h) => (h.crime_type || '').toLowerCase() === crimeFilter);

      const features = filtered
        .filter((h) => h.lat && h.lng)
        .map((h) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] as [number, number] },
          properties: {
            crime_type: h.crime_type || 'Unknown',
            count: h.incident_count ?? 1,
            risk_level: h.risk_level ?? 'medium',
            id: h.id ?? Math.random().toString(36).slice(2),
          },
        }));

      if (features.length === 0) return;

      map.addSource('hotspots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'hotspots',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], PURPLE, 5, '#EF4444', 10, '#7C3AED'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40],
          'circle-opacity': 0.7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'hotspots',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'hotspots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match', ['get', 'risk_level'],
            'high', '#EF4444',
            'medium', '#F59E0B',
            '#22C55E',
          ],
          'circle-radius': 8,
          'circle-opacity': 0.8,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
      });

      map.on('click', 'unclustered-point', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#1a1d2e;padding:10px;border-radius:8px;color:white;min-width:140px">
              <p style="font-size:12px;font-weight:600;margin:0 0 4px">${props.crime_type}</p>
              <p style="font-size:11px;color:#aaa;margin:0">${props.count} incident${props.count > 1 ? 's' : ''}</p>
              <p style="font-size:10px;color:${props.risk_level === 'high' ? '#EF4444' : props.risk_level === 'medium' ? '#F59E0B' : '#22C55E'};margin:4px 0 0;font-weight:500">${props.risk_level} risk</p>
            </div>
          `)
          .addTo(map);
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [hotspots, crimeFilter, loading]);

  if (loading) return <PSIPageSkeleton />;

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-base font-semibold" style={{ color: PURPLE }}>Station Hotspot Map</h1>
            <p className="text-xs text-white/40">
              Station-area crime density · {hotspots.length} hotspots detected
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {CRIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setCrimeFilter(f.toLowerCase())}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                crimeFilter === f.toLowerCase()
                  ? 'text-purple-300 border border-purple-500/40'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}
              style={crimeFilter === f.toLowerCase() ? { background: 'rgba(139,92,246,0.12)' } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span className="flex-1">Unable to load hotspots. Please try again.</span>
          <button onClick={fetchData} className="text-xs hover:underline">
            <RefreshCw size={12} className="inline mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Map */}
      <div
        className="rounded-xl border border-white/10 overflow-hidden"
        style={{ height: 500 }}
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Top 5 hotspot zones */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-xs font-medium text-white/70 mb-4">Top 5 Hotspot Zones</h3>
        <div className="space-y-3">
          {hotspots
            .sort((a, b) => (b.incident_count ?? 0) - (a.incident_count ?? 0))
            .slice(0, 5)
            .map((h, i) => (
              <div key={h.id ?? i} className="flex items-center gap-3">
                <span className="text-[10px] text-white/20 w-3">{i + 1}</span>
                <div
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    h.risk_level === 'high' ? 'bg-red-400' :
                    h.risk_level === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                />
                <span className="text-xs text-white/70 flex-1 truncate">
                  {h.area_name ?? `Zone ${i + 1}`}
                </span>
                <span className="text-xs text-white/40">{h.crime_type}</span>
                <span className="text-xs font-medium text-white/70 tabular-nums">
                  {h.incident_count ?? 0} incidents
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-400" /> Low
        </span>
      </div>
    </div>
  );
}
