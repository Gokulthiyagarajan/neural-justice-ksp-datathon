import { api } from './client';
import type {
  FirCase,
  Accused,
  Victim,
  TimelineEvent,
  InvestigationSummary,
  CaseDiaryEntry,
  CaseDiaryListResponse,
  CaseDiaryCreateRequest,
  OfficerTask,
  OfficerTaskListResponse,
  DutyReport,
  DutyReportListResponse,
  DutyReportCreateRequest,
} from '@/types';

/** Fetch a single FIR by crime number (uses existing /api/firs detail endpoint). */
export async function getPcFirDetail(crimeNo: string): Promise<FirCase> {
  return api.get<FirCase>(`/firs/${encodeURIComponent(crimeNo)}`);
}

/** Fetch FIR timeline events. */
export async function getPcFirTimeline(
  crimeNo: string,
): Promise<{ crime_no: string; events: TimelineEvent[] }> {
  return api.get(`/firs/${encodeURIComponent(crimeNo)}/timeline`);
}

/** Fetch investigation summary for a case. */
export async function getPcInvestigationSummary(
  crimeNo: string,
): Promise<InvestigationSummary> {
  return api.get<InvestigationSummary>(
    `/firs/${encodeURIComponent(crimeNo)}/investigation-summary`,
  );
}

/** Fetch accused linked to a FIR. */
export async function getPcAccused(crimeNo: string): Promise<Accused[]> {
  return api.get<Accused[]>(`/firs/${encodeURIComponent(crimeNo)}/accused`);
}

/** Fetch victims linked to a FIR. */
export async function getPcVictims(crimeNo: string): Promise<Victim[]> {
  return api.get<Victim[]>(`/firs/${encodeURIComponent(crimeNo)}/victims`);
}

/** Fetch case dates / hearing schedule. */
export async function getPcCaseDates(
  crimeNo: string,
): Promise<{ crime_no: string; dates: { date: string; description: string }[] }> {
  return api.get(`/firs/${encodeURIComponent(crimeNo)}/case-dates`);
}

/** Case Diary — fetch entries for a case. */
export async function getPcCaseDiary(
  crimeNo: string,
  params?: { limit?: number; offset?: number },
): Promise<CaseDiaryListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  const qs = sp.toString();
  return api.get<CaseDiaryListResponse>(
    `/pc/case-diary/${encodeURIComponent(crimeNo)}${qs ? `?${qs}` : ''}`,
  );
}

/** Case Diary — create a new entry. */
export async function createPcCaseDiaryEntry(
  crimeNo: string,
  data: CaseDiaryCreateRequest,
): Promise<CaseDiaryEntry> {
  return api.post<CaseDiaryEntry>(
    `/pc/case-diary/${encodeURIComponent(crimeNo)}`,
    data,
  );
}

/** Get today's tasks/orders assigned to the PC. */
export async function getPcTasks(
  statusFilter?: string,
): Promise<OfficerTaskListResponse> {
  const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  return api.get<OfficerTaskListResponse>(`/pc/tasks${qs}`);
}

/** Update a task's status (e.g. mark complete). */
export async function updatePcTaskStatus(
  taskId: number,
  status: string,
): Promise<OfficerTask> {
  return api.patch<OfficerTask>(`/pc/tasks/${taskId}`, { status });
}

/** Get duty reports submitted by the PC. */
export async function getPcDutyReports(params?: {
  limit?: number;
  offset?: number;
}): Promise<DutyReportListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  const qs = sp.toString();
  return api.get<DutyReportListResponse>(`/pc/duty-reports${qs ? `?${qs}` : ''}`);
}

/** Submit an end-of-shift duty report. */
export async function submitPcDutyReport(
  data: DutyReportCreateRequest,
): Promise<DutyReport> {
  return api.post<DutyReport>('/pc/duty-reports', data);
}

/** Fetch assigned FIRs for the PC (used by My Cases page). */
export async function getPcAssignedFirs(params: {
  assigned_to?: string;
  station_id?: string;
  limit?: number;
}): Promise<{ firs: any[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.assigned_to) sp.set('assigned_to', params.assigned_to);
  if (params.station_id) sp.set('station_id', params.station_id);
  sp.set('limit', String(params.limit ?? 100));
  return api.get(`/firs/assigned?${sp}`);
}
