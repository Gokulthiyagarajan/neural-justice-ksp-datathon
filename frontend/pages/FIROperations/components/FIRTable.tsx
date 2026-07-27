import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { FIR } from '@/types/fir.types';
import type { useFIRSelection } from '@/hooks/useFIRSelection';
import { C } from '../theme';
import { FIRTableRow } from './FIRTableRow';

interface Props {
  firs: FIR[];
  selection: ReturnType<typeof useFIRSelection>;
  onRowClick: (fir: FIR) => void;
  onFlag: (fir: FIR) => void;
  onAssign: (fir: FIR) => void;
}

type SortKey =
  | 'fir_number'
  | 'date'
  | 'crime_type'
  | 'district'
  | 'station'
  | 'accused_name'
  | 'status'
  | 'severity'
  | 'days_open';

const COLUMNS: { key: SortKey | 'select' | 'actions'; label: string; width: number; sortable?: boolean }[] = [
  { key: 'select', label: '', width: 40 },
  { key: 'fir_number', label: 'FIR No', width: 140, sortable: true },
  { key: 'date', label: 'Date', width: 100, sortable: true },
  { key: 'crime_type', label: 'Crime Type', width: 140, sortable: true },
  { key: 'district', label: 'District', width: 120, sortable: true },
  { key: 'station', label: 'Station', width: 130, sortable: true },
  { key: 'accused_name', label: 'Accused', width: 130, sortable: true },
  { key: 'status', label: 'Status', width: 130, sortable: true },
  { key: 'severity', label: 'Severity', width: 90, sortable: true },
  { key: 'days_open', label: 'Days Open', width: 80, sortable: true },
  { key: 'actions', label: '', width: 80 },
];

function compare(a: FIR, b: FIR, key: SortKey): number {
  const av = a[key];
  const bv = b[key];
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true });
}

export function FIRTable({ firs, selection, onRowClick, onFlag, onAssign }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...firs].sort((a, b) => {
    const cmp = compare(a, b, sortKey);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          minWidth: 1120,
        }}
      >
        <thead>
          <tr style={{ background: C.navyMid, borderBottom: `1px solid ${C.navyLight}` }}>
            <th
              style={{
                width: 40,
                padding: '0 12px',
                height: 40,
                textAlign: 'left',
              }}
            >
              <span
                onClick={() => selection.toggleAll()}
                style={{
                  display: 'inline-flex',
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: `1px solid ${selection.allSelected ? C.amber : C.steel}`,
                  background: selection.allSelected ? C.amber : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {selection.allSelected && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </th>
            {COLUMNS.slice(1).map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  padding: '0 16px',
                  height: 40,
                  textAlign: 'left',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                  color: C.muted,
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => col.sortable && toggleSort(col.key as SortKey)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.label}
                  {col.sortable && (
                    <span style={{ display: 'inline-flex', opacity: sortKey === col.key ? 1 : 0.3 }}>
                      {sortKey === col.key && sortDir === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((fir) => (
            <FIRTableRow
              key={fir.fir_id}
              fir={fir}
              selected={selection.isSelected(fir.fir_id)}
              anySelected={selection.selectedCount > 0}
              onToggleSelect={selection.toggleOne}
              onOpenDetail={onRowClick}
              onFlag={onFlag}
              onAssign={onAssign}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
