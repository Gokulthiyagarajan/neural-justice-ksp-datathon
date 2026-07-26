import { useTranslation } from 'react-i18next';
import type { TrendPoint, Forecast } from '@/types';

interface MetricsPanelProps {
  trendData: TrendPoint[];
  forecastData: Forecast[];
}

function formatPct(value: number): string {
  const abs = Math.abs(value);
  return `${value >= 0 ? '+' : '-'}${abs.toFixed(1)}%`;
}

export function MetricsPanel({ trendData, forecastData }: MetricsPanelProps) {
  const { t } = useTranslation();
  if (trendData.length < 7) return null;

  const recent = trendData.slice(-7);
  const prev = trendData.slice(-14, -7);
  const recentAvg = recent.reduce((s, d) => s + d.count, 0) / recent.length;
  const prevAvg = prev.length ? prev.reduce((s, d) => s + d.count, 0) / prev.length : recentAvg;
  const weekChange = prevAvg ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;

  const forecastChange = forecastData.length
    ? ((forecastData[forecastData.length - 1].predicted_cases - forecastData[0].predicted_cases) /
        forecastData[0].predicted_cases) *
      100
    : null;

  const metrics = [
    {
      label: t('metrics.weeklyTrend'),
      value: formatPct(weekChange),
      dir: weekChange >= 0 ? 'up' : 'down',
      critical: Math.abs(weekChange) > 10,
    },
    {
      label: t('metrics.forecastChange'),
      value: forecastChange !== null ? formatPct(forecastChange) : '—',
      dir: forecastChange !== null && forecastChange >= 0 ? 'up' : 'down',
      critical: forecastChange !== null && Math.abs(forecastChange) > 10,
    },
    {
      label: t('metrics.confidence'),
      value: forecastData.length ? '80%' : '—',
      dir: 'neutral',
    },
  ];

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 space-y-4">
      <h3 className="font-semibold text-text-primary text-sm">{t('metrics.keyMetrics')}</h3>
      {metrics.map((m) => (
        <div key={m.label} className="space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{m.label}</p>
          <p
            className={`text-lg font-bold ${
              m.critical && m.dir === 'up'
                ? 'text-alert-red'
                : m.critical && m.dir === 'down'
                  ? 'text-accent-green'
                  : 'text-text-primary'
            }`}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
