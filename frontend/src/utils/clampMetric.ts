export interface MetricDisplay {
  display: string;
  raw: number;
  clamped: number;
  outOfBounds: boolean;
}

export interface ClampMetricOptions {
  min?: number;
  max?: number;
  unit?: string;
  isPercent?: boolean;
  decimals?: number;
}

export function clampMetric(value: number, options: ClampMetricOptions = {}): MetricDisplay {
  const { min = 0, max = options.isPercent ? 100 : Infinity, unit = '', isPercent = false, decimals = isPercent ? 0 : 0 } = options;
  const outOfBounds = value < min || value > max;
  const clamped = Math.min(max, Math.max(min, value));
  const formatted = isPercent
    ? `${clamped.toFixed(decimals)}%`
    : `${clamped.toLocaleString(undefined, { maximumFractionDigits: decimals })}${unit}`;

  return {
    display: formatted,
    raw: value,
    clamped,
    outOfBounds,
  };
}
