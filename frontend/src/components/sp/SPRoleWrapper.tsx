/**
 * SPRoleWrapper — shared wrapper used by all SP route-namespace pages.
 *
 * Renders the child component with a subtle "SP" badge in the top-right
 * corner to indicate the Superintendent of Police role context.
 */
import type { ReactNode } from 'react';

interface SPRoleWrapperProps {
  children: ReactNode;
}

export function SPRoleWrapper({ children }: SPRoleWrapperProps) {
  return (
    <div className="relative">
      <span className="absolute top-2 right-2 z-10 text-[11px] font-semibold uppercase tracking-wider text-blue-500/80 select-none pointer-events-none">
        SP
      </span>
      {children}
    </div>
  );
}
