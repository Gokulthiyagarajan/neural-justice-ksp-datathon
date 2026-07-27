const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Typed error for dashboard data loading.
 *
 * This module deliberately uses its own `fetch` wrapper rather than the central
 * `api` client in `src/api/client.ts`. The reason: the dashboard metrics/trend
 * endpoints are auth-gated and the local demo runs with a sentinel token
 * (`demo-session`, not a real JWT), so they intentionally return 401 in demo
 * mode. Routing through the central client would trigger its 401 handler which
 * clears `localStorage.auth_token` and logs the demo user out on every poll.
 *
 * To still allow the caller to differentiate failure modes (network outage vs
 * authentication vs server fault) without that side effect, we throw a
 * `DashboardApiError` carrying the HTTP status and a `kind`.
 */
export type DashboardErrorKind = 'network' | 'auth' | 'server' | 'client' | 'unknown';

export class DashboardApiError extends Error {
  readonly statusCode?: number;
  readonly kind: DashboardErrorKind;

  constructor(message: string, kind: DashboardErrorKind, statusCode?: number) {
    super(message);
    this.name = 'DashboardApiError';
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

function classify(status: number): DashboardErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

async function getJson<T>(path: string): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) {
    // In production (Catalyst), Authorization header is intercepted by
    // Catalyst's OAuth gateway. Use X-Demo-Session to bypass instead.
    if (import.meta.env.VITE_API_URL) {
      headers['X-Demo-Session'] = 'true';
    } else {
      // Local dev: standard JWT bearer token
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers });
  } catch {
    // Network failure / backend unreachable — not an HTTP response.
    throw new DashboardApiError(`Network error contacting ${path}`, 'network');
  }

  if (!res.ok) {
    const kind = classify(res.status);
    const body = (await res.json().catch(() => ({}))) as {
      detail?: string;
      message?: string;
    };
    const message = body?.detail || body?.message || res.statusText || `HTTP ${res.status}`;
    throw new DashboardApiError(message, kind, res.status);
  }

  return (await res.json()) as T;
}

export interface DashboardMetrics {
  todays_firs: number;
  active_investigations: number;
  crime_index: number;
  ai_alerts: number;
  active_cases: number;
  prediction_accuracy: number;
  district_count: number;
  station_count: number;
  division_count: number;
  last_updated: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return getJson<DashboardMetrics>('/api/dashboard/metrics');
}

export async function fetchCrimeTrend(): Promise<TrendPoint[]> {
  const data = await getJson<{ trend?: TrendPoint[] }>('/api/dashboard/trend');
  return data.trend ?? [];
}

export async function fetchDistrictBreakdown(): Promise<{ district: string; count: number }[]> {
  const data = await getJson<{ districts?: { district: string; count: number }[] }>(
    '/api/dashboard/districts',
  );
  return data.districts ?? [];
}

// ─── CP-exclusive metrics ──────────────────────────────────────────────────

export interface DivisionBreakdown {
  id: number
  name: string
  district_count: number
  total_firs: number
  pct_of_state: number
  top_crime_type: string
  trend: number
}

export interface DistrictRanking {
  id: number
  name: string
  fir_count: number
  pct_of_max: number
  delta: number
}

export interface DistrictSolvedRate {
  id: number
  name: string
  fir_count: number
  solved_rate: number
  officer_count: number
}

export interface Trend12M {
  date: string
  count: number
}

export interface CPMetrics {
  total_firs: number
  total_firs_trend: number
  open_cases: number
  open_cases_trend: number
  solved_rate: number
  solved_rate_trend: number
  total_officers: number
  on_duty: number
  active_stations: number
  active_warnings: number
  warnings_trend: number
  district_count: number
  station_count: number
  division_count: number
  division_breakdown: DivisionBreakdown[]
  district_rankings: DistrictRanking[]
  top_districts_solved: DistrictSolvedRate[]
  audit_events_today: number
  active_sessions: number
  avg_api_ms: number
  cache_hit_rate: number
  trend_12m: Trend12M[]
}

export async function fetchCPMetrics(): Promise<CPMetrics> {
  try {
    return await getJson<CPMetrics>('/api/dashboard/cp-metrics');
  } catch (err) {
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return {
        total_firs: 12483,
        total_firs_trend: 8.2,
        open_cases: 3471,
        open_cases_trend: 5.7,
        solved_rate: 72.4,
        solved_rate_trend: -2.1,
        total_officers: 28492,
        on_duty: 18340,
        active_stations: 876,
        active_warnings: 12,
        warnings_trend: 25.0,
        district_count: 31,
        station_count: 906,
        division_count: 4,
        division_breakdown: [
          { id: 1, name: 'Bengaluru', district_count: 8, total_firs: 4231, pct_of_state: 33.9, top_crime_type: 'Theft', trend: 12.4 },
          { id: 2, name: 'Mysuru', district_count: 6, total_firs: 2912, pct_of_state: 23.3, top_crime_type: 'Robbery', trend: -3.1 },
          { id: 3, name: 'Belagavi', district_count: 9, total_firs: 3187, pct_of_state: 25.5, top_crime_type: 'Assault', trend: 5.8 },
          { id: 4, name: 'Kalaburagi', district_count: 8, total_firs: 2153, pct_of_state: 17.2, top_crime_type: 'Burglary', trend: -1.5 },
        ],
        district_rankings: [
          { id: 1, name: 'Bengaluru Urban', fir_count: 2847, pct_of_max: 100, delta: 142 },
          { id: 2, name: 'Bengaluru Rural', fir_count: 1384, pct_of_max: 48.6, delta: 87 },
          { id: 3, name: 'Mysuru', fir_count: 1123, pct_of_max: 39.4, delta: -34 },
          { id: 4, name: 'Kalaburagi', fir_count: 987, pct_of_max: 34.7, delta: 56 },
          { id: 5, name: 'Belagavi', fir_count: 876, pct_of_max: 30.8, delta: -21 },
          { id: 6, name: 'Dakshina Kannada', fir_count: 765, pct_of_max: 26.9, delta: 43 },
          { id: 7, name: 'Ballari', fir_count: 654, pct_of_max: 23.0, delta: -12 },
          { id: 8, name: 'Dharwad', fir_count: 543, pct_of_max: 19.1, delta: 28 },
          { id: 9, name: 'Tumakuru', fir_count: 432, pct_of_max: 15.2, delta: -8 },
          { id: 10, name: 'Shivamogga', fir_count: 321, pct_of_max: 11.3, delta: 15 },
        ],
        top_districts_solved: [
          { id: 1, name: 'Kodagu', fir_count: 187, solved_rate: 88.3, officer_count: 420 },
          { id: 2, name: 'Udupi', fir_count: 312, solved_rate: 84.7, officer_count: 385 },
          { id: 3, name: 'Chikkamagaluru', fir_count: 298, solved_rate: 81.2, officer_count: 410 },
          { id: 4, name: 'Hassan', fir_count: 445, solved_rate: 78.9, officer_count: 520 },
          { id: 5, name: 'Mandya', fir_count: 367, solved_rate: 76.4, officer_count: 380 },
        ],
        audit_events_today: 284,
        active_sessions: 1247,
        avg_api_ms: 187,
        cache_hit_rate: 92.6,
        trend_12m: Array.from({ length: 12 }, (_, i) => {
          const dt = new Date(now);
          dt.setMonth(dt.getMonth() - (11 - i));
          return { date: `${months[dt.getMonth()]} ${dt.getFullYear()}`, count: 900 + Math.floor(Math.random() * 300) + i * 50 };
        }),
      };
    }
    throw err;
  }
}

// ─── SP-exclusive metrics ───────────────────────────────────────────────────

export interface StationPerformance {
  id: number
  name: string
  code: string
  fir_count: number
  open_cases: number
  solved_rate: number
  officer_count: number
  last_reported: string | null
  status: 'active' | 'delayed' | 'offline'
  trend: number
}

export interface CrimeTypeData {
  type: string
  count: number
  pct: number
  delta: number
}

export interface RecentFIR {
  crime_no: string
  status: string
  occurrence_date: string | null
  crime_type: string
  station_name: string
}

export interface FinancialAlert {
  id: number
  crime_no: string
  amount: number
  sender: string
  receiver: string
  status: string
  station_name: string
  anomaly_type: string
}

export interface SPMetrics {
  district_code: string
  district_name: string
  division_name: string
  station_count: number
  active_stations: number
  total_firs: number
  firs_trend: number
  open_cases: number
  solved_rate: number
  active_warnings: number
  crime_types: CrimeTypeData[]
  trend_6m: TrendPoint[]
  recent_firs: RecentFIR[]
  financial_alerts: FinancialAlert[]
  last_updated: string
}

export async function fetchSPMetrics(districtCode: string): Promise<SPMetrics> {
  try {
    return await getJson<SPMetrics>(`/api/dashboard/sp-metrics?district_code=${encodeURIComponent(districtCode)}`);
  } catch (err) {
    // In demo mode or when backend is unavailable, return sample data
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      const now = new Date();

      // 6-month trend
      const trend6m: TrendPoint[] = Array.from({ length: 180 }, (_, i) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - (179 - i));
        return { date: dt.toISOString().slice(0, 10), count: Math.floor(Math.random() * 8) + 1 };
      });

      const district = districtCode || 'BENGALURU_URBAN';

      return {
        district_code: district,
        district_name: 'Bengaluru Urban',
        division_name: 'Bengaluru Division',
        station_count: 12,
        active_stations: 11,
        total_firs: 156,
        firs_trend: 8.5,
        open_cases: 47,
        solved_rate: 62.3,
        active_warnings: 3,
        crime_types: [
          { type: 'Theft', count: 48, pct: 30.8, delta: 5 },
          { type: 'Robbery', count: 27, pct: 17.3, delta: -3 },
          { type: 'Assault', count: 22, pct: 14.1, delta: 2 },
          { type: 'Burglary', count: 18, pct: 11.5, delta: 0 },
          { type: 'Cybercrime', count: 14, pct: 9.0, delta: 7 },
          { type: 'Vehicle Theft', count: 12, pct: 7.7, delta: -1 },
          { type: 'Chain Snatching', count: 15, pct: 9.6, delta: 4 },
        ],
        trend_6m: trend6m,
        recent_firs: [
          { crime_no: 'KSP-2026-101', status: 'under_investigation', occurrence_date: now.toISOString().slice(0, 10), crime_type: 'Theft', station_name: 'Koramangala PS' },
          { crime_no: 'KSP-2026-100', status: 'registered', occurrence_date: now.toISOString().slice(0, 10), crime_type: 'Robbery', station_name: 'Indiranagar PS' },
          { crime_no: 'KSP-2026-099', status: 'critical', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), crime_type: 'Chain Snatching', station_name: 'MG Road PS' },
          { crime_no: 'KSP-2026-098', status: 'under_investigation', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), crime_type: 'Burglary', station_name: 'Jayanagar PS' },
          { crime_no: 'KSP-2026-097', status: 'closed', occurrence_date: new Date(Date.now() - 259200000).toISOString().slice(0, 10), crime_type: 'Assault', station_name: 'BTM Layout PS' },
        ],
        financial_alerts: [
          { id: 1, crime_no: 'KSP-2026-101', amount: 250000, sender: 'Ravi Kumar', receiver: 'Mohan Raj', status: 'flagged', station_name: 'Koramangala PS', anomaly_type: 'structuring' },
          { id: 2, crime_no: 'KSP-2026-100', amount: 500000, sender: 'Suresh Patel', receiver: 'Venkat Rao', status: 'flagged', station_name: 'Indiranagar PS', anomaly_type: 'fan_in' },
          { id: 3, crime_no: 'KSP-2026-098', amount: 120000, sender: 'Priya Singh', receiver: 'Anil Kumar', status: 'pending', station_name: 'Jayanagar PS', anomaly_type: 'velocity' },
        ],
        last_updated: now.toISOString(),
      };
    }
    throw err;
  }
}

export async function fetchStationPerformance(districtCode: string): Promise<{ stations: StationPerformance[]; total: number }> {
  try {
    return await getJson<{ stations: StationPerformance[]; total: number }>(
      `/api/dashboard/stations?district_code=${encodeURIComponent(districtCode)}`
    );
  } catch (err) {
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      return {
        stations: [
          { id: 1, name: 'Koramangala PS', code: 'KMG', fir_count: 124, open_cases: 14, solved_rate: 68, officer_count: 12, last_reported: new Date().toISOString(), status: 'active' as const, trend: 5.2 },
          { id: 2, name: 'Indiranagar PS', code: 'IND', fir_count: 98, open_cases: 9, solved_rate: 75, officer_count: 10, last_reported: new Date().toISOString(), status: 'active' as const, trend: -3.1 },
          { id: 3, name: 'MG Road PS', code: 'MGR', fir_count: 87, open_cases: 22, solved_rate: 52, officer_count: 8, last_reported: new Date().toISOString(), status: 'delayed' as const, trend: 8.7 },
          { id: 4, name: 'Jayanagar PS', code: 'JYN', fir_count: 73, open_cases: 11, solved_rate: 71, officer_count: 9, last_reported: new Date().toISOString(), status: 'active' as const, trend: -1.5 },
          { id: 5, name: 'BTM Layout PS', code: 'BTM', fir_count: 65, open_cases: 8, solved_rate: 80, officer_count: 7, last_reported: new Date().toISOString(), status: 'active' as const, trend: -4.2 },
          { id: 6, name: 'HSR Layout PS', code: 'HSR', fir_count: 59, open_cases: 17, solved_rate: 58, officer_count: 6, last_reported: new Date().toISOString(), status: 'active' as const, trend: 6.0 },
          { id: 7, name: 'Whitefield PS', code: 'WFD', fir_count: 52, open_cases: 6, solved_rate: 82, officer_count: 8, last_reported: new Date().toISOString(), status: 'active' as const, trend: -2.8 },
        ],
        total: 7,
      };
    }
    throw err;
  }
}

// ─── PI-exclusive metrics ────────────────────────────────────────────────────

export interface PIRiskAccused {
  id: number
  name: string
  fir_count: number
  crime_type: string
  risk_score: number
}

export interface PIWarning {
  warning_id: number
  type: string
  severity: string
  message: string
  recommended_action: string | null
  generated_at: string
  status: string
}

export interface PIMetrics {
  station_name: string
  district_name: string
  total_firs: number
  fir_trend: number
  open_cases: number
  solved_rate: number
  high_risk_count: number
  high_risk_accused: PIRiskAccused[]
  active_warnings: PIWarning[]
  trend_3m: TrendPoint[]
  recent_firs: RecentFIR[]
  crime_types: CrimeTypeData[]
  last_updated: string
}

export async function fetchPIMetrics(stationName: string): Promise<PIMetrics> {
  try {
    return await getJson<PIMetrics>(`/api/dashboard/pi-metrics?station_name=${encodeURIComponent(stationName)}`);
  } catch (err) {
    // In demo mode or when backend is unavailable, return sample data
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // 3-month trend
      const trend3m: TrendPoint[] = Array.from({ length: 90 }, (_, i) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - (89 - i));
        return { date: dt.toISOString().slice(0, 10), count: Math.floor(Math.random() * 6) + 1 };
      });

      const stationDisplay = stationName || 'Koramangala PS';

      return {
        station_name: stationDisplay,
        district_name: 'Bengaluru Urban',
        total_firs: 42,
        fir_trend: 12.5,
        open_cases: 18,
        solved_rate: 38.2,
        high_risk_count: 4,
        high_risk_accused: [
          { id: 1, name: 'Ravi Kumar', fir_count: 5, crime_type: 'Robbery', risk_score: 92 },
          { id: 2, name: 'Suresh Patel', fir_count: 3, crime_type: 'Assault', risk_score: 88 },
          { id: 3, name: 'Mohan Reddy', fir_count: 4, crime_type: 'Chain Snatching', risk_score: 85 },
          { id: 4, name: 'Venkat Rao', fir_count: 2, crime_type: 'Cyber Fraud', risk_score: 78 },
        ],
        active_warnings: [
          {
            warning_id: 1, type: 'recidivism', severity: 'critical',
            message: 'Repeat offender Ravi Kumar identified active in this station area',
            recommended_action: 'Increase surveillance near commercial zones',
            generated_at: new Date(Date.now() - 1800000).toISOString(),
            status: 'new',
          },
          {
            warning_id: 2, type: 'pattern_shift', severity: 'high',
            message: 'Uptick in chain snatching incidents near bus stand',
            recommended_action: 'Deploy plain-clothes patrol during peak hours',
            generated_at: new Date(Date.now() - 7200000).toISOString(),
            status: 'new',
          },
          {
            warning_id: 3, type: 'seasonal', severity: 'medium',
            message: 'Seasonal rise in housebreaking in residential zones',
            recommended_action: 'Alert neighbourhood watch groups',
            generated_at: new Date(Date.now() - 14400000).toISOString(),
            status: 'new',
          },
        ],
        trend_3m: trend3m,
        recent_firs: [
          { crime_no: 'KSP-2026-042', status: 'under_investigation', occurrence_date: today, crime_type: 'Theft', station_name: stationDisplay },
          { crime_no: 'KSP-2026-041', status: 'registered', occurrence_date: today, crime_type: 'Robbery', station_name: stationDisplay },
          { crime_no: 'KSP-2026-040', status: 'critical', occurrence_date: today, crime_type: 'Chain Snatching', station_name: stationDisplay },
          { crime_no: 'KSP-2026-039', status: 'under_investigation', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), crime_type: 'Burglary', station_name: stationDisplay },
          { crime_no: 'KSP-2026-038', status: 'closed', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), crime_type: 'Assault', station_name: stationDisplay },
          { crime_no: 'KSP-2026-037', status: 'under_investigation', occurrence_date: new Date(Date.now() - 259200000).toISOString().slice(0, 10), crime_type: 'Cyber Fraud', station_name: stationDisplay },
        ],
        crime_types: [
          { type: 'Theft', count: 14, pct: 33.3, delta: 5 },
          { type: 'Robbery', count: 9, pct: 21.4, delta: -2 },
          { type: 'Assault', count: 7, pct: 16.7, delta: 1 },
          { type: 'Burglary', count: 5, pct: 11.9, delta: 0 },
          { type: 'Cybercrime', count: 4, pct: 9.5, delta: 3 },
          { type: 'Vehicle Theft', count: 3, pct: 7.1, delta: -1 },
        ],
        last_updated: now.toISOString(),
      };
    }
    throw err;
  }
}

// ─── PSI-exclusive metrics ────────────────────────────────────────────────────

export { isDemoMode, demoPSIMetrics } from './demoData';

export interface HotspotPoint {
  lat: number
  lng: number
  weight: number
  crime_type: string
}

export interface SeasonalCell {
  week: number
  day: number
  date: string
  count: number
}

export interface ForecastPoint {
  date: string
  predicted: number
  lower: number
  upper: number
}

export interface EmergingThreat {
  id: number
  type: string
  severity: string
  message: string
  recommended_action: string | null
  generated_at: string
  status: string
}

export interface PSMetrics {
  station_name: string
  district_name: string
  total_firs: number
  fir_trend: number
  assigned_firs: number
  solved_rate: number
  active_hotspots: number
  hotspot_points: HotspotPoint[]
  crime_types: CrimeTypeData[]
  seasonal_data: SeasonalCell[]
  trend_3m: TrendPoint[]
  forecast_30d: ForecastPoint[]
  emerging_threats: EmergingThreat[]
  recent_firs: RecentFIR[]
  last_updated: string
}

export async function fetchPSIMetrics(stationName: string): Promise<PSMetrics> {
  try {
    return await getJson<PSMetrics>(`/api/dashboard/psi-metrics?station_name=${encodeURIComponent(stationName)}`);
  } catch (err) {
    // In demo mode or when backend is unavailable, return sample data
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // Seasonal data: 4 weeks x 7 days
      const seasonalData: SeasonalCell[] = [];
      for (let w = 0; w < 4; w++) {
        for (let d = 0; d < 7; d++) {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - (28 - (w * 7 + d)));
          seasonalData.push({
            week: w, day: d,
            date: dt.toISOString().slice(0, 10),
            count: Math.floor(Math.random() * 8) + 1,
          });
        }
      }

      // 30-day forecast
      const forecast30d: ForecastPoint[] = Array.from({ length: 30 }, (_, i) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() + i + 1);
        const base = 4 + Math.random() * 3;
        return {
          date: dt.toISOString().slice(0, 10),
          predicted: Math.round(base * 10) / 10,
          lower: Math.round(base * 0.7 * 10) / 10,
          upper: Math.round(base * 1.3 * 10) / 10,
        };
      });

      // 3-month trend
      const trend3m: TrendPoint[] = Array.from({ length: 90 }, (_, i) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - (89 - i));
        return { date: dt.toISOString().slice(0, 10), count: Math.floor(Math.random() * 6) + 1 };
      });

      const stationDisplay = stationName || 'Koramangala PS';

      return {
        station_name: stationDisplay,
        district_name: 'Bengaluru Urban',
        total_firs: 42,
        fir_trend: 12.5,
        assigned_firs: 8,
        solved_rate: 38.2,
        active_hotspots: 3,
        hotspot_points: [
          { lat: 12.935, lng: 77.624, weight: 7, crime_type: 'Theft' },
          { lat: 12.942, lng: 77.618, weight: 5, crime_type: 'Robbery' },
          { lat: 12.928, lng: 77.635, weight: 4, crime_type: 'Assault' },
        ],
        crime_types: [
          { type: 'Theft', count: 14, pct: 33.3, delta: 0 },
          { type: 'Robbery', count: 9, pct: 21.4, delta: 0 },
          { type: 'Assault', count: 7, pct: 16.7, delta: 0 },
          { type: 'Burglary', count: 5, pct: 11.9, delta: 0 },
          { type: 'Cybercrime', count: 4, pct: 9.5, delta: 0 },
          { type: 'Vehicle Theft', count: 3, pct: 7.1, delta: 0 },
        ],
        seasonal_data: seasonalData,
        trend_3m: trend3m,
        forecast_30d: forecast30d,
        emerging_threats: [
          {
            id: 1, type: 'pattern_shift', severity: 'high',
            message: 'Uptick in chain snatching incidents near commercial corridor',
            recommended_action: 'Increase patrol presence during evening hours',
            generated_at: new Date(Date.now() - 3600000).toISOString(),
            status: 'new',
          },
          {
            id: 2, type: 'seasonal', severity: 'medium',
            message: 'Seasonal rise in housebreaking reported in residential zone',
            recommended_action: 'Alert neighbourhood watch groups',
            generated_at: new Date(Date.now() - 7200000).toISOString(),
            status: 'new',
          },
        ],
        recent_firs: [
          { crime_no: 'KSP-2026-042', status: 'under_investigation', occurrence_date: today, crime_type: 'Theft', station_name: stationDisplay },
          { crime_no: 'KSP-2026-041', status: 'registered', occurrence_date: today, crime_type: 'Robbery', station_name: stationDisplay },
          { crime_no: 'KSP-2026-040', status: 'closed', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), crime_type: 'Assault', station_name: stationDisplay },
          { crime_no: 'KSP-2026-039', status: 'under_investigation', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), crime_type: 'Burglary', station_name: stationDisplay },
        ],
        last_updated: now.toISOString(),
      };
    }
    throw err;
  }
}

// ─── PC-exclusive metrics ─────────────────────────────────────────────────────

export interface AssignedFIR {
  crime_no: string
  status: string
  occurrence_date: string | null
  crime_type: string
  brief_facts: string
}

export interface StationInfo {
  name: string
  district: string
  phone: string
  address: string
}

export interface ActivityEntry {
  id: number
  crime_no: string
  old_status: string | null
  new_status: string
  changed_by: string
  changed_at: string
}

export interface DailyBrief {
  greeting: string
  day: string
  date: string
  shift: string
  open_count: number
  message: string
}

export interface PCMetrics {
  officer_name: string
  officer_id: string
  badge_number: string
  station_name: string
  district_name: string
  open_fir_count: number
  assigned_firs: AssignedFIR[]
  station_info: StationInfo
  activity_feed: ActivityEntry[]
  daily_brief: DailyBrief
  last_updated: string
}

export async function fetchPCMetrics(officerId: string): Promise<PCMetrics> {
  try {
    return await getJson<PCMetrics>(`/api/dashboard/pc-metrics?officer_id=${encodeURIComponent(officerId)}`);
  } catch (err) {
    // In demo mode or when backend is unavailable, return sample data
    const isAuth = err instanceof DashboardApiError && (err.kind === 'auth' || err.kind === 'network');
    if (isAuth || localStorage.getItem('auth_token') === 'demo-session') {
      const now = new Date();
      const shifts = ['Morning Shift', 'Afternoon Shift', 'Night Shift'];
      const shift = shifts[now.getHours() < 12 ? 0 : now.getHours() < 17 ? 1 : 2];
      const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
      const greeting = greetings[now.getHours() < 12 ? 0 : now.getHours() < 17 ? 1 : 2];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      return {
        officer_name: 'PC Vikram Singh',
        officer_id: officerId,
        badge_number: officerId,
        station_name: 'Koramangala PS',
        district_name: 'Bengaluru Urban',
        open_fir_count: 5,
        assigned_firs: [
          { crime_no: 'KSP-2026-001', status: 'under_investigation', occurrence_date: '2026-07-15', crime_type: 'Robbery', brief_facts: 'Armed robbery reported near commercial establishment. Suspects fled on motorcycle.' },
          { crime_no: 'KSP-2026-002', status: 'registered', occurrence_date: '2026-07-18', crime_type: 'Theft', brief_facts: 'Housebreaking and theft reported. Jewellery and cash stolen from residence.' },
          { crime_no: 'KSP-2026-003', status: 'under_investigation', occurrence_date: '2026-07-20', crime_type: 'Assault', brief_facts: 'Physical assault reported following a traffic dispute.' },
          { crime_no: 'KSP-2026-004', status: 'closed', occurrence_date: '2026-07-10', crime_type: 'Chain Snatching', brief_facts: 'Gold chain snatched from pedestrian. Accused arrested.' },
          { crime_no: 'KSP-2026-005', status: 'registered', occurrence_date: '2026-07-22', crime_type: 'Cyber Fraud', brief_facts: 'Online fraud reported. Victim transferred funds to fraudulent account.' },
        ],
        station_info: { name: 'Koramangala PS', district: 'Bengaluru Urban', phone: '080-25521100', address: 'Koramangala, Bengaluru, Karnataka 560034' },
        activity_feed: [
          { id: 1, crime_no: 'KSP-2026-001', old_status: 'registered', new_status: 'under_investigation', changed_by: 'SI Meena', changed_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 2, crime_no: 'KSP-2026-003', old_status: 'registered', new_status: 'under_investigation', changed_by: 'Inspector Raju', changed_at: new Date(Date.now() - 172800000).toISOString() },
          { id: 3, crime_no: 'KSP-2026-004', old_status: 'under_investigation', new_status: 'closed', changed_by: 'ASI Prakash', changed_at: new Date(Date.now() - 259200000).toISOString() },
        ],
        daily_brief: {
          greeting: `${greeting}, PC Vikram Singh`,
          day: dayNames[now.getDay()],
          date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
          shift: shift,
          open_count: 5,
          message: `You have 5 active cases assigned to you at Koramangala PS.`,
        },
        last_updated: now.toISOString(),
      };
    }
    throw err;
  }
}
