import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendPoint, Forecast } from '@/types';

interface TrendChartProps {
  data: TrendPoint[];
  forecast?: Forecast[];
  days?: number;
  isLoading?: boolean;
}

export function TrendChart({ data, forecast = [], days: periodDays = 90, isLoading }: TrendChartProps) {
  const chartData = data
    .slice(-periodDays)
    .map((d, i, arr) => {
      const window = 30;
      const start = Math.max(0, i - window + 1);
      const slice = arr.slice(start, i + 1);
      const ma = slice.reduce((s, p) => s + p.count, 0) / slice.length;
      return {
        date: d.date.slice(5),
        cases: d.count,
        movingAvg: Math.round(ma * 10) / 10,
      };
    });

  const forecastChartData = forecast.map((f) => ({
    date: f.date.slice(5),
    predicted: f.predicted_cases,
    lower: f.lower,
    upper: f.upper,
  }));

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-3 sm:p-4 md:p-5 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="font-semibold text-text-primary text-sm sm:text-base truncate">Crime Trends</h3>
        {isLoading && (
          <span className="text-[10px] sm:text-xs text-accent-cyan animate-pulse">Loading forecast...</span>
        )}
      </div>
      <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 2, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="cases" fill="var(--accent-cyan)" opacity={0.3} radius={[2, 2, 0, 0]} />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="var(--alert-red)"
              strokeWidth={1.5}
              dot={false}
            />
            {/* Forecast confidence band */}
            {forecastChartData.length > 0 && (
              <>
                <Area
                  data={forecastChartData}
                  dataKey="upper"
                  stroke="none"
                  fill="var(--accent-purple)"
                  fillOpacity={0.1}
                  name="upper"
                />
                <Area
                  data={forecastChartData}
                  dataKey="lower"
                  stroke="none"
                  fill="var(--bg-card)"
                  fillOpacity={1}
                  name="lower"
                />
                <Line
                  data={forecastChartData}
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--accent-purple)"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Forecast"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-[10px] sm:text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded" style={{ background: 'rgba(0, 212, 255, 0.08)' }} />
          Daily Cases
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 sm:w-3.5 sm:h-0.5" style={{ background: 'var(--alert-red)' }} />
          30-Day Moving Avg
        </span>
        {forecastChartData.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 sm:w-3.5 sm:h-0.5 border-t-2 border-dashed" style={{ borderColor: 'var(--accent-purple)' }} />
            Forecast
          </span>
        )}
      </div>
    </div>
  );
}
