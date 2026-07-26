import type { Severity } from '@/types/fir.types';
import { SEVERITY_BG, SEVERITY_COLOR } from '../theme';

interface Props {
  severity: Severity;
}

export function FIRSeverityBadge({ severity }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        background: SEVERITY_BG[severity],
        color: SEVERITY_COLOR[severity],
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: SEVERITY_COLOR[severity],
        }}
      />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
