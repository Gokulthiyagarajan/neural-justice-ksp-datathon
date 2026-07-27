/**
 * SP Officers — District officer roster (read-only)
 * Route: /sp/officers
 */
import { useEffect, useState, useCallback } from 'react';
import { Users, Download, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode } from '@/services/demoData';

interface Officer {
  name: string;
  kgid?: string;
  rank?: string;
  station_name?: string;
  cases_handled?: number;
  solved_rate?: number;
  status?: string;
}

function officersToCSV(officers: Officer[]): string {
  const header = 'Name,KGID,Rank,Station,Cases Handled,Solved %,Status';
  const rows = officers.map(o =>
    [o.name, o.kgid ?? '', o.rank ?? '', o.station_name ?? '', o.cases_handled ?? '', o.solved_rate ?? '', o.status ?? ''].join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function SPOfficers() {
  const user = useAuthStore(s => s.user);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [stationFilter, setStationFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      if (isDemoMode()) {
        setOfficers([
          { name: 'SI Meena K', kgid: 'KSP-001', rank: 'Sub-Inspector', station_name: 'Koramangala PS', cases_handled: 12, solved_rate: 75, status: 'active' },
          { name: 'ASI Prakash R', kgid: 'KSP-002', rank: 'Assistant Sub-Inspector', station_name: 'Koramangala PS', cases_handled: 8, solved_rate: 62, status: 'active' },
          { name: 'HC Ramesh N', kgid: 'KSP-003', rank: 'Head Constable', station_name: 'Indiranagar PS', cases_handled: 15, solved_rate: 80, status: 'active' },
          { name: 'PC Vikram S', kgid: 'KSP-004', rank: 'Police Constable', station_name: 'Indiranagar PS', cases_handled: 6, solved_rate: 50, status: 'active' },
          { name: 'SI Venkatesh M', kgid: 'KSP-005', rank: 'Sub-Inspector', station_name: 'MG Road PS', cases_handled: 20, solved_rate: 85, status: 'active' },
          { name: 'ASI Geeta P', kgid: 'KSP-006', rank: 'Assistant Sub-Inspector', station_name: 'MG Road PS', cases_handled: 10, solved_rate: 70, status: 'active' },
          { name: 'PC Arun K', kgid: 'KSP-007', rank: 'Police Constable', station_name: 'Jayanagar PS', cases_handled: 4, solved_rate: 25, status: 'active' },
          { name: 'SI Priya S', kgid: 'KSP-008', rank: 'Sub-Inspector', station_name: 'Jayanagar PS', cases_handled: 18, solved_rate: 72, status: 'active' },
          { name: 'HC Manoj T', kgid: 'KSP-009', rank: 'Head Constable', station_name: 'BTM Layout PS', cases_handled: 9, solved_rate: 55, status: 'active' },
          { name: 'PC Sunita R', kgid: 'KSP-010', rank: 'Police Constable', station_name: 'HSR Layout PS', cases_handled: 7, solved_rate: 42, status: 'active' },
          { name: 'ASI Karthik S', kgid: 'KSP-011', rank: 'Assistant Sub-Inspector', station_name: 'Whitefield PS', cases_handled: 14, solved_rate: 78, status: 'active' },
          { name: 'PC Lavanya M', kgid: 'KSP-012', rank: 'Police Constable', station_name: 'Whitefield PS', cases_handled: 5, solved_rate: 40, status: 'active' },
        ]);
        setLoading(false);
        return;
      }
      // Fetch officers across all stations in the district
      const stationsRes = await fetch(`/api/dashboard/stations?district_code=${user?.district_id ?? 'BENGALURU_URBAN'}`, { headers: authHeaders() });
      if (!stationsRes.ok) throw new Error(`HTTP ${stationsRes.status}`);
      const stationsData = await stationsRes.json();
      const stations = (stationsData?.stations ?? stationsData ?? []) as any[];
      
      // For each station, fetch officers
      const officerPromises = stations.slice(0, 20).map(async (s: any) => {
        try {
          const oRes = await fetch(`/api/station/${s.id}/officers`, { headers: authHeaders() });
          if (!oRes.ok) return [];
          const oData = await oRes.json();
          const officers = oData?.officers ?? oData ?? [];
          if (Array.isArray(officers)) {
            return officers.map((o: any) => ({
              name: o.name ?? o.officer_name ?? 'Unknown',
              kgid: o.kgid ?? o.officer_id?.toString() ?? '',
              rank: o.rank ?? o.designation ?? 'Constable',
              station_name: s.name,
              cases_handled: o.cases_handled ?? 0,
              solved_rate: o.solved_rate ?? 0,
              status: o.status ?? 'active',
            }));
          }
          return [];
        } catch { console.warn('[SPOfficers] Per-station officer fetch failed for station', s.id); return []; }
      });
      const nested = await Promise.all(officerPromises);
      const allOfficers = nested.flat();
      setOfficers(allOfficers);

    } catch (err) {
      setError('Unable to load officers');
    } finally { setLoading(false); }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  const uniqueStations = [...new Set(officers.map(o => o.station_name).filter(Boolean))] as string[];
  const uniqueRanks = [...new Set(officers.map(o => o.rank).filter(Boolean))] as string[];

  const filtered = officers.filter(o => {
    const matchStation = stationFilter === 'all' || o.station_name === stationFilter;
    const matchRank = rankFilter === 'all' || o.rank === rankFilter;
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.kgid?.includes(search);
    return matchStation && matchRank && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return <div className="p-6"><ErrorState title="Unable to load officers" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" /></div>;
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-blue-400">District Officer Roster</h1>
            <p className="text-xs text-white/40">{user?.district_name ?? 'District'} · {officers.length} officers</p>
          </div>
        </div>
        <div className="flex gap-2">

          <button
            onClick={() => downloadCSV(officersToCSV(filtered), `officer-roster-${user?.district_id ?? 'district'}.csv`)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:border-blue-500/30 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Officers', value: officers.length },
          { label: 'Stations', value: uniqueStations.length },
          { label: 'Inspectors', value: officers.filter(o => o.rank === 'Inspector').length },
          { label: 'Constables', value: officers.filter(o => o.rank === 'Constable').length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-xl font-bold text-blue-300">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" placeholder="Search by name or KGID..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full text-xs bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white/60 placeholder-white/20 focus:outline-none focus:border-blue-500/40" />
        </div>
        <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
          <option value="all">All Stations</option>
          {uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={rankFilter} onChange={e => { setRankFilter(e.target.value); setPage(1); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
          <option value="all">All Ranks</option>
          {uniqueRanks.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Officers table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No officers match your filters"
          description="Try adjusting station or rank filters"
        />
      ) : (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-3 py-2">Rank</th>
              <th className="text-left px-3 py-2">Station</th>
              <th className="text-right px-3 py-2">Cases Handled</th>
              <th className="text-right px-3 py-2">Solved%</th>
              <th className="text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paged.map((o, i) => (
              <tr key={o.kgid ?? i} className="hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <p className="text-white/80 font-medium">{o.name}</p>
                  {o.kgid && <p className="text-[9px] text-white/30 font-mono">{o.kgid}</p>}
                </td>
                <td className="px-3 py-2.5 text-white/50">{o.rank ?? '—'}</td>
                <td className="px-3 py-2.5 text-white/50 truncate max-w-[120px]">{o.station_name ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-white/50">{o.cases_handled ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className={`font-medium ${(o.solved_rate ?? 0) >= 70 ? 'text-green-400' : (o.solved_rate ?? 0) >= 50 ? 'text-amber-400' : 'text-white/40'}`}>
                    {o.solved_rate != null ? `${o.solved_rate}%` : '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className={`inline-block h-1.5 w-1.5 rounded-full ${o.status === 'active' ? 'bg-green-400' : 'bg-white/20'}`} />
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/60 disabled:opacity-30">Prev</button>
              <span className="text-[10px] px-2 py-1 text-white/30">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/60 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
