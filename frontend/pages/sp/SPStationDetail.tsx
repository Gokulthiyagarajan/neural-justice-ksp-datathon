/**
 * SP Station Detail — Single station deep-dive
 * Route: /sp/station/:id
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Phone, FileText,
} from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode } from '@/services/demoData';
import maplibregl from 'maplibre-gl';

interface StationDetail {
  id: number;
  name: string;
  code: string;
  district: string;
  division: string;
  inspector_name?: string;
  officer_count?: number;
  phone?: string;
  last_reported?: string;
  fir_count?: number;
  open_cases?: number;
  solved_rate?: number;
  lat?: number;
  lng?: number;
}

interface FIR {
  crime_no: string;
  crime_type: string;
  accused_name?: string;
  status: string;
  days_open?: number;
}

export function SPStationDetail() {
  const { id } = useParams<{ id: string }>();
  const [station, setStation] = useState<StationDetail | null>(null);
  const [firs, setFirs] = useState<FIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      // Demo mode — use hardcoded station data matching SPStations list
      if (isDemoMode()) {
        const demoStations: Record<string, StationDetail> = {
          '1': { id: 1, name: 'Koramangala PS', code: 'KMG', district: 'Bengaluru Urban', division: 'Bengaluru', inspector_name: 'Inspector Ramesh', officer_count: 12, phone: '+91-080-25531234', last_reported: new Date().toISOString(), fir_count: 124, open_cases: 14, solved_rate: 68, lat: 12.935, lng: 77.624 },
          '2': { id: 2, name: 'Indiranagar PS', code: 'IND', district: 'Bengaluru Urban', division: 'Bengaluru East', inspector_name: 'Inspector Geetha', officer_count: 10, phone: '+91-080-25251234', last_reported: new Date().toISOString(), fir_count: 98, open_cases: 9, solved_rate: 75, lat: 12.978, lng: 77.640 },
          '3': { id: 3, name: 'MG Road PS', code: 'MGR', district: 'Bengaluru Urban', division: 'Bengaluru Central', inspector_name: 'Inspector Venkatesh', officer_count: 8, phone: '+91-080-25581234', last_reported: new Date().toISOString(), fir_count: 87, open_cases: 22, solved_rate: 52, lat: 12.961, lng: 77.619 },
          '4': { id: 4, name: 'Jayanagar PS', code: 'JYN', district: 'Bengaluru Urban', division: 'Bengaluru South', inspector_name: 'Inspector Lakshmi', officer_count: 9, phone: '+91-080-26631234', last_reported: new Date().toISOString(), fir_count: 73, open_cases: 11, solved_rate: 71, lat: 12.930, lng: 77.594 },
          '5': { id: 5, name: 'BTM Layout PS', code: 'BTM', district: 'Bengaluru Urban', division: 'Bengaluru South', inspector_name: 'Inspector Kumar', officer_count: 7, phone: '+91-080-26681234', last_reported: new Date().toISOString(), fir_count: 65, open_cases: 8, solved_rate: 80, lat: 12.916, lng: 77.611 },
          '6': { id: 6, name: 'HSR Layout PS', code: 'HSR', district: 'Bengaluru Urban', division: 'Bengaluru South', inspector_name: 'Inspector Divya', officer_count: 6, phone: '+91-080-26701234', last_reported: new Date().toISOString(), fir_count: 59, open_cases: 17, solved_rate: 58, lat: 12.911, lng: 77.638 },
          '7': { id: 7, name: 'Whitefield PS', code: 'WFD', district: 'Bengaluru Urban', division: 'Bengaluru East', inspector_name: 'Inspector Srinivas', officer_count: 8, phone: '+91-080-28521234', last_reported: new Date().toISOString(), fir_count: 52, open_cases: 6, solved_rate: 82, lat: 12.969, lng: 77.748 },
        };
        const station = demoStations[id];
        if (!station) { setError('Station not found'); setLoading(false); return; }

        const demoFirs: FIR[] = [
          { crime_no: 'MG-2026-001', crime_type: 'Theft', accused_name: 'Ravi Kumar', status: 'under_investigation', days_open: 12 },
          { crime_no: 'MG-2026-002', crime_type: 'Assault', accused_name: 'Suresh', status: 'chargesheeted', days_open: 45 },
          { crime_no: 'MG-2026-003', crime_type: 'Burglary', accused_name: 'Unknown', status: 'under_investigation', days_open: 8 },
          { crime_no: 'MG-2026-004', crime_type: 'Cyber Crime', accused_name: 'Unknown', status: 'registered', days_open: 2 },
          { crime_no: 'MG-2026-005', crime_type: 'Vehicle Theft', accused_name: 'Manjunath', status: 'closed', days_open: 90 },
          { crime_no: 'MG-2026-006', crime_type: 'Fraud', accused_name: 'Sandeep', status: 'under_investigation', days_open: 30 },
          { crime_no: 'MG-2026-007', crime_type: 'Drug Possession', accused_name: 'Arun', status: 'chargesheeted', days_open: 60 },
          { crime_no: 'MG-2026-008', crime_type: 'Robbery', accused_name: 'Unknown', status: 'under_investigation', days_open: 15 },
        ];

        setStation(station);
        setFirs(demoFirs);
        setLoading(false);
        return;
      }

      const [sRes, fRes] = await Promise.all([
        fetch(`/api/station/${id}`, { headers: authHeaders() }),
        fetch(`/api/fir-ops?station_id=${id}&limit=20&sort=desc`, { headers: authHeaders() }),
      ]);
      if (!sRes.ok) throw new Error(`Station fetch failed: HTTP ${sRes.status}`);
      const s = await sRes.json();
      const f = await fRes.json();
      setStation(s?.station ?? s);
      setFirs(f?.firs ?? f ?? []);
    } catch (err) {
      console.warn('[SPStationDetail] Fetch failed:', err);
      setError('Unable to load station details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Station map
  useEffect(() => {
    if (!containerRef.current || !station?.lat || !station?.lng) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [station.lng, station.lat],
      zoom: 14,
    });
    new maplibregl.Marker({ color: '#3B82F6' }).setLngLat([station.lng, station.lat]).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [station]);

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load station details" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Building2 size={40} />}
          title="Station not found"
          description="The station you're looking for doesn't exist or you don't have access."
          action={<Link to="/sp/stations" className="text-xs text-blue-400 hover:text-blue-300">← Back to all stations</Link>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/sp/stations" className="text-xs text-white/30 hover:text-white/60 inline-flex items-center gap-1">
            <ArrowLeft size={12} /> All Stations
          </Link>
          <h1 className="text-base font-semibold text-blue-400 mt-1">{station.name}</h1>
          <p className="text-xs text-white/40">{station.district} · {station.division}</p>
        </div>
        <div className="flex gap-2">
          <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10
                             text-white/50 hover:border-blue-500/30 hover:text-blue-400 transition-colors
                             inline-flex items-center gap-1">
            <Phone size={11} /> Contact Station
          </button>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10
                             text-white/50 hover:border-blue-500/30 hover:text-blue-400 transition-colors
                             inline-flex items-center gap-1">
            <FileText size={11} /> Generate Report
          </button>
        </div>
      </div>

      {/* Station info strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Inspector', value: station.inspector_name ?? '—' },
          { label: 'Officers', value: station.officer_count ?? '—' },
          { label: 'Phone', value: station.phone ?? '—' },
          { label: 'Last Report', value: station.last_reported ? new Date(station.last_reported).toLocaleDateString() : '—' },
        ].map(f => (
          <div key={f.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] text-white/30">{f.label}</p>
            <p className="text-sm text-white/70 mt-1">{f.value}</p>
          </div>
        ))}
      </div>

      {/* KPI + Map */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total FIRs', value: station.fir_count ?? '—', color: station.fir_count && station.fir_count > 100 ? 'amber' : 'blue' },
              { label: 'Open Cases', value: station.open_cases ?? '—', color: station.open_cases && station.open_cases > 20 ? 'red' : station.open_cases && station.open_cases > 10 ? 'amber' : 'blue' },
              { label: 'Solved Rate', value: station.solved_rate != null ? `${station.solved_rate}%` : '—', color: station.solved_rate != null && station.solved_rate >= 70 ? 'green' : station.solved_rate != null && station.solved_rate >= 50 ? 'amber' : 'red' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className={`text-2xl font-bold ${
                  k.color === 'blue' ? 'text-blue-400' :
                  k.color === 'green' ? 'text-green-400' :
                  k.color === 'amber' ? 'text-amber-400' : 'text-red-400'
                }`}>{k.value}</p>
                <p className="text-[10px] text-white/40 mt-1">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-white/10 overflow-hidden" style={{ height: 220 }}>
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>

      {/* Recent FIRs */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-medium text-white/70">Recent FIRs — Last 20</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Accused</th>
              <th className="text-right px-3 py-2">Days Open</th>
              <th className="text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {firs.map(fir => (
              <tr key={fir.crime_no} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2.5 font-mono text-[10px] text-blue-400">{fir.crime_no}</td>
                <td className="px-3 py-2.5 text-white/60 truncate max-w-[100px]">{fir.crime_type}</td>
                <td className="px-3 py-2.5 text-white/40 truncate max-w-[80px]">{fir.accused_name ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className={(fir.days_open ?? 0) > 30 ? 'text-red-400' : 'text-white/40'}>
                    {fir.days_open ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center"><StatusBadge status={fir.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
