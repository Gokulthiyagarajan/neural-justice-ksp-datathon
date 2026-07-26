import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { Forecast } from '@/types';

interface ForecastChartProps {
  data: Forecast[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  const { t } = useTranslation();
  const chartData = data.map((f) => ({
    date: f.date.slice(5),
    predicted: f.predicted_cases,
    lower: f.lower,
    upper: f.upper,
  }));

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{t('forecastChart.title')}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="var(--accent-purple)"
              fillOpacity={0.08}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="var(--bg-card)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--accent-purple)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent-purple)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5" style={{ background: 'var(--accent-purple)' }} />
          {t('forecastChart.predictedCases')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: 'var(--accent-purple)', opacity: 0.08 }} />
          {t('forecastChart.confidenceInterval')}
        </span>
      </div>
    </div>
  );
}
