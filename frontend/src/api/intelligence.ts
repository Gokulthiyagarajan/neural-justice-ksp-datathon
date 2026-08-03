import { api } from './client';
import type {
  BehaviorProfile,
  CrimePattern,
  PatrolRecommendation,
  EarlyWarning,
  Forecast,
} from '@/types';

const INTEL_BASE = '/intelligence/v1';

export async function getBehaviorProfile(accusedId: string): Promise<BehaviorProfile> {
  return api.get<BehaviorProfile>(`${INTEL_BASE}/profile/${accusedId}`);
}

export async function getCrimePatterns(filters?: {
  district_id?: string;
  pattern_type?: string;
  days?: number;
  limit?: number;
}): Promise<{ patterns: CrimePattern[]; generated_at: string }> {
  return api.get(`${INTEL_BASE}/patterns`, filters);
}

export async function getPatrolRecommendations(
  stationId?: string,
  date?: string,
  minPriority?: string
): Promise<{
  recommendations: PatrolRecommendation[];
  total_patrol_hours: number;
  review_status: string;
}> {
  return api.get(`${INTEL_BASE}/patrol-recommendations`, {
    station_id: stationId,
    date,
    min_priority: minPriority,
  });
}

export async function getEarlyWarnings(filters?: {
  severity?: string;
  status?: string;
  type?: string;
  district_id?: string;
}): Promise<{
  warnings: EarlyWarning[];
  total_active: number;
  critical_count: number;
  generated_at: string;
}> {
  return api.get(`${INTEL_BASE}/warnings`, filters);
}

export async function acknowledgeWarning(warningId: string): Promise<void> {
  await api.post(`${INTEL_BASE}/warnings/${warningId}/acknowledge`, {});
}

export async function resolveWarning(warningId: string, note: string): Promise<void> {
  await api.post(`${INTEL_BASE}/warnings/${warningId}/resolve`, {
    resolution_note: note,
  });
}

export async function getForecast(
  districtId?: string,
  horizonDays?: number,
  crimeType?: string
): Promise<{
  forecasts: Forecast[];
  total_predicted_30d: number;
  generated_at: string;
}> {
  return api.get(`${INTEL_BASE}/forecast`, {
    district_id: districtId,
    horizon_days: horizonDays,
    crime_type: crimeType,
  });
}
