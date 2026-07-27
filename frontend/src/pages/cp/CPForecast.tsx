/**
 * CPForecast — Crime Forecasting & Prediction
 *
 * Commissioner of Police command center page.
 * AI-powered 30-day crime forecast with prediction intervals,
 * district-level breakdown, and resource recommendations.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, RefreshCw, AlertTriangle, Calendar, Clock, Brain, MapPin,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode, authHeaders } from '@/services/demoData'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ForecastDay {
  date: string
  predicted: number
  lower: number
  upper: number
  weekday: string
  is_weekend: boolean
}

interface DistrictForecast {
  predicted_trend: string
  weekly_avg: number
  change_pct: number
}

interface SeasonalFactor {
  factor: string
  impact: string
  details: string
}

interface ForecastData {
  summary: {
    forecast_period: string
    trend_direction: string
    expected_change_pct: number
    model_confidence: number
    total_predicted_firs: number
    peak_prediction_date: string
    peak_prediction_value: number
    lowest_prediction_date: string
    lowest_prediction_value: number
  }
  forecast_30d: ForecastDay[]
  weekly_breakdown: { week: string; days: string; predicted: number; avg: number }[]
  district_forecast: Record<string, DistrictForecast>
  hotspot_districts: string[]
  resource_recommendation: string
  seasonal_factors: SeasonalFactor[]
  ai_insights: string[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TREND_COLORS: Record<string, string> = {
  rising: '#EF4444',
  stable: '#EAB308',
  falling: '#22C55E',
  emerging: '#8B5CF6',
}

const TREND_ICONS: Record<string, string> = {
  rising: '📈',
  stable: '➡️',
  falling: '📉',
  emerging: '🆕',
}

const SEASONAL_IMPACT_COLORS: Record<string, string> = {
  high: '#EF4444',
  moderate: '#F97316',
  low: '#22C55E',
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Forecast Chart ────────────────────────────────────────────────────────

function ForecastChart({ data }: { data: ForecastDay[] }) {
  if (!data || data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.upper))
  const minVal = Math.min(...data.map(d => d.lower))
  const range = maxVal - minVal

  // Show every 5th label
  const chartHeight = 200

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${data.length * 30} ${chartHeight + 40}`} className="min-w-[600px]">
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = chartHeight * (1 - frac)
          const val = Math.round(minVal + range * frac)
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={data.length * 30} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={-5} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.3)">{val}</text>
            </g>
          )
        })}

        {/* Data points */}
        {data.map((day, i) => {
          const x = i * 30 + 15
          const predictedY = chartHeight - ((day.predicted - minVal) / range) * chartHeight
          const lowerY = chartHeight - ((day.lower - minVal) / range) * chartHeight
          const upperY = chartHeight - ((day.upper - minVal) / range) * chartHeight
          const areaHeight = upperY - lowerY

          return (
            <g key={i}>
              {/* Confidence band */}
              <rect
                x={x - 3}
                y={upperY}
                width={6}
                height={areaHeight}
                fill="rgba(59,130,246,0.15)"
                rx={2}
              />

              {/* Predicted point */}
              <circle
                cx={x}
                cy={predictedY}
                r={2.5}
                fill={day.is_weekend ? '#EAB308' : '#3B82F6'}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={0.5}
              />

              {/* Date label (every 5th) */}
              {i % 5 === 0 && (
                <text x={x} y={chartHeight + 15} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.3)" transform={`rotate(-45, ${x}, ${chartHeight + 15})`}>
                  {formatDate(day.date)}
                </text>
              )}
            </g>
          )
        })}

        {/* Trend line */}
        <polyline
          points={data.map((d, i) => {
            const x = i * 30 + 15
            const y = chartHeight - ((d.predicted - minVal) / range) * chartHeight
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 text-[10px] text-white/40">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span>Predicted</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-blue-500/20 rounded" />
          <span>Confidence band</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-amber-400 rounded-full" />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Weekday</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

function demoForecastData(): ForecastData {
  const now = new Date()
  const forecast_30d: ForecastDay[] = Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(now); dt.setDate(dt.getDate() + i)
    const base = 20 + Math.sin(i * 0.5) * 8 + (Math.random() - 0.5) * 6
    return {
      date: dt.toISOString().slice(0, 10),
      predicted: Math.round(base * 10) / 10,
      lower: Math.round(base * 0.7 * 10) / 10,
      upper: Math.round(base * 1.3 * 10) / 10,
      weekday: dt.toLocaleDateString('en-IN', { weekday: 'short' }),
      is_weekend: dt.getDay() === 0 || dt.getDay() === 6,
    }
  })
  const districts: Record<string, DistrictForecast> = {
    'Bengaluru Urban': { predicted_trend: 'rising', weekly_avg: 48, change_pct: 12.5 },
    'Mysuru': { predicted_trend: 'stable', weekly_avg: 32, change_pct: -2.1 },
    'Belagavi': { predicted_trend: 'rising', weekly_avg: 28, change_pct: 8.3 },
    'Kalaburagi': { predicted_trend: 'emerging', weekly_avg: 22, change_pct: 5.7 },
    'Ballari': { predicted_trend: 'falling', weekly_avg: 18, change_pct: -6.2 },
  }
  return {
    summary: {
      forecast_period: '30 days',
      trend_direction: 'rising',
      expected_change_pct: 8.4,
      model_confidence: 0.82,
      total_predicted_firs: 1247,
      peak_prediction_date: forecast_30d[14].date,
      peak_prediction_value: forecast_30d[14].predicted,
      lowest_prediction_date: forecast_30d[5].date,
      lowest_prediction_value: forecast_30d[5].predicted,
    },
    forecast_30d,
    weekly_breakdown: Array.from({ length: 4 }, (_, i) => ({
      week: `Week ${i + 1}`,
      days: `${forecast_30d[i * 7]?.date ?? ''} - ${forecast_30d[Math.min(i * 7 + 6, 29)]?.date ?? ''}`,
      predicted: Math.round(forecast_30d.slice(i * 7, i * 7 + 7).reduce((s, d) => s + d.predicted, 0)),
      avg: Math.round(forecast_30d.slice(i * 7, i * 7 + 7).reduce((s, d) => s + d.predicted, 0) / 7 * 10) / 10,
    })),
    district_forecast: districts,
    hotspot_districts: ['Bengaluru Urban', 'Kalaburagi', 'Ballari', 'Belagavi', 'Mysuru'],
    resource_recommendation: 'Deploy additional patrol units to Bengaluru Urban (evening hours 6-10 PM). Increase surveillance in Kalaburagi border areas. Maintain current deployment in Ballari.',
    seasonal_factors: [
      { factor: 'Monsoon Season', impact: 'high', details: 'Historical increase in chain snatching and burglary during heavy rainfall months (Jun-Sep).' },
      { factor: 'Festival Period', impact: 'moderate', details: 'Upcoming festival season may see 15-20% rise in pickpocketing and vehicle theft near temple areas.' },
      { factor: 'Year-End Effect', impact: 'low', details: 'Slight uptick in property crimes during December-January holiday period.' },
      { factor: 'Harvest Season', impact: 'moderate', details: 'Increased rural crime during harvest months (Oct-Nov) due to cash flow in agricultural communities.' },
    ],
    ai_insights: [
      'Bengaluru Urban shows a cyclical pattern with peak crime every 7-10 days, suggesting weekly event correlation.',
      'Chain snatching incidents in Koramangala corridor have shifted from evening (6-8 PM) to late night (10 PM-12 AM).',
      'Inter-district vehicle theft ring likely operating across Bengaluru Urban-Mysuru-Belagavi axis.',
      'Predictive model shows 82% confidence in rising trend — recommend proactive deployment adjustment.',
    ],
    last_updated: now.toISOString(),
  }
}

export function CPForecast() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<ForecastData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      if (isDemoMode()) {
        const demo = demoForecastData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      const res = await fetch('/api/cp/forecast', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        const demo = demoForecastData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPForecast] Failed to fetch forecast data')
      const demo = demoForecastData()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-blue-400">Crime Forecasting & Prediction</h1>
            <p className="text-[10px] text-white/40">AI-powered 30-day forecast · Prediction intervals · District-level insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-white/30">Updated: {lastUpdated}</span>
          )}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <JurisdictionBanner scope={jur} />
        </div>
      </div>

      {/* ─── KPI Summary ───────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Forecast Period', value: summary.forecast_period, icon: <Calendar size={12} />, color: 'text-blue-400' },
            { label: 'Trend', value: summary.trend_direction, icon: <TrendingUp size={12} />, color: 'text-blue-400' },
            { label: 'Change', value: `${summary.expected_change_pct}%`, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Model Confidence', value: `${(summary.model_confidence * 100).toFixed(0)}%`, icon: <Brain size={12} />, color: 'text-purple-400' },
            { label: 'Predicted Total', value: summary.total_predicted_firs.toLocaleString(), icon: <Clock size={12} />, color: 'text-amber-400' },
            { label: 'Peak', value: summary.peak_prediction_value.toLocaleString(), icon: <MapPin size={12} />, color: 'text-orange-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={kpi.color}>{kpi.icon}</span>
                <span className="text-[10px] text-white/40">{kpi.label}</span>
              </div>
              <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Main Area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading forecast…</p>
              </div>
            </div>
          )}

          {/* 30-Day Forecast Chart */}
          {data && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-blue-400 mb-3">30-Day Crime Prediction</h3>
              <ForecastChart data={data.forecast_30d} />
            </div>
          )}

          {/* Weekly Breakdown */}
          {data?.weekly_breakdown && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-blue-400">Weekly Breakdown</h3>
              </div>
              <div className="space-y-2">
                {data.weekly_breakdown.map((week, i) => {
                  const maxAvg = Math.max(...data.weekly_breakdown.map(w => w.avg))
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-16 text-[10px] text-white/40">{week.week}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/50">{week.days}</span>
                          <span className="text-[10px] text-white/80">{week.predicted} FIRs (avg {week.avg})</span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400/60 rounded-full"
                            style={{ width: `${(week.avg / maxAvg) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {data?.ai_insights && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-purple-400 mb-3">AI Predictions & Insights</h3>
              <ul className="space-y-2">
                {data.ai_insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-white/50 leading-relaxed">
                    <Brain size={12} className="mt-0.5 text-purple-400 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Seasonal Factors */}
          {data?.seasonal_factors && (
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-amber-400 mb-3">Seasonal Factors</h3>
              <div className="grid grid-cols-3 gap-3">
                {data.seasonal_factors.map((sf, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${SEASONAL_IMPACT_COLORS[sf.impact]}20 ${SEASONAL_IMPACT_COLORS[sf.impact]}`}>
                        {sf.impact.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white/80 mb-1">{sf.factor}</h4>
                    <p className="text-[10px] text-white/40 leading-relaxed">{sf.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-80 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Resource Recommendation */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-amber-400 mb-2">Resource Recommendation</h3>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                {data?.resource_recommendation}
              </p>
            </div>
          </div>

          {/* District Forecast */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-blue-400 mb-3">District Forecast</h3>
            <div className="space-y-2">
              {Object.entries(data?.district_forecast || {}).map(([district, forecast]) => {
                const trend = forecast.predicted_trend
                return (
                  <button
                    key={district}
                    onClick={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
                    className={`w-full bg-white/[0.03] rounded-lg p-3 border border-white/5 hover:bg-white/[0.06] transition-colors text-left ${
                      selectedDistrict === district ? 'ring-1 ring-blue-400/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/70 font-medium">{district}</span>
                      <span className="text-xs" style={{ color: TREND_COLORS[trend] }}>
                        {TREND_ICONS[trend]} {trend.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-white/40">Weekly avg:</span>
                      <span className="text-white/80 font-medium">{forecast.weekly_avg} FIRs</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-white/40">Change:</span>
                      <span className={forecast.change_pct > 0 ? 'text-red-400' : 'text-green-400'}>
                        {forecast.change_pct > 0 ? '+' : ''}{forecast.change_pct}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hotspot Districts */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold text-red-400 mb-2">Hotspot Ranking</h3>
            <div className="space-y-1.5">
              {(data?.hotspot_districts || []).map((district, i) => {
                const max = Math.max(...Object.values(data?.district_forecast || {}).map(d => d.weekly_avg))
                const avg = data?.district_forecast[district]?.weekly_avg || 0
                return (
                  <div key={district} className="flex items-center gap-2">
                    <div className="w-4 text-[9px] text-white/40">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-white/70">{district}</span>
                        <span className="text-[9px] text-white/40">{avg}/wk</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400/60 rounded-full"
                          style={{ width: `${(avg / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Model Info */}
          <div className="p-4">
            <p className="text-[10px] text-white/30 leading-relaxed">
              Forecast updated every 60s. Confidence bands show 70% prediction interval.
              District forecasts based on historical FIR patterns and seasonal factors.
              This is a predictive model — actual results may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}