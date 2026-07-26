import { api } from './client';
import type {
  Alert,
  CommandCenterView,
  DispatchRecommendation,
  OfficerAlertSummary,
} from '@/types/EarlyWarning';

const EW_BASE = '/early-warning/v1';

export async function getAlerts(filters?: {
  district_id?: string;
  severity?: string;
  alert_type?: string;
}): Promise<{ alerts: Alert[]; count: number }> {
  return api.get(`${EW_BASE}/alerts`, filters as any);
}

export async function getCriticalAlerts(districtId: string): Promise<{ alerts: Alert[]; count: number }> {
  return api.get(`${EW_BASE}/alerts/critical`, { district_id: districtId });
}

export async function getOfficerAlerts(officerId: string, districtId: string): Promise<{ alerts: OfficerAlertSummary[]; count: number }> {
  return api.get(`${EW_BASE}/alerts/officer`, { officer_id: officerId, district_id: districtId });
}

export async function getAlertHistory(districtId: string, days?: number): Promise<{ alerts: Alert[]; count: number }> {
  return api.get(`${EW_BASE}/alerts/history`, { district_id: districtId, days: days ?? 7 });
}

export async function getCommandCenter(districtId: string): Promise<CommandCenterView> {
  return api.get(`${EW_BASE}/command-center`, { district_id: districtId });
}

export async function getDispatchRecommendations(districtId: string): Promise<{ recommendations: DispatchRecommendation[] }> {
  return api.get(`${EW_BASE}/dispatch`, { district_id: districtId });
}

export async function postDispatchRecommend(data: {
  lat: number;
  lng: number;
  risk_score?: number;
  alert_type?: string;
}): Promise<{ recommendation: DispatchRecommendation }> {
  return api.post(`${EW_BASE}/dispatch/recommend`, data);
}
