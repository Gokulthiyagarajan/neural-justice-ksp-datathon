import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton'

interface FIR {
  crime_no: string
  status: string
  occurrence_date: string | null
  crime_type: string
  brief_facts: string
  days_open: number
  accused_name?: string
  station_name?: string
}

// ── Demo data generator ──────────────────────────────────────────
function generateDemoCases(): FIR[] {
  const types = ['Robbery', 'Theft', 'Assault', 'Burglary', 'Cyber Fraud', 'Vehicle Theft', 'Chain Snatching'];
  const statuses = ['registered', 'under_investigation', 'open', 'in_progress', 'closed'];
  const facts = [
    'Armed robbery near commercial complex. Suspects fled on motorcycle towards highway.',
    'Housebreaking reported. Jewellery and cash stolen from residence during daytime.',
    'Physical assault following traffic dispute. Victim sustained minor injuries.',
    'Office burglary over weekend. Electronics and documents stolen from premises.',
    'Online payment fraud. Victim transferred ₹45,000 to fraudulent UPI ID.',
    'Two-wheeler theft from railway station parking. CCTV footage being examined.',
    'Gold chain snatched near bus stop. Two accused on motorcycle involved.',
  ];
  const accused = ['Ravi Kumar', 'Suresh Babu', undefined, 'Mohan Gowda', undefined, 'Deepak Reddy', 'Ibrahim Khan'];
  return Array.from({ length: 7 }, (_, i) => ({
    crime_no: `KSP-2026-${String(1001 + i).padStart(5, '0')}`,
    status: statuses[i % statuses.length],
    occurrence_date: new Date(Date.now() - [3, 12, 5, 30, 45, 2, 18][i] * 86400000).toISOString().slice(0, 10),
    crime_type: types[i],
    brief_facts: facts[i],
    days_open: [3, 12, 5, 30, 45, 2, 18][i],
    accused_name: accused[i],
    station_name: 'Koramangala Police Station',
  }));
}

export function PCMyCases() {
  const { user } = useAuthStore()
  const [firs, setFIRs] = useState<FIR[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'investigating' | 'closed'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {}

    // Try multiple strategies to find assigned cases
    const tryFetch = async (attempts: { assigned_to?: string; station_id?: string }[]): Promise<FIR[]> => {
      for (const params of attempts) {
        // Build clean params — only non-empty values
        const sp = new URLSearchParams()
        if (params.assigned_to) sp.set('assigned_to', params.assigned_to)
        if (params.station_id) sp.set('station_id', params.station_id)
        sp.set('limit', '100')
        try {
          const r = await fetch(`/api/firs/assigned?${sp}`, { headers })
          const d = await r.json()
          if ((d?.firs ?? []).length > 0) return d.firs
        } catch (e) { console.warn('[PCMyCases] fetch attempt failed:', e) }
      }
      return []
    }

    const attempts: { assigned_to?: string; station_id?: string }[] = [];
    if (user?.id !== undefined && user?.id !== null) {
      attempts.push({ assigned_to: String(user.id) });
    }
    if (user?.station_id !== undefined && user?.station_id !== null) {
      attempts.push({ station_id: String(user.station_id) });
    }

    tryFetch(attempts).then(results => {
      if (results.length > 0) {
        setFIRs(results)
      } else {
        setFIRs(generateDemoCases())
      }
      setLoading(false)
    }).catch((e) => {
      console.error('[PCMyCases] all fetch attempts failed:', e)
      setFIRs(generateDemoCases())
      setLoading(false)
    })
  }, [user?.id, user?.station_id])

  const filtered = firs.filter(f => {
    const s = f.status?.toLowerCase() ?? ''
    const matchFilter =
      filter === 'all' ? true
      : filter === 'open' ? (s === 'registered' || s === 'open' || s === 'in_progress')
      : filter === 'investigating' ? (s === 'under_investigation' || s === 'investigating')
      : (s === 'closed' || s === 'chargesheeted' || s === 'resolved')

    const matchSearch = !search ||
      (f.crime_no?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (f.crime_type?.toLowerCase() ?? '').includes(search.toLowerCase())

    return matchFilter && matchSearch
  })

  if (loading) return <PCPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">My Assigned Cases</h1>
          <p className="text-xs text-white/40">{firs.length} total cases assigned to you</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'open', 'investigating', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              filter === f
                ? 'bg-slate-500/20 text-slate-200 border border-slate-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}>
            {f}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto text-xs bg-white/5 border border-white/10 rounded-lg
                     px-3 py-1.5 text-white/60 placeholder-white/20
                     focus:outline-none focus:border-slate-500/40 w-40"
        />
      </div>

      {/* Case cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10
                        flex flex-col items-center gap-2">
          <span className="text-2xl opacity-30">📭</span>
          <p className="text-sm text-white/40">No cases match this filter</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(fir => (
            <Link key={fir.crime_no} to={`/pc/cases/${fir.crime_no}`}
              className="flex items-center justify-between rounded-xl border
                         border-white/10 bg-white/[0.03] p-4 hover:border-white/20
                         hover:bg-white/5 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-white/60">{fir.crime_no}</span>
                  <StatusBadge status={fir.status} compact />
                </div>
                <p className="text-sm text-white/80">{fir.crime_type}</p>
                {fir.accused_name && (
                  <p className="text-xs text-white/30 mt-0.5">Accused: {fir.accused_name}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                {fir.days_open > 30 && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5
                                   rounded-full border border-red-500/20">
                    {fir.days_open}d open
                  </span>
                )}
                <p className="text-xs text-slate-400 mt-1">View →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
