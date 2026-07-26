import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line,
} from 'recharts';
import { chartTimeRanges } from '@/design-system/tokens';
import { cn } from '@/design-system/utils/cn';
import { Skeleton } from '@/design-system/components/Skeleton';
import { EmptyState } from '@/design-system/components/EmptyState';
import { TrendingUp } from 'lucide-react';

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface UnifiedTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  /** Controlled period in days */
  days?: number;
  onDaysChange?: (days: number) => void;
  showForecast?: boolean;
  isLoading?: boolean;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

type PeriodDays = (typeof chartTimeRanges)[number]['days'];

export function UnifiedTrendChart({
  data,
  title,
  days: controlledDays,
  onDaysChange,
  showForecast = false,
  isLoading,
  className,
  emptyTitle,
  emptyDescription,
}: UnifiedTrendChartProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('chart.crimeTrends');
  const resolvedEmptyTitle = emptyTitle ?? t('chart.noTrendTitle');
  const resolvedEmptyDescription = emptyDescription ?? t('chart.noTrendDescription');
  const [internalDays, setInternalDays] = useState<PeriodDays>(30);
  const days = controlledDays ?? internalDays;
  const setDays = onDaysChange ?? setInternalDays;

  const filtered = useMemo(() => {
    if (!data.length) return [];
    return data.slice(-days).map((d) => ({
      date: d.date.slice(5),
      actual: d.count,
      forecast: null as number | null,
    }));
  }, [data, days]);

  const chartData = useMemo(() => {
    if (!showForecast || !filtered.length) return filtered;
    const last3 = filtered.slice(-3).map((d) => d.actual);
    const avg = last3.reduce((a, b) => a + b, 0) / (last3.length || 1);
    return filtered.map((d, i) => ({
      ...d,
      forecast: i >= filtered.length - 3 ? Math.round(avg) : null,
    }));
  }, [filtered, showForecast]);

  const total = chartData.reduce((s, d) => s + d.actual, 0);
  const avg = chartData.length ? Math.round(total / chartData.length) : 0;
  const peak = chartData.length ? Math.max(...chartData.map((d) => d.actual)) : 0;

  if (isLoading) {
    return (
      <div className={cn('panel-card p-5', className)}>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={<TrendingUp />}
        title={resolvedEmptyTitle}
        description={resolvedEmptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cn('panel-card p-5', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary font-display">{resolvedTitle}</h3>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-text-tertiary">
            <span>{t('chart.total')}: {total}</span>
            <span aria-hidden>·</span>
            <span>{t('chart.avgPerDay')}: {avg}{t('chart.perDay')}</span>
            <span aria-hidden>·</span>
            <span>{t('chart.peak')}: {peak}</span>
          </div>
        </div>
        <div className="flex gap-1 bg-bg-tertiary rounded-md p-0.5" role="group" aria-label={t('chart.timeRange')}>
          {chartTimeRanges.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-sm transition-colors duration-fast motion-reduce:transition-none',
                days === p.days
                  ? 'bg-bg-secondary text-service-blue border border-border-primary'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-service-blue)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-service-blue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" strokeOpacity={0.6} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                boxShadow: 'var(--shadow-floating)',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--color-service-blue)"
              strokeWidth={2}
              fill="url(#trendGradient)"
              name={t('chart.cases')}
            />
            {showForecast && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-signal-amber)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name={t('chart.forecast')}
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
