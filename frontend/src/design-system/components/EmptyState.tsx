import type { ReactNode } from 'react';
import { cn } from '@/design-system/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'panel-card flex flex-col items-center justify-center text-center px-6 py-12',
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-text-tertiary [&>svg]:w-10 [&>svg]:h-10">{icon}</div>
      )}
      <h3 className="text-sm font-semibold text-text-primary font-display">{title}</h3>
      <p className="text-caption text-text-secondary mt-2 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
