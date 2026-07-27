/**
 * SP Forecast — District 90-day forecast with per-station breakdown
 * Route: /sp/forecast
 */
import { useEffect, useState, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authHeaders } from '@/utils/authHeaders';
import { SPPageSkeleton } from '@/components/sp/SPPageSkeleton';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { ErrorState } from '@/design-system/components/ErrorState';

interface ForecastPoint { date: string; predicted: number; lower: number; upper: number; }
interface StationForecast { station_name: string; predicted_firs: number; confidence: string; }
interface ForecastData {
  forecast_90d?: ForecastPoint[]; station_breakdown?: StationForecast[];
  overall_risk?: string; monthly_average?: number; trend_direction?: string;
}

export function SPForecast() {
  const user = useAuthStore(s => s.user);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`/api/intelligence/v1/forecast?district_id=${user?.district_id ?? 'BENGALURU_URBAN'}&days=90`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.warn('[SPForecast] Fetch failed:', err);
      setError('Unable to load forecast data');
    } finally { setLoading(false); }
  }, [user?.district_id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SPPageSkeleton />;

  if (error) {
    return <div className="p-6"><ErrorState title="Unable to load forecast" description="Please try again. If the issue persists, contact support." onRetry={load} retryLabel="Retry" /></div>;
  }

  const forecastData = (data?.forecast_90d ?? []).map(f => ({ date: f.date, count: f.predicted }));

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <TrendingUp size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-blue-400">District Forecast — 90 Days</h1>
          <p className="text-xs text-white/40">
            {user?.district_name ?? 'District'} · {data?.trend_direction ?? 'stable'} trend
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Monthly Avg (Predicted)', value: data?.monthly_average ?? '—', color: 'blue' },
          { label: 'Overall Risk', value: data?.overall_risk ?? '—', color: data?.overall_risk === 'high' ? 'red' : data?.overall_risk === 'medium' ? 'amber' : 'green' },
          { label: 'Trend Direction', value: data?.trend_direction ?? '—', color: 'blue' },
          { label: 'Stations Projected', value: data?.station_breakdown?.length ?? '—', color: 'blue' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${
              s.color === 'blue' ? 'text-blue-400' : s.color === 'green' ? 'text-green-400' :
              s.color === 'amber' ? 'text-amber-400' : 'text-red-400'
            }`}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <UnifiedTrendChart
        data={forecastData}
        title="90-Day FIR Forecast"
        showForecast
        emptyTitle="No forecast data available"
        emptyDescription="Forecasts will be generated as data is recorded."
      />

      {/* Station breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-medium text-white/70">Per-Station Forecast Breakdown</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/30 text-[10px]">
              <th className="text-left px-4 py-2">Station</th>
              <th className="text-right px-3 py-2">Predicted FIRs (90 days)</th>
              <th className="text-center px-3 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data?.station_breakdown ?? []).map((s, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="px-4 py-2.5 text-white/70 truncate max-w-[200px]">{s.station_name}</td>
                <td className="px-3 py-2.5 text-right font-mono text-white/60">{s.predicted_firs}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                    s.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{s.confidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
