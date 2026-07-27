/**
 * SP Stations — All stations in district (table + map view)
 * Route: /sp/stations
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Map as MapIcon, Table2, Search,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode } from '@/services/demoData';
import { fetchStationPerformance } from '@/services/dashboardApi';
import maplibregl from 'maplibre-gl';

interface StationSummary {
  id: number;
  name: string;
  code: string;
  fir_count: number;
  open_cases: number;
  solved_rate: number;
  officer_count: number;
  last_reported: string | null;
  status: 'active' | 'delayed' | 'offline';
  lat?: number;
  lng?: number;
}

type SortField = 'fir_count' | 'open_cases' | 'solved_rate' | 'officer_count';

export function SPStations() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [view, setView] = useState<'table' | 'map'>('table');
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'fir_count', dir: 'desc' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isDemoMode()) {
        setStations([
          { id: 1, name: 'Koramangala PS', code: 'KMG', fir_count: 124, open_cases: 14, solved_rate: 68, officer_count: 12, last_reported: new Date().toISOString(), status: 'active', lat: 12.935, lng: 77.624 },
          { id: 2, name: 'Indiranagar PS', code: 'IND', fir_count: 98, open_cases: 9, solved_rate: 75, officer_count: 10, last_reported: new Date().toISOString(), status: 'active', lat: 12.978, lng: 77.640 },
          { id: 3, name: 'MG Road PS', code: 'MGR', fir_count: 87, open_cases: 22, solved_rate: 52, officer_count: 8, last_reported: new Date().toISOString(), status: 'delayed', lat: 12.961, lng: 77.619 },
          { id: 4, name: 'Jayanagar PS', code: 'JYN', fir_count: 73, open_cases: 11, solved_rate: 71, officer_count: 9, last_reported: new Date().toISOString(), status: 'active', lat: 12.930, lng: 77.594 },
          { id: 5, name: 'BTM Layout PS', code: 'BTM', fir_count: 65, open_cases: 8, solved_rate: 80, officer_count: 7, last_reported: new Date().toISOString(), status: 'active', lat: 12.916, lng: 77.611 },
          { id: 6, name: 'HSR Layout PS', code: 'HSR', fir_count: 59, open_cases: 17, solved_rate: 58, officer_count: 6, last_reported: new Date().toISOString(), status: 'active', lat: 12.911, lng: 77.638 },
          { id: 7, name: 'Whitefield PS', code: 'WFD', fir_count: 52, open_cases: 6, solved_rate: 82, officer_count: 8, last_reported: new Date().toISOString(), status: 'active', lat: 12.969, lng: 77.748 },
        ]);
        setLoading(false);
        return;
      }
      const result = await fetchStationPerformance(user?.district_id ?? 'BENGALURU_URBAN');
      setStations(result.stations.map(s => ({
        ...s,
        lat: undefined as number | undefined,
        lng: undefined as number | undefined,
      })));
    } catch (err) {
      console.warn('[SPStations] Fetch failed:', err);
      // API error — fall back to demo data
      setStations([
        { id: 1, name: 'Koramangala PS', code: 'KMG', fir_count: 124, open_cases: 14, solved_rate: 68, officer_count: 12, last_reported: new Date().toISOString(), status: 'active', lat: 12.935, lng: 77.624 },
        { id: 2, name: 'Indiranagar PS', code: 'IND', fir_count: 98, open_cases: 9, solved_rate: 75, officer_count: 10, last_reported: new Date().toISOString(), status: 'active', lat: 12.978, lng: 77.640 },
        { id: 3, name: 'MG Road PS', code: 'MGR', fir_count: 87, open_cases: 22, solved_rate: 52, officer_count: 8, last_reported: new Date().toISOString(), status: 'delayed', lat: 12.961, lng: 77.619 },
        { id: 4, name: 'Jayanagar PS', code: 'JYN', fir_count: 73, open_cases: 11, solved_rate: 71, officer_count: 9, last_reported: new Date().toISOString(), status: 'active', lat: 12.930, lng: 77.594 },
        { id: 5, name: 'BTM Layout PS', code: 'BTM', fir_count: 65, open_cases: 8, solved_rate: 80, officer_count: 7, last_reported: new Date().toISOString(), status: 'active', lat: 12.916, lng: 77.611 },
        { id: 6, name: 'HSR Layout PS', code: 'HSR', fir_count: 59, open_cases: 17, solved_rate: 58, officer_count: 6, last_reported: new Date().toISOString(), status: 'active', lat: 12.911, lng: 77.638 },
        { id: 7, name: 'Whitefield PS', code: 'WFD', fir_count: 52, open_cases: 6, solved_rate: 82, officer_count: 8, last_reported: new Date().toISOString(), status: 'active', lat: 12.969, lng: 77.748 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  const filtered = stations
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sort.field] ?? 0;
      const bv = b[sort.field] ?? 0;
      return sort.dir === 'desc' ? bv - av : av - bv;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* handleSort used inline in JSX */


  if (loading) return <SPPageSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Unable to load stations"
          description="Please try again. If the issue persists, contact support."
          onRetry={load}
          retryLabel="Retry"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Building2 size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-blue-400">District Stations</h1>
            <p className="text-xs text-white/40">
              {user?.district_name ?? 'District'} · {stations.length} police stations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['table', 'map'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${
                view === v
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}>{v === 'table' ? <><Table2 size={12} className="inline mr-1" />Table</> : <><MapIcon size={12} className="inline mr-1" />Map</>}</button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Stations', value: stations.length, color: 'blue' },
          { label: 'Active', value: stations.filter(s => s.status === 'active').length, color: 'green' },
          { label: 'High FIR Load (>50)', value: stations.filter(s => s.fir_count > 50).length, color: 'amber' },
          { label: 'Low Solved (<40%)', value: stations.filter(s => s.solved_rate < 40).length, color: 'red' },
        ].map(s => (
          <div key={s.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${
              s.color === 'blue' ? 'text-blue-400' :
              s.color === 'green' ? 'text-green-400' :
              s.color === 'amber' ? 'text-amber-400' : 'text-red-400'
            }`}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search with icon */}
      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        <input type="text" placeholder="Search station..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5
                     text-white/60 placeholder-white/20 focus:outline-none
                     focus:border-blue-500/40 w-full" />
      </div>

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 size={40} />}
              title="No stations found"
              description={search ? 'Try a different search term' : 'No stations in this district'}
            />
          ) : (
            <>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0f1117] border-b border-white/10">
                  <tr className="text-white/30 text-[10px]">
                    <th className="text-left px-4 py-2">Station</th>
                    {[
                      { field: 'fir_count' as const, label: 'FIRs' },
                      { field: 'open_cases' as const, label: 'Open' },
                      { field: 'solved_rate' as const, label: 'Solved%' },
                      { field: 'officer_count' as const, label: 'Officers' },
                    ].map(col => (
                      <th key={col.field}
                        className="text-right px-3 py-2 cursor-pointer hover:text-white/60"
                        onClick={() => {
                          setSort(prev => ({
                            field: col.field,
                            dir: prev.field === col.field && prev.dir === 'asc' ? 'desc' : 'asc',
                          }));
                        }}>
                        {col.label} {sort.field === col.field ? (
                          sort.dir === 'asc' ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />
                        ) : ''}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-center px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paged.map(station => (
                    <tr key={station.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/sp/station/${station.id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-white/80 font-medium truncate max-w-[160px]">{station.name}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-white/60">{station.fir_count}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className={station.open_cases > 20 ? 'text-red-400' : 'text-white/50'}>
                          {station.open_cases}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className={`font-medium ${
                          station.solved_rate >= 70 ? 'text-green-400' :
                          station.solved_rate >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>{station.solved_rate}%</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-white/50">{station.officer_count}</td>
                      <td className="px-3 py-3 text-center">
                        <div className={`inline-block h-2 w-2 rounded-full ${
                          station.status === 'active' ? 'bg-green-400' :
                          station.status === 'delayed' ? 'bg-amber-400' : 'bg-red-400'
                        }`} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Link to={`/sp/station/${station.id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-blue-400/60 hover:text-blue-400">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/5">
                  <span className="text-[10px] text-white/30">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/60 disabled:opacity-30"
                    >Prev</button>
                    <span className="text-[10px] px-2 py-1 text-white/30">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/60 disabled:opacity-30"
                    >Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MAP VIEW */}
      {view === 'map' && (
        <SPStationsMap stations={filtered} />
      )}
    </div>
  );
}

function SPStationsMap({ stations }: { stations: StationSummary[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || !stations.length) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: 'District Stations Map',
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#f0f2f5' } },
          { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.85 } },
        ],
      },
      center: [76.5, 13.5],
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      stations.filter(s => s.lat && s.lng).forEach(s => {
        const color = s.solved_rate >= 70 ? '#22C55E' :
          s.solved_rate >= 50 ? '#F59E0B' : '#EF4444';
        const el = document.createElement('div');
        el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;cursor:pointer`;
        new maplibregl.Marker({ element: el })
          .setLngLat([s.lng!, s.lat!])
          .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`
            <div style="background:#1a1d2e;padding:10px;border-radius:8px;color:white;min-width:160px">
              <p style="font-weight:600;font-size:12px">${s.name}</p>
              <p style="font-size:11px;color:#aaa">${s.fir_count} FIRs · ${s.solved_rate}% solved</p>
              <a href="/sp/station/${s.id}" style="font-size:10px;color:#60a5fa">View details →</a>
            </div>
          `)).addTo(map);
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [stations]);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" style={{ height: 520 }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
