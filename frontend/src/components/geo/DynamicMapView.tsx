import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { isMapLibreSupported } from './mapEngine';
import { MapView } from '@/components/geo/MapView';
import type { MapViewHandle } from '@/components/geo/MapView';
import { LeafletMapView } from '@/components/geo/LeafletMapView';
import type { LeafletMapHandle } from '@/components/geo/LeafletMapView';
import { useTheme } from '@/context/ThemeContext';
import type { GeoCoordinates, Hotspot } from '@/types/geo';
import type { FirCase } from '@/types';

export interface DynamicMapHandle {
  flyTo: (coords: GeoCoordinates, zoom?: number) => void;
  getMap: () => unknown;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface DynamicMapProps {
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  onHotspotClick?: (hotspot: Hotspot) => void;
  onLocationSelect?: (coords: GeoCoordinates) => void;
  onFirClick?: (fir: FirCase) => void;
  onDoubleClick?: (coords: GeoCoordinates) => void;
  onContextMenu?: (coords: GeoCoordinates) => void;
  districtId?: string;
  className?: string;
  visibleLayers?: Record<string, boolean>;
}

export const DynamicMapView = forwardRef<DynamicMapHandle, DynamicMapProps>(
  function DynamicMapView(props, ref) {
    const mapLibreRef = useRef<MapViewHandle>(null);
    const leafletRef = useRef<LeafletMapHandle>(null);
    const [engine, setEngine] = useState<'maplibre' | 'leaflet' | null>(null);
    const { theme } = useTheme();

    useEffect(() => {
      setEngine(isMapLibreSupported() ? 'maplibre' : 'leaflet');
    }, []);

    useImperativeHandle(ref, () => ({
      flyTo: (coords: GeoCoordinates, zoom?: number) => {
        mapLibreRef.current?.flyTo(coords, zoom);
        leafletRef.current?.flyTo(coords, zoom);
      },
      getMap: () => mapLibreRef.current?.getMap() ?? leafletRef.current?.getMap() ?? null,
      fitBounds: (bounds: [[number, number], [number, number]]) => {
        mapLibreRef.current?.fitBounds(bounds);
        leafletRef.current?.fitBounds(bounds);
      },
      zoomIn: () => {
        if (engine === 'leaflet') {
          leafletRef.current?.getMap()?.zoomIn(1);
        } else {
          const mlMap = mapLibreRef.current?.getMap();
          if (mlMap && 'zoomIn' in mlMap && typeof (mlMap as any).zoomIn === 'function') {
            (mlMap as any).zoomIn();
          }
        }
      },
      zoomOut: () => {
        if (engine === 'leaflet') {
          leafletRef.current?.getMap()?.zoomOut(1);
        } else {
          const mlMap = mapLibreRef.current?.getMap();
          if (mlMap && 'zoomOut' in mlMap && typeof (mlMap as any).zoomOut === 'function') {
            (mlMap as any).zoomOut();
          }
        }
      },
    }));

    if (!engine) {
      return (
        <div className={`flex items-center justify-center bg-bg-tertiary w-full h-full ${props.className}`}>
          <p className="text-sm text-text-tertiary">Detecting map engine...</p>
        </div>
      );
    }

    if (engine === 'leaflet') {
      return (
        <LeafletMapView
          ref={leafletRef}
          className={props.className}
          districtId={props.districtId}
          theme={theme}
          onLocationSelect={props.onLocationSelect}
          onDoubleClick={props.onDoubleClick}
          onContextMenu={props.onContextMenu}
          onHotspotClick={props.onHotspotClick}
        />
      );
    }

    return (
      <MapView
        ref={mapLibreRef}
        districtId={props.districtId}
        theme={theme}
        visibleLayers={props.visibleLayers}
        onLayerToggle={props.onLayerToggle}
        onHotspotClick={props.onHotspotClick}
        onLocationSelect={props.onLocationSelect}
        onFirClick={props.onFirClick}
        onDoubleClick={props.onDoubleClick}
        onContextMenu={props.onContextMenu}
        className={props.className}
      />
    );
  }
);
