import type { ReactNode } from 'react';

interface HaloStatProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down';
}

export function HaloStat({ label, value, delta, icon, trend }: HaloStatProps) {
  return (
    <div className="halo-stat">
      <div className="halo-stat-head">
        <span className="halo-stat-label">{label}</span>
        {icon && <span className="halo-stat-icon">{icon}</span>}
      </div>
      <p className="halo-stat-value">{value}</p>
      <div className="halo-stat-meta">
        {delta && (
          <span className="halo-stat-delta">
            {trend === 'down' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            )}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
