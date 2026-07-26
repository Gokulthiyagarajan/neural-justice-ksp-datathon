import { api } from './client';
import type {
  MapConfig,
  Hotspot,
  TimelineSlice,
  NavigationRoute,
  LocationAnalysis,
  DistrictAnalytics,
  StationInfo,
  GeoReport,
  ReportRequest,
  GeoCoordinates,
  PatrolUnit,
  OpsIntelResponse,
} from '@/types/geo';

const GEO_BASE = '/api/geo/v1/map';

function unwrapGeo<T>(raw: unknown): T {
  const r = raw as Record<string, unknown>;
  if (r && typeof r === 'object' && r.status === 'ok' && 'data' in r) {
    const data = r.data as T;
    const meta = r.metadata as Record<string, unknown> | undefined;
    if (meta && typeof data === 'object' && data !== null) {
      return { ...data, ...meta } as T;
    }
    return data;
  }
  return raw as T;
}

export async function getMapConfig(districtId?: string): Promise<MapConfig> {
  const res = await api.get(`${GEO_BASE}/config`, { district_id: districtId });
  return res as MapConfig;
}

export async function getDistrictRisk(districtId: string): Promise<DistrictAnalytics> {
  const res = await api.get(`${GEO_BASE}/risk`, { district_id: districtId });
  return unwrapGeo<DistrictAnalytics>(res);
}

export async function getHotspots(filters?: {
  district_id?: string;
  hotspot_type?: string;
  limit?: number;
}): Promise<{ hotspots: Hotspot[]; generated_at: string }> {
  const res = await api.get(`${GEO_BASE}/hotspots`, filters as Record<string, string | number | boolean | undefined>);
  return unwrapGeo<{ hotspots: Hotspot[]; generated_at: string }>(res);
}

export async function getHotspotDetail(hotspotId: string): Promise<Hotspot> {
  const res = await api.get(`${GEO_BASE}/hotspots/${hotspotId}`);
  return unwrapGeo<Hotspot>(res);
}

export async function getTimeline(params?: {
  district_id?: string;
  days?: number;
  slices?: number;
}): Promise<{ slices: TimelineSlice[]; total_slices: number; date_range: { start: string; end: string } }> {
  const res = await api.get(`${GEO_BASE}/timeline`, params as Record<string, string | number | boolean | undefined>);
  return unwrapGeo<{ slices: TimelineSlice[]; total_slices: number; date_range: { start: string; end: string } }>(res);
}

export async function postNavigation(data: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  alternatives?: boolean;
}): Promise<{ routes: NavigationRoute[] }> {
  const res = await api.post(`${GEO_BASE}/navigation`, data);
  return unwrapGeo<{ routes: NavigationRoute[] }>(res);
}

export async function getNearbyStations(coords: {
  lat: number;
  lng: number;
  radius_km?: number;
}): Promise<{ stations: StationInfo[] }> {
  const res = await api.get(`${GEO_BASE}/nearby`, {
    lat: coords.lat,
    lng: coords.lng,
    radius_km: coords.radius_km,
  });
  return unwrapGeo<{ stations: StationInfo[] }>(res);
}

export async function getStationDetail(stationId: number): Promise<StationInfo> {
  const res = await api.get(`${GEO_BASE}/stations/${stationId}`);
  return res as StationInfo;
}

export async function getDistrictAnalytics(districtId: string): Promise<DistrictAnalytics> {
  const res = await api.get(`${GEO_BASE}/district/${districtId}`);
  return unwrapGeo<DistrictAnalytics>(res);
}

export async function getLocationAnalysis(coords: GeoCoordinates): Promise<LocationAnalysis> {
  const res = await api.post(`${GEO_BASE}/analyze`, coords);
  return unwrapGeo<LocationAnalysis>(res);
}

export async function generateReport(request: ReportRequest): Promise<GeoReport> {
  const res = await api.post(`${GEO_BASE}/reports`, request);
  return unwrapGeo<GeoReport>(res);
}

export interface RegionGroup {
  region_id: number | null;
  region_name: string;
  headquarters: string | null;
  districts: { id: number; name: string; code: string }[];
}

export async function getDistrictsList(): Promise<RegionGroup[]> {
  const res = await api.get(`${GEO_BASE}/districts`);
  return res as RegionGroup[];
}

export async function getPatrolUnits(districtId?: string): Promise<{ units: PatrolUnit[] }> {
  const res = await api.get(`${GEO_BASE}/patrol-units`, { district_id: districtId });
  return res as { units: PatrolUnit[] };
}

export async function postOpsIntel(data: {
  lat: number;
  lng: number;
  crime_category: string[];
  risk_score: number;
  hotspot_id?: string;
}): Promise<{ ops_intel: OpsIntelResponse }> {
  const res = await api.post(`${GEO_BASE}/ops-intel`, data);
  return unwrapGeo<{ ops_intel: OpsIntelResponse }>(res);
}


