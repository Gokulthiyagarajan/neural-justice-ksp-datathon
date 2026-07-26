import { api } from './client';
import type { FirCase, TimelineEvent, InvestigationSummary } from '@/types';

// NOTE: The live FIR Operations demo is served from the ZCQL-backed
// `/api/fir-ops` router (see backend/api/routes/fir_operations.py).
// The list/search calls below are pinned to /fir-ops. The detail,
// timeline, and investigation-summary calls remain on the legacy
// SQLAlchemy `/api/firs` router (crime_no keyed) which stays mounted
// for the legacy FIR detail page.

export async function getFirs(filters?: {
  station_id?: number;
  status?: string;
  crime_head_id?: number;
  date_from?: string;
  date_to?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ results: FirCase[]; total: number }> {
  return api.get('/fir-ops', filters as Record<string, string | number | boolean | undefined>);
}

export async function getFir(crimeNo: string): Promise<FirCase> {
  return api.get<FirCase>(`/firs/${encodeURIComponent(crimeNo)}`);
}

export async function searchFirs(query: string): Promise<{ results: FirCase[]; total: number }> {
  return api.get('/fir-ops', { search: query } as Record<string, string | number | boolean | undefined>);
}

export async function getFirTimeline(crimeNo: string): Promise<{ crime_no: string; events: TimelineEvent[] }> {
  return api.get(`/firs/${encodeURIComponent(crimeNo)}/timeline`);
}

export async function getInvestigationSummary(crimeNo: string): Promise<InvestigationSummary> {
  return api.get<InvestigationSummary>(`/firs/${encodeURIComponent(crimeNo)}/investigation-summary`);
}
