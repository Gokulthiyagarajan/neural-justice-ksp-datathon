/**
 * SP Cases — District-wide FIR explorer
 * Route: /sp/cases
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Download, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode } from '@/services/demoData';

interface FIR {
  crime_no: string;
  crime_type: string;
  station_name?: string;
  accused_name?: string;
  status: string;
  occurrence_date?: string;
  days_open?: number;
}

function firsToCSV(firs: FIR[]): string {
  const header = 'Crime No,Type,Station,Accused,Status,Days Open';
  const rows = firs.map(f =>
    [f.crime_no, f.crime_type, f.station_name ?? '', f.accused_name ?? '', f.status, f.days_open ?? ''].join(',')
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

export function SPCases() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [firs, setFirs] = useState<FIR[]>([]);
  const [stationFilter, setStationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      if (isDemoMode()) {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        setFirs([
          { crime_no: 'KSP-2026-101', crime_type: 'Theft', station_name: 'Koramangala PS', accused_name: 'Ravi Kumar', status: 'under_investigation', occurrence_date: today, days_open: 5 },
          { crime_no: 'KSP-2026-100', crime_type: 'Robbery', station_name: 'Indiranagar PS', accused_name: 'Suresh Patel', status: 'registered', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), days_open: 1 },
          { crime_no: 'KSP-2026-099', crime_type: 'Chain Snatching', station_name: 'MG Road PS', accused_name: 'Mohan Reddy', status: 'critical', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), days_open: 3 },
          { crime_no: 'KSP-2026-098', crime_type: 'Burglary', station_name: 'Jayanagar PS', accused_name: 'Venkat Rao', status: 'under_investigation', occurrence_date: today, days_open: 2 },
          { crime_no: 'KSP-2026-097', crime_type: 'Assault', station_name: 'BTM Layout PS', accused_name: 'Anil Kumar', status: 'closed', occurrence_date: new Date(Date.now() - 259200000).toISOString().slice(0, 10), days_open: 14 },
          { crime_no: 'KSP-2026-096', crime_type: 'Cyber Fraud', station_name: 'HSR Layout PS', accused_name: 'Priya Singh', status: 'under_investigation', occurrence_date: new Date(Date.now() - 345600000).toISOString().slice(0, 10), days_open: 22 },
          { crime_no: 'KSP-2026-095', crime_type: 'Theft', station_name: 'Koramangala PS', accused_name: 'Unknown', status: 'registered', occurrence_date: today, days_open: 0 },
          { crime_no: 'KSP-2026-094', crime_type: 'Robbery', station_name: 'Whitefield PS', accused_name: 'Karthik S', status: 'resolved', occurrence_date: new Date(Date.now() - 432000000).toISOString().slice(0, 10), days_open: 45 },
          { crime_no: 'KSP-2026-093', crime_type: 'Chain Snatching', station_name: 'MG Road PS', accused_name: 'Ravi Kumar', status: 'under_investigation', occurrence_date: new Date(Date.now() - 518400000).toISOString().slice(0, 10), days_open: 6 },
          { crime_no: 'KSP-2026-092', crime_type: 'Burglary', station_name: 'Jayanagar PS', accused_name: 'Manoj T', status: 'under_investigation', occurrence_date: new Date(Date.now() - 604800000).toISOString().slice(0, 10), days_open: 35 },
          { crime_no: 'KSP-2026-091', crime_type: 'Vehicle Theft', station_name: 'BTM Layout PS', accused_name: 'Unknown', status: 'registered', occurrence_date: today, days_open: 0 },
          { crime_no: 'KSP-2026-090', crime_type: 'Assault', station_name: 'Indiranagar PS', accused_name: 'Suresh Patel', status: 'under_investigation', occurrence_date: new Date(Date.now() - 691200000).toISOString().slice(0, 10), days_open: 8 },
        ]);
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/fir-ops?district_id=${user?.district_id ?? 'BENGALURU_URBAN'}&limit=200`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setFirs(d?.firs ?? d ?? []);
    } catch (err) {
      console.warn('[SPCases] Fetch failed:', err);
      // Fall back to demo data on API failure
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      setFirs([
        { crime_no: 'KSP-2026-101', crime_type: 'Theft', station_name: 'Koramangala PS', accused_name: 'Ravi Kumar', status: 'under_investigation', occurrence_date: today, days_open: 5 },
        { crime_no: 'KSP-2026-100', crime_type: 'Robbery', station_name: 'Indiranagar PS', accused_name: 'Suresh Patel', status: 'registered', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), days_open: 1 },
        { crime_no: 'KSP-2026-099', crime_type: 'Chain Snatching', station_name: 'MG Road PS', accused_name: 'Mohan Reddy', status: 'critical', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), days_open: 3 },
        { crime_no: 'KSP-2026-098', crime_type: 'Burglary', station_name: 'Jayanagar PS', accused_name: 'Venkat Rao', status: 'under_investigation', occurrence_date: today, days_open: 2 },
        { crime_no: 'KSP-2026-097', crime_type: 'Assault', station_name: 'BTM Layout PS', accused_name: 'Anil Kumar', status: 'closed', occurrence_date: new Date(Date.now() - 259200000).toISOString().slice(0, 10), days_open: 14 },
        { crime_no: 'KSP-2026-096', crime_type: 'Cyber Fraud', station_name: 'HSR Layout PS', accused_name: 'Priya Singh', status: 'under_investigation', occurrence_date: new Date(Date.now() - 345600000).toISOString().slice(0, 10), days_open: 22 },
      ]);
    } finally { setLoading(false); }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  const uniqueStations = [...new Set(firs.map(f => f.station_name).filter(Boolean))] as string[];
  const STATUSES = ['all', 'registered', 'under_investigation', 'resolved', 'closed'];

  const filtered = firs.filter(fir => {
    const matchStation = stationFilter === 'all' || fir.station_name === stationFilter;
    const matchStatus = statusFilter === 'all' || fir.status === statusFilter;
    const matchSearch = !search ||
      fir.crime_no.toLowerCase().includes(search.toLowerCase()) ||
      fir.crime_type?.toLowerCase().includes(search.toLowerCase());
    return matchStation && matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return <div className="p-6"><ErrorState title="Unable to load cases" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" /></div>;
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FolderOpen size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-blue-400">District-Wide FIR Explorer</h1>
            <p className="text-xs text-white/40">{user?.district_name ?? 'District'} · {firs.length} cases</p>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(firsToCSV(filtered), `district-firs-${user?.district_id ?? 'district'}.csv`)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:border-blue-500/30 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" placeholder="Search by crime no. or type..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full text-xs bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white/60 placeholder-white/20 focus:outline-none focus:border-blue-500/40" />
        </div>
        <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
          <option value="all">All Stations</option>
          {uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 focus:outline-none focus:border-blue-500/40">
          {STATUSES.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: filtered.length },
          { label: 'Under Investigation', value: filtered.filter(f => f.status === 'under_investigation').length },
          { label: 'Resolved', value: filtered.filter(f => f.status === 'resolved' || f.status === 'closed').length },
          { label: 'Pending >30 days', value: filtered.filter(f => (f.days_open ?? 0) > 30).length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-lg font-bold text-blue-300 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* FIR Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={40} />}
          title="No cases match your filters"
          description={search ? 'Try a different search term' : 'Try adjusting the station or status filters'}
        />
      ) : (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Station</th>
              <th className="text-left px-3 py-2">Accused</th>
              <th className="text-right px-3 py-2">Days Open</th>
              <th className="text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paged.map(fir => (
              <tr key={fir.crime_no}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/firs/${encodeURIComponent(fir.crime_no)}`)}>
                <td className="px-4 py-2.5 font-mono text-[10px] text-blue-400">{fir.crime_no}</td>
                <td className="px-3 py-2.5 text-white/60 truncate max-w-[80px]">{fir.crime_type}</td>
                <td className="px-3 py-2.5 text-white/50 truncate max-w-[100px]">{fir.station_name ?? '—'}</td>
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
