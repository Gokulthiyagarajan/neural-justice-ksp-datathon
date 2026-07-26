export interface AiExplanation {
  summary: string;
  supporting_evidence: string[];
  alternative_explanation?: string;
  model_version: string;
  generated_at: string;
}

export interface HistoricalTrend {
  period: string;
  previous_count: number;
  current_count: number;
  percent_change: number;
  direction: 'up' | 'down' | 'stable';
}

export interface RelatedCriminal {
  criminal_id: string;
  name: string;
  priors: number;
  last_known_location?: string;
}

export interface Alert {
  alert_id: string;
  alert_type: string;
  title: string;
  crime_category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  district_id: string;
  station_id?: string;
  lat?: number;
  lng?: number;
  prediction_window: string;
  confidence: number;
  supporting_fir_count: number;
  historical_trend?: HistoricalTrend;
  ai_explanation: AiExplanation;
  recommended_action: string;
  recommended_patrol?: string;
  nearest_station?: string;
  nearest_station_distance_km?: number;
  estimated_response_time_min?: number;
  related_criminals: RelatedCriminal[];
  related_fir_numbers: string[];
  officer_assigned?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  review_status: string;
}

export interface DispatchRecommendation {
  nearest_station_id: string;
  nearest_station_name: string;
  nearest_station_distance_km: number;
  nearest_patrol_unit_id?: string;
  officer_count: number;
  suggested_route_waypoints?: Record<string, number>[];
  suggested_patrol_hours: number;
  priority: string;
  alternative_station_id?: string;
  alternative_station_name?: string;
  estimated_response_time_min: number;
  coverage_radius_km: number;
  vehicle_type: string;
  generated_at: string;
}

export interface CommandCenterView {
  live_alerts: Alert[];
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  active_hotspots: number;
  prediction_timeline?: any[];
  officer_status: { on_duty: number; available: number; deployed: number };
  crime_growth_percent: number;
  recommendations: string[];
  generated_at: string;
}

export interface OfficerAlertSummary {
  alert_id: string;
  title: string;
  severity: string;
  type: string;
  district_id: string;
  created_at: string;
  status: string;
  response_time_min?: number;
}
