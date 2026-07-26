import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { Modal } from '@/components/Common/Modal';
import { PSIPageSkeleton } from '@/components/psi/PSIPageSkeleton';
import { useAuthStore } from '@/store/authStore';
import { isDemoMode, demoFIRs } from '@/services/demoData';
import type { FIR } from '@/types/fir.types';

// ─── Color tokens — purple accent ───────────────────────────────────────────
const PURPLE = '#8B5CF6';
const PURPLE_12 = 'rgba(139, 92, 246, 0.12)';

// ─── Auth headers helper ────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── FIR Status Update Form ─────────────────────────────────────────────────
function FIRStatusUpdateForm({
  fir, onSuccess, onCancel,
}: {
  fir: FIR; onSuccess: () => void; onCancel: () => void;
}) {
  const [status, setStatus] = useState(fir.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/fir-ops/${fir.fir_number}/status`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      onSuccess();
    } catch (e) {
      console.error('[PSIMyCases] FIR status update failed:', e);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-white/40 mb-1.5 block">New Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg
                     px-3 py-2 text-white/70 focus:outline-none focus:border-purple-500/40"
        >
          {['Open', 'Under Investigation', 'Chargesheeted', 'Closed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1.5 block">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add a note about this status change..."
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg
                     px-3 py-2 text-white/70 placeholder-white/20
                     focus:outline-none focus:border-purple-500/40 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-xs font-medium
                     border border-white/10 text-white/40 hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-xs font-medium
                     bg-purple-500/20 text-purple-300 border border-purple-500/30
                     hover:bg-purple-500/30 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Status Update'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSI MY CASES MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIMyCases() {
  const user = useAuthStore((s) => s.user);
  const [firs, setFIRs] = useState<FIR[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedFIR, setSelectedFIR] = useState<FIR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In demo mode, skip the backend and use sample data
      if (isDemoMode()) {
        setFIRs(demoFIRs());
        setLoading(false);
        return;
      }
      const scope = `station_id=${user?.station_id}&assigned_to=${user?.id}&limit=100`;
      const res = await fetch(`/api/fir-ops?${scope}`, { headers: authHeaders() });
      const data = await res.json();
      setFIRs(data?.firs ?? data ?? []);
    } catch (e) {
      console.warn('[PSIMyCases] fetch error:', e);
      // Fall back to demo data on any fetch failure
      if (isDemoMode()) {
        setFIRs(demoFIRs());
      } else {
        setError('Unable to load cases');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.station_id, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = firs.filter((f) => {
    const statusNorm = (f.status || '').toLowerCase();
    const matchFilter =
      filter === 'all' ? true :
      filter === 'open' ? ['open', 'registered'].includes(statusNorm) :
      filter === 'investigating' ? statusNorm.includes('investigat') :
      ['closed', 'chargesheeted'].includes(statusNorm);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (f.fir_number || '').toLowerCase().includes(q) ||
      (f.crime_type || '').toLowerCase().includes(q) ||
      (f.accused_name || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const summary = {
    total: firs.length,
    open: firs.filter((f) => ['open', 'registered'].includes((f.status || '').toLowerCase())).length,
    investigating: firs.filter((f) => (f.status || '').toLowerCase().includes('investigat')).length,
    closed: firs.filter((f) => ['closed', 'chargesheeted'].includes((f.status || '').toLowerCase())).length,
  };

  if (loading) return <PSIPageSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#F59E0B' }} />
          <p className="text-sm text-white/70">Unable to load cases</p>
          <p className="text-xs text-white/40 mt-1">Please try again. If the issue persists, contact support.</p>
          <button
            onClick={fetchData}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/70"
          >
            <RefreshCw size={12} className="inline mr-1" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h1 className="text-base font-semibold" style={{ color: PURPLE }}>My Assigned Cases</h1>
            <p className="text-xs text-white/40">{firs.length} cases assigned to you</p>
          </div>
        </div>
        <Link
          to="/firs"
          className="text-[10px] text-white/40 hover:text-white/60 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          Full FIR Explorer →
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: PURPLE },
          { label: 'Open', value: summary.open, color: '#F59E0B' },
          { label: 'Investigating', value: summary.investigating, color: '#3B82F6' },
          { label: 'Closed', value: summary.closed, color: '#22C55E' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
          >
            <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + search bar */}
      <div className="flex items-center gap-2">
        {['all', 'open', 'investigating', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as string)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              filter === f
                ? 'text-purple-300 border border-purple-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}
            style={filter === f ? { background: PURPLE_12 } : {}}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search FIR / type / accused..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5
                       text-white/60 placeholder-white/20 focus:outline-none focus:border-purple-500/40 w-52"
          />
        </div>
      </div>

      {/* Cases table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Crime No.</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Accused</th>
              <th className="text-right px-3 py-2">Days Open</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-[10px]">
                  No cases match this filter
                </td>
              </tr>
            ) : (
              filtered.map((fir) => (
                <tr
                  key={fir.fir_number}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedFIR(fir)}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/firs/${fir.fir_number}`}
                      className="font-mono text-[10px] text-white/60 hover:text-purple-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {fir.fir_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/70 truncate max-w-[130px]">
                    {fir.crime_type || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-white/50 truncate max-w-[110px]">
                    {fir.accused_name || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={
                      (fir.days_open || 0) > 30 ? 'text-red-400' :
                      (fir.days_open || 0) > 14 ? 'text-amber-400' : 'text-white/40'
                    }>
                      {fir.days_open ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge status={fir.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] text-purple-400/50 hover:text-purple-400">
                      Update
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status update modal */}
      <Modal
        isOpen={!!selectedFIR}
        onClose={() => setSelectedFIR(null)}
        title={`Update Status — ${selectedFIR?.fir_number || ''}`}
        size="sm"
      >
        {selectedFIR && (
          <FIRStatusUpdateForm
            fir={selectedFIR}
            onSuccess={() => {
              setSelectedFIR(null);
              fetchData();
            }}
            onCancel={() => setSelectedFIR(null)}
          />
        )}
      </Modal>
    </div>
  );
}
