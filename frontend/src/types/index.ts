export interface FirCase {
  crime_no: string;
  station_name?: string;
  station_id?: number;
  registered_by: string;
  occurrence_date: string;
  occurrence_time: string;
  lat: number;
  lng: number;
  crime_head_name?: string;
  crime_head_id?: number;
  brief_facts: string;
  status: string;
  fir_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiskScoreResponse {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  score: number;
  calibrated_score: number;
  score_bucket: string;
  confidence_interval: { lower: number; upper: number };
  model: string;
  generated_at: string;
  cache_hit: boolean;
  explanation?: {
    plain_english: string;
    contributions: Array<{ name: string; shap_value: number; direction: string }>;
  };
  review_status: string;
  disclaimer?: string;
}

export interface BehaviorProfile {
  accused_id: string;
  accused_name: string;
  total_cases: number;
  preferred_crime_types: Array<{ crime_head: string; count: number; proportion: number }>;
  operating_radius_km: number;
  primary_area: string;
  escalation_pattern: string;
  risk_evolution?: { trend: string };
  known_associates?: Array<{ name: string; shared_cases: number }>;
  risk_factors?: Array<{ factor: string; weight: number }>;
  explanation: string;
}

export interface CrimePattern {
  pattern_id: string;
  pattern_type: string;
  data: {
    centroid?: { lat: number; lng: number };
    case_count?: number;
    composition?: Record<string, number>;
  };
  actionable: boolean;
  recommendation?: string;
}

// ─── PC / FIR detail types ───────────────────────────────────────────────────
export interface Accused {
  accused_id: string;
  accused_name: string;
  crime_no: string;
  age?: number;
  gender?: string;
  address?: string;
  status?: string;
  is_arrested?: boolean;
  arrest_date?: string;
  charges?: string[];
}

export interface Victim {
  victim_id: string;
  victim_name: string;
  crime_no: string;
  age?: number;
  gender?: string;
  address?: string;
  injury_type?: string;
  medical_aid_provided?: boolean;
  statement?: string;
}

export interface EarlyWarning {
  warning_id: string;
  type: string;
  severity: string;
  entity_name?: string;
  message: string;
  recommended_action: string;
  generated_at: string;
  status: string;
}

export interface PatrolRecommendation {
  type: string;
  priority: string;
  location: { lat: number; lng: number };
  reason: string;
  suggested_patrols: number;
  suggested_time_slots: string[];
}

export interface Forecast {
  date: string;
  predicted_cases: number;
  lower: number;
  upper: number;
}

export interface User {
  id: string;
  username: string;
  roles: string[];
  district_id?: string;
  district_name?: string;
  station_id?: string;
  station_name?: string;
  jurisdiction_type?: string;
  zone?: string;
  name?: string;
  email?: string;
  profile_picture?: string | null;
}

export interface TrendPoint {
  date: string;
  count: number;
  crime_type?: string;
}

export interface InsightItem {
  title: string;
  description: string;
  severity: string;
  metric?: number;
}

export interface DensityPoint {
  lat: number;
  lng: number;
  weight: number;
  crime_type?: string;
}

export interface DistrictSummary {
  district_id: number;
  district_name: string;
  total_cases: number;
  active_cases: number;
  chargesheet_rate: number;
  crime_head_breakdown: Record<string, number>;
}

export interface SummaryInsight {
  label: string;
  confidence: number;
  evidence_source: string;
}

export interface PersonInfo {
  name: string;
  role: string;
  age?: number;
  gender?: string;
  status?: string;
  details?: string;
}

export interface EvidenceInfo {
  type: string;
  description?: string;
  value?: number;
  status?: string;
}

export interface TimelineStep {
  stage: string;
  date?: string;
  details?: string;
}

export interface SimilarCaseInfo {
  crime_no: string;
  crime_type: string;
  district: string;
  status: string;
  similarity: number;
}

export interface RecommendationInfo {
  action: string;
  priority: string;
  confidence: number;
  reason: string;
}

export interface RiskAnalysisInfo {
  overall_risk: string;
  overall_score: number;
  repeat_offender_risk: string;
  violence_risk: string;
  escape_risk: string;
  organized_crime_risk: string;
  community_impact: string;
}

export interface GeoInfo {
  incident_lat?: number;
  incident_lng?: number;
  nearest_station?: string;
  district?: string;
}

export interface InvestigationSummary {
  summary_paragraph: string;
  incident_type: string;
  status: string;
  priority: string;
  risk_score: number;
  ai_confidence: number;
  crime_category: string;
  district: string;
  police_station: string;
  officer: string;
  case_age_days: number;
  insights: SummaryInsight[];
  accused: PersonInfo[];
  victims: PersonInfo[];
  witnesses: string[];
  vehicles: string[];
  weapons: string[];
  evidence: EvidenceInfo[];
  documents: string[];
  locations: string[];
  timeline: TimelineStep[];
  current_stage: string;
  similar_cases: SimilarCaseInfo[];
  recommendations: RecommendationInfo[];
  risk_analysis: RiskAnalysisInfo;
  geo_info: GeoInfo;
}

export interface TimelineEvent {
  event: string;
  timestamp?: string;
  details?: string;
}

export interface CopilotQueryResponse {
  response: string;
  sources: Array<{ title: string; url?: string }>;
  mode_used: string;
  confidence: number;
  requires_review: boolean;
  session_id?: string;
  degraded?: boolean;
}

export interface CopilotSession {
  session_id: string;
  session_type: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface CopilotMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  intent?: string;
}

export interface Notification {
  id: string;
  type: 'alert' | 'system' | 'case' | 'warning';
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  is_read: boolean;
  created_at: string;
  related_entity_type?: 'fir' | 'warning' | 'alert' | null;
  related_entity_id?: string | null;
  deep_link?: string | null;
  /** Priority level for operational triage */
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  /** Officer who triggered the notification */
  triggered_by?: string | null;
  /** FIR crime number reference */
  fir_reference?: string | null;
  /** Crime type classification */
  crime_type?: string | null;
  /** Current status of related entity */
  status?: string | null;
}

// ─── PC Case Diary types ──────────────────────────────────────────────────────
export interface CaseDiaryEntry {
  id: number;
  crime_no: string;
  officer_id: string;
  entry_date: string;
  entry_text: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseDiaryListResponse {
  crime_no: string;
  entries: CaseDiaryEntry[];
  total: number;
}

export interface CaseDiaryCreateRequest {
  entry_text: string;
  entry_date?: string | null;
}

// ─── PC OfficerTask types ──────────────────────────────────────────────────────
export interface OfficerTask {
  id: number;
  assigned_to: string;
  assigned_by: string | null;
  crime_no: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OfficerTaskListResponse {
  tasks: OfficerTask[];
  total: number;
}

// ─── PC DutyReport types ────────────────────────────────────────────────────────
export interface DutyReport {
  id: number;
  officer_id: string;
  shift_date: string;
  shift_type: string;
  summary: string;
  cases_attended: string | null;
  challenges: string | null;
  pending_items: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface DutyReportListResponse {
  reports: DutyReport[];
  total: number;
}

export interface DutyReportCreateRequest {
  shift_date?: string | null;
  shift_type?: string;
  summary: string;
  cases_attended?: string | null;
  challenges?: string | null;
  pending_items?: string | null;
}
