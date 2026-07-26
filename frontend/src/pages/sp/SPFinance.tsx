/**
 * SP Finance — Financial intelligence (district-scoped anomalies)
 * Route: /sp/finance
 */
import { useEffect, useState, useCallback } from 'react';
import { IndianRupee, Download, Filter } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode, demoFinanceAlerts } from '@/services/demoData';

interface FinancialAlert {
  id: number;
  anomaly_type: string;
  station_name?: string;
  amount?: number;
  entity_name?: string;
  flagged_at?: string;
}

/** Generate CSV string from alerts data */
function alertsToCSV(alerts: FinancialAlert[]): string {
  const header = 'Anomaly Type,Station,Amount (INR),Entity,Flagged Date';
  const rows = alerts.map(a =>
    [a.anomaly_type, a.station_name ?? '', a.amount ?? '', a.entity_name ?? '', a.flagged_at ?? ''].join(',')
  );
  return [header, ...rows].join('\n');
}

/** Trigger browser download of a CSV file */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function SPFinance() {
  const user = useAuthStore(s => s.user);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // In demo mode, return sample financial alerts immediately
      if (isDemoMode()) {
        setAlerts(demoFinanceAlerts() as any);
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/suspicious?crime_no=&limit=100`,
        { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const report = await res.json();
      // /api/suspicious returns SuspiciousReport { flagged_transactions, suspicious_accounts, cycles, summary }
      // Map flagged_transactions to FinancialAlert format
      const txns = report?.flagged_transactions ?? [];
      const mapped: FinancialAlert[] = Array.isArray(txns) ? txns.map((t: any) => ({
        id: t.id ?? 0,
        anomaly_type: t.anomaly_type ?? (t.risk_score && t.risk_score > 0.5 ? 'structuring' : 'flagged'),
        station_name: '—',
        amount: t.amount ?? 0,
        entity_name: t.sender_name ?? t.receiver_name ?? t.sender_account ?? t.receiver_account ?? 'Unknown',
        flagged_at: t.transaction_date ?? '',
      })) : [];
      setAlerts(mapped);
    } catch (err) {
      console.warn('[SPFinance] Fetch failed, using demo data:', err);
      setAlerts(demoFinanceAlerts() as any);
    } finally {
      setLoading(false);
    }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  const ANOMALY_TYPES = ['all', 'structuring', 'fan_in', 'fan_out', 'velocity', 'circular'];
  const filtered = typeFilter === 'all' ? alerts : alerts.filter(a => a.anomaly_type === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const summary = {
    total: alerts.length,
    structuring: alerts.filter(a => a.anomaly_type === 'structuring').length,
    fan_in: alerts.filter(a => a.anomaly_type === 'fan_in').length,
    velocity: alerts.filter(a => a.anomaly_type === 'velocity').length,
    circular: alerts.filter(a => a.anomaly_type === 'circular').length,
  };

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Unable to load financial alerts" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <IndianRupee size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-blue-400">Financial Intelligence</h1>
            <p className="text-xs text-white/40">
              {user?.district_name ?? 'District'} · {alerts.length} anomalies detected
            </p>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(alertsToCSV(alerts), `finance-anomalies-${user?.district_id ?? 'district'}.csv`)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:border-blue-500/30 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Alerts', value: summary.total },
          { label: 'Structuring', value: summary.structuring },
          { label: 'Fan-In', value: summary.fan_in },
          { label: 'Velocity', value: summary.velocity },
          { label: 'Circular', value: summary.circular },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-xl font-bold text-blue-300 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={12} className="text-white/30" />
        {ANOMALY_TYPES.map(t => (
          <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`text-[10px] px-3 py-1.5 rounded-full capitalize transition-colors ${
              typeFilter === t
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}>{t.replace('_', '-')}</button>
        ))}
      </div>

      {/* Alerts table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<IndianRupee size={40} />}
          title="No anomalies detected"
          description="Financial anomalies will be flagged as transactions are analyzed in this district."
        />
      ) : (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Anomaly Type</th>
              <th className="text-left px-3 py-2">Station</th>
              <th className="text-right px-3 py-2">Amount (₹)</th>
              <th className="text-left px-3 py-2">Entity</th>
              <th className="text-right px-3 py-2">Flagged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paged.map((alert, i) => (
              <tr key={alert.id ?? i} className="hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    alert.anomaly_type === 'structuring' ? 'bg-red-500/20 text-red-400' :
                    alert.anomaly_type === 'circular' ? 'bg-purple-500/20 text-purple-400' :
                    alert.anomaly_type === 'velocity' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{alert.anomaly_type?.replace('_', '-')}</span>
                </td>
                <td className="px-3 py-2.5 text-white/50 truncate max-w-[120px]">{alert.station_name ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono text-white/70">
                  ₹{alert.amount?.toLocaleString('en-IN') ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-white/40 truncate max-w-[120px]">{alert.entity_name ?? '—'}</td>
                <td className="px-3 py-2.5 text-right text-white/30 text-[10px]">
                  {alert.flagged_at ? new Date(alert.flagged_at).toLocaleDateString('en-IN') : '—'}
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
