import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { FolderSearch } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';
import { isDemoMode, demoFIRs } from '@/services/demoData';

interface FIR {
  crime_no: string;
  crime_type: string;
  accused_name?: string;
  assigned_officer?: string;
  days_open?: number;
  status: string;
}

export function PICases() {
  const { user } = useAuthStore()
  const [firs, setFIRs] = useState<FIR[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: 'all', crimeType: 'all', search: '', dateRange: '30d'
  })
  const [sort, setSort] = useState({ field: 'occurrence_date', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 25
  const jurisdiction = useJurisdiction()

  const fetchFIRs = () => {
    setLoading(true);
    // In demo mode, return sample FIRs immediately
    if (isDemoMode()) {
      const demo = demoFIRs();
      setFIRs(demo.map((f: any) => ({
        crime_no: f.fir_number || f.fir_no || 'KSP-2026-XXX',
        crime_type: f.crime_type || 'Unknown',
        accused_name: f.accused_name || 'Unknown',
        assigned_officer: f.assigned_officer || 'SI Meena',
        days_open: f.days_open ?? 0,
        status: f.status || 'registered',
      })));
      setTotal(demo.length);
      setLoading(false);
      return;
    }
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[filters.dateRange]
    const dateFrom = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : ''
    const params = new URLSearchParams({
      station_id: String(user?.station_id),
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sort: sort.field,
      order: sort.dir,
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.crimeType !== 'all' && { crime_type: filters.crimeType }),
      ...(filters.search && { search: filters.search }),
      ...(dateFrom && { date_from: dateFrom }),
    })

    fetch(`/api/fir-ops?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const raw = d?.firs ?? d ?? []
        setFIRs(raw.map((f: any) => ({
          crime_no: f.crime_no || f.fir_number || f.fir_id || '',
          crime_type: f.crime_type || 'Unknown',
          accused_name: f.accused_name,
          assigned_officer: f.assigned_officer || f.officer_assigned,
          days_open: f.days_open ?? 0,
          status: f.status || 'registered',
        })))
        setTotal(d?.total ?? raw.length)
        setLoading(false)
      })      .catch(e => { console.warn('[PICases] fetch error:', e); setLoading(false); })
  }

  useEffect(() => { fetchFIRs() }, [filters, sort, page, user?.station_id])

  const toggleSelect = (crimeNo: string) =>
    setSelected(prev =>
      prev.includes(crimeNo) ? prev.filter(x => x !== crimeNo) : [...prev, crimeNo]
    )

  const toggleSelectAll = () =>
    setSelected(prev => prev.length === firs.length ? [] : firs.map(f => f.crime_no))

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className="text-right px-3 py-2 cursor-pointer hover:text-text-secondary select-none"
      onClick={() => handleSort(field)}
    >
      {label} {sort.field === field ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const summary = {
    total: total,
    open: firs.filter(f => f.status === 'Open' || f.status === 'open').length,
    investigating: firs.filter(f => f.status === 'Under Investigation').length,
    chargesheeted: firs.filter(f => f.status === 'Chargesheeted').length,
    closed: firs.filter(f => f.status === 'Closed' || f.status === 'closed').length,
  }

  if (loading && firs.length === 0) return <PIPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderSearch className="w-6 h-6 text-text-primary" />
          <div>
            <h1 className="text-base font-semibold text-service-blue">Station Cases</h1>
            <p className="text-xs text-text-tertiary">{user?.station_name} · {total} total FIRs</p>
          </div>
        </div>
        <JurisdictionBanner scope={jurisdiction} />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border-primary bg-bg-card p-3 text-center">
            <p className="text-lg font-bold text-accent-cyan tabular-nums">{v.toLocaleString()}</p>
            <p className="text-[10px] text-text-tertiary mt-0.5 capitalize">{k.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-xs bg-bg-card border border-border-primary rounded-lg px-3 py-1.5
                     text-text-secondary focus:outline-none focus:border-cyan-500/40">
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="Under Investigation">Investigating</option>
          <option value="Chargesheeted">Chargesheeted</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={filters.dateRange} onChange={e => setFilters(f => ({ ...f, dateRange: e.target.value }))}
          className="text-xs bg-bg-card border border-border-primary rounded-lg px-3 py-1.5
                     text-text-secondary focus:outline-none focus:border-cyan-500/40">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <input
          type="text"
          placeholder="Search crime no / type / accused..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="flex-1 text-xs bg-bg-card border border-border-primary rounded-lg
                     px-3 py-1.5 text-text-secondary placeholder-white/20
                     focus:outline-none focus:border-cyan-500/40"
        />
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg
                        bg-cyan-500/10 border border-border-primary">
          <span className="text-xs text-accent-cyan font-medium">{selected.length} selected</span>
          <div className="flex gap-2 ml-auto">
            <button className="text-xs px-3 py-1 rounded-lg bg-hover-bg text-accent-cyan
                               border border-border-primary hover:bg-hover-bg transition-colors">
              Assign Officer
            </button>
            <button className="text-xs px-3 py-1 rounded-lg bg-bg-card text-text-secondary
                               border border-border-primary hover:bg-hover-bg transition-colors"
              onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* FIR Table */}
      <div className="rounded-xl border border-border-primary bg-bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0f1117] border-b border-border-primary">
            <tr className="text-text-tertiary text-[10px]">
              <th className="px-4 py-2 w-8">
                <input type="checkbox"
                  checked={selected.length === firs.length && firs.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-cyan-500"
                />
              </th>
              <th className="text-left px-3 py-2 w-4">!</th>
              <th className="text-left px-3 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Accused</th>
              <th className="text-left px-3 py-2">Officer</th>
              <SortHeader field="days_open" label="Days" />
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-secondary">
            {firs.map(fir => {
              const isUrgent = (fir.days_open ?? 0) > 30 || fir.status === 'under_investigation'
              return (
                <tr key={fir.crime_no}
                    className={`hover:bg-hover-bg transition-colors ${
                      selected.includes(fir.crime_no) ? 'bg-cyan-500/5' : ''
                    }`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox"
                      checked={selected.includes(fir.crime_no)}
                      onChange={() => toggleSelect(fir.crime_no)}
                      className="accent-cyan-500"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      isUrgent ? 'bg-red-400 animate-pulse' : 'bg-white/20'
                    }`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/pi/case/${encodeURIComponent(fir.crime_no)}`}
                      className="font-mono text-[10px] text-service-blue hover:text-accent-cyan">
                      {fir.crime_no}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary truncate max-w-[100px]">{fir.crime_type}</td>
                  <td className="px-3 py-2.5 text-text-secondary truncate max-w-[80px]">{fir.accused_name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-text-tertiary truncate max-w-[80px]">{fir.assigned_officer ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={
                      (fir.days_open ?? 0) > 30 ? 'text-alert-red' :
                      (fir.days_open ?? 0) > 14 ? 'text-amber-400' : 'text-text-tertiary'
                    }>{fir.days_open ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge status={fir.status} size="sm" /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/pi/case/${encodeURIComponent(fir.crime_no)}`}
                        className="text-[10px] text-service-blue/60 hover:text-service-blue">View</Link>
                      <span className="text-white/20">·</span>
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('copilot-open-with-query', { detail: { query: `Summarize case ${fir.crime_no}` } }))}
                        className="text-[10px] text-purple-400/60 hover:text-purple-400">AI</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {firs.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-text-tertiary text-xs">
                  No cases found for the selected criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>Showing {firs.length > 0 ? ((page-1)*PAGE_SIZE)+1 : 0}–{Math.min(page*PAGE_SIZE, total)} of {total}</span>
        <div className="flex gap-2">
          <button disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded-lg border border-border-primary hover:border-white/20
                       disabled:opacity-30 transition-colors">← Prev</button>
          <button disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded-lg border border-border-primary hover:border-white/20
                       disabled:opacity-30 transition-colors">Next →</button>
        </div>
      </div>
    </div>
  )
}
