/**
 * SP Warnings — District early warnings management
 * Route: /sp/warnings
 */
import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, AlertCircle, Bell, CheckCheck, ArrowUpCircle, Filter } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode, demoPIWarnings } from '@/services/demoData';

interface Warning {
  warning_id: number;
  type: string;
  severity: string;
  message: string;
  recommended_action: string | null;
  generated_at: string;
  status: string;
  station_name?: string;
}

export function SPWarnings() {
  const user = useAuthStore(s => s.user);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isDemoMode()) {
        setWarnings(demoPIWarnings().map(w => ({
          warning_id: w.warning_id,
          type: w.type,
          severity: w.severity,
          message: w.message,
          recommended_action: w.recommended_action ?? null,
          generated_at: w.generated_at,
          status: w.status,
          station_name: w.entity_id ? `Station #${w.entity_id}` : undefined,
        })));
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/intelligence/v1/warnings?district_id=${user?.district_id ?? 'BENGALURU_URBAN'}&limit=100`,
        { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setWarnings(d?.warnings ?? d ?? []);
    } catch (err) {
      console.warn('[SPWarnings] Fetch failed:', err);
      // Fall back to demo data on API failure
      setWarnings(demoPIWarnings().map(w => ({
        warning_id: w.warning_id,
        type: w.type,
        severity: w.severity,
        message: w.message,
        recommended_action: w.recommended_action ?? null,
        generated_at: w.generated_at,
        status: w.status,
        station_name: w.entity_id ? `Station #${w.entity_id}` : undefined,
      })));
    } finally {
      setLoading(false);
    }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  const SEVERITY = ['all', 'critical', 'high', 'medium', 'low'];
  const filtered = severityFilter === 'all'
    ? warnings : warnings.filter(w => w.severity === severityFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleAcknowledge = async (id: number) => {
    try {
      await fetch(`/api/intelligence/v1/warnings/${id}/acknowledge`, {
        method: 'POST', headers: authHeaders(),
      });
      setWarnings(prev => prev.map(w =>
        w.warning_id === id ? { ...w, status: 'acknowledged' } : w
      ));
    } catch { console.warn('[SPWarnings] Acknowledge failed for warning', id); }
  };

  const handleEscalate = async (id: number) => {
    try {
      await fetch(`/api/intelligence/v1/warnings/${id}/escalate`, {
        method: 'POST', headers: authHeaders(),
      });
      setWarnings(prev => prev.map(w =>
        w.warning_id === id ? { ...w, status: 'escalated' } : w
      ));
    } catch { console.warn('[SPWarnings] Escalate failed for warning', id); }
  };

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load warnings" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <AlertTriangle size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-blue-400">District Early Warnings</h1>
          <p className="text-xs text-white/40">
            {user?.district_name ?? 'District'} · {warnings.length} total · {
              warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length
            } critical
          </p>
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex gap-2 items-center">
        <Filter size={12} className="text-white/30" />
        {SEVERITY.map(s => (
          <button key={s} onClick={() => { setSeverityFilter(s); setPage(1); }}
            className={`text-[10px] px-3 py-1.5 rounded-full capitalize transition-colors ${
              severityFilter === s
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}>{s}</button>
        ))}
      </div>

      {/* Warning cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="No warnings match this filter"
          description={severityFilter !== 'all' ? 'Try a different severity filter' : 'No early warnings in this district'}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-3">
        {paged.map(w => (
          <div key={w.warning_id}
            className={`rounded-xl border p-4 transition-all ${
              w.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
              w.severity === 'high' ? 'border-red-500/20 bg-red-500/3' :
              w.severity === 'medium' ? 'border-amber-500/20 bg-amber-500/3' :
              'border-white/10 bg-white/[0.03]'
            }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertCircle size={16} className={`mt-0.5 shrink-0 ${
                  w.severity === 'critical' || w.severity === 'high' ? 'text-red-400' :
                  w.severity === 'medium' ? 'text-amber-400' :
                  'text-white/40'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      w.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      w.severity === 'high' ? 'bg-red-500/15 text-red-400' :
                      w.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/10 text-white/40'
                    }`}>{w.severity}</span>
                    {w.station_name && (
                      <span className="text-[10px] text-white/30">{w.station_name}</span>
                    )}
                    <span className="text-[10px] text-white/20">
                      {new Date(w.generated_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mb-1">{w.message}</p>
                  {w.recommended_action && (
                    <p className="text-[10px] text-blue-400/60">{w.recommended_action}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {w.status !== 'acknowledged' && w.status !== 'escalated' && (
                  <>
                    <button onClick={() => handleAcknowledge(w.warning_id)}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10
                                 text-white/50 hover:border-green-500/30 hover:text-green-400
                                 transition-colors inline-flex items-center gap-1">
                      <CheckCheck size={10} /> Ack
                    </button>
                    <button onClick={() => handleEscalate(w.warning_id)}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/30
                                 text-amber-400 hover:bg-amber-500/10 transition-colors
                                 inline-flex items-center gap-1">
                      <ArrowUpCircle size={10} /> Escalate
                    </button>
                  </>
                )}
                {(w.status === 'acknowledged' || w.status === 'escalated') && (
                  <span className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                    w.status === 'escalated' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {w.status === 'escalated' ? <ArrowUpCircle size={10} /> : <CheckCheck size={10} />}
                    {w.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
        </>
      )}
    </div>
  );
}
