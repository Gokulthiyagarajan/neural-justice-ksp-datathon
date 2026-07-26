import { useMemo } from 'react';
import { cn } from '@/design-system/utils/cn';

export type ScoreLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ScoreGaugeProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  className?: string;
  /** Override automatic color from value */
  level?: ScoreLevel;
}

function scoreLevel(value: number, max: number): ScoreLevel {
  const pct = (value / max) * 100;
  if (pct >= 80) return 'critical';
  if (pct >= 60) return 'high';
  if (pct >= 40) return 'medium';
  return 'low';
}

const LEVEL_COLORS: Record<ScoreLevel, string> = {
  low: 'var(--color-verified-green)',
  medium: 'var(--color-service-blue)',
  high: 'var(--color-signal-amber)',
  critical: 'var(--color-alert-red)',
};

const SIZE_CONFIG = {
  sm: { width: 56, stroke: 5, fontSize: 'text-xs' },
  md: { width: 80, stroke: 6, fontSize: 'text-sm' },
  lg: { width: 112, stroke: 8, fontSize: 'text-lg' },
} as const;

/** Canonical arc gauge for risk scores, AI confidence, and operational metrics */
export function ScoreGauge({
  value,
  max = 100,
  size = 'md',
  label,
  showValue = true,
  className,
  level,
}: ScoreGaugeProps) {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? clamped / max : 0;
  const resolvedLevel = level ?? scoreLevel(clamped, max);
  const color = LEVEL_COLORS[resolvedLevel];
  const { width, stroke, fontSize } = SIZE_CONFIG[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  const arcPath = useMemo(() => {
    const cy = width / 2;
    const r = radius;
    return `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${cy}`;
  }, [width, stroke, radius]);

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)} role="img" aria-label={label ? `${label}: ${Math.round(clamped)}` : undefined}>
      <div className="relative" style={{ width, height: width / 2 + stroke }}>
        <svg width={width} height={width / 2 + stroke} viewBox={`0 0 ${width} ${width / 2 + stroke}`} className="overflow-visible">
          <path
            d={arcPath}
            fill="none"
            stroke="var(--border-secondary)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        {showValue && (
          <span
            className={cn('absolute inset-x-0 bottom-0 text-center font-mono font-semibold tabular-nums', fontSize)}
            style={{ color }}
          >
            {Math.round(clamped)}{max === 100 ? '' : `/${max}`}
          </span>
        )}
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-console text-text-tertiary font-medium text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}
