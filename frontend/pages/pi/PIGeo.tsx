import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DynamicMapView } from '@/components/geo/DynamicMapView';
import type { DynamicMapHandle } from '@/components/geo/DynamicMapView';
import { HotspotPanel } from '@/components/geo/HotspotPanel';
import { GeoDashboard } from '@/components/geo/GeoDashboard';
import { OperationalIntelCard } from '@/components/geo/OperationalIntelCard';
import { AnalysisModal } from '@/components/geo/AnalysisModal';
import { NotifyOfficerModal } from '@/components/geo/NotifyOfficerModal';
import { ReportGenerator } from '@/components/geo/ReportGenerator';
import { MapToolbar } from '@/components/geo/MapToolbar';
import { Legend } from '@/components/geo/Legend';
import { LayerPanel } from '@/components/geo/LayerPanel';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { useAuthStore } from '@/store/authStore';
import {
  ZoomIn, ZoomOut, PanelRightClose, PanelRightOpen,
  Download, FileText, Bell,
} from 'lucide-react';
import type { Hotspot, GeoCoordinates } from '@/types/geo';

export function PIGeo() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const jurisdiction = useJurisdiction();
  const mapRef = useRef<DynamicMapHandle>(null);

  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [hotspotPanelOpen, setHotspotPanelOpen] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [analysisCoords, setAnalysisCoords] = useState<GeoCoordinates | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [notifyHotspot, setNotifyHotspot] = useState<Hotspot | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportCoords, setReportCoords] = useState<GeoCoordinates | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const handleHotspotSelect = useCallback((hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    if (mapRef.current) {
      mapRef.current.flyTo({ lat: hotspot.lat, lng: hotspot.lng }, 15);
    }
  }, []);

  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: visible }));
  }, []);

  const handleLocationSelect = useCallback((coords: GeoCoordinates) => {
    setSelectedHotspot(null);
    setAnalysisCoords(coords);
  }, []);

  const handleNotifyOfficer = useCallback((h: Hotspot) => {
    setNotifyHotspot(h);
    setShowNotify(true);
  }, []);

  const handleGenerateReport = useCallback((h: Hotspot) => {
    setReportCoords({ lat: h.lat, lng: h.lng });
    setShowReport(true);
  }, []);

  const activeDistrict = user?.district_id || jurisdiction.district_id || undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-bg-deep">
      {/* Map Toolbar */}
      <MapToolbar
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onFullscreen={() => {
          if (mapRef.current) {
            const m = mapRef.current.getMap() as any;
            if (m?.getContainer()?.requestFullscreen) {
              m.getContainer().requestFullscreen();
            }
          }
        }}
        onLocate={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              mapRef.current?.flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 16);
            });
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Map Area */}
        <div className="flex-1 relative">
          <DynamicMapView
            ref={mapRef}
            districtId={activeDistrict}
            visibleLayers={visibleLayers}
            onLayerToggle={handleLayerToggle}
            onHotspotClick={handleHotspotSelect}
            onLocationSelect={handleLocationSelect}
            onDoubleClick={(coords) => {
              setAnalysisCoords(coords);
              setShowAnalysis(true);
            }}
            className="w-full h-full"
          />

          {/* Map overlays */}
          {showLayerPanel && (
            <div className="absolute top-3 left-3 z-10 max-h-[calc(100%-24px)] overflow-y-auto">
              <div className="rounded-xl border border-border-primary bg-bg-card shadow-xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary">
                  <span className="text-xs font-semibold text-text-primary">Layers</span>
                  <button
                    onClick={() => setShowLayerPanel(false)}
                    className="p-0.5 rounded hover:bg-hover-bg text-text-tertiary"
                  >
                    ×
                  </button>
                </div>
                <LayerPanel
                  visibleLayers={visibleLayers}
                  onLayerToggle={handleLayerToggle}
                />
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-3 z-10">
            <Legend visibleLayers={visibleLayers} />
          </div>

          {/* Floating zoom controls — redundant with MapToolbar zoom buttons above; kept for convenience in stacked-panel layouts */}
          <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-2">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="w-9 h-9 rounded-lg bg-bg-card border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors shadow-md"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="w-9 h-9 rounded-lg bg-bg-card border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors shadow-md"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Info Panels */}
        {hotspotPanelOpen && (
          <div className="w-[380px] flex flex-col border-l border-border-primary bg-bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-secondary">
              <h2 className="text-sm font-semibold text-text-primary">Intelligence Center</h2>
              <button
                onClick={() => setHotspotPanelOpen(false)}
                className="p-1.5 rounded-md hover:bg-hover-bg text-text-tertiary hover:text-text-primary transition-colors"
                title="Close panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Dashboard Stats */}
              <GeoDashboard districtId={activeDistrict} />

              {/* Selected hotspot details */}
              {selectedHotspot && (
                <OperationalIntelCard
                  hotspot={selectedHotspot}
                  onClose={() => setSelectedHotspot(null)}
                  onGeneratePdf={handleGenerateReport}
                  onNotifyOfficer={handleNotifyOfficer}
                  onOpenCopilot={() => navigate(`/pi/copilot?query=Analyze hotspot at ${selectedHotspot.lat},${selectedHotspot.lng}`)}
                  onOpenNetwork={() => navigate(`/pi/network?lat=${selectedHotspot.lat}&lng=${selectedHotspot.lng}`)}
                  onOpenTimeline={() => toast.info('This feature is under development and will be available soon.')}
                  onLaunchCommander={() => toast.info('This feature is under development and will be available soon.')}
                />
              )}

              {/* Hotspot List */}
              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
                  Hotspots
                </h3>
                <HotspotPanel
                  collapsed={false}
                  onToggle={() => {}}
                  onHotspotSelect={handleHotspotSelect}
                  onNavigate={() => {}}
                  onDetail={(h) => handleHotspotSelect(h)}
                />
              </div>
            </div>

            {/* Bottom actions */}
            <div className="border-t border-border-secondary p-3 flex gap-2">
              <button
                onClick={() => setShowReport(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-bg-card border border-border-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Report
              </button>
              <button
                onClick={() => {
                  if (selectedHotspot) {
                    handleNotifyOfficer(selectedHotspot);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-bg-card border border-border-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Notify
              </button>
              <button
                onClick={() => {
                  if (selectedHotspot) {
                    handleGenerateReport(selectedHotspot);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-bg-card border border-border-primary text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>
        )}

        {!hotspotPanelOpen && (
          <button
            onClick={() => setHotspotPanelOpen(true)}
            className="absolute right-3 top-3 z-10 w-9 h-9 rounded-lg bg-bg-card border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors shadow-md"
            title="Open intelligence panel"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modals */}
      {showAnalysis && analysisCoords && (
        <AnalysisModal
          coords={analysisCoords}
          onClose={() => { setShowAnalysis(false); setAnalysisCoords(null); }}
        />
      )}

      {showNotify && notifyHotspot && (
        <NotifyOfficerModal
          hotspot={notifyHotspot}
          onClose={() => { setShowNotify(false); setNotifyHotspot(null); }}
        />
      )}

      <ReportGenerator
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        clickCoords={reportCoords}
      />
    </div>
  );
}
