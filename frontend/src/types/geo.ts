export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface Hotspot {
  hotspot_id: string;
  crime_category: string;
  risk_score: number;
  confidence: number;
  lat: number;
  lng: number;
  fir_count: number;
  location: string;
  hotspot_type: 'current' | 'emerging' | 'predicted' | 'high_risk_street' | 'crime_cluster' | 'crime_spread';
  patrol_suggestion?: string;
  duration_hours?: number;
  status: string;
  ai_explanation?: string;
  ai_recommendation?: string;
  alert_type?: string;
  severity?: string;
  title?: string;
  label?: string;
  related_firs?: string[];
  related_criminals?: string[];
  estimated_response_time_min?: number;
  nearest_station?: string;
  review_status: 'Unreviewed' | 'Reviewed' | 'Escalated';
  created_at: string;
  updated_at?: string;
}

export interface StationInfo {
  station_id: number;
  station_name: string;
  lat: number;
  lng: number;
  officer_count: number;
  jurisdiction?: GeoJSON.Polygon;
  address?: string;
  phone?: string;
}

export interface TimelineSlice {
  timestamp: string;
  firs: GeoFirBrief[];
  hotspot_ids: string[];
}

export interface GeoFirBrief {
  crime_no: string;
  lat: number;
  lng: number;
  crime_head_name: string;
  occurrence_date: string;
  status: string;
}

export interface MapConfig {
  center: GeoCoordinates;
  zoom: number;
  bounds?: { north: number; south: number; east: number; west: number };
  stations: StationInfo[];
}

export type LayerCategory =
  | 'Base Map'
  | 'Crime Data'
  | 'Analysis'
  | 'Hotspots'
  | 'Alerts'
  | 'Response'
  | 'Replay';

export interface LayerDef {
  id: string;
  name: string;
  category: LayerCategory;
  visibleByDefault: boolean;
}

export interface NavigationRoute {
  route_id: string;
  waypoints: GeoCoordinates[];
  distance_km: number;
  estimated_minutes: number;
  vehicle_recommendation: string;
  alternative_routes?: NavigationRoute[];
}

export interface LocationAnalysis {
  crime_history_30d: number;
  nearby_hotspots_1km: Hotspot[];
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  response_time_estimate_min: number;
  pattern_analysis: string;
  women_safety_assessment: string;
  ai_summary: string;
}

export interface DistrictAnalytics {
  district_id: string;
  district_name: string;
  total_cases_30d: number;
  active_cases: number;
  station_count: number;
  crime_type_breakdown?: Record<string, number>;
  crime_density: number;
  hotspot_count: number;
  clearance_rate: number;
  patrol_units_active: number;
  crime_index: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_level_str?: string;
  prediction_alerts: number;
  officer_count: number;
}

export interface PatrolUnit {
  unit_id: string;
  station_id: number;
  officer_count: number;
  status: 'active' | 'available' | 'off_duty';
  current_location?: GeoCoordinates;
  assigned_hotspot_id?: string;
}

export interface OfficerDeployment {
  officer_id: string;
  name: string;
  rank: string;
  station_id: number;
  status: string;
  current_beat?: string;
}

export interface ReportRequest {
  type: 'area_summary' | 'hotspot_analysis' | 'patrol_coverage';
  area?: GeoCoordinates[];
  center?: GeoCoordinates;
  time_range: '24h' | '7d' | '30d';
  sections: string[];
}

export interface GeoReport {
  report_id: string;
  type: string;
  generated_at: string;
  content: Record<string, unknown>;
  download_url?: string;
}

export interface NearbyStation {
  station_id: string;
  station_name: string;
  lat: number;
  lng: number;
  distance_km: number;
  officer_count: number;
  phone?: string;
}

export interface PatrolRecommendation {
  vehicle: string;
  officer_count: number;
  priority: string;
  estimated_duration: string;
  distance_km: number;
  coverage_radius_km: number;
}

export interface SuggestedAction {
  id: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OpsIntelResponse {
  hotspot_id?: string;
  nearby_stations: NearbyStation[];
  patrol_recommendation: PatrolRecommendation;
  response_time_min: number;
  suggested_actions: SuggestedAction[];
  ai_explanation: string;
  review_status: string;
  generated_at: string;
}
