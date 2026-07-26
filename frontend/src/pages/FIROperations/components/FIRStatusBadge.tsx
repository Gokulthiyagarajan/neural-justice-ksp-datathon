import type { FIRStatus } from '@/types/fir.types';
import { STATUS_BG, STATUS_COLOR, STATUS_LABEL } from '../theme';

interface Props {
  status: FIRStatus;
}

export function FIRStatusBadge({ status }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        background: STATUS_BG[status],
        color: STATUS_COLOR[status],
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
