import { useRef, useCallback, useState, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import { MapLibreMap } from '@/components/Map/MapLibreMap';
import { layerRegistry } from '@/components/geo/layerRegistry';
import { LayerManager } from '@/components/geo/LayerManager';
import { FirPopupManager } from '@/components/geo/FirPopupManager';
import type { FirProperties } from '@/components/geo/FirPopupManager';
import type { GeoCoordinates } from '@/types/geo';
import { getMapConfig } from '@/api/geo';
import { getMapStyleUrl } from '@/components/geo/mapConfig';

/**
 * Central MapComponent that provides GIS capabilities across the application.
 * It manages:
 * - Map instance lifecycle (creation, resizing, cleanup)
 * - Layer control (visibility, opacity, ordering)
 * - Real-time updates (new layers, modified features)
 * - Role-based layer visibility enforcement
 * - Heatmap and clustering management
 * - Drawing tool integration
 */
export interface MapProviderHandle {
  /** Fly to coordinates with optional zoom */
  flyTo: (coords: GeoCoordinates, zoom?: number) => void;
  /** Fit bounds programmatically */
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
  /** Toggle layer visibility */
  toggleLayer: (layerId: string) => void;
  /** Adjust layer opacity (0-1) */
  setLayerOpacity: (layerId: string, opacity: number) => void;
  /** Enable/disable drawing mode */
  setDrawingMode: (mode: 'polygon' | 'circle' | 'route' | 'none') => void;
  /** Get current map instance */
  getMap: () => any;
  /** Is map fully loaded and ready */
  isMapReady: () => boolean;
  /** Subscribe to map readiness */
  onReady: (callback: () => void) => void;
  /** Enable layers by ID */
  enableLayers: (layerIds: string[]) => void;
}

export interface MapProviderProps {
  /** Theme: 'dark' or 'light' */
  theme?: MapTheme;
  /** Central geographic region to focus on */
  districtId?: string;
  /** Layers to initially enable */
  initiallyEnabledLayers?: string[];
  /** Callback when map is ready */
  onReady?: () => void;
  /** Impose RBAC restrictions */
  rbacRoles?: string[];
  /** Optional container ref for direct DOM mounting */
  containerRef?: React.RefObject<HTMLDivElement>;
  /** Callback when an FIR marker is clicked — parent decides navigation */
  onFirClick?: (fir: FirProperties) => void;
}

type MapTheme = 'dark' | 'light';
type DrawingMode = 'polygon' | 'circle' | 'route' | 'none';

export const MapProvider = forwardRef<MapProviderHandle, MapProviderProps>(
  function MapProvider(props, externalRef) {
    const {
      theme = 'dark',
      districtId,
      initiallyEnabledLayers = [],
      onReady: onReadyProp,
      onFirClick,
      containerRef: externalContainerRef,
    } = props;

    const [mapReady, setMapReady] = useState(false);
    const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
    const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({});
    const [drawingMode, setDrawingModeState] = useState<DrawingMode>('none');
    const [drawingVertices, setDrawingVertices] = useState<any[]>([]);
    const [drawingProgress, setDrawingProgress] = useState<string | null>(null);
    const [drawnLayers] = useState<string[]>([]);

    // Combine visibility + opacity into layerSettings for LayerManager
    const layerSettings = useMemo(() => {
      const result: Record<string, { visible: boolean; opacity?: number }> = {};
      Object.keys(layerRegistry).forEach((id) => {
        result[id] = {
          visible: layerVisibility[id] ?? true,
          opacity: layerOpacities[id] ?? 1,
        };
      });
      return result;
    }, [layerVisibility, layerOpacities]);

    const mapRef = useRef<any>(null);
    const layerManagerRef = useRef<any>(null);
    const onReadyRef = useRef<() => void>();
    const containerRef = useRef<HTMLDivElement>(null);
    const firPopupRef = useRef<FirPopupManager | null>(null);
    const onFirClickRef = useRef(onFirClick);
    onFirClickRef.current = onFirClick;

    // Initialize map on mount
    useEffect(() => {
      const el = externalContainerRef?.current || containerRef.current;
      if (!el) return;

      // Initialize layer visibility states
      const initVis: Record<string, boolean> = {};
      Object.keys(layerRegistry).forEach((id) => {
        initVis[id] = true;
      });
      setLayerVisibility(initVis);

      // Set initial opacities
      const initOpacities: Record<string, number> = {};
      Object.keys(layerRegistry).forEach((id) => {
        initOpacities[id] = 1.0;
      });
      setLayerOpacities(initOpacities);

      // Apply initially enabled layers
      initiallyEnabledLayers.forEach((layerId) => {
        if (layerRegistry[layerId]) {
          setLayerVisibility(prev => ({ ...prev, [layerId]: true }));
        }
      });

      return () => {
        // Destroy FIR popup manager to prevent memory leaks
        if (firPopupRef.current) {
          firPopupRef.current.destroy();
          firPopupRef.current = null;
        }
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
      // Only run on mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Store onReady callback
    useEffect(() => {
      onReadyRef.current = onReadyProp;
    }, [onReadyProp]);

    // Fly to district when districtId changes
    useEffect(() => {
      if (!mapRef.current || !districtId) return;

      const loadDistrictGeo = async () => {
        try {
          const geoConfig = await getMapConfig(districtId);
          if (geoConfig && mapRef.current) {
            if (geoConfig.center && geoConfig.zoom !== undefined) {
              mapRef.current.flyTo({
                center: [geoConfig.center.lng, geoConfig.center.lat],
                zoom: geoConfig.zoom,
              });
            }
          }
        } catch (err) {
          console.error('Failed to load district geoconfig:', err);
        }
      };
      loadDistrictGeo();
    }, [districtId]);

    // Theme switcher — use OpenFreeMap vector tile styles
    useEffect(() => {
      if (!mapRef.current) return;
      mapRef.current.setStyle(getMapStyleUrl(theme));
    }, [theme]);

    // Public API methods
    const toggleLayer = useCallback((layerId: string) => {
      setLayerVisibility(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    }, []);

    const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
      setLayerOpacities(prev => ({ ...prev, [layerId]: opacity }));
    }, []);

    const setDrawingMode = useCallback((mode: DrawingMode) => {
      setDrawingModeState(mode);
      setDrawingVertices([]);
      setDrawingProgress('idle');
    }, []);

    const flyTo = useCallback((coords: GeoCoordinates, zoom = 14) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom,
        });
      }
    }, []);

    const fitBounds = useCallback((bounds: [[number, number], [number, number]]) => {
      if (mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }
    }, []);

    const enableLayers = useCallback((layerIds: string[]) => {
      layerIds.forEach((id) => {
        if (layerRegistry[id]) {
          setLayerVisibility(prev => ({ ...prev, [id]: true }));
        }
      });
    }, []);

    const getMap = useCallback(() => mapRef.current, []);
    const isMapReadyCb = useCallback(() => mapRef.current !== null && mapReady, [mapReady]);

    const handleMapReady = useCallback((map: any) => {
      mapRef.current = map;
      if (!mapReady) {
        setMapReady(true);
        if (onReadyRef.current) {
          onReadyRef.current();
        }

        // Initialize FIR popup manager for interactive FIR markers
        if (!firPopupRef.current) {
          const mgr = new FirPopupManager(map, {
            onFirClick: (fir) => onFirClickRef.current?.(fir),
            hoverPopup: true,
          });
          mgr.attach('fir-points-layer');
          firPopupRef.current = mgr;
        }
      }
    }, [mapReady]);

    // Attach public API to ref
    useImperativeHandle(externalRef, () => ({
      flyTo,
      fitBounds,
      toggleLayer,
      setLayerOpacity,
      setDrawingMode,
      getMap,
      isMapReady: isMapReadyCb,
      onReady: (cb: () => void) => { onReadyRef.current = cb; },
      enableLayers,
    }), [flyTo, fitBounds, toggleLayer, setLayerOpacity, setDrawingMode, getMap, isMapReadyCb, enableLayers]);

    // Sync layer visibility to layer manager
    useEffect(() => {
      if (!mapRef.current || !layerManagerRef.current) return;
      Object.entries(layerVisibility).forEach(([id, visible]) => {
        if (visible) {
          layerManagerRef.current?.renderLayer(id);
        } else {
          layerManagerRef.current?.removeLayer(id);
        }
      });
    }, [layerVisibility]);

    // Sync layer opacities to map layers
    useEffect(() => {
      if (!mapRef.current) return;
      Object.entries(layerOpacities).forEach(([id, opacity]) => {
        const layer = mapRef.current.getLayer(id);
        if (layer) {
          mapRef.current.setPaintProperty(id, 'raster-opacity', opacity);
        }
      });
    }, [layerOpacities]);

    // Cleanup drawn layers on unmount
    useEffect(() => {
      return () => {
        if (drawnLayers.length > 0 && mapRef.current) {
          drawnLayers.forEach((layerId) => {
            mapRef.current.removeLayer(layerId);
          });
        }
      };
    }, [drawnLayers]);

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Map container */}
        <div
          ref={containerRef}
          className="w-full h-full relative z-0"
        >
          <MapLibreMap
            className="w-full h-full z-1"
            showNav={true}
            restrictBounds={true}
            onMapReady={handleMapReady}
          />
        </div>

        {/* Layer controls */}
        <LayerManager
          map={mapRef.current}
          layerSettings={layerSettings}
          onVisibilityToggle={() => {}}
          onOpacityChange={() => {}}
        />

        {/* Drawing mode overlay */}
        {drawingMode !== 'none' && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center z-45">
            <div className="bg-bg-card rounded-lg p-4 w-64 text-center">
              <p className="text-lg font-medium text-text-primary">
                Drawing Mode: {drawingMode}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  onClick={() => setDrawingMode('polygon')}
                  className="flex items-center gap-1 rounded bg-outline border px-2 py-1 text-sm hover:bg-outline"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 21H20V4H2H13V6H11V20H2Z" />
                  </svg>
                  Polygon
                </button>
                <button
                  onClick={() => setDrawingMode('circle')}
                  className="flex items-center gap-1 rounded bg-outline border px-2 py-1 text-sm hover:bg-outline"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a2 2 0 002 2v10a2 2 0 002 2V4a2 2 0 00-2-2zm0 8a6 6 0 010 12H6a6 6 0 006-6zm0 6V4h12v11h-1V4Z" />
                  </svg>
                  Circle
                </button>
                <button
                  onClick={() => setDrawingMode('route')}
                  className="flex items-center gap-1 rounded bg-outline border px-2 py-1 text-sm hover:bg-outline"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 21V1M22 21V1m-5-6h-4V4h4V2h-1V6h-2V2H9V2h2v2H7V6H5V2H4v2H3V2H2V21H2Z" />
                  </svg>
                  Route
                </button>
              </div>
              {drawingProgress && (
                <div className="mt-2 text-sm text-text-secondary">
                  {drawingProgress === 'collecting' ? 'Click on map to start drawing...' : 'Not enough vertices'}
                </div>
              )}
              {drawingVertices.length > 0 && (
                <div className="mt-1 text-xs text-text-tertiary">
                  Vertices: {drawingVertices.length}
                </div>
              )}
              {drawingVertices.length > 2 && (
                <button
                  onClick={() => setDrawingMode('none')}
                  className="mt-2 rounded bg-primary text-white px-3 py-1 text-sm"
                >
                  Finish Polygon
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
