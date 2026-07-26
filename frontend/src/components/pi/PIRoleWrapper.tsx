/**
 * PIRoleWrapper — shared wrapper used by all PI route-namespace pages.
 *
 * Renders the child component with a subtle "PI" badge in the top-right
 * corner to indicate the Police Inspector role context.
 */
import type { ReactNode } from 'react';

interface PIRoleWrapperProps {
  children: ReactNode;
}

export function PIRoleWrapper({ children }: PIRoleWrapperProps) {
  return (
    <div className="relative">
      <span className="absolute top-2 right-2 z-10 text-[11px] font-semibold uppercase tracking-wider text-cyan-500/80 select-none pointer-events-none">
        PI
      </span>
      {children}
    </div>
  );
}
