import React from 'react';
import { Eye, Flag, UserPlus, Link2 } from 'lucide-react';
import type { FIR } from '@/types/fir.types';
import { C, daysOpenColor } from '../theme';
import { FIRSeverityBadge } from './FIRSeverityBadge';
import { FIRStatusBadge } from './FIRStatusBadge';
import { formatDate, relativeTime } from '../utils';

interface Props {
  fir: FIR;
  selected: boolean;
  anySelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (fir: FIR) => void;
  onFlag: (fir: FIR) => void;
  onAssign: (fir: FIR) => void;
}

const cellBase: React.CSSProperties = {
  padding: '0 16px',
  fontSize: 13,
  color: C.white,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="fir-tip-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <span
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: C.navyMid,
          color: C.white,
          border: `1px solid ${C.navyLight}`,
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.12s',
          zIndex: 50,
        }}
        className="fir-tip"
      >
        {label}
      </span>
    </span>
  );
}

export function FIRTableRow({
  fir,
  selected,
  anySelected,
  onToggleSelect,
  onOpenDetail,
  onFlag,
  onAssign,
}: Props) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpenDetail(fir)}
      style={{
        height: 52,
        background: selected ? C.amberDim : hovered ? C.navyLight : 'transparent',
        borderBottom: `1px solid rgba(26, 51, 88, 0.5)`,
        borderLeft: selected ? `3px solid ${C.amber}` : '3px solid transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {/* Checkbox */}
      <td
        style={{
          width: 40,
          padding: '0 12px',
          opacity: hovered || anySelected ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(fir.fir_id);
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1px solid ${selected ? C.amber : C.steel}`,
            background: selected ? C.amber : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-6" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </td>

      {/* FIR Number */}
      <td style={cellBase} onClick={(e) => { e.stopPropagation(); onOpenDetail(fir); }}>
        <div style={{ color: C.amber, fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{fir.fir_number}</div>
        <div style={{ color: C.muted, fontSize: 11 }}>{fir.district}</div>
      </td>

      {/* Date */}
      <td style={cellBase}>
        <div style={{ color: C.white, fontSize: 13 }}>{formatDate(fir.date)}</div>
        <div style={{ color: C.muted, fontSize: 11 }}>{relativeTime(fir.date)}</div>
      </td>

      {/* Crime Type */}
      <td style={cellBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{fir.crime_type}</span>
          {fir.linked_cases > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: C.muted, fontSize: 11, whiteSpace: 'nowrap' }}>
              <Link2 size={11} />
              {fir.linked_cases}
            </span>
          )}
        </div>
      </td>

      {/* District */}
      <td style={cellBase}>{fir.district}</td>

      {/* Station */}
      <td style={{ ...cellBase, maxWidth: 130 }}>{fir.station}</td>

      {/* Accused */}
      <td style={cellBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{fir.accused_name}</span>
        </div>
      </td>

      {/* Status */}
      <td style={cellBase}>
        <FIRStatusBadge status={fir.status} />
      </td>

      {/* Severity */}
      <td style={cellBase}>
        <FIRSeverityBadge severity={fir.severity} />
      </td>

      {/* Days Open */}
      <td style={{ ...cellBase, color: daysOpenColor(fir.days_open) }}>
        {fir.days_open} days
      </td>

      {/* Actions */}
      <td
        style={{
          width: 80,
          padding: '0 12px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip label="View FIR Details">
            <button
              type="button"
              onClick={() => onOpenDetail(fir)}
              style={actionBtn}
              aria-label="View FIR Details"
            >
              <Eye size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Flag for Review">
            <button
              type="button"
              onClick={() => onFlag(fir)}
              style={actionBtn}
              aria-label="Flag for Review"
            >
              <Flag size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Assign Investigator">
            <button
              type="button"
              onClick={() => onAssign(fir)}
              style={actionBtn}
              aria-label="Assign Investigator"
            >
              <UserPlus size={15} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

const actionBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: C.muted,
  display: 'inline-flex',
  padding: 2,
};

export { Tooltip };
