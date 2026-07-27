import { SearchX } from 'lucide-react';
import type { FIRFilters } from '@/types/fir.types';
import { C } from '../theme';

interface Props {
  activeFilters: FIRFilters;
  onClearFilters: () => void;
  onClearDistrict: () => void;
}

export function FIREmptyState({ activeFilters, onClearFilters, onClearDistrict }: Props) {
  const parts: string[] = [];
  if (activeFilters.district && activeFilters.district !== 'all') parts.push(`in ${activeFilters.district}`);
  if (activeFilters.crime_type && activeFilters.crime_type !== 'all') parts.push(`for ${activeFilters.crime_type}`);
  if (activeFilters.station && activeFilters.station !== 'all') parts.push(`at ${activeFilters.station}`);
  if (activeFilters.status && activeFilters.status !== 'all') parts.push(`with status ${activeFilters.status.replace(/_/g, ' ')}`);
  if (activeFilters.severity && activeFilters.severity !== 'all') parts.push(`of ${activeFilters.severity} severity`);
  if (activeFilters.date_from) parts.push(`after ${activeFilters.date_from}`);
  if (activeFilters.search) parts.push(`matching "${activeFilters.search}"`);

  const message = `No FIRs found ${parts.join(' ')}`.trim();
  const suggestion = 'Try widening your date range or removing some filters.';

  const ghostBtn: React.CSSProperties = {
    background: 'transparent',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '64px 24px',
        minHeight: 360,
      }}
    >
      <SearchX size={32} color={C.steel} />
      <p style={{ fontSize: 15, fontWeight: 500, color: C.white, marginTop: 16, maxWidth: 480 }}>
        {message}
      </p>
      <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>{suggestion}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          onClick={onClearFilters}
          style={{ ...ghostBtn, border: `1px solid ${C.navyLight}`, color: C.white }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.navyLight)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Clear All Filters
        </button>
        <button
          type="button"
          onClick={onClearDistrict}
          style={{ ...ghostBtn, border: `1px solid ${C.amber}`, color: C.amber }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.amberDim)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Search All Districts
        </button>
      </div>
    </div>
  );
}
