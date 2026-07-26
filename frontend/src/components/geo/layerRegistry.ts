import type { Map as MapLibreMap } from 'maplibre-gl';

// ─── Sample data generators ────────────────────────────────────────────────
// These produce realistic Karnataka police data that renders immediately.
// Replace with real API-fetched data as the backend endpoints mature.

// 15 realistic FIR points across Karnataka
const FIR_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-001', crime_head_name: 'Murder', status: 'under_investigation', severity: 'critical', recency_hours: 2, lat: 15.36, lng: 75.14 }, geometry: { type: 'Point' as const, coordinates: [75.14, 15.36] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-002', crime_head_name: 'Robbery', status: 'open', severity: 'high', recency_hours: 8, lat: 12.97, lng: 77.59 }, geometry: { type: 'Point' as const, coordinates: [77.59, 12.97] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-003', crime_head_name: 'Theft', status: 'under_investigation', severity: 'medium', recency_hours: 16, lat: 12.31, lng: 76.66 }, geometry: { type: 'Point' as const, coordinates: [76.66, 12.31] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-004', crime_head_name: 'Assault', status: 'closed', severity: 'medium', recency_hours: 48, lat: 15.85, lng: 74.50 }, geometry: { type: 'Point' as const, coordinates: [74.50, 15.85] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-005', crime_head_name: 'Burglary', status: 'open', severity: 'high', recency_hours: 24, lat: 13.34, lng: 74.74 }, geometry: { type: 'Point' as const, coordinates: [74.74, 13.34] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-006', crime_head_name: 'Cyber Crime', status: 'under_investigation', severity: 'critical', recency_hours: 4, lat: 12.91, lng: 77.65 }, geometry: { type: 'Point' as const, coordinates: [77.65, 12.91] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-007', crime_head_name: 'Kidnapping', status: 'open', severity: 'critical', recency_hours: 6, lat: 17.33, lng: 76.82 }, geometry: { type: 'Point' as const, coordinates: [76.82, 17.33] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-008', crime_head_name: 'Fraud', status: 'under_investigation', severity: 'medium', recency_hours: 36, lat: 12.30, lng: 76.65 }, geometry: { type: 'Point' as const, coordinates: [76.65, 12.30] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-009', crime_head_name: 'Drug Related', status: 'open', severity: 'high', recency_hours: 12, lat: 14.44, lng: 75.92 }, geometry: { type: 'Point' as const, coordinates: [75.92, 14.44] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-010', crime_head_name: 'Domestic Violence', status: 'closed', severity: 'medium', recency_hours: 72, lat: 15.32, lng: 76.46 }, geometry: { type: 'Point' as const, coordinates: [76.46, 15.32] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-011', crime_head_name: 'Sexual Assault', status: 'under_investigation', severity: 'critical', recency_hours: 10, lat: 16.83, lng: 75.72 }, geometry: { type: 'Point' as const, coordinates: [75.72, 16.83] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-012', crime_head_name: 'Human Trafficking', status: 'open', severity: 'critical', recency_hours: 3, lat: 12.59, lng: 76.90 }, geometry: { type: 'Point' as const, coordinates: [76.90, 12.59] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-013', crime_head_name: 'Robbery', status: 'open', severity: 'high', recency_hours: 20, lat: 13.02, lng: 77.57 }, geometry: { type: 'Point' as const, coordinates: [77.57, 13.02] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-014', crime_head_name: 'Theft', status: 'under_investigation', severity: 'medium', recency_hours: 30, lat: 14.54, lng: 75.63 }, geometry: { type: 'Point' as const, coordinates: [75.63, 14.54] } },
    { type: 'Feature' as const, properties: { crime_no: 'KSP-2026-015', crime_head_name: 'Murder Attempt', status: 'open', severity: 'critical', recency_hours: 5, lat: 12.78, lng: 78.20 }, geometry: { type: 'Point' as const, coordinates: [78.20, 12.78] } },
  ],
};

const HOTSPOT_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { id: 'hs-1', hotspot_type: 'current', risk_score: 85, crime_category: 'theft', fir_count: 12, title: 'Theft Cluster — Central Zone', severity: 'Critical' }, geometry: { type: 'Point' as const, coordinates: [75.14, 15.36] } },
    { type: 'Feature' as const, properties: { id: 'hs-2', hotspot_type: 'current', risk_score: 72, crime_category: 'robbery', fir_count: 8, title: 'Robbery Cluster — East Zone', severity: 'High' }, geometry: { type: 'Point' as const, coordinates: [77.61, 12.98] } },
    { type: 'Feature' as const, properties: { id: 'hs-3', hotspot_type: 'emerging', risk_score: 58, crime_category: 'cyber_crime', fir_count: 5, title: 'Cyber Crime — Tech Hub', severity: 'Medium' }, geometry: { type: 'Point' as const, coordinates: [77.65, 12.91] } },
    { type: 'Feature' as const, properties: { id: 'hs-4', hotspot_type: 'predicted', risk_score: 45, crime_category: 'assault', fir_count: 3, title: 'Predicted Hotspot — North', severity: 'Low' }, geometry: { type: 'Point' as const, coordinates: [75.92, 14.44] } },
    { type: 'Feature' as const, properties: { id: 'hs-5', hotspot_type: 'current', risk_score: 90, crime_category: 'drug_trafficking', fir_count: 15, title: 'Narcotics Cluster — Coastal', severity: 'Critical' }, geometry: { type: 'Point' as const, coordinates: [74.74, 13.34] } },
  ],
};

const STATION_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { station_id: 1, station_name: 'Cubbon Park Police Station', officer_count: 45, phone: '+91 80 2222 0001' }, geometry: { type: 'Point' as const, coordinates: [77.5929, 12.9763] } },
    { type: 'Feature' as const, properties: { station_id: 2, station_name: 'Indiranagar Police Station', officer_count: 52, phone: '+91 80 2222 0002' }, geometry: { type: 'Point' as const, coordinates: [77.6408, 12.9783] } },
    { type: 'Feature' as const, properties: { station_id: 3, station_name: 'Mysuru City Police Station', officer_count: 60, phone: '+91 80 2222 0003' }, geometry: { type: 'Point' as const, coordinates: [76.5570, 12.3072] } },
    { type: 'Feature' as const, properties: { station_id: 4, station_name: 'Belagavi City Police Station', officer_count: 38, phone: '+91 80 2222 0004' }, geometry: { type: 'Point' as const, coordinates: [74.4977, 15.8497] } },
    { type: 'Feature' as const, properties: { station_id: 5, station_name: 'Hubballi Police Station', officer_count: 42, phone: '+91 80 2222 0005' }, geometry: { type: 'Point' as const, coordinates: [75.1249, 15.3647] } },
    { type: 'Feature' as const, properties: { station_id: 6, station_name: 'Mangaluru City Police Station', officer_count: 55, phone: '+91 80 2222 0006' }, geometry: { type: 'Point' as const, coordinates: [74.8428, 12.9141] } },
    { type: 'Feature' as const, properties: { station_id: 7, station_name: 'Kalaburagi Police Station', officer_count: 35, phone: '+91 80 2222 0007' }, geometry: { type: 'Point' as const, coordinates: [76.9763, 17.3193] } },
  ],
};

const PATROL_ROUTE_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { route_id: 'pr-1', status: 'active', patrol_count: 4, color: '#00BFFF' }, geometry: { type: 'LineString' as const, coordinates: [[75.14, 15.36], [75.16, 15.38], [75.18, 15.36], [75.16, 15.34], [75.14, 15.36]] } },
    { type: 'Feature' as const, properties: { route_id: 'pr-2', status: 'active', patrol_count: 3, color: '#00FF7F' }, geometry: { type: 'LineString' as const, coordinates: [[77.59, 12.97], [77.62, 12.99], [77.65, 12.97], [77.62, 12.95], [77.59, 12.97]] } },
    { type: 'Feature' as const, properties: { route_id: 'pr-3', status: 'inactive', patrol_count: 1, color: '#FFA500' }, geometry: { type: 'LineString' as const, coordinates: [[76.55, 12.30], [76.58, 12.32], [76.60, 12.30]] } },
  ],
};

const BOUNDARY_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { district_id: 'BLR-U', name: 'Bengaluru Urban', risk_level: 'High' }, geometry: { type: 'Polygon' as const, coordinates: [[[77.45, 12.85], [77.75, 12.85], [77.75, 13.10], [77.45, 13.10], [77.45, 12.85]]] } },
    { type: 'Feature' as const, properties: { district_id: 'MYS', name: 'Mysuru', risk_level: 'Medium' }, geometry: { type: 'Polygon' as const, coordinates: [[[76.30, 12.20], [76.80, 12.20], [76.80, 12.50], [76.30, 12.50], [76.30, 12.20]]] } },
    { type: 'Feature' as const, properties: { district_id: 'BLG', name: 'Belagavi', risk_level: 'Medium' }, geometry: { type: 'Polygon' as const, coordinates: [[[74.20, 15.70], [74.80, 15.70], [74.80, 16.00], [74.20, 16.00], [74.20, 15.70]]] } },
    { type: 'Feature' as const, properties: { district_id: 'DHW', name: 'Dharwad', risk_level: 'Low' }, geometry: { type: 'Polygon' as const, coordinates: [[[75.00, 15.30], [75.40, 15.30], [75.40, 15.55], [75.00, 15.55], [75.00, 15.30]]] } },
  ],
};

const WARNING_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { warning_id: 'ew-1', type: 'crime_spike', severity: 'critical', title: 'Night theft spike — Central Zone', description: 'Theft cases up 34% in 20:00-02:00 window' }, geometry: { type: 'Point' as const, coordinates: [75.14, 15.36] } },
    { type: 'Feature' as const, properties: { warning_id: 'ew-2', type: 'safety_alert', severity: 'high', title: 'Women safety alert — East Zone', description: 'Crimes against women up 12% MoM' }, geometry: { type: 'Point' as const, coordinates: [77.63, 12.99] } },
    { type: 'Feature' as const, properties: { warning_id: 'ew-3', type: 'patrol_required', severity: 'medium', title: 'Patrol required — Coastal', description: 'Drug trafficking activity reported near coast' }, geometry: { type: 'Point' as const, coordinates: [74.74, 13.34] } },
  ],
};

const NETWORK_LINK_SAMPLE_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { link_id: 'nl-1', source: 'Accused-1', target: 'Accused-2', link_type: 'known_associate', weight: 85 }, geometry: { type: 'LineString' as const, coordinates: [[75.14, 15.36], [75.18, 15.40]] } },
    { type: 'Feature' as const, properties: { link_id: 'nl-2', source: 'Accused-2', target: 'Accused-3', link_type: 'family', weight: 90 }, geometry: { type: 'LineString' as const, coordinates: [[75.18, 15.40], [75.22, 15.38]] } },
    { type: 'Feature' as const, properties: { link_id: 'nl-3', source: 'Accused-1', target: 'Accused-4', link_type: 'co-accused', weight: 75 }, geometry: { type: 'LineString' as const, coordinates: [[75.14, 15.36], [75.08, 15.32]] } },
  ],
};

// ─── Layer definition with helper to safely add source + layers ─────────────

function addGeoJSONSource(map: MapLibreMap | null, sourceId: string, data: any): boolean {
  if (!map || !map.getSource(sourceId)) {
    try { map?.addSource(sourceId, { type: 'geojson', data }); return true; } catch { return false; }
  }
  return false;
}

function safeAddLayer(map: MapLibreMap | null, layer: any): boolean {
  if (!map) return false;
  if (map.getLayer(layer.id)) return false;
  try { map.addLayer(layer); return true; } catch { return false; }
}

function safeRemoveLayer(map: MapLibreMap | null, id: string) {
  if (!map) return;
  try { if (map.getLayer(id)) map.removeLayer(id); } catch { /* ignore */ }
}

function safeRemoveSource(map: MapLibreMap | null, id: string) {
  if (!map) return;
  try { if (map.getSource(id)) map.removeSource(id); } catch { /* ignore */ }
}

export interface LayerDefinition {
  id: string;
  name: string;
  category: string;
  visibleByDefault: boolean;
  render(map: MapLibreMap | null): void;
  remove(map: MapLibreMap | null): void;
  visible: boolean;
  opacity?: number;
}

const layerDefs: LayerDefinition[] = [
  {
    id: 'base-map',
    name: 'Base Map',
    category: 'Base Map',
    visibleByDefault: true,
    visible: true,
    render() {},
    remove() {},
  },
  {
    id: 'fir-points',
    name: 'FIR Points',
    category: 'Crime Data',
    visibleByDefault: true,
    visible: true,
    render(map) {
      if (!map || map.getLayer('fir-points-layer')) return;
      const srcId = 'fir-points-source';
      addGeoJSONSource(map, srcId, FIR_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'fir-points-layer',
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': ['match', ['get', 'crime_head_name'],
            'Murder', '#ef4444', 'Robbery', '#f97316', 'Assault', '#eab308',
            'Theft', '#22c55e', 'Burglary', '#06b6d4', 'Fraud', '#8b5cf6',
            'Kidnapping', '#ec4899', 'Cyber Crime', '#14b8a6', 'Drug Related', '#a855f7',
            'Domestic Violence', '#fb7185', 'Sexual Assault', '#dc2626',
            'Human Trafficking', '#d946ef', 'Murder Attempt', '#7c3aed',
            '#6b7280'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'recency_hours'],
            0, 10, 24, 8, 72, 6, 168, 4],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      safeAddLayer(map, {
        id: 'fir-points-label',
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'crime_no'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'fir-points-label');
      safeRemoveLayer(map, 'fir-points-layer');
      safeRemoveSource(map, 'fir-points-source');
    },
  },
  {
    id: 'density-heatmap',
    name: 'Density Heatmap',
    category: 'Analysis',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('density-heatmap-layer')) return;
      const srcId = 'density-heatmap-source';
      addGeoJSONSource(map, srcId, FIR_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'density-heatmap-layer',
        type: 'heatmap',
        source: srcId,
        paint: {
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 20, 10, 40, 15, 60],
          'heatmap-opacity': 0.6,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1.0, 15, 1.5],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgba(103,169,207,0.6)',
            0.4, 'rgba(209,229,240,0.8)',
            0.6, 'rgba(253,219,199,0.9)',
            0.8, 'rgba(239,138,98,0.95)',
            1, 'rgba(178,24,43,1)'],
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'density-heatmap-layer');
      safeRemoveSource(map, 'density-heatmap-source');
    },
  },
  {
    id: 'hotspot-points',
    name: 'Hotspots',
    category: 'Hotspots',
    visibleByDefault: true,
    visible: true,
    render(map) {
      if (!map || map.getLayer('hotspot-points-layer')) return;
      const srcId = 'hotspot-points-source';
      addGeoJSONSource(map, srcId, HOTSPOT_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'hotspot-points-layer',
        type: 'circle',
        source: srcId,
        filter: ['==', ['get', 'hotspot_type'], 'current'],
        paint: {
          'circle-color': '#ef4444',
          'circle-radius': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 10, 50, 20, 100, 35],
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-blur': 0.3,
        },
      });
      safeAddLayer(map, {
        id: 'hotspot-predicted-layer',
        type: 'circle',
        source: srcId,
        filter: ['!=', ['get', 'hotspot_type'], 'current'],
        paint: {
          'circle-color': '#f97316',
          'circle-radius': ['interpolate', ['linear'], ['get', 'risk_score'], 0, 8, 50, 16, 100, 28],
          'circle-opacity': 0.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.8,
        },
      });
      safeAddLayer(map, {
        id: 'hotspot-label-layer',
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'title'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'hotspot-label-layer');
      safeRemoveLayer(map, 'hotspot-predicted-layer');
      safeRemoveLayer(map, 'hotspot-points-layer');
      safeRemoveSource(map, 'hotspot-points-source');
    },
  },
  {
    id: 'early-warnings',
    name: 'Early Warnings',
    category: 'Alerts',
    visibleByDefault: true,
    visible: true,
    render(map) {
      if (!map || map.getLayer('early-warnings-layer')) return;
      const srcId = 'early-warnings-source';
      addGeoJSONSource(map, srcId, WARNING_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'early-warnings-layer',
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': ['match', ['get', 'severity'],
            'critical', '#dc2626', 'high', '#f97316', 'medium', '#eab308',
            '#6b7280'],
          'circle-radius': 12,
          'circle-opacity': 0.7,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
      safeAddLayer(map, {
        id: 'early-warnings-label',
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'title'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'early-warnings-label');
      safeRemoveLayer(map, 'early-warnings-layer');
      safeRemoveSource(map, 'early-warnings-source');
    },
  },
  {
    id: 'patrol-routes',
    name: 'Patrol Routes',
    category: 'Response',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('patrol-routes-layer')) return;
      const srcId = 'patrol-routes-source';
      addGeoJSONSource(map, srcId, PATROL_ROUTE_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'patrol-routes-layer',
        type: 'line',
        source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'status'], 'active', '#00BFFF', '#FFA500'],
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 1],
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'patrol-routes-layer');
      safeRemoveSource(map, 'patrol-routes-source');
    },
  },
  {
    id: 'crime-prediction',
    name: 'Prediction',
    category: 'Analysis',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('crime-prediction-layer')) return;
      const srcId = 'crime-prediction-source';
      // Generate a few prediction points
      addGeoJSONSource(map, srcId, {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { prediction: 5.2, date: '2026-07-08', confidence: 78 }, geometry: { type: 'Point', coordinates: [75.20, 15.42] } },
          { type: 'Feature', properties: { prediction: 4.8, date: '2026-07-09', confidence: 72 }, geometry: { type: 'Point', coordinates: [77.55, 12.92] } },
          { type: 'Feature', properties: { prediction: 3.1, date: '2026-07-10', confidence: 65 }, geometry: { type: 'Point', coordinates: [76.60, 12.35] } },
        ],
      });
      safeAddLayer(map, {
        id: 'crime-prediction-layer',
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': '#a855f7',
          'circle-radius': ['interpolate', ['linear'], ['get', 'prediction'], 0, 8, 10, 20],
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'crime-prediction-layer');
      safeRemoveSource(map, 'crime-prediction-source');
    },
  },
  {
    id: 'station-points',
    name: 'Stations',
    category: 'Base Map',
    visibleByDefault: true,
    visible: true,
    render(map) {
      if (!map || map.getLayer('station-points-layer')) return;
      const srcId = 'station-points-source';
      addGeoJSONSource(map, srcId, STATION_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'station-points-layer',
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': 10,
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      safeAddLayer(map, {
        id: 'station-points-label',
        type: 'symbol',
        source: srcId,
        layout: {
          'text-field': ['get', 'station_name'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'station-points-label');
      safeRemoveLayer(map, 'station-points-layer');
      safeRemoveSource(map, 'station-points-source');
    },
  },
  {
    id: 'risk-zones',
    name: 'Risk Zones',
    category: 'Analysis',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('risk-zones-fill-layer')) return;
      const srcId = 'risk-zones-source';
      addGeoJSONSource(map, srcId, BOUNDARY_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'risk-zones-fill-layer',
        type: 'fill',
        source: srcId,
        paint: {
          'fill-color': ['match', ['get', 'risk_level'], 'High', '#ef4444', 'Medium', '#f97316', 'Low', '#22c55e', '#6b7280'],
          'fill-opacity': 0.1,
        },
      });
      safeAddLayer(map, {
        id: 'risk-zones-line-layer',
        type: 'line',
        source: srcId,
        paint: {
          'line-color': ['match', ['get', 'risk_level'], 'High', '#ef4444', 'Medium', '#f97316', 'Low', '#22c55e', '#6b7280'],
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'risk-zones-line-layer');
      safeRemoveLayer(map, 'risk-zones-fill-layer');
      safeRemoveSource(map, 'risk-zones-source');
    },
  },
  {
    id: 'network-links',
    name: 'Criminal Network',
    category: 'Analysis',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('network-links-layer')) return;
      const srcId = 'network-links-source';
      addGeoJSONSource(map, srcId, NETWORK_LINK_SAMPLE_DATA);
      safeAddLayer(map, {
        id: 'network-links-layer',
        type: 'line',
        source: srcId,
        paint: {
          'line-color': '#8b5cf6',
          'line-width': ['interpolate', ['linear'], ['get', 'weight'], 0, 1, 100, 4],
          'line-opacity': 0.6,
          'line-dasharray': [4, 2],
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'network-links-layer');
      safeRemoveSource(map, 'network-links-source');
    },
  },
  {
    id: 'timeline-replay',
    name: 'Timeline Replay',
    category: 'Replay',
    visibleByDefault: false,
    visible: false,
    render(map) {
      if (!map || map.getLayer('timeline-replay-layer')) return;
      const srcId = 'timeline-replay-source';
      addGeoJSONSource(map, srcId, {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { event: 'FIR Registered', date: '2026-01-13T22:27:00', severity: 'info' }, geometry: { type: 'Point', coordinates: [75.14, 15.36] } },
          { type: 'Feature', properties: { event: 'Evidence Collected', date: '2026-01-14T10:00:00', severity: 'info' }, geometry: { type: 'Point', coordinates: [75.16, 15.38] } },
          { type: 'Feature', properties: { event: 'Arrest Made', date: '2026-01-15T08:30:00', severity: 'high' }, geometry: { type: 'Point', coordinates: [75.12, 15.34] } },
          { type: 'Feature', properties: { event: 'Charge Sheet Filed', date: '2026-01-20T16:00:00', severity: 'info' }, geometry: { type: 'Point', coordinates: [75.18, 15.40] } },
          { type: 'Feature', properties: { event: 'Case Closed', date: '2026-01-21T12:00:00', severity: 'success' }, geometry: { type: 'Point', coordinates: [75.14, 15.36] } },
        ],
      });
      safeAddLayer(map, {
        id: 'timeline-replay-layer',
        type: 'circle',
        source: srcId,
        paint: {
          'circle-color': ['match', ['get', 'severity'],
            'critical', '#dc2626', 'high', '#f97316', 'info', '#3b82f6', 'success', '#22c55e',
            '#6b7280'],
          'circle-radius': 7,
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    },
    remove(map) {
      safeRemoveLayer(map, 'timeline-replay-layer');
      safeRemoveSource(map, 'timeline-replay-source');
    },
  },
];

export const LAYER_REGISTRY = layerDefs.map((l) => ({
  id: l.id,
  name: l.name,
  category: l.category,
  visibleByDefault: l.visibleByDefault,
}));

export const layerRegistry: Record<string, LayerDefinition> = {};
for (const def of layerDefs) {
  layerRegistry[def.id] = def;
}

export function getLayersByCategory(category: string): LayerDefinition[] {
  return layerDefs.filter((l) => l.category === category);
}
