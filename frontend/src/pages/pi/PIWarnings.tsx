import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';
import { isDemoMode, demoPIWarnings } from '@/services/demoData';

interface PIWarning {
  warning_id: number;
  type: string;
  severity: string;
  status: string;
  message: string;
  recommended_action?: string;
  generated_at: string;
  entity_id?: string;
}

export function PIWarnings() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [warnings, setWarnings] = useState<PIWarning[]>([])
  const [acknowledging, setAcknowledging] = useState<number | null>(null)

  const fetchWarnings = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode()) {
        setWarnings(demoPIWarnings() as any)
        setLoading(false)
        return
      }
      const res = await fetch(
        `/api/intelligence/v1/warnings?severity=critical,high,medium&station_id=${user?.station_id}`,
        { headers: authHeaders() }
      )
      const data = await res.json()
      setWarnings(data?.warnings ?? data ?? [])
    } catch (e) {
      console.warn('[PIWarnings] fetch error, using demo data:', e)
      setWarnings(demoPIWarnings() as any)
    } finally {
      setLoading(false)
    }
  }, [user?.station_id])

  useEffect(() => { fetchWarnings() }, [fetchWarnings])

  const handleAcknowledge = async (warningId: number) => {
    setAcknowledging(warningId)
    try {
      await fetch(`/api/intelligence/v1/warnings/${warningId}/acknowledge`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: user?.id }),
      })
      await fetchWarnings()
    } catch {
      setWarnings(prev => prev.filter(w => w.warning_id !== warningId))
    } finally {
      setAcknowledging(null)
    }
  }

  const handleViewDetails = (warning: PIWarning) => {
    if (warning.entity_id) {
      navigate(`/pi/cases?search=${encodeURIComponent(warning.entity_id)}`)
    }
  }

  if (loading) return <PIPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-alert-red" />
          <div>
            <h1 className="text-base font-semibold text-alert-red">Early Warning Center</h1>
            <p className="text-xs text-text-tertiary">{user?.station_name} · Preemptive intelligence</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Active Warnings List */}
        <div className="col-span-2 flex flex-col gap-4">
          {warnings.length === 0 ? (
            <div className="rounded-xl border border-border-primary bg-bg-card p-10 flex flex-col items-center justify-center">
               <CheckCircle className="w-8 h-8 opacity-20 mb-3" />
               <p className="text-sm text-text-secondary">No active warnings.</p>
               <p className="text-xs text-text-tertiary text-center max-w-sm mt-2">
                 Your station is clear of immediate risks, officer overloads, and overdue investigations.
               </p>
            </div>
          ) : (
            warnings.map(w => (
              <div key={w.warning_id} className="rounded-xl border border-border-primary bg-bg-card p-4 flex gap-4 transition-all hover:bg-hover-bg">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  w.severity === 'critical' ? 'bg-red-500/20 text-alert-red' :
                  w.severity === 'high' ? 'bg-amber-500/20 text-signal-amber' :
                  'bg-cyan-500/20 text-service-blue'
                }`}>
                  {w.severity === 'critical' ? <AlertOctagon size={20} /> :
                   w.severity === 'high' ? <AlertTriangle size={20} /> :
                   <Clock size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={w.severity} size="sm" />
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{w.type.replace(/_/g, ' ')}</span>
                    <span className="ml-auto text-[10px] text-text-tertiary font-mono">
                      {new Date(w.generated_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-medium mb-1">{w.message}</p>
                  {w.recommended_action && (
                    <div className="mt-2 p-2 rounded bg-bg-card border border-border-primary flex items-start gap-2">
                      <span className="text-[10px] text-service-blue font-medium">ACTION:</span>
                      <p className="text-[10px] text-text-secondary">{w.recommended_action}</p>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleAcknowledge(w.warning_id)} disabled={acknowledging === w.warning_id}
                      className="text-xs px-3 py-1.5 rounded bg-hover-bg text-text-primary hover:bg-white/20 transition-colors disabled:opacity-40">
                      {acknowledging === w.warning_id ? '...' : 'Acknowledge'}
                    </button>
                    <button onClick={() => handleViewDetails(w)}
                      className="text-xs px-3 py-1.5 rounded text-service-blue/70 hover:bg-hover-bg transition-colors">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Sidebar */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3">Warning Categories</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-text-secondary">High Risk Cases</span>
                <span className="text-xs font-medium text-alert-red tabular-nums">{warnings.filter(w => w.type === 'high_risk_case').length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-text-secondary">Overdue Investigations</span>
                <span className="text-xs font-medium text-signal-amber tabular-nums">{warnings.filter(w => w.type === 'overdue_investigation').length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-text-secondary">Officer Overload</span>
                <span className="text-xs font-medium text-service-blue tabular-nums">{warnings.filter(w => w.type === 'officer_overload').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Crime Spikes</span>
                <span className="text-xs font-medium text-text-tertiary tabular-nums">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
