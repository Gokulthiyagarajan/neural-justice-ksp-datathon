import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  severity: string
  is_read: boolean
  created_at: string
  deep_link?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
}

// ── Demo notifications generator ─────────────────────────────────
function getDemoNotifications(): Notification[] {
  const now = Date.now();
  return [
    { id: 1, type: 'warning', title: 'New case assigned', message: 'Theft case PC-DEMO-2024001 has been assigned to you by SI Ramesh', severity: 'medium', is_read: false, created_at: new Date(now - 300000).toISOString() },
    { id: 2, type: 'alert', title: 'Patrol reminder', message: 'Evening patrol starts at 1800 hrs. Report to station by 1745.', severity: 'low', is_read: false, created_at: new Date(now - 3600000).toISOString() },
    { id: 3, type: 'system', title: 'Evidence deadline', message: 'Evidence for case KSR-789/2024 must be submitted to FSL by tomorrow 1700 hrs.', severity: 'high', is_read: false, created_at: new Date(now - 7200000).toISOString() },
    { id: 4, type: 'case', title: 'Witness statement required', message: 'SI Ramesh requests you to record statement of witness Mr. Kumar (contact: 9876543210) at 3rd Main, Koramangala', severity: 'high', is_read: true, created_at: new Date(now - 86400000).toISOString() },
    { id: 5, type: 'warning', title: 'Weekly summary available', message: 'Your weekly duty summary for last week is now available for review.', severity: 'low', is_read: true, created_at: new Date(now - 172800000).toISOString() },
  ];
}

export function PCNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    const token = localStorage.getItem('auth_token')
    const params = new URLSearchParams({ limit: '50' })
    try {
      const res = await fetch(`/api/notifications?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      const fetched = data?.notifications ?? []
      if (fetched.length > 0) {
        setNotifications(fetched)
      } else {
        setNotifications(getDemoNotifications())
      }
    } catch (e) {
      console.error('[PCNotifications] fetch failed:', e)
      setNotifications(getDemoNotifications())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleMarkRead = async (id: number) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    const token = localStorage.getItem('auth_token')
    const isDemo = token === 'demo-session';
    if (isDemo) return; // Demo mode: local state only
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch (e) {
      console.error('[PCNotifications] mark-read failed:', e)
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
    }
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) return <PCPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">Notifications</h1>
          <p className="text-xs text-white/40">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              filter === f
                ? 'bg-slate-500/20 text-slate-200 border border-slate-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}>
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1 text-red-400">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10
                        flex flex-col items-center gap-2">
          <span className="text-2xl opacity-30">✓</span>
          <p className="text-sm text-white/40">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(n => (
            <button key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`text-left rounded-xl border p-4 transition-all ${
                n.is_read
                  ? 'border-white/10 bg-white/[0.02]'
                  : 'border-slate-500/30 bg-slate-500/5'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />}
                    <p className={`text-xs font-medium ${
                      n.is_read ? 'text-white/50' : 'text-white/80'
                    }`}>
                      {n.title}
                    </p>
                  </div>
                  <p className="text-xs text-white/40">{n.message}</p>
                  <p className="text-[10px] text-white/30 mt-1.5">
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString('en-IN')
                      : '—'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
