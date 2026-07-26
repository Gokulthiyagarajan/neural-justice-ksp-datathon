export interface IncidentLocation {
  lat: number;
  lng: number;
  district_id: string;
  station_id?: string;
  station_name?: string;
}

export interface IncidentRiskFactor {
  factor: string;
  score: number;
  description: string;
}

export interface IncidentAction {
  action_id: string;
  title: string;
  description: string;
  priority: string;
  assigned_to?: string;
  status: string;
  deadline?: string;
}

export interface IncidentPatrolRecommendation {
  unit_id: string;
  unit_type: string;
  officer_count: number;
  coverage_radius_km: number;
  estimated_response_min: number;
  priority: string;
}

export interface RelatedIncidentFIR {
  crime_no: string;
  crime_head_name: string;
  occurrence_date: string;
  status: string;
  complainant_name: string;
  lat?: number;
  lng?: number;
}

export interface IncidentTimelineEvent {
  event_id: string;
  event_type: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface IncidentAuditEntry {
  entry_id: string;
  action: string;
  actor_type: string;
  actor_id: string;
  details: string;
  timestamp: string;
}

export interface Incident {
  incident_id: string;
  incident_name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  crime_category: string;
  alert_type: string;
  district_id: string;
  location?: IncidentLocation;
  risk_analysis: IncidentRiskFactor[];
  risk_score: number;
  confidence: number;
  suggested_actions: IncidentAction[];
  patrol_recommendations: IncidentPatrolRecommendation[];
  related_firs: RelatedIncidentFIR[];
  fir_count: number;
  criminal_network: Record<string, any>[];
  timeline: IncidentTimelineEvent[];
  audit_history: IncidentAuditEntry[];
  officer_assigned?: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  review_status: string;
  ai_summary: string;
  model_version: string;
}
