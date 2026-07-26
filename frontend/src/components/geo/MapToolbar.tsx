import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Ruler, Pencil, Camera, Maximize, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

interface MapToolbarProps {
  onSearch?: (query: string) => void;
  onMeasureToggle?: (active: boolean) => void;
  onDrawToggle?: (active: boolean) => void;
  onScreenshot?: () => void;
  onFullscreen?: () => void;
  onLocate?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLaunchCommander?: () => void;
}

export function MapToolbar({
  onSearch,
  onMeasureToggle,
  onDrawToggle,
  onScreenshot,
  onFullscreen,
  onLocate,
  onZoomIn,
  onZoomOut,
  onLaunchCommander,
}: MapToolbarProps) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [measureActive, setMeasureActive] = useState(false);
  const [drawActive, setDrawActive] = useState(false);

  const toggleMeasure = useCallback(() => {
    const next = !measureActive;
    setMeasureActive(next);
    onMeasureToggle?.(next);
  }, [measureActive, onMeasureToggle]);

  const toggleDraw = useCallback(() => {
    const next = !drawActive;
    setDrawActive(next);
    if (drawActive) setDrawActive(false);
    onDrawToggle?.(next);
  }, [drawActive, onDrawToggle]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) onSearch?.(searchQuery.trim());
  }, [searchQuery, onSearch]);

  return (
    <div className="flex flex-col gap-1">
      <div className="glass rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={`p-2 rounded-lg transition-colors btn-press ${
            searchOpen ? 'bg-[rgba(0,212,255,0.15)] text-white' : 'text-text-tertiary hover:bg-hover-bg'
          }`}
          aria-label={t('geo.searchLocation')}
          title={t('geo.search')}
        >
          <Search className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={toggleMeasure}
          className={`p-2 rounded-lg transition-colors btn-press ${
            measureActive ? 'bg-[rgba(0,212,255,0.15)] text-white' : 'text-text-tertiary hover:bg-hover-bg'
          }`}
          aria-label={t('geo.measureDistance')}
          title={t('geo.measure')}
        >
          <Ruler className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={toggleDraw}
          className={`p-2 rounded-lg transition-colors btn-press ${
            drawActive ? 'bg-[rgba(0,212,255,0.15)] text-white' : 'text-text-tertiary hover:bg-hover-bg'
          }`}
          aria-label={t('geo.drawOnMap')}
          title={t('geo.draw')}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onScreenshot}
          className="p-2 rounded-lg text-text-tertiary hover:bg-hover-bg transition-colors btn-press"
          aria-label={t('geo.takeScreenshot')}
          title={t('geo.screenshot')}
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onFullscreen}
          className="p-2 rounded-lg text-text-tertiary hover:bg-hover-bg transition-colors btn-press"
          aria-label={t('geo.toggleFullscreen')}
          title={t('geo.fullscreen')}
        >
          <Maximize className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onLocate}
          className="p-2 rounded-lg text-text-tertiary hover:bg-hover-bg transition-colors btn-press"
          aria-label={t('geo.myLocation')}
          title={t('geo.myLocationTitle')}
        >
          <Crosshair className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="glass rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="p-2 rounded-lg text-text-tertiary hover:bg-hover-bg transition-colors btn-press"
          aria-label={t('geo.zoomIn')}
          title={t('geo.zoomInTitle')}
        >
          <ZoomIn className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 rounded-lg text-text-tertiary hover:bg-hover-bg transition-colors btn-press"
          aria-label={t('geo.zoomOut')}
          title={t('geo.zoomOutTitle')}
        >
          <ZoomOut className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {onLaunchCommander && (
        <button
          onClick={onLaunchCommander}
          aria-label={t('geo.launchIncidentCommander')}
          className="flex items-center gap-1.5 bg-[var(--alert-red)] hover:bg-[rgba(255,51,102,0.2)] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg transition-colors btn-press animate-pulse"
          title={t('geo.launchIncidentCommander')}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bg-card" />
          COMMANDER
        </button>
      )}

      {searchOpen && (
        <div className="glass rounded-xl shadow-lg p-2">
          <div className="flex gap-1">
            <label htmlFor="map-search" className="sr-only">{t('geo.searchLocation')}</label>
            <input
              id="map-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('geo.searchLocationPlaceholder')}
              className="flex-1 text-xs border border-border-primary rounded-lg px-2 py-1.5 bg-bg-tertiary focus:ring-2 focus:ring-[rgba(0,212,255,0.4)] focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-2 py-1.5 bg-[rgba(0,212,255,0.15)] text-white text-xs rounded-lg hover:bg-[rgba(0,212,255,0.25)] btn-press"
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
