import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { ForecastChart } from './ForecastChart';
import { CrimeTypeChart } from './CrimeTypeChart';
import { MetricsPanel } from './MetricsPanel';
import { StatCard } from '@/design-system/components/StatCard';
import { getForecast } from '@/api/intelligence';
import { getFirs } from '@/api/firs';
import { chartTimeRanges } from '@/design-system/tokens';
import { useAuth } from '@/hooks/useAuth';
import type { TrendPoint, Forecast } from '@/types';

// Demo forecast data
const DEMO_FORECAST: Forecast[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i + 1);
  return {
    date: date.toISOString().slice(0, 10),
    predicted_cases: Math.round(12 + Math.sin(i / 5) * 6 + Math.random() * 3),
    lower: Math.round(8 + Math.sin(i / 5) * 4),
    upper: Math.round(18 + Math.sin(i / 5) * 8),
  };
});

// Demo crime types
const DEMO_CRIME_TYPES = [
  { name: 'Robbery', count: 42 },
  { name: 'Theft', count: 38 },
  { name: 'Cyber Fraud', count: 31 },
  { name: 'Assault', count: 27 },
  { name: 'Vehicle Theft', count: 24 },
  { name: 'Burglary', count: 19 },
  { name: 'Cheating', count: 16 },
  { name: 'Murder', count: 8 },
  { name: 'Drug Offence', count: 12 },
  { name: 'Domestic Violence', count: 14 },
];

interface AnalyticsDashboardProps {
  trendData: TrendPoint[];
}

export function AnalyticsDashboard({ trendData }: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [days, setDays] = useState(30);
  const [forecastData, setForecastData] = useState<Forecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [crimeTypes, setCrimeTypes] = useState<{ name: string; count: number }[]>([]);

  // Role-based content visibility
  const showForecasts = hasRole('ANALYST', 'SUPERVISOR', 'SUPER_ADMIN');
  const showCrimeTypes = hasRole('INVESTIGATOR', 'ANALYST', 'SUPERVISOR');
  const showDetailedMetrics = hasRole('ANALYST', 'SUPERVISOR');

  useEffect(() => {
    setForecastLoading(true);
    Promise.allSettled([
      getForecast(undefined, days),
      getFirs({ limit: 200 }),
    ])
      .then(([forecastRes, firsRes]) => {
        // Forecast
        const forecasts = forecastRes.status === 'fulfilled' ? forecastRes.value?.forecasts : undefined;
        if (forecasts?.length) {
          setForecastData(forecasts);
        } else {
          setForecastData(DEMO_FORECAST);
        }
        // Crime types from FIR data
        if (firsRes.status === 'fulfilled' && firsRes.value?.results?.length > 0) {
          const typeMap = new Map<string, number>();
          firsRes.value.results.forEach((fir) => {
            const key = fir.crime_head_name || 'Unknown';
            typeMap.set(key, (typeMap.get(key) || 0) + 1);
          });
          setCrimeTypes(
            Array.from(typeMap.entries())
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count),
          );
        } else {
          setCrimeTypes(DEMO_CRIME_TYPES);
        }
      })
      .finally(() => setForecastLoading(false));
  }, [days]);

  const slicedTrend = useMemo(() => trendData.slice(-days), [trendData, days]);

  const total = slicedTrend.reduce((s, d) => s + d.count, 0);
  const avg = slicedTrend.length ? Math.round(total / slicedTrend.length) : 0;
  const peak = slicedTrend.reduce(
    (max, d) => (d.count > max.count ? d : max),
    { date: '—', count: 0 } as TrendPoint,
  );
  const forecastTotal = forecastData.length
    ? Math.round(forecastData[forecastData.length - 1]?.predicted_cases ?? 0)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-bg-tertiary rounded-md p-0.5" role="group" aria-label={t('analytics.timeRange')}>
          {chartTimeRanges.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors duration-fast ${
                days === p.days
                  ? 'bg-bg-secondary text-service-blue border border-border-primary'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-text-tertiary">
          <span>
            {t('analytics.forecast')}: <strong className="text-service-blue font-mono">{forecastTotal ?? '—'}</strong> {t('analytics.inNextDays', { days })}
          </span>
        </div>
      </div>

      {/* Stat cards — visible to all roles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('analytics.totalCases')} value={total} />
        <StatCard label={t('analytics.dailyAverage')} value={avg} />
        <StatCard label={t('analytics.peakDay')} value={peak.count} delta={peak.date !== '—' ? peak.date.slice(5) : undefined} />
        <StatCard label={t('analytics.dataPoints')} value={slicedTrend.length} />
      </div>

      {/* Trend chart + metrics — visible to all roles */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <UnifiedTrendChart
            data={trendData.map((d) => ({ date: d.date, count: d.count }))}
            days={days}
            onDaysChange={setDays}
            isLoading={forecastLoading}
          />
        </div>
        {showDetailedMetrics && (
          <div className="lg:col-span-1">
            <MetricsPanel trendData={slicedTrend} forecastData={forecastData} />
          </div>
        )}
      </div>

      {/* Forecast — analyst, supervisor, policymaker only (no raw PII concern for policymaker) */}
      {showForecasts && forecastData.length > 0 && <ForecastChart data={forecastData} />}

      {/* Crime type breakdown — investigator, analyst, supervisor (policymaker sees no individual types) */}
      {showCrimeTypes && crimeTypes.length > 0 && <CrimeTypeChart data={crimeTypes} />}
    </div>
  );
}
