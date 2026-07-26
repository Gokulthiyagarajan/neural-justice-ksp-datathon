/**
 * SP Section Card — blue-accent wrapper for dashboard sections.
 */
import type { LucideIcon } from 'lucide-react';

const BLUE = '#3B82F6';
const BLUE_12 = 'rgba(59, 130, 246, 0.12)';

export function SPSectionCard({
  title,
  icon: Icon,
  children,
  className = '',
  action,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 p-4 ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: BLUE_12 }}
          >
            <Icon size={13} style={{ color: BLUE }} />
          </div>
          <h3 className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
