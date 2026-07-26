import { RefreshCw } from 'lucide-react';
import type { FIRSummary } from '@/types/fir.types';
import { C } from '../theme';

interface Props {
  shown: number;
  total: number;
  summary: FIRSummary;
  onRefresh: () => void;
  loading?: boolean;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        marginRight: 6,
      }}
    />
  );
}

export function FIRResultsBar({ shown, total, summary, onRefresh, loading }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: C.navyMid,
        border: `1px solid ${C.navyLight}`,
        borderRadius: 8,
        padding: '10px 16px',
        height: 40,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: C.white }}>
          Showing <strong>{shown}</strong> of <strong>{total}</strong> FIRs
        </span>
        <span style={{ width: 1, height: 14, background: C.navyLight }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: C.danger }}>
          <Dot color={C.danger} />
          {summary.critical} Critical
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: C.warning }}>
          <Dot color={C.warning} />
          {summary.open} Open
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: C.muted }}>Last updated: just now</span>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh"
          disabled={loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
        >
          <RefreshCw size={16} style={loading ? { animation: 'fir-spin 0.8s linear infinite' } : undefined} />
        </button>
      </div>
      <style>{`@keyframes fir-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
