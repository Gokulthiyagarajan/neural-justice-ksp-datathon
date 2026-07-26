import maplibregl from 'maplibre-gl';
import type { Map, AttributionControlOptions } from 'maplibre-gl';

export type MapTheme = 'dark' | 'light';

export const CRIME_TYPE_COLORS: Record<string, string> = {
  murder: '#ef4444',
  robbery: '#f97316',
  assault: '#eab308',
  theft: '#22c55e',
  burglary: '#06b6d4',
  fraud: '#8b5cf6',
  kidnapping: '#ec4899',
  'cyber-crime': '#14b8a6',
  'drug-related': '#a855f7',
  'domestic-violence': '#fb7185',
  'sexual-assault': '#dc2626',
  'human-trafficking': '#d946ef',
  'organized-crime': '#7c3aed',
  default: '#6b7280',
};

export function getCrimeColor(type: string): string {
  return CRIME_TYPE_COLORS[type.toLowerCase()] || CRIME_TYPE_COLORS.default;
}

/**
 * Returns the OpenFreeMap style URL for the given theme.
 * - dark  → Dark Matter (CartoDB) — https://tiles.openfreemap.org/styles/dark
 * - light → Liberty — https://tiles.openfreemap.org/styles/liberty
 */
export function getMapStyleUrl(theme: MapTheme = 'dark'): string {
  return theme === 'dark'
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
}

// Karnataka state bounding box (with padding)
// SW corner: ~74.0°E, 11.5°N  |  NE corner: ~78.5°E, 18.5°N
export const KARNATAKA_BOUNDS: [[number, number], [number, number]] = [
  [74.0, 11.5],  // [west, south]
  [78.5, 18.5],  // [east, north]
];

export const KARNATAKA_CENTER: [number, number] = [76.5, 15.0];

export function createMap(
  container: HTMLDivElement,
  options?: { theme?: MapTheme },
): Map {
  const style = getMapStyleUrl(options?.theme ?? 'dark');

  return new maplibregl.Map({
    container,
    style,
    center: KARNATAKA_CENTER,
    zoom: 7,
    minZoom: 5,
    maxZoom: 18,
    maxBounds: KARNATAKA_BOUNDS,
    attributionControl: {} as AttributionControlOptions,
  });
}
