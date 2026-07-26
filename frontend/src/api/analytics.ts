import { api } from './client';
import type { TrendPoint, InsightItem, DensityPoint, DistrictSummary } from '@/types';

export async function getTrends(
  days?: number,
  districtId?: string,
  crimeHeadId?: number
): Promise<{ trends: TrendPoint[]; period: string }> {
  return api.get('/analytics/trends', {
    days,
    district_id: districtId,
    crime_head_id: crimeHeadId,
  });
}

export async function getInsights(
  districtId?: string
): Promise<{ insights: InsightItem[]; generated_at: string }> {
  return api.get('/analytics/insights', { district_id: districtId });
}

export async function getIncidentDensity(
  districtId?: string,
  days?: number
): Promise<{ points: DensityPoint[]; district_id?: string; date_range: string }> {
  return api.get('/analytics/incident-density', {
    district_id: districtId,
    days,
  });
}

export async function getDistrictSummary(): Promise<{
  districts: DistrictSummary[];
  generated_at: string;
}> {
  return api.get('/analytics/district-summary');
}
