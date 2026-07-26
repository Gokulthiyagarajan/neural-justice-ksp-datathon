/**
 * SyntheticDataNotice — visible indicator that dashboard data is for demo purposes.
 *
 * Placed in the app shell so it appears on every page during demos and judging.
 * The amber/blue colour scheme was chosen to be noticeable but not alarming.
 * Uses the existing design tokens for consistency.
 */
import { FlaskConical } from 'lucide-react';

export function SyntheticDataNotice() {
  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase"
      style={{
        background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.10) 0%, rgba(96, 165, 250, 0.08) 100%)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.20)',
        color: 'var(--text-secondary)',
      }}
      role="status"
      aria-label="Synthetic data used for demonstration"
    >
      <FlaskConical
        size={11}
        className="shrink-0"
        style={{ color: 'rgba(251, 191, 36, 0.8)' }}
        aria-hidden
      />
      <span>
        <span className="font-semibold" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
          Synthetic Data
        </span>
        <span className="hidden sm:inline">
          {' '}— For demonstration purposes only
        </span>
      </span>
    </div>
  );
}
