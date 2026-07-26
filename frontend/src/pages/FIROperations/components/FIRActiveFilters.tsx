import { X } from 'lucide-react';
import type { FIRFilters } from '@/types/fir.types';
import { C } from '../theme';

interface Props {
  filters: FIRFilters;
  onRemove: (key: keyof FIRFilters, value: string) => void;
  onClearAll: () => void;
  skipAutoDistrict?: boolean;
}

interface Chip {
  key: keyof FIRFilters;
  label: string;
}

export function FIRActiveFilters({ filters, onRemove, onClearAll, skipAutoDistrict }: Props) {
  const chips: Chip[] = [];
  if (filters.district !== 'all' && !skipAutoDistrict) chips.push({ key: 'district', label: `District: ${filters.district}` });
  if (filters.station !== 'all') chips.push({ key: 'station', label: `Station: ${filters.station}` });
  if (filters.crime_type !== 'all') chips.push({ key: 'crime_type', label: `Crime: ${filters.crime_type}` });
  if (filters.status !== 'all') chips.push({ key: 'status', label: `Status: ${filters.status.replace(/_/g, ' ')}` });
  if (filters.severity !== 'all') chips.push({ key: 'severity', label: `Severity: ${filters.severity}` });
  if (filters.date_from) chips.push({ key: 'date_from', label: `From: ${filters.date_from}` });
  if (filters.date_to) chips.push({ key: 'date_to', label: `To: ${filters.date_to}` });
  if (filters.search) chips.push({ key: 'search', label: `Search: ${filters.search}` });

  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <span style={{ fontSize: 11, color: C.muted }}>Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: C.amberDim,
            border: `1px solid rgba(245, 158, 11, 0.3)`,
            borderRadius: 20,
            padding: '4px 10px',
            fontSize: 12,
            color: C.amber,
          }}
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key, 'all')}
            aria-label={`Remove ${chip.label}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.amber, display: 'flex' }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: C.muted,
          textDecoration: 'underline',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
      >
        Clear all
      </button>
    </div>
  );
}
