import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { Forecast } from '@/types';

interface ForecastChartProps {
  forecasts: Forecast[];
  horizonDays: number;
  onHorizonChange: (days: number) => void;
}

export function ForecastChart({ forecasts, horizonDays, onHorizonChange }: ForecastChartProps) {
  const { t } = useTranslation();
  const data = forecasts.map((f) => ({
    date: f.date.slice(5),
    predicted: Math.round(f.predicted_cases * 10) / 10,
    lower: Math.round(f.lower * 10) / 10,
    upper: Math.round(f.upper * 10) / 10,
  }));

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">{t('intelForecast.crimeForecast')}</h3>
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => onHorizonChange(d)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                horizonDays === d ? 'bg-bg-card shadow-sm text-[var(--accent-cyan)]' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-text-tertiary py-12">{t('intelForecast.noData')}</p>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--alert-red)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--alert-red)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                fill="url(#band)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--text-primary)"
                fillOpacity={1}
                isAnimationActive={false}
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--alert-red)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
           <span className="w-4 h-0.5" style={{ background: 'var(--alert-red)' }} />
          Predicted Cases
        </span>
        <span className="flex items-center gap-1">
           <span className="w-4 h-3" style={{ background: 'rgba(255, 51, 102, 0.15)' }} />
          95% Confidence Band
        </span>
      </div>
    </div>
  );
}
