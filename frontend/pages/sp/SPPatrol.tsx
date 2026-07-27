/**
 * SP Patrol — Patrol recommendations + zone assignment
 * Route: /sp/patrol
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import maplibregl from 'maplibre-gl';

interface PatrolRec {
  id?: string;
  area_name: string;
  risk_level: 'high' | 'medium' | 'low';
  justification: string;
  station_name?: string;
  lat?: number;
  lng?: number;
}

export function SPPatrol() {
  const user = useAuthStore(s => s.user);
  const [recommendations, setRecommendations] = useState<PatrolRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/intelligence/v1/patrol-recommendations?district_id=${user?.district_id ?? 'BENGALURU_URBAN'}&limit=12`,
        { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setRecommendations(d?.recommendations ?? d ?? []);
    } catch (err) {
      console.warn('[SPPatrol] Fetch failed:', err);
      setError('Unable to load patrol recommendations');
    } finally {
      setLoading(false);
    }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!containerRef.current || !recommendations.length) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.35 } }],
      },
      center: [76.5, 13.5], zoom: 10,
    });
    map.on('load', () => {
      recommendations.filter(r => r.lat && r.lng).forEach((r, i) => {
        const color = r.risk_level === 'high' ? '#EF4444' : r.risk_level === 'medium' ? '#F59E0B' : '#22C55E';
        const el = document.createElement('div');
        el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;cursor:pointer`;
        el.textContent = String(i + 1);
        new maplibregl.Marker({ element: el }).setLngLat([r.lng!, r.lat!])
          .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`
            <div style="background:#1a1d2e;padding:10px;border-radius:8px;color:white;max-width:200px">
              <p style="font-weight:600;font-size:12px">${r.area_name}</p>
              <p style="font-size:10px;color:#aaa">${r.justification}</p>
              <p style="font-size:10px;color:${color};font-weight:500">${r.risk_level} risk</p>
            </div>`))
          .addTo(map);
      });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [recommendations]);

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load patrol recommendations" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Navigation size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-blue-400">Patrol Recommendations</h1>
          <p className="text-xs text-white/40">
            AI-generated · {user?.district_name ?? 'District'} · {recommendations.length} zones
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          icon={<Navigation size={40} />}
          title="No patrol recommendations"
          description="Recommendations will be generated as crime data accumulates in this district."
        />
      ) : (
        <>
      {/* Top recommendation cards */}
      <div className="grid grid-cols-3 gap-3">
        {recommendations.slice(0, 6).map((rec, i) => (
          <div key={rec.id ?? i}
            className={`rounded-xl border p-4 ${
              rec.risk_level === 'high' ? 'border-red-500/30 bg-red-500/5' :
              rec.risk_level === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
              'border-green-500/20 bg-green-500/5'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                rec.risk_level === 'high' ? 'bg-red-500/20 text-red-400' :
                rec.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                'bg-green-500/20 text-green-400'
              }`}>Zone {i + 1} · {rec.risk_level}</span>
            </div>
            <p className="text-sm font-medium text-white/80 mb-1 truncate">{rec.area_name}</p>
            <p className="text-[10px] text-white/40 line-clamp-2">{rec.justification}</p>
            <p className="text-[10px] text-white/30 mt-2">{rec.station_name}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ height: 380 }}>
        <div ref={containerRef} className="h-full w-full" />
      </div>

      </>
      )}

      {/* Assignment table */}
      {recommendations.length > 0 && (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-medium text-white/70">Zone Assignments</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Zone</th>
              <th className="text-left px-3 py-2">Area</th>
              <th className="text-left px-3 py-2">Responsible Station</th>
              <th className="text-center px-3 py-2">Risk Level</th>
              <th className="text-right px-3 py-2">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recommendations.map((r, i) => (
              <tr key={r.id ?? i} className="hover:bg-white/5">
                <td className="px-4 py-2.5 font-medium text-white/60">{i + 1}</td>
                <td className="px-3 py-2.5 text-white/70 truncate max-w-[160px]">{r.area_name}</td>
                <td className="px-3 py-2.5 text-white/50">{r.station_name ?? '—'}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    r.risk_level === 'high' ? 'bg-red-500/20 text-red-400' :
                    r.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{r.risk_level}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-white/40">{i + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
