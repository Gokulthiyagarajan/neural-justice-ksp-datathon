import { api } from './client';
import type { Incident } from '@/types/incident';

export async function createIncident(alert: Record<string, any>): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>('/incident/v1/create', alert);
  return res.incident;
}

export async function getIncident(incidentId: string): Promise<Incident> {
  const res = await api.get<{ incident: Incident }>(`/incident/v1/${incidentId}`);
  return res.incident;
}

export async function listIncidents(districtId: string): Promise<Incident[]> {
  const res = await api.get<{ incidents: Incident[] }>(`/incident/v1/list/${districtId}`);
  return res.incidents;
}

export async function getIncidentTimeline(incidentId: string): Promise<any[]> {
  const res = await api.get<{ timeline: any[] }>(`/incident/v1/${incidentId}/timeline`);
  return res.timeline || [];
}

export async function getIncidentAudit(incidentId: string): Promise<any[]> {
  const res = await api.get<{ audit_history: any[] }>(`/incident/v1/${incidentId}/audit`);
  return res.audit_history || [];
}

export async function addTimelineEvent(incidentId: string, event: Record<string, any>): Promise<boolean> {
  const res = await api.post<{ added: boolean }>(`/incident/v1/${incidentId}/timeline/add`, event);
  return res.added === true;
}
