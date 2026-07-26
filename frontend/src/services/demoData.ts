/**
 * demoData.ts — Shared demo-mode fallback data for PSI pages.
 *
 * Every function follows the same contract: if the calling page's auth token
 * is the sentinel 'demo-session' (set by the mock-login flow) the page can
 * call into this module to get realistic sample data instead of showing a
 * "Unable to load" error.
 *
 * This keeps demo-data generation in ONE place instead of duplicating it
 * across every PSI page file.
 */
import type { PSMetrics } from './dashboardApi';
export { authHeaders } from '@/utils/authHeaders';

// ─── Utility helper ─────────────────────────────────────────────────────────

/** True when the demo build flag is on AND the auth token is the demo sentinel. */
export function isDemoMode(): boolean {
  const demoBuildEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
  return demoBuildEnabled && localStorage.getItem('auth_token') === 'demo-session';
}

// ─── Dashboard metrics ──────────────────────────────────────────────────────

export function demoPSIMetrics(stationName?: string): PSMetrics {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const station = stationName || 'Koramangala PS';

  const seasonalData = Array.from({ length: 28 }, (_, i) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - (27 - i));
    return {
      week: Math.floor(i / 7),
      day: i % 7,
      date: dt.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 8) + 1,
    };
  });

  const forecast30d = Array.from({ length: 30 }, (_, i) => {
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

  const trend3m = Array.from({ length: 90 }, (_, i) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - (89 - i));
    return { date: dt.toISOString().slice(0, 10), count: Math.floor(Math.random() * 6) + 1 };
  });

  return {
    station_name: station,
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
      { crime_no: 'KSP-2026-042', status: 'under_investigation', occurrence_date: today, crime_type: 'Theft', station_name: station },
      { crime_no: 'KSP-2026-041', status: 'registered', occurrence_date: today, crime_type: 'Robbery', station_name: station },
      { crime_no: 'KSP-2026-040', status: 'closed', occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), crime_type: 'Assault', station_name: station },
      { crime_no: 'KSP-2026-039', status: 'under_investigation', occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), crime_type: 'Burglary', station_name: station },
    ],
    last_updated: now.toISOString(),
  };
}

// ─── Pattern analysis data ──────────────────────────────────────────────────

export interface DemoPatternData {
  seasonal: Record<string, any>;
  emerging: Record<string, any>;
  clusters: Record<string, any>;
  trends: Record<string, any>;
}

export function demoPatternData(): DemoPatternData {
  const matrix = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 10))
  );
  return {
    seasonal: {
      matrix,
      peak_hour: Math.floor(Math.random() * 24),
      peak_day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][Math.floor(Math.random() * 7)],
    },
    emerging: {
      threats: [
        { pattern_type: 'Chain Snatching', description: 'Spike in evening incidents near MG Road', detected_at: new Date().toISOString(), severity: 'high' },
        { pattern_type: 'Vehicle Theft', description: 'Two-wheelers targeted in commercial zones', detected_at: new Date(Date.now() - 86400000).toISOString(), severity: 'medium' },
      ],
    },
    clusters: {
      total: 3,
      clusters: [
        { area: 'Market Area', crime_count: 12, dominant_crime_type: 'Theft', density: 'high' },
        { area: 'Residential Block B', crime_count: 8, dominant_crime_type: 'Burglary', density: 'medium' },
        { area: 'Bus Stand', crime_count: 5, dominant_crime_type: 'Chain Snatching', density: 'medium' },
      ],
    },
    trends: {
      trends: Array.from({ length: 30 }, (_, i) => {
        const dt = new Date();
        dt.setDate(dt.getDate() - (29 - i));
        return { date: dt.toISOString().slice(0, 10), count: Math.floor(Math.random() * 8) + 2 };
      }),
    },
  };
}

// ─── DEMO FIRs for My Cases ─────────────────────────────────────────────────

import type { FIR } from '@/types/fir.types';

export function demoFIRs(): FIR[] {
  return [
    {
      fir_number: 'KSP-2026-042', status: 'under_investigation',
      occurrence_date: new Date().toISOString().slice(0, 10),
      crime_type: 'Theft', accused_name: 'Ravi Kumar',
      days_open: 3, station_name: 'Koramangala PS',
    } as unknown as FIR,
    {
      fir_number: 'KSP-2026-041', status: 'registered',
      occurrence_date: new Date().toISOString().slice(0, 10),
      crime_type: 'Robbery', accused_name: 'Unknown',
      days_open: 1, station_name: 'Koramangala PS',
    } as unknown as FIR,
    {
      fir_number: 'KSP-2026-040', status: 'closed',
      occurrence_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      crime_type: 'Assault', accused_name: 'Suresh Reddy',
      days_open: 45, station_name: 'Koramangala PS',
    } as unknown as FIR,
    {
      fir_number: 'KSP-2026-039', status: 'under_investigation',
      occurrence_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
      crime_type: 'Burglary', accused_name: 'Unknown',
      days_open: 7, station_name: 'Koramangala PS',
    } as unknown as FIR,
    {
      fir_number: 'KSP-2026-038', status: 'chargesheeted',
      occurrence_date: new Date(Date.now() - 345600000).toISOString().slice(0, 10),
      crime_type: 'Chain Snatching', accused_name: 'Venkatesh',
      days_open: 15, station_name: 'Koramangala PS',
    } as unknown as FIR,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSI HOTSPOTS demo data
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoHotspot {
  lng: number;
  lat: number;
  crime_type: string;
  incident_count: number;
  risk_level: string;
  area_name: string;
  id?: string;
}

export function demoHotspots(): DemoHotspot[] {
  return [
    { id: 'hs-1', lng: 77.624, lat: 12.935, crime_type: 'Theft', incident_count: 14, risk_level: 'high', area_name: 'Market Area' },
    { id: 'hs-2', lng: 77.618, lat: 12.942, crime_type: 'Robbery', incident_count: 9, risk_level: 'high', area_name: 'Commercial District' },
    { id: 'hs-3', lng: 77.635, lat: 12.928, crime_type: 'Assault', incident_count: 7, risk_level: 'medium', area_name: 'Bus Stand' },
    { id: 'hs-4', lng: 77.608, lat: 12.952, crime_type: 'Burglary', incident_count: 5, risk_level: 'medium', area_name: 'Residential Block B' },
    { id: 'hs-5', lng: 77.644, lat: 12.915, crime_type: 'Chain Snatching', incident_count: 4, risk_level: 'medium', area_name: 'MG Road' },
    { id: 'hs-6', lng: 77.596, lat: 12.948, crime_type: 'Vehicle Theft', incident_count: 3, risk_level: 'low', area_name: 'Parking Zone' },
    { id: 'hs-7', lng: 77.654, lat: 12.905, crime_type: 'Cyber Fraud', incident_count: 2, risk_level: 'low', area_name: 'Tech Park' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSI FORECAST demo data (matches BackendForecastResponse from PSIForecast.tsx)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoForecastPoint {
  date: string;
  predicted_cases: number;
  lower: number;
  upper: number;
}

export interface DemoForecastResponse {
  district_id: string;
  crime_type: string | null;
  forecasts: DemoForecastPoint[];
  total_predicted: number;
  seasonal_factors: Record<string, number>;
  model: string;
  generated_at: string;
  review_status: string;
}

export function demoForecastResponse(): DemoForecastResponse {
  const now = new Date();
  const forecasts = Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + i + 1);
    const base = 4 + Math.sin(i * 0.5) * 2 + Math.random() * 2;
    return {
      date: dt.toISOString().slice(0, 10),
      predicted_cases: Math.round(base),
      lower: Math.round(base * 0.7),
      upper: Math.round(base * 1.3),
    };
  });

  return {
    district_id: 'BENGALURU_URBAN',
    crime_type: null,
    forecasts,
    total_predicted: forecasts.reduce((s, f) => s + f.predicted_cases, 0),
    seasonal_factors: {
      peak_month: 8,
      weekend_factor: 0.35,
      night_hours: 0.28,
      holiday_impact: 0.15,
    },
    model: 'holtwinters_triple',
    generated_at: now.toISOString(),
    review_status: 'approved',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PI RISK demo data (matches PIRisk.tsx & PINetwork.tsx risk structure)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoRiskAccused {
  id: string;
  name: string;
  risk_score: number;
  review_status: string;
  fir_count: number;
  crime_type: string;
  shap_features: { feature: string; impact: number }[];
}

export function demoRiskData(): { accused: DemoRiskAccused[]; station: any } {
  return {
    accused: [
      { id: 'ra-1', name: 'Ravi Kumar', risk_score: 92, review_status: 'unreviewed', fir_count: 4, crime_type: 'Robbery', shap_features: [{ feature: 'prior_arrests', impact: 0.32 }, { feature: 'crime_density', impact: 0.25 }, { feature: 'victim_count', impact: 0.18 }, { feature: 'weapon_use', impact: 0.15 }] },
      { id: 'ra-2', name: 'Suresh Reddy', risk_score: 85, review_status: 'unreviewed', fir_count: 3, crime_type: 'Assault', shap_features: [{ feature: 'prior_arrests', impact: 0.28 }, { feature: 'weapon_use', impact: 0.22 }, { feature: 'recency', impact: 0.2 }, { feature: 'crime_density', impact: 0.18 }] },
      { id: 'ra-3', name: 'Venkatesh Gowda', risk_score: 78, review_status: 'reviewed', fir_count: 5, crime_type: 'Theft', shap_features: [{ feature: 'recidivism', impact: 0.3 }, { feature: 'crime_density', impact: 0.22 }, { feature: 'victim_count', impact: 0.2 }, { feature: 'prior_arrests', impact: 0.16 }] },
      { id: 'ra-4', name: 'Mohan Das', risk_score: 65, review_status: 'unreviewed', fir_count: 2, crime_type: 'Burglary', shap_features: [{ feature: 'crime_density', impact: 0.25 }, { feature: 'prior_arrests', impact: 0.2 }, { feature: 'recency', impact: 0.18 }] },
      { id: 'ra-5', name: 'Prakash Shetty', risk_score: 55, review_status: 'reviewed', fir_count: 3, crime_type: 'Chain Snatching', shap_features: [{ feature: 'recency', impact: 0.28 }, { feature: 'crime_density', impact: 0.2 }, { feature: 'prior_arrests', impact: 0.15 }] },
      { id: 'ra-6', name: 'Kiran Kumar', risk_score: 42, review_status: 'unreviewed', fir_count: 1, crime_type: 'Cyber Fraud', shap_features: [{ feature: 'victim_count', impact: 0.22 }, { feature: 'recency', impact: 0.18 }, { feature: 'crime_density', impact: 0.14 }] },
      { id: 'ra-7', name: 'Mahesh Babu', risk_score: 35, review_status: 'cleared', fir_count: 1, crime_type: 'Vehicle Theft', shap_features: [{ feature: 'recency', impact: 0.2 }, { feature: 'crime_density', impact: 0.15 }] },
      { id: 'ra-8', name: 'Anil Kumar', risk_score: 88, review_status: 'unreviewed', fir_count: 6, crime_type: 'Armed Robbery', shap_features: [{ feature: 'weapon_use', impact: 0.35 }, { feature: 'prior_arrests', impact: 0.28 }, { feature: 'victim_count', impact: 0.22 }, { feature: 'recency', impact: 0.18 }] },
    ],
    station: { station_id: 1, station_name: 'Koramangala PS', district_name: 'Bengaluru Urban' },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PI NETWORK demo data (matches PINetwork.tsx graph structure)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoNetworkNode {
  id: string;
  label: string;
  type: string;
  risk_score: number;
  fir_count: number;
  degree: number;
}

export function demoNetworkData(): { nodes: DemoNetworkNode[]; edges: any[] } {
  const nodes: DemoNetworkNode[] = [
    { id: 'acc-1', label: 'Ravi Kumar', type: 'accused', risk_score: 92, fir_count: 4, degree: 5 },
    { id: 'acc-2', label: 'Suresh Reddy', type: 'accused', risk_score: 85, fir_count: 3, degree: 3 },
    { id: 'acc-3', label: 'Venkatesh G', type: 'accused', risk_score: 78, fir_count: 5, degree: 4 },
    { id: 'acc-4', label: 'Mohan Das', type: 'accused', risk_score: 65, fir_count: 2, degree: 2 },
    { id: 'acc-5', label: 'Prakash Shetty', type: 'accused', risk_score: 55, fir_count: 3, degree: 2 },
    { id: 'vic-1', label: 'Priya Singh', type: 'victim', risk_score: 0, fir_count: 1, degree: 1 },
    { id: 'vic-2', label: 'Rahul Sharma', type: 'victim', risk_score: 0, fir_count: 1, degree: 2 },
    { id: 'vic-3', label: 'Meena Devi', type: 'victim', risk_score: 0, fir_count: 1, degree: 1 },
    { id: 'wit-1', label: 'Kiran RF', type: 'witness', risk_score: 0, fir_count: 0, degree: 1 },
    { id: 'wit-2', label: 'Deepa N', type: 'witness', risk_score: 0, fir_count: 0, degree: 1 },
  ];
  const edges = [
    { source: 'acc-1', target: 'acc-2' }, { source: 'acc-1', target: 'acc-3' },
    { source: 'acc-1', target: 'vic-1' }, { source: 'acc-1', target: 'wit-1' },
    { source: 'acc-1', target: 'acc-4' }, { source: 'acc-2', target: 'vic-2' },
    { source: 'acc-2', target: 'acc-5' }, { source: 'acc-3', target: 'vic-3' },
    { source: 'acc-3', target: 'wit-2' }, { source: 'acc-3', target: 'acc-5' },
    { source: 'acc-4', target: 'vic-2' }, { source: 'acc-5', target: 'vic-1' },
  ];
  return { nodes, edges };
}

export function demoCrimeRings(): { member_count: number; crime_types?: string[] }[] {
  return [
    { member_count: 4, crime_types: ['Robbery', 'Chain Snatching', 'Burglary'] },
    { member_count: 3, crime_types: ['Vehicle Theft', 'Armed Robbery'] },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PI WARNINGS demo data (matches PIWarnings.tsx warning structure)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoPIWarning {
  warning_id: number;
  type: string;
  severity: string;
  status: string;
  message: string;
  recommended_action?: string;
  generated_at: string;
  entity_id?: string;
}

export function demoPIWarnings(): DemoPIWarning[] {
  const now = new Date();
  return [
    {
      warning_id: 1, type: 'high_risk_case', severity: 'critical', status: 'active',
      message: 'Chain snatching incidents up 40% in Koramangala Market area over the past week',
      recommended_action: 'Deploy plain-clothes officers during peak hours (6-9 PM)',
      generated_at: new Date(now.getTime() - 3600000).toISOString(),
    },
    {
      warning_id: 2, type: 'overdue_investigation', severity: 'high', status: 'active',
      message: 'FIR KSP-2026-030 (Assault) overdue by 14 days — no case diary entry in 10 days',
      recommended_action: 'Assign additional investigating officer or escalate to PI',
      generated_at: new Date(now.getTime() - 7200000).toISOString(),
      entity_id: 'KSP-2026-030',
    },
    {
      warning_id: 3, type: 'officer_overload', severity: 'medium', status: 'active',
      message: 'SI Meena assigned 8 active investigations — exceeds recommended limit of 5',
      recommended_action: 'Reallocate 2-3 cases to officers with lower caseload',
      generated_at: new Date(now.getTime() - 14400000).toISOString(),
    },
    {
      warning_id: 4, type: 'high_risk_case', severity: 'high', status: 'active',
      message: 'Repeat offender hotspot: Accused Ravi Kumar linked to 4 FIRs in same jurisdiction',
      recommended_action: 'File charge sheet expeditiously; coordinate with PP for bail opposition',
      generated_at: new Date(now.getTime() - 28800000).toISOString(),
      entity_id: 'ra-1',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SP FINANCE demo data (matches SPFinance.tsx FinancialAlert structure)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DemoFinanceAlert {
  id: number;
  anomaly_type: string;
  station_name: string;
  amount: number;
  entity_name: string;
  flagged_at: string;
}

export function demoFinanceAlerts(): DemoFinanceAlert[] {
  const now = new Date();
  return [
    { id: 1, anomaly_type: 'structuring', station_name: 'Koramangala PS', amount: 450000, entity_name: 'SK Enterprises', flagged_at: new Date(now.getTime() - 86400000).toISOString() },
    { id: 2, anomaly_type: 'structuring', station_name: 'BTM Layout PS', amount: 320000, entity_name: 'Gokul Traders', flagged_at: new Date(now.getTime() - 172800000).toISOString() },
    { id: 3, anomaly_type: 'fan_in', station_name: 'Jayanagar PS', amount: 1250000, entity_name: 'Multiple accounts → Singh Holdings', flagged_at: new Date(now.getTime() - 259200000).toISOString() },
    { id: 4, anomaly_type: 'velocity', station_name: 'MG Road PS', amount: 89000, entity_name: 'Rapid transactions in 1hr', flagged_at: new Date(now.getTime() - 345600000).toISOString() },
    { id: 5, anomaly_type: 'circular', station_name: 'Indiranagar PS', amount: 780000, entity_name: 'ABC Corp ↔ DEF Ltd (cycle)', flagged_at: new Date(now.getTime() - 432000000).toISOString() },
    { id: 6, anomaly_type: 'structuring', station_name: 'Whitefield PS', amount: 280000, entity_name: 'Ramesh Constructions', flagged_at: new Date(now.getTime() - 518400000).toISOString() },
    { id: 7, anomaly_type: 'velocity', station_name: 'Koramangala PS', amount: 45000, entity_name: '5 deposits in 30 mins', flagged_at: new Date(now.getTime() - 604800000).toISOString() },
    { id: 8, anomaly_type: 'fan_out', station_name: 'HSR Layout PS', amount: 920000, entity_name: 'Single acct → 12 recipients', flagged_at: new Date(now.getTime() - 691200000).toISOString() },
    { id: 9, anomaly_type: 'structuring', station_name: 'Electronic City PS', amount: 195000, entity_name: 'GreenTech Solutions', flagged_at: new Date(now.getTime() - 777600000).toISOString() },
    { id: 10, anomaly_type: 'circular', station_name: 'JP Nagar PS', amount: 1450000, entity_name: 'Rainbow Corp ↔ Moonlight Ltd (3-cycle)', flagged_at: new Date(now.getTime() - 864000000).toISOString() },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEO DASHBOARD demo data (matches GeoDashboard.tsx & HotspotPanel.tsx types)
// ═══════════════════════════════════════════════════════════════════════════════

export function demoGeoDashboard() {
  return {
    risk: {
      crime_index: 52,
      risk_level: 'Medium',
      clearance_rate: 38.5,
      prediction_alerts: 3,
    },
    hotspots: [
      { hotspot_id: 'g-hs-1', crime_category: 'Theft', location: 'Market Area, Koramangala', risk_score: 78, fir_count: 14, confidence: 0.85, status: 'active', hotspot_type: 'current', lat: 12.935, lng: 77.624 },
      { hotspot_id: 'g-hs-2', crime_category: 'Robbery', location: 'Commercial District', risk_score: 72, fir_count: 9, confidence: 0.82, status: 'active', hotspot_type: 'current', lat: 12.942, lng: 77.618 },
      { hotspot_id: 'g-hs-3', crime_category: 'Assault', location: 'Bus Stand Area', risk_score: 58, fir_count: 7, confidence: 0.78, status: 'active', hotspot_type: 'emerging', lat: 12.928, lng: 77.635 },
      { hotspot_id: 'g-hs-4', crime_category: 'Burglary', location: 'Residential Block B', risk_score: 45, fir_count: 5, confidence: 0.7, status: 'monitoring', hotspot_type: 'predicted', lat: 12.952, lng: 77.608 },
    ],
    patrolUnits: [
      { unit_id: 'pu-1', name: 'Patrol Unit A', status: 'active', officer_count: 2, current_beat: 'Koramangala Sector 1' },
      { unit_id: 'pu-2', name: 'Patrol Unit B', status: 'active', officer_count: 2, current_beat: 'Koramangala Sector 2' },
      { unit_id: 'pu-3', name: 'Patrol Unit C', status: 'on_break', officer_count: 1, current_beat: 'Koramangala Sector 3' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CP DISTRICTS demo data (matches CPDistricts.tsx DistrictsData)
// ═══════════════════════════════════════════════════════════════════════════════

export function demoCPDistricts(): import('@/pages/cp/CPDistricts').DistrictsData {
  const districts = [
    { name: 'Bengaluru Urban', population: 9621000, area_sqkm: 2196, crime_rate_per_100k: 485, stations_count: 86, officers_per_100k: 142, literacy_rate: 91.2, urban_pct: 98, division: 'Bengaluru', headquarters: 'Bengaluru', border_districts: ['Bengaluru Rural', 'Ramanagara', 'Kolar'], key_issues: ['Cybercrime surge', 'Traffic violations', 'Chain snatching'] },
    { name: 'Bengaluru Rural', population: 987000, area_sqkm: 2298, crime_rate_per_100k: 215, stations_count: 28, officers_per_100k: 78, literacy_rate: 82.1, urban_pct: 35, division: 'Bengaluru', headquarters: 'Bengaluru', border_districts: ['Bengaluru Urban', 'Ramanagara', 'Tumakuru', 'Kolar'], key_issues: ['Inter-district vehicle theft', 'Land disputes'] },
    { name: 'Mysuru', population: 3065000, area_sqkm: 6354, crime_rate_per_100k: 310, stations_count: 45, officers_per_100k: 105, literacy_rate: 72.8, urban_pct: 55, division: 'Mysuru', headquarters: 'Mysuru', border_districts: ['Mandya', 'Chamarajanagar', 'Wayanad (KL)', 'Kodagu'], key_issues: ['Tourist-targeted theft', 'Drug trafficking'] },
    { name: 'Belagavi', population: 4779000, area_sqkm: 13415, crime_rate_per_100k: 265, stations_count: 52, officers_per_100k: 88, literacy_rate: 73.5, urban_pct: 32, division: 'Belagavi', headquarters: 'Belagavi', border_districts: ['Dharwad', 'Bagalkote', 'Vijayapura', 'Maharashtra (Kolhapur)'], key_issues: ['Border smuggling', 'Communal tensions'] },
    { name: 'Dharwad', population: 1847000, area_sqkm: 4260, crime_rate_per_100k: 290, stations_count: 30, officers_per_100k: 95, literacy_rate: 80.1, urban_pct: 48, division: 'Belagavi', headquarters: 'Dharwad', border_districts: ['Belagavi', 'Uttara Kannada', 'Haveri', 'Gadag'], key_issues: ['Naxal influence in forest areas', 'Vehicle theft'] },
    { name: 'Mangaluru (Dakshina Kannada)', population: 2089000, area_sqkm: 4860, crime_rate_per_100k: 345, stations_count: 38, officers_per_100k: 112, literacy_rate: 88.6, urban_pct: 52, division: 'Mangaluru', headquarters: 'Mangaluru', border_districts: ['Udupi', 'Chikkamagaluru', 'Hassan', 'Kasaragod (KL)'], key_issues: ['Coastal smuggling', 'Drug peddling', 'Cybercrime'] },
    { name: 'Tumakuru', population: 2678000, area_sqkm: 10598, crime_rate_per_100k: 195, stations_count: 35, officers_per_100k: 72, literacy_rate: 75.2, urban_pct: 28, division: 'Bengaluru', headquarters: 'Tumakuru', border_districts: ['Bengaluru Rural', 'Chitradurga', 'Hassan', 'Mandya', 'Chikkaballapura'], key_issues: ['Gold smuggling route', 'Cattle theft'] },
    { name: 'Kalaburagi', population: 2566000, area_sqkm: 10951, crime_rate_per_100k: 420, stations_count: 40, officers_per_100k: 68, literacy_rate: 64.8, urban_pct: 30, division: 'Kalaburagi', headquarters: 'Kalaburagi', border_districts: ['Bidar', 'Vijayapura', 'Yadgir', 'Telangana (Medak)'], key_issues: ['Communal violence', 'Illegal mining', 'Land grabbing'] },
    { name: 'Shivamogga', population: 1752000, area_sqkm: 8477, crime_rate_per_100k: 230, stations_count: 28, officers_per_100k: 82, literacy_rate: 80.5, urban_pct: 35, division: 'Shivamogga', headquarters: 'Shivamogga', border_districts: ['Davangere', 'Udupi', 'Chikkamagaluru', 'Haveri', 'Uttara Kannada'], key_issues: ['Forest crime', 'Wildlife poaching'] },
    { name: 'Ballari', population: 2460000, area_sqkm: 8447, crime_rate_per_100k: 510, stations_count: 36, officers_per_100k: 62, literacy_rate: 67.4, urban_pct: 38, division: 'Ballari', headquarters: 'Ballari', border_districts: ['Vijayanagara', 'Chitradurga', 'Davangere', 'Andhra Pradesh (Kurnool)'], key_issues: ['Mining mafia', 'Political violence', 'Illegal arms'] },
    { name: 'Udupi', population: 1177000, area_sqkm: 3580, crime_rate_per_100k: 175, stations_count: 22, officers_per_100k: 90, literacy_rate: 86.2, urban_pct: 42, division: 'Mangaluru', headquarters: 'Udupi', border_districts: ['Dakshina Kannada', 'Shivamogga', 'Chikkamagaluru', 'Uttara Kannada'], key_issues: ['Coastal security', 'Tourist safety'] },
    { name: 'Hassan', population: 1776000, area_sqkm: 6814, crime_rate_per_100k: 200, stations_count: 26, officers_per_100k: 76, literacy_rate: 78.4, urban_pct: 25, division: 'Mysuru', headquarters: 'Hassan', border_districts: ['Mysuru', 'Tumakuru', 'Chikkamagaluru', 'Dakshina Kannada', 'Mandya'], key_issues: ['Coffee estate crime', 'Road accidents'] },
  ];
  const total = districts.reduce((s, d) => ({ population: s.population + d.population, area_sqkm: s.area_sqkm + d.area_sqkm, crime: s.crime + d.crime_rate_per_100k }), { population: 0, area_sqkm: 0, crime: 0 });
  const crimeDist: Record<string, number> = {};
  districts.forEach(d => {
    const bucket = d.crime_rate_per_100k < 200 ? 'low' : d.crime_rate_per_100k < 400 ? 'medium' : d.crime_rate_per_100k < 600 ? 'high' : 'critical';
    crimeDist[bucket] = (crimeDist[bucket] || 0) + 1;
  });
  const divisions: Record<string, { districts: number; population: number; crime_rate: number }> = {};
  districts.forEach(d => {
    if (!divisions[d.division]) divisions[d.division] = { districts: 0, population: 0, crime_rate: 0 };
    divisions[d.division].districts++;
    divisions[d.division].population += d.population;
    divisions[d.division].crime_rate = Math.round((divisions[d.division].crime_rate * (divisions[d.division].districts - 1) + d.crime_rate_per_100k) / divisions[d.division].districts);
  });
  return {
    summary: {
      total_districts: districts.length,
      total_population: total.population,
      total_area_sqkm: total.area_sqkm,
      avg_crime_rate: Math.round(total.crime / districts.length),
    },
    districts,
    crime_rate_distribution: crimeDist,
    division_breakdown: divisions,
    last_updated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CP STATIONS demo data (matches CPStations.tsx StationsData)
// ═══════════════════════════════════════════════════════════════════════════════

export function demoCPStations(): import('@/pages/cp/CPStations').StationsData {
  const allStations: Record<string, { name: string; type: string; capacity: number; current_strength: number; condition_score: number; facilities: string[]; last_inspection: string }[]> = {
    'Bengaluru Urban': [
      { name: 'Cubbon Park PS', type: 'urban', capacity: 150, current_strength: 138, condition_score: 8.5, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Visitor_Room', 'Parking', 'Drone_Bay'], last_inspection: '2026-03-15' },
      { name: 'Koramangala PS', type: 'urban', capacity: 120, current_strength: 112, condition_score: 7.8, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Visitor_Room', 'Parking'], last_inspection: '2026-04-02' },
      { name: 'MG Road PS', type: 'metro', capacity: 200, current_strength: 185, condition_score: 9.2, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Visitor_Room', 'Parking', 'Drone_Bay'], last_inspection: '2026-02-20' },
      { name: 'Whitefield PS', type: 'urban', capacity: 100, current_strength: 95, condition_score: 6.5, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-05-10' },
      { name: 'Yeshwanthpur PS', type: 'urban', capacity: 80, current_strength: 76, condition_score: 5.2, facilities: ['WiFi', 'CCTV', 'Filing', 'Vehicles', 'Radio'], last_inspection: '2026-01-18' },
    ],
    'Mysuru': [
      { name: 'Krishnaraja Boulevard PS', type: 'urban', capacity: 90, current_strength: 82, condition_score: 7.6, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-03-22' },
      { name: 'Mysuru Palace PS', type: 'metro', capacity: 110, current_strength: 105, condition_score: 8.8, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Visitor_Room', 'Parking'], last_inspection: '2026-04-15' },
      { name: 'Nanjangud PS', type: 'rural', capacity: 45, current_strength: 40, condition_score: 6.1, facilities: ['WiFi', 'CCTV', 'Filing', 'Vehicles', 'Radio'], last_inspection: '2026-02-08' },
    ],
    'Belagavi': [
      { name: 'Belagavi City PS', type: 'urban', capacity: 85, current_strength: 78, condition_score: 7.0, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-01-30' },
      { name: 'Gokak PS', type: 'rural', capacity: 35, current_strength: 32, condition_score: 4.5, facilities: ['WiFi', 'Filing', 'Vehicles', 'Radio'], last_inspection: '2025-11-12' },
      { name: 'Khanapur PS', type: 'rural', capacity: 30, current_strength: 25, condition_score: 3.8, facilities: ['WiFi', 'Filing', 'Radio'], last_inspection: '2025-10-05' },
    ],
    'Mangaluru (Dakshina Kannada)': [
      { name: 'Mangaluru City PS', type: 'urban', capacity: 100, current_strength: 94, condition_score: 8.2, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Parking', 'Drone_Bay'], last_inspection: '2026-04-28' },
      { name: 'Surathkal PS', type: 'urban', capacity: 60, current_strength: 55, condition_score: 6.9, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-03-01' },
      { name: 'Coastal Patrol PS', type: 'rural', capacity: 40, current_strength: 38, condition_score: 7.5, facilities: ['WiFi', 'CCTV', 'Vehicles', 'Radio', 'Armory'], last_inspection: '2026-05-05' },
    ],
    'Kalaburagi': [
      { name: 'Kalaburagi City PS', type: 'urban', capacity: 75, current_strength: 70, condition_score: 5.8, facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-02-14' },
      { name: 'Sedam PS', type: 'rural', capacity: 25, current_strength: 22, condition_score: 3.2, facilities: ['WiFi', 'Filing', 'Radio'], last_inspection: '2025-09-20' },
    ],
    'Ballari': [
      { name: 'Ballari City PS', type: 'urban', capacity: 80, current_strength: 73, condition_score: 6.0, facilities: ['WiFi', 'CCTV', 'Filing', 'Armory', 'Vehicles', 'Radio', 'Parking'], last_inspection: '2026-01-10' },
      { name: 'Hospet PS', type: 'urban', capacity: 55, current_strength: 52, condition_score: 5.5, facilities: ['WiFi', 'CCTV', 'Filing', 'Vehicles', 'Radio'], last_inspection: '2025-12-15' },
    ],
  };
  const districts = Object.keys(allStations);
  const by_district = districts.map(district => ({
    district,
    stations: allStations[district],
  }));
  const allStationList = by_district.flatMap(d => d.stations);
  const total = allStationList.length;
  const types = allStationList.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const avgCondition = allStationList.reduce((s, st) => s + st.condition_score, 0) / total;
  const criticalCount = allStationList.filter(s => s.condition_score < 4).length;
  const conditionDist = allStationList.reduce((acc, s) => {
    const key = s.condition_score >= 8 ? 'excellent' : s.condition_score >= 6 ? 'good' : s.condition_score >= 4 ? 'fair' : s.condition_score >= 2 ? 'poor' : 'critical';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const facilityGaps = allStationList.filter(s => s.facilities.length < 8).map(s => ({
    station: s.name,
    missing_facilities: ['WiFi', 'CCTV', 'Generator', 'Filing', 'Armory', 'Barracks', 'Vehicles', 'Radio', 'Evidence_Lab', 'Visitor_Room', 'Parking', 'Drone_Bay'].filter(f => !s.facilities.includes(f)).slice(0, 4),
    priority: s.condition_score < 5 ? 'high' : s.condition_score < 7 ? 'medium' : 'low',
  }));
  const alerts = allStationList.filter(s => s.condition_score < 5).map(s => ({
    station: s.name,
    issue: s.condition_score < 3 ? `Critical infrastructure decay (score ${s.condition_score})` : `Below-standard condition (${s.condition_score}/10) requires upgrade`,
    severity: s.condition_score < 3 ? 'critical' : 'high',
    since: s.last_inspection,
  }));
  return {
    summary: {
      total,
      urban: types.urban || 0,
      rural: types.rural || 0,
      metro: types.metro || 0,
      avg_condition: Math.round(avgCondition * 10) / 10,
      critical_count: criticalCount,
    },
    by_district,
    condition_distribution: conditionDist,
    facility_gaps: facilityGaps,
    infrastructure_alerts: alerts,
    last_updated: new Date().toISOString(),
  };
}
