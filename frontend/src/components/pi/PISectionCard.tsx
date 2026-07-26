import type { LucideIcon } from 'lucide-react';

const CYAN = '#06B6D4';
const CYAN_12 = 'rgba(6, 182, 212, 0.12)';

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Reusable PI section card with cyan accent header.
 * Matches the PI identity theme used across the PIDashboard.
 */
export function PISectionCard({ title, icon: Icon, children, className = '', action }: SectionCardProps) {
  return (
    <div
      className={`rounded-xl border border-border-primary p-4 ${className}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: CYAN_12 }}
          >
            <Icon size={13} style={{ color: CYAN }} />
          </div>
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
