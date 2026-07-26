import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';
import { clampMetric, type ClampMetricOptions } from '@/utils/clampMetric';
import { ScoreGauge } from './ScoreGauge';
import { Skeleton } from './Skeleton';

export interface StatCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  delta?: string;
  /** When set, renders the signature arc gauge instead of plain numeric value */
  gauge?: boolean;
  metricOptions?: ClampMetricOptions;
  className?: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  gauge = false,
  metricOptions,
  className,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn('panel-card p-4 space-y-3', className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-2 w-20" />
      </div>
    );
  }

  const metric = clampMetric(value, metricOptions ?? {});

  return (
    <div className={cn('panel-card p-4 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium uppercase tracking-wide text-text-secondary">{label}</span>
        {icon && <span className="text-text-tertiary [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      </div>

      <div className="flex items-end justify-between gap-3">
        {gauge ? (
          <ScoreGauge value={metric.clamped} size="sm" showValue />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums text-text-primary leading-none">
            {metric.display}
          </p>
        )}
        {delta && (
          <span className="text-caption font-mono text-verified-green bg-verified-green/10 px-2 py-0.5 rounded-full">
            {delta}
          </span>
        )}
      </div>

      {metric.outOfBounds && (
        <p className="flex items-center gap-1 text-[10px] text-signal-amber">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
          Value adjusted — source reported {metric.raw.toLocaleString()}
        </p>
      )}
    </div>
  );
}
