export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FIRStatus =
  | 'open'
  | 'under_investigation'
  | 'pending_trial'
  | 'closed'
  | 'resolved';

export interface FIR {
  fir_id: string;
  fir_number: string;
  date: string;
  crime_type: string;
  district: string;
  station: string;
  accused_name: string;
  accused_id: string;
  victim_name: string;
  status: FIRStatus;
  severity: Severity;
  officer_assigned: string;
  days_open: number;
  linked_cases: number;
  is_repeat_offender: boolean;
  description: string;
  location: string;
  rowid: number | string;
}

export interface TimelineEvent {
  date: string;
  event: string;
  officer: string;
}

export interface EvidenceItem {
  id: string;
  type: string;
  description: string;
  seized_from: string;
  seized_date: string;
  status: 'collected' | 'forensic_analysis' | 'in_custody' | 'returned' | 'produced_in_court';
  value: number | null;
}

export interface WitnessInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  relation: string;
  statement: string;
  status: 'yet_to_examine' | 'examined' | 'cross_examined' | 'hostile';
}

export interface CaseDiaryEntry {
  date: string;
  officer: string;
  entry: string;
  progress: string;
}

export interface PropertyItem {
  id: string;
  item: string;
  description: string;
  estimated_value: number;
  status: 'stolen' | 'recovered' | 'produced';
  recovery_date: string | null;
}

export interface LinkedCaseInfo {
  fir_number: string;
  crime_type: string;
  district: string;
  status: string;
  accused: string;
}

export interface LegalSection {
  code: string;
  section: string;
  description: string;
}

export interface CourtInfo {
  court_name: string;
  case_number: string;
  judge: string;
  next_hearing: string | null;
  bail_status: 'granted' | 'denied' | 'pending' | 'not_applicable';
  filing_date: string | null;
}

export interface FIRDetail extends FIR {
  accused_age: number | null;
  accused_gender: string | null;
  accused_prior_offences: number;
  accused_risk_score: number;
  victim_age: number | null;
  victim_gender: string | null;
  investigation_timeline: TimelineEvent[];
  ai_summary: string | null;
  description_full: string;
  fir_date_time: string;
  legal_sections: LegalSection[];
  witnesses: WitnessInfo[];
  evidence_items: EvidenceItem[];
  property: PropertyItem[];
  linked_case_details: LinkedCaseInfo[];
  case_diary: CaseDiaryEntry[];
  court: CourtInfo | null;
  investigation_officers: string[];
  case_category: string;
  modus_operandi: string;
  documents: string[];
  updated_at: string;
  occurrence_time: string;
  registration_time: string;
}

export interface FIRFilters {
  date_from: string;
  date_to: string;
  district: string;
  station: string;
  crime_type: string;
  status: string;
  severity: string;
  search: string;
}

export interface FIRSummary {
  critical: number;
  high: number;
  open: number;
  resolved: number;
}

export interface FIRListResponse {
  firs: FIR[];
  total: number;
  page: number;
  has_more: boolean;
  summary: FIRSummary;
}

export interface FIRFilterOptions {
  districts: string[];
  crime_types: string[];
  stations: string[];
  statuses: string[];
  severities: string[];
}
