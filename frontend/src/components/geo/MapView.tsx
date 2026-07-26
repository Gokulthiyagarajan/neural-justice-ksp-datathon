import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Map, MapMouseEvent } from 'maplibre-gl';
import { createMap, getMapStyleUrl, type MapTheme } from './mapConfig';
import { layerRegistry } from './layerRegistry';
// LayerManager imported in parent component
import { FirPopupManager } from '@/components/geo/FirPopupManager';
import type { FirProperties } from '@/components/geo/FirPopupManager';
import { getMapConfig } from '@/api/geo';
import { isDemoMode } from '@/services/demoData';
import { KARNATAKA_CENTER } from '@/components/geo/mapConfig';
import type { FirCase } from '@/types';
import type { Hotspot, StationInfo, GeoCoordinates } from '@/types/geo';

export interface MapViewHandle {
  flyTo: (coords: GeoCoordinates, zoom?: number) => void;
  getMap(): Map | null;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

interface MapViewProps {
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  onHoveredFirChange?: (fir: FirCase | null) => void;
  onHotspotClick?: (hotspot: Hotspot) => void;
  onLocationSelect?: (coords: GeoCoordinates) => void;
  onFirClick?: (fir: FirCase) => void;
  onDoubleClick?: (coords: GeoCoordinates) => void;
  onContextMenu?: (coords: GeoCoordinates) => void;
  districtId?: string;
  className?: string;
  visibleLayers?: Record<string, boolean>;
  theme?: MapTheme;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    onLayerToggle: _onLayerToggle,
    onHoveredFirChange: _onHoveredFirChange,
    onHotspotClick: _onHotspotClick,
    onLocationSelect,
    onFirClick,
    onDoubleClick,
    onContextMenu,
    districtId,
    className = '',
    visibleLayers = {},
    theme = 'dark',
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredFir, _setHoveredFir] = useState<FirCase | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextCoords, setContextCoords] = useState<GeoCoordinates | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const lastClickRef = useRef(0);
  const visibleLayersRef = useRef(visibleLayers);
  visibleLayersRef.current = visibleLayers;
  const firPopupRef = useRef<FirPopupManager | null>(null);
  const onFirClickRef = useRef(onFirClick);
  onFirClickRef.current = onFirClick;

  useImperativeHandle(ref, () => ({
    flyTo: (coords: GeoCoordinates, zoom = 14) => {
      mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom });
    },
    getMap: () => mapRef.current,
    fitBounds: (bounds: [[number, number], [number, number]]) => {
      mapRef.current?.fitBounds(bounds, { padding: 50 });
    },
  }));

  // Initialize map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = createMap(containerRef.current, { theme });
    mapRef.current = map;

    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

    const onLoad = () => {
      setMapReady(true);
      setMapLoading(false);
      if (loadingTimeout) clearTimeout(loadingTimeout);

      // Initialize FIR popup manager for interactive popups
      if (!firPopupRef.current) {
        const mgr = new FirPopupManager(map, {
          onFirClick: (firProps: FirProperties) => {
            // Map FirProperties to FirCase for backward compatibility
            const fir: Partial<FirCase> = {
              crime_no: firProps.crime_no,
              crime_head_name: firProps.crime_head_name,
              status: firProps.status,
              occurrence_date: firProps.occurrence_date,
              lat: firProps.lat,
              lng: firProps.lng,
            };
            onFirClickRef.current?.(fir as FirCase);
          },
          hoverPopup: true,
        });
        mgr.attach('fir-points-layer');
        firPopupRef.current = mgr;
      }
    };

    const onError = () => {
      setMapLoading(false);
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };

    map.on('load', onLoad);
    map.on('error', onError);

    loadingTimeout = setTimeout(() => {
      setMapLoading(false);
    }, 15000);

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      // Destroy FIR popup manager to prevent memory leaks
      if (firPopupRef.current) {
        firPopupRef.current.destroy();
        firPopupRef.current = null;
      }
      map.off('load', onLoad);
      map.off('error', onError);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  // Switch map style when theme changes (only re-runs when theme actually changes)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const newStyle = getMapStyleUrl(theme);

    map.setStyle(newStyle);

    // Re-add layers after style loads — use ref to avoid stale closure
    const onStyleLoad = () => {
      const layers = visibleLayersRef.current;
      Object.values(layerRegistry).forEach((layer) => {
        const isVisible = layers[layer.id] ?? layer.visible;
        if (isVisible) {
          layer.render(map);
        }
      });
    };
    map.once('style.load', onStyleLoad);

    return () => {
      map.off('style.load', onStyleLoad);
    };
  }, [theme]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleSingleClick = (e: MapMouseEvent) => {
      const now = Date.now();
      if (now - lastClickRef.current < 300) return;
      lastClickRef.current = now;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['fir-points-layer'],
      });

      if (features.length && features[0].properties) {
        const p = features[0].properties;
        const fir: Partial<FirCase> = {
          crime_no: p.crime_no,
          crime_head_name: p.crime_head_name,
          status: p.status,
          occurrence_date: p.occurrence_date,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        };
        onFirClick?.(fir as FirCase);
        return;
      }

      const stationFeatures = map.queryRenderedFeatures(e.point, {
        layers: ['station-points-layer'],
      });
      if (stationFeatures.length && stationFeatures[0].properties) {
        const s = stationFeatures[0].properties;
        const station: StationInfo = {
          station_id: s.station_id,
          station_name: s.station_name,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          officer_count: s.officer_count,
        };
        onLocationSelect?.({ lat: station.lat, lng: station.lng });
        return;
      }

      onLocationSelect?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    const handleDblClick = (e: MapMouseEvent) => {
      lastClickRef.current = Date.now();
      e.originalEvent.preventDefault();
      onDoubleClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    const handleContext = (e: MapMouseEvent) => {
      e.originalEvent.preventDefault();
      setContextCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setContextMenuPos({ x: e.point.x, y: e.point.y });
    };

    map.on('click', handleSingleClick);
    map.on('dblclick', handleDblClick);
    map.on('contextmenu', handleContext);

    return () => {
      map.off('click', handleSingleClick);
      map.off('dblclick', handleDblClick);
      map.off('contextmenu', handleContext);
    };
  }, [onFirClick, onLocationSelect, onDoubleClick, onContextMenu]);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        // In demo mode, skip the API call and use default map center/zoom
        if (isDemoMode()) {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: KARNATAKA_CENTER,
              zoom: 7,
            });
          }
          setDataLoading(false);
          return;
        }
        const [configRes] = await Promise.all([
          getMapConfig(districtId),
        ]);

        if (configRes.center && mapRef.current) {
          mapRef.current.flyTo({
            center: [configRes.center.lng, configRes.center.lat],
            zoom: configRes.zoom,
          });
        }
      } catch (err) {
        setDataError('Unable to load map data. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [districtId]);

  // ---------- Layer Registry Integration ----------
  useEffect(() => {
    if (!mapReady) return;
    Object.values(layerRegistry).forEach((layer) => {
      const isVisible = visibleLayers[layer.id] ?? layer.visible;
      if (isVisible) {
        layer.render(mapRef.current);
      } else {
        layer.remove(mapRef.current);
      }
    });
  }, [mapReady, visibleLayers]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resize = () => mapRef.current?.resize();
    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(containerRef.current);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleContextAction = useCallback(
    (action: 'report' | 'analyze') => {
      if (!contextCoords) return;
      if (action === 'report') onContextMenu?.(contextCoords);
      if (action === 'analyze') onDoubleClick?.(contextCoords);
      setContextMenuPos(null);
      setContextCoords(null);
    },
    [contextCoords, onContextMenu, onDoubleClick]
  );

  return (
    <div className={`w-full h-full ${className}`} style={{ position: 'relative' }}>
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Render layers via the dynamic LayerManager */}
      {(mapLoading || dataLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary/60 z-20 p-4">
          <div className="flex flex-col items-center gap-3 max-w-xs text-center">
            <div className="w-8 h-8 border-4 border-[rgba(0,212,255,0.15)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">
              {mapLoading ? 'Initializing map…' : 'Loading data…'}
            </span>
          </div>
        </div>
      )}

      {dataError && (
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-bg-card border border-border-primary rounded-lg shadow-lg px-3 sm:px-4 py-2 sm:py-3 z-30 max-w-[calc(100vw-2rem)] sm:max-w-xs">
          <p className="text-xs sm:text-sm text-text-tertiary mb-1">Map data error</p>
          <p className="text-xs sm:text-sm text-alert-red break-words">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-accent-cyan hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* LayerManager intentionally omitted — MapView handles all layer rendering through layerRegistry effects */}

      {hoveredFir && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 glass backdrop-blur rounded-lg shadow-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs border border-border-primary pointer-events-none z-10 max-w-[200px] sm:max-w-xs">
          <p className="font-medium text-text-primary truncate">{hoveredFir.crime_no}</p>
          <p className="text-text-tertiary truncate">{hoveredFir.crime_head_name}</p>
          <p className="text-text-tertiary truncate text-[10px] sm:text-xs">{hoveredFir.occurrence_date}</p>
        </div>
      )}

      {contextMenuPos && contextCoords && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenuPos(null)} />
          <div
            className="absolute z-50 bg-bg-card rounded-lg shadow-xl border border-border-primary py-1 w-36 sm:w-48"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={() => handleContextAction('report')}
              className="w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-text-primary hover:bg-hover-bg"
            >
              Generate Report
            </button>
            <button
              onClick={() => handleContextAction('analyze')}
              className="w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-text-primary hover:bg-hover-bg"
            >
              AI Analysis
            </button>
          </div>
        </>
      )}
    </div>
  );
});
