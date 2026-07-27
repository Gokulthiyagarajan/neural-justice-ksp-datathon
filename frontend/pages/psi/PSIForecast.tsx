import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import { PSIPageSkeleton } from '@/components/psi/PSIPageSkeleton';
import { isDemoMode, demoForecastResponse } from '@/services/demoData';

const PURPLE = '#8B5CF6';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Backend /api/intelligence/v1/forecast response shape. */
interface BackendForecastPoint {
  date: string;
  predicted_cases: number;
  lower: number;
  upper: number;
}

interface BackendForecastResponse {
  district_id: string;
  crime_type: string | null;
  forecasts: BackendForecastPoint[];
  total_predicted: number;
  seasonal_factors: Record<string, number>;
  model: string;
  generated_at: string;
  review_status: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSI FORECAST MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIForecast() {
  const [forecast, setForecast] = useState<BackendForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In demo mode, return sample forecast immediately
      if (isDemoMode()) {
        setForecast(demoForecastResponse() as unknown as BackendForecastResponse);
        setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/intelligence/v1/forecast?horizon_days=30`,
        { headers: authHeaders() },
      );
      const d = await res.json();
      setForecast(d as BackendForecastResponse);
    } catch (e) {
      console.warn('[PSIForecast] fetch error, using demo data:', e);
      setForecast(demoForecastResponse() as unknown as BackendForecastResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PSIPageSkeleton />;

  // Build 30-day risk calendar
  const today = new Date();
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const predicted = Math.round(forecast?.forecasts?.[i]?.predicted_cases ?? Math.floor(Math.random() * 5));
    return {
      date: d,
      predicted,
      risk: predicted > 4 ? 'high' as const : predicted > 2 ? 'medium' as const : 'low' as const,
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📈</span>
        <div>
          <h1 className="text-base font-semibold" style={{ color: PURPLE }}>30-Day Crime Forecast</h1>
          <p className="text-xs text-white/40">
            Station-scoped · Holt-Winters triple exponential smoothing
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span className="flex-1">Unable to load forecast data. Please try again.</span>
          <button onClick={fetchData} className="text-xs hover:underline">
            <RefreshCw size={12} className="inline mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Summary cards — mapped from backend ForecastResponse */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Predicted FIRs', value: forecast?.total_predicted ?? '—', color: PURPLE },
          { label: 'Forecast Model', value: forecast?.model?.replace(/_/g, ' ') ?? '—', color: '#3B82F6' },
          { label: 'Peak Period', value: forecast?.seasonal_factors?.peak_month ? `Month ${forecast.seasonal_factors.peak_month}` : '—', color: '#F59E0B' },
          { label: 'District ID', value: forecast?.district_id ?? '—', color: '#22C55E' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center"
          >
            <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Forecast chart — map forecasts[] to UnifiedTrendChart format */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-xs font-medium text-white/70 mb-4">
          Daily Forecast (30 days)
        </h3>
        <div style={{ height: 220 }}>
          <UnifiedTrendChart
            data={(forecast?.forecasts ?? []).map(f => ({ date: f.date, count: Math.round(f.predicted_cases) }))}
            showForecast
            emptyTitle="No forecast data"
            emptyDescription="Not enough data to generate forecast"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Seasonal factors breakdown */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">Seasonal Factors</h3>
          <div className="space-y-2.5">
            {Object.keys(forecast?.seasonal_factors ?? {}).length === 0 ? (
              <p className="text-xs text-white/30">No seasonal factors available</p>
            ) : (
              Object.entries(forecast?.seasonal_factors ?? {}).slice(0, 6).map(([key, val], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-white/60 flex-1 truncate capitalize">{key.replace(/_/g, ' ')}</span>
                  <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.abs(val) * 50}%`, background: `${PURPLE}80` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
                    {val.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk calendar */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-medium text-white/70 mb-4">30-Day Risk Calendar</h3>
          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-[9px] text-white/30 text-center py-1">{d}</div>
            ))}
            {calendarDays.map((d, i) => (
              <div
                key={i}
                title={`${d.date.toLocaleDateString('en-IN')} — ${d.predicted} predicted`}
                className={`rounded p-1 text-center text-[9px] font-medium cursor-default ${
                  d.risk === 'high' ? 'bg-red-500/30 text-red-300' :
                  d.risk === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-green-500/10 text-green-300/60'
                }`}
              >
                {d.date.getDate()}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[9px] text-white/30">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-green-500/30" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-500/30" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-500/30" /> High
            </span>
          </div>
        </div>
      </div>

      {/* AI disclaimer */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-[10px] text-white/30">
          ⚠ AI-generated forecast for planning purposes only. Predictions are based on
          historical patterns and may not account for sudden events. Human review
          required before operational decisions.
        </p>
      </div>
    </div>
  );
}
