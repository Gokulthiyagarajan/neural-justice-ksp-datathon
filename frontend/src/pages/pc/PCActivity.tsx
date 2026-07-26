import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton'

interface Activity {
  crime_no: string
  type: string
  description: string
  timestamp: string
  old_status?: string
  new_status?: string
}

export function PCActivity() {
  const { user } = useAuthStore()
  const [activities, setActivities] = useState<Activity[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = async (p: number) => {
    const token = localStorage.getItem('auth_token')
    const params = new URLSearchParams({
      assigned_to: user?.id ?? '',
      page: String(p),
      limit: '20',
    })
    const res = await fetch(`/api/analytics/activity?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      console.warn('[PCActivity] HTTP', res.status, 'for page', p)
      setLoading(false)
      return
    }
    const data = await res.json()
    const items = data?.activities ?? []
    setActivities(prev => p === 1 ? items : [...prev, ...items])
    setHasMore(items.length === 20)
    setLoading(false)
  }

  useEffect(() => {
    setPage(1)
    fetchPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPage(next)
  }

  const weekActivities = activities.filter(a =>
    a.timestamp ? new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false
  )
  const notesCount = activities.filter(a => a.type === 'note_added').length
  const statusChanges = activities.filter(a => a.type === 'status_change').length

  if (loading) return <PCPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📊</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">My Activity</h1>
          <p className="text-xs text-white/40">History of your actions on assigned cases</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'This Week', value: weekActivities.length },
          { label: 'Status Changes', value: statusChanges },
          { label: 'Notes Added', value: notesCount },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-xl font-bold text-slate-300">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {activities.length === 0 && !loading ? (
          <div className="p-10 text-center">
            <p className="text-xs text-white/30">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activities.map((a, i) => {
              const icon = a.type === 'status_change' ? '🔄'
                : a.type === 'note_added' ? '📝'
                : a.type === 'accused_added' ? '👤' : '📋'
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center
                                  justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70">
                      <span className="font-mono text-white/50">{a.crime_no}</span>
                      {' — '}{a.description}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {a.timestamp
                        ? new Date(a.timestamp).toLocaleString('en-IN')
                        : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <button onClick={handleLoadMore}
          className="text-xs text-slate-400 hover:text-white transition-colors self-center">
          Load more →
        </button>
      )}
    </div>
  )
}
