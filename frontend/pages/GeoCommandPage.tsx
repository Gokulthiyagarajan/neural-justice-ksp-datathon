import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicMapView } from '@/components/geo/DynamicMapView';
import type { DynamicMapHandle } from '@/components/geo/DynamicMapView';
import { GeoDashboard } from '@/components/geo/GeoDashboard';
import { LayerPanel } from '@/components/geo/LayerPanel';
import type { GeoDashboardTab } from '@/components/geo/GeoDashboard';
import { HotspotPanel } from '@/components/geo/HotspotPanel';
import { TimelineReplay } from '@/components/geo/TimelineReplay';
import { RouteNavigator } from '@/components/geo/RouteNavigator';
import { MapToolbar } from '@/components/geo/MapToolbar';
import { HotspotDetailModal } from '@/components/geo/HotspotDetailModal';
import { AnalysisModal } from '@/components/geo/AnalysisModal';
import { ReportGenerator } from '@/components/geo/ReportGenerator';
import { OperationalIntelCard } from '@/components/geo/OperationalIntelCard';
import { NotifyOfficerModal } from '@/components/geo/NotifyOfficerModal';
import { InvestigationCopilot } from '@/components/geo/InvestigationCopilot';
import { CriminalNetworkGraph } from '@/components/geo/CriminalNetworkGraph';
import { IncidentCommander } from '@/components/IncidentCommander/IncidentCommander';
import type { Hotspot, GeoCoordinates, NavigationRoute } from '@/types/geo';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { useTranslation } from 'react-i18next';
import { PanelRightClose, PanelRightOpen, Layers } from 'lucide-react';

export function GeoCommandPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const jurisdiction = useJurisdiction();
  const mapRef = useRef<DynamicMapHandle>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('bengaluru-urban');
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [hotspotPanelCollapsed, setHotspotPanelCollapsed] = useState(false);
  const [detailHotspot, setDetailHotspot] = useState<Hotspot | null>(null);
  const [analysisCoords, setAnalysisCoords] = useState<GeoCoordinates | null>(null);
  const [reportCoords, setReportCoords] = useState<GeoCoordinates | null>(null);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [navigateHotspot, setNavigateHotspot] = useState<Hotspot | null>(null);
  const [selectedOpsHotspot, setSelectedOpsHotspot] = useState<Hotspot | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showNetworkGraph, setShowNetworkGraph] = useState(false);
  const [showIncidentCommander, setShowIncidentCommander] = useState(false);
  const [incidentCommanderAlert, setIncidentCommanderAlert] = useState<Record<string, any> | null>(null);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<GeoDashboardTab>('dashboard');

  const triggerResize = useCallback(() => {
    requestAnimationFrame(() => {
      const m = mapRef.current?.getMap();
      if (m && typeof (m as any).resize === 'function') {
        (m as any).resize();
      }
    });
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelOpen((p) => !p);
    setTimeout(triggerResize, 100);
  }, [triggerResize]);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen((p) => !p);
    setTimeout(triggerResize, 100);
  }, [triggerResize]);

  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: visible }));
  }, []);

  const handleHotspotSelect = useCallback((hotspot: Hotspot) => {
    if (mapRef.current) {
      mapRef.current.flyTo({ lat: hotspot.lat, lng: hotspot.lng }, 15);
    }
    setSelectedOpsHotspot(hotspot);
    setRightPanelOpen(true);
    setTimeout(triggerResize, 100);
  }, [triggerResize]);

  const handleOpsIntelClose = useCallback(() => {
    setSelectedOpsHotspot(null);
    setTimeout(triggerResize, 100);
  }, [triggerResize]);

  const handleLocationSelect = useCallback((coords: GeoCoordinates) => {
    if (mapRef.current) {
      mapRef.current.flyTo(coords, 14);
    }
  }, []);

  const handleDoubleClick = useCallback((coords: GeoCoordinates) => {
    setAnalysisCoords(coords);
  }, []);

  const handleContextMenu = useCallback((coords: GeoCoordinates) => {
    setReportCoords(coords);
    setShowReportGenerator(true);
  }, []);

  const handleDistrictChange = useCallback((districtId: string) => {
    setSelectedDistrict(districtId);
  }, []);

  const handleNavigate = useCallback((hotspot: Hotspot) => {
    setNavigateHotspot(hotspot);
  }, []);

  const handleRouteFound = useCallback((route: NavigationRoute) => {
    if (mapRef.current && route.waypoints.length >= 2) {
      const coords: [number, number][] = route.waypoints.map((w) => [w.lng, w.lat]);
      mapRef.current.fitBounds([
        [Math.min(...coords.map((c) => c[0])), Math.min(...coords.map((c) => c[1]))],
        [Math.max(...coords.map((c) => c[0])), Math.max(...coords.map((c) => c[1]))],
      ]);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0 && mapRef.current) {
        mapRef.current.flyTo({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }, 15);
      }
    } catch {
      // silently fail
    }
  }, []);

  const handleTimelineSlice = useCallback((sliceIndex: number) => {
    void sliceIndex;
  }, []);

  const handleGeneratePdf = useCallback((hotspot: Hotspot) => {
    setReportCoords({ lat: hotspot.lat, lng: hotspot.lng });
    setShowReportGenerator(true);
  }, []);

  const handleNotifyOfficer = useCallback((_hotspot: Hotspot) => {
    setShowNotifyModal(true);
  }, []);

  const handleOpenCopilot = useCallback((_hotspot: Hotspot) => {
    setShowCopilot(true);
  }, []);

  const handleOpenNetwork = useCallback((_hotspot: Hotspot) => {
    setShowNetworkGraph(true);
  }, []);

  const handleOpenTimeline = useCallback((_hotspot: Hotspot) => {
    // scroll timeline into view by clearing and re-setting
  }, []);

  const handleLaunchIncidentCommander = useCallback(() => {
    if (selectedOpsHotspot) {
      setIncidentCommanderAlert({
        alert_type: selectedOpsHotspot.alert_type || 'emerging_hotspot',
        severity: selectedOpsHotspot.severity || 'Critical',
        title: selectedOpsHotspot.title || selectedOpsHotspot.label || 'Hotspot Incident',
        crime_category: selectedOpsHotspot.crime_category || 'multiple',
        district_id: selectedDistrict,
        lat: selectedOpsHotspot.lat,
        lng: selectedOpsHotspot.lng,
        confidence: selectedOpsHotspot.confidence || 75,
        supporting_fir_count: selectedOpsHotspot.fir_count || 0,
        related_fir_numbers: selectedOpsHotspot.related_firs || [],
        related_criminals: selectedOpsHotspot.related_criminals || [],
        ai_explanation: selectedOpsHotspot.ai_explanation || { summary: 'Hotspot detected with elevated crime density.', supporting_evidence: [] },
        estimated_response_time_min: selectedOpsHotspot.estimated_response_time_min,
        nearest_station: selectedOpsHotspot.nearest_station,
      });
      setShowIncidentCommander(true);
    }
  }, [selectedOpsHotspot, selectedDistrict]);

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-8rem)] overflow-hidden bg-bg-dark">
      {/* Map layer - z-0 to ensure it's behind all UI */}
      <DynamicMapView
        ref={mapRef}
        districtId={selectedDistrict}
        visibleLayers={visibleLayers}
        onLayerToggle={handleLayerToggle}
        onHotspotClick={handleHotspotSelect}
        onLocationSelect={handleLocationSelect}
        onFirClick={(fir) => navigate(`/firs/${fir.crime_no}`)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className="absolute inset-0 z-0"
      />

      {/* Top bar - z-50 to be above all panels */}
      <div className="absolute inset-x-0 top-0 z-50 pointer-events-none">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 pointer-events-auto">
          {/* Mobile menu button - shown on small screens */}
          <button
            onClick={toggleLeftPanel}
            className="lg:hidden p-2 rounded glass hover:bg-hover-bg transition-colors"
            aria-label="Toggle layer panel"
          >
            <Layers className="w-5 h-5 text-text-primary" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop layer toggle - hidden on mobile */}
            <button
              onClick={toggleLeftPanel}
              className="hidden lg:block p-1.5 rounded glass hover:bg-hover-bg transition-colors"
              aria-label="Toggle layer panel"
            >
              <Layers className="w-4 h-4 text-text-primary" />
            </button>
            <div className="glass rounded-lg shadow px-3 py-1.5 hidden sm:flex items-center gap-2" style={{ backdropFilter: 'var(--aether-glass-blur)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-verified-green animate-pulse" />
              <h1 className="text-sm font-bold text-text-primary font-display">{t('geo.geoIntelligence')}</h1>
            </div>
            <JurisdictionBanner scope={jurisdiction} />
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="text-xs glass rounded-lg px-2 sm:px-3 py-1.5 shadow font-medium text-text-primary max-w-[120px] sm:max-w-[140px] md:max-w-none"
            >
              <option value="bengaluru-urban">{t('districts.bengaluruUrban')}</option>
              <option value="bengaluru-rural">{t('districts.bengaluruRural')}</option>
              <option value="mysuru">{t('districts.mysuru')}</option>
              <option value="hubli">{t('districts.hubli')}</option>
              <option value="mangaluru">{t('districts.mangaluru')}</option>
              <option value="belagavi">{t('districts.belagavi')}</option>
              <option value="kalaburagi">{t('districts.kalaburagi')}</option>
            </select>
            <button
              onClick={toggleRightPanel}
              className="p-1.5 rounded glass hover:bg-hover-bg transition-colors"
              aria-label="Toggle right panel"
            >
              {rightPanelOpen ? (
                <PanelRightClose className="w-4 h-4 text-text-primary" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-text-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Left sidebar: LayerPanel - z-40, responsive positioning */}
      <div
        className={`absolute left-2 sm:left-3 top-16 sm:top-20 z-40 pointer-events-none transition-all duration-200 ${
          leftPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-0 lg:pointer-events-none'
        }`}
      >
        <div className="pointer-events-auto">
          <LayerPanel visibleLayers={visibleLayers} onLayerToggle={handleLayerToggle} />
        </div>
      </div>

      {/* Mobile layer drawer - full screen overlay on small screens */}
      {leftPanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 pointer-events-auto" onClick={toggleLeftPanel}>
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-full glass overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Layers</h2>
                <button onClick={toggleLeftPanel} className="p-2 rounded hover:bg-hover-bg">
                  <PanelRightClose className="w-5 h-5 text-text-primary" />
                </button>
              </div>
              <LayerPanel visibleLayers={visibleLayers} onLayerToggle={handleLayerToggle} />
            </div>
          </div>
        </div>
      )}

      {/* Right panel - z-40, responsive positioning */}
      <div
        className={`absolute right-2 sm:right-3 top-16 sm:top-20 z-40 pointer-events-none transition-all duration-200 max-w-[calc(100vw-2rem)] ${
          rightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="pointer-events-auto flex flex-col gap-3 items-end max-h-[calc(100vh-6rem)] overflow-y-auto">
          {/* Tabs for switching between dashboard/hotspots - hidden on mobile */}
          {!selectedOpsHotspot && (
            <div className="hidden md:flex gap-1 glass rounded-lg px-2 py-1.5 shadow">
              {(['dashboard', 'hotspots', 'legend'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setRightPanelTab(tab); setTimeout(triggerResize, 100); }}
                  className={`text-[11px] px-2 sm:px-3 py-1 rounded-md transition-colors capitalize ${
                    rightPanelTab === tab
                      ? 'bg-[rgba(0,212,255,0.15)] text-accent-cyan font-medium'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {rightPanelOpen && (
            <>
              {selectedOpsHotspot ? (
                <OperationalIntelCard
                  hotspot={selectedOpsHotspot}
                  onClose={handleOpsIntelClose}
                  onGeneratePdf={handleGeneratePdf}
                  onNotifyOfficer={handleNotifyOfficer}
                  onOpenCopilot={handleOpenCopilot}
                  onOpenNetwork={handleOpenNetwork}
                  onOpenTimeline={handleOpenTimeline}
                  onLaunchCommander={handleLaunchIncidentCommander}
                />
              ) : rightPanelTab === 'hotspots' ? (
                <div className="w-72 max-w-[calc(100vw-2rem)]">
                  <HotspotPanel
                    collapsed={hotspotPanelCollapsed}
                    onToggle={() => setHotspotPanelCollapsed(!hotspotPanelCollapsed)}
                    onHotspotSelect={handleHotspotSelect}
                    onNavigate={handleNavigate}
                    onDetail={setDetailHotspot}
                  />
                </div>
              ) : (
                <div className="w-72 max-w-[calc(100vw-2rem)]">
                  <GeoDashboard
                    districtId={selectedDistrict}
                    onDistrictChange={handleDistrictChange}
                    activeTab={rightPanelTab}
                    onTabChange={setRightPanelTab}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile right panel drawer - full screen overlay on small screens */}
      {rightPanelOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 pointer-events-auto" onClick={toggleRightPanel}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full glass overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary capitalize">
                  {selectedOpsHotspot ? 'Details' : rightPanelTab}
                </h2>
                <button onClick={toggleRightPanel} className="p-2 rounded hover:bg-hover-bg">
                  <PanelRightClose className="w-5 h-5 text-text-primary" />
                </button>
              </div>
              {!selectedOpsHotspot && (
                <div className="flex gap-1 mb-4 glass rounded-lg px-2 py-1.5 shadow">
                  {(['dashboard', 'legend'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setRightPanelTab(tab); setTimeout(triggerResize, 100); }}
                      className={`flex-1 text-xs px-3 py-2 rounded-md transition-colors capitalize ${
                        rightPanelTab === tab
                          ? 'bg-[rgba(0,212,255,0.15)] text-accent-cyan font-medium'
                          : 'text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
              {selectedOpsHotspot ? (
                <OperationalIntelCard
                  hotspot={selectedOpsHotspot}
                  onClose={handleOpsIntelClose}
                  onGeneratePdf={handleGeneratePdf}
                  onNotifyOfficer={handleNotifyOfficer}
                  onOpenCopilot={handleOpenCopilot}
                  onOpenNetwork={handleOpenNetwork}
                  onOpenTimeline={handleOpenTimeline}
                  onLaunchCommander={handleLaunchIncidentCommander}
                />
              ) : rightPanelTab === 'hotspots' ? (
                <HotspotPanel
                  collapsed={hotspotPanelCollapsed}
                  onToggle={() => setHotspotPanelCollapsed(!hotspotPanelCollapsed)}
                  onHotspotSelect={handleHotspotSelect}
                  onNavigate={handleNavigate}
                  onDetail={setDetailHotspot}
                />
              ) : (
                <GeoDashboard
                  districtId={selectedDistrict}
                  onDistrictChange={handleDistrictChange}
                  activeTab={rightPanelTab}
                  onTabChange={setRightPanelTab}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map toolbar (vertical buttons, center-left) - z-40 */}
      <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <MapToolbar
            onSearch={handleSearch}
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            onLaunchCommander={selectedOpsHotspot ? handleLaunchIncidentCommander : undefined}
          />
        </div>
      </div>

      {/* Timeline replay (bottom center) - z-40, hidden on mobile */}
      <div className="hidden md:block absolute inset-x-0 bottom-3 z-40 px-4 pointer-events-none">
        <div className="pointer-events-auto max-w-full mx-auto">
          <TimelineReplay
            districtId={selectedDistrict}
            visibleLayers={visibleLayers}
            onSliceChange={handleTimelineSlice}
          />
        </div>
      </div>

      {/* Route navigator (bottom-left) - z-40 */}
      {navigateHotspot && (
        <div className="absolute left-2 sm:left-3 bottom-24 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <RouteNavigator
              fromHotspot={navigateHotspot}
              onRouteFound={handleRouteFound}
              onStartPatrol={() => {}}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <HotspotDetailModal
        hotspot={detailHotspot}
        onClose={() => setDetailHotspot(null)}
        onNavigate={handleNavigate}
        onGenerateReport={(h) => {
          setReportCoords({ lat: h.lat, lng: h.lng });
          setShowReportGenerator(true);
        }}
      />

      <AnalysisModal
        coords={analysisCoords}
        onClose={() => setAnalysisCoords(null)}
      />

      <ReportGenerator
        isOpen={showReportGenerator}
        onClose={() => {
          setShowReportGenerator(false);
          setReportCoords(null);
        }}
        clickCoords={reportCoords}
      />

      {showNotifyModal && selectedOpsHotspot && (
        <NotifyOfficerModal
          hotspot={selectedOpsHotspot}
          onClose={() => setShowNotifyModal(false)}
        />
      )}

      {showCopilot && selectedOpsHotspot && (
        <InvestigationCopilot
          hotspot={selectedOpsHotspot}
          onClose={() => setShowCopilot(false)}
        />
      )}

      {showNetworkGraph && selectedOpsHotspot && (
        <CriminalNetworkGraph
          hotspot={selectedOpsHotspot}
          onClose={() => setShowNetworkGraph(false)}
        />
      )}

      {showIncidentCommander && (
        <IncidentCommander
          districtId={selectedDistrict}
          alert={incidentCommanderAlert}
          hotspot={selectedOpsHotspot}
          onClose={() => { setShowIncidentCommander(false); setIncidentCommanderAlert(null); }}
          onOpenCopilot={() => { setShowCopilot(true); }}
          onOpenNetwork={() => setShowNetworkGraph(true)}
          onGeneratePdf={() => { if (selectedOpsHotspot) { setReportCoords({ lat: selectedOpsHotspot.lat, lng: selectedOpsHotspot.lng }); setShowReportGenerator(true); }}}
          onNotifyCommand={() => setShowNotifyModal(true)}
        />
      )}
    </div>
  );
}
