import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, MapPin, Clock, Route, Car } from 'lucide-react';
import { postNavigation, getHotspots } from '@/api/geo';
import type { Hotspot, NavigationRoute, GeoCoordinates } from '@/types/geo';

interface RouteNavigatorProps {
  onRouteFound?: (route: NavigationRoute) => void;
  onStartPatrol?: (route: NavigationRoute) => void;
  fromHotspot?: Hotspot | null;
}

export function RouteNavigator({ onRouteFound, onStartPatrol, fromHotspot }: RouteNavigatorProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'hotspot' | 'custom'>('hotspot');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(fromHotspot?.hotspot_id ?? '');
  const [customOrigin, setCustomOrigin] = useState('');
  const [customDest, setCustomDest] = useState('');
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    getHotspots({ limit: 20 }).then((res) => setHotspots(res.hotspots)).catch(() => {});
  }, []);

  useEffect(() => {
    if (fromHotspot) setSelectedHotspotId(fromHotspot.hotspot_id);
  }, [fromHotspot]);

  const parseCoords = (input: string): GeoCoordinates | null => {
    const parts = input.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return { lat: parts[0], lng: parts[1] };
  };

  const handleGetRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      let origin: GeoCoordinates;
      let destination: GeoCoordinates;

      if (mode === 'hotspot') {
        const hs = hotspots.find((h) => h.hotspot_id === selectedHotspotId);
        if (!hs) {
          setError('Please select a hotspot');
          setLoading(false);
          return;
        }
        origin = { lat: hs.lat, lng: hs.lng };
        // Placeholder: replace with real destination logic or API call
        destination = { lat: hs.lat + 0.01, lng: hs.lng + 0.01 };
      } else {
        const o = parseCoords(customOrigin);
        const d = parseCoords(customDest);
        if (!o || !d) {
          setError('Invalid coordinates. Use format: lat,lng');
          setLoading(false);
          return;
        }
        origin = o;
        destination = d;
      }

      const res = await postNavigation({
        origin,
        destination,
        alternatives: true,
      });

      if (res.routes.length > 0) {
        setRoute(res.routes[0]);
        onRouteFound?.(res.routes[0]);
      } else {
        setError('No route found');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedHotspot = hotspots.find((h) => h.hotspot_id === selectedHotspotId);

  return (
    <div className="glass rounded-xl shadow-lg p-4 space-y-3 w-80">
      <div className="flex items-center gap-2">
        <Navigation className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
        <span className="text-sm font-semibold text-text-primary">{t('geo.routeNavigator')}</span>
      </div>

      <div className="flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
        {(['hotspot', 'custom'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === m ? 'bg-bg-card shadow text-text-primary font-medium' : 'text-text-tertiary'
            }`}
          >
            {m === 'hotspot' ? 'From Hotspot' : 'Custom'}
          </button>
        ))}
      </div>

      {mode === 'hotspot' ? (
        <select
          value={selectedHotspotId}
          onChange={(e) => setSelectedHotspotId(e.target.value)}
          className="w-full text-xs border border-border-primary rounded-lg px-2 py-1.5 bg-bg-tertiary"
        >
          <option value="">{t('geo.selectHotspot')}</option>
          {hotspots.map((h) => (
            <option key={h.hotspot_id} value={h.hotspot_id}>
              {h.crime_category} - {h.location}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-text-tertiary block mb-0.5">{t('geo.origin')}</label>
            <input
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              placeholder="12.9716,77.5946"
              className="w-full text-xs border border-border-primary rounded-lg px-2 py-1.5 bg-bg-tertiary"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-tertiary block mb-0.5">{t('geo.destination')}</label>
            <input
              value={customDest}
              onChange={(e) => setCustomDest(e.target.value)}
              placeholder="12.9716,77.5946"
              className="w-full text-xs border border-border-primary rounded-lg px-2 py-1.5 bg-bg-tertiary"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleGetRoute}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.25)] disabled:opacity-50 transition-colors"
      >
        <Route className="w-3.5 h-3.5" />
        {loading ? 'Calculating...' : 'Get Route'}
      </button>

      {error && (
        <div className="text-xs rounded px-2 py-1" style={{ color: 'var(--alert-red)', background: 'rgba(255, 51, 102, 0.1)' }}>{error}</div>
      )}

      {route && (
        <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <MapPin className="w-3.5 h-3.5 text-text-tertiary mx-auto mb-0.5" />
              <p className="text-xs font-medium text-text-primary">{route.distance_km.toFixed(1)}km</p>
              <p className="text-[10px] text-text-tertiary">{t('geo.distance')}</p>
            </div>
            <div>
              <Clock className="w-3.5 h-3.5 text-text-tertiary mx-auto mb-0.5" />
              <p className="text-xs font-medium text-text-primary">{route.estimated_minutes}min</p>
              <p className="text-[10px] text-text-tertiary">ETA</p>
            </div>
            <div>
              <Car className="w-3.5 h-3.5 text-text-tertiary mx-auto mb-0.5" />
              <p className="text-xs font-medium text-text-primary truncate">{route.vehicle_recommendation}</p>
              <p className="text-[10px] text-text-tertiary">{t('geo.vehicle')}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onStartPatrol?.(route)}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-[var(--alert-green)] hover:bg-[rgba(0,230,118,0.2)] text-white rounded-lg transition-colors"
            >
              Start Patrol
            </button>
            {route.alternative_routes && route.alternative_routes.length > 0 && (
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="px-2 py-1.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors"
              >
                {showAlternatives ? 'Hide' : 'Alt'} Routes
              </button>
            )}
          </div>

          {showAlternatives && route.alternative_routes?.map((alt, i) => (
            <div key={i} className="text-xs text-text-tertiary pl-2 border-l-2 border-border-primary py-1">
              Route {i + 2}: {alt.distance_km.toFixed(1)}km, {alt.estimated_minutes}min
            </div>
          ))}
        </div>
      )}

      {selectedHotspot && (
        <div className="border-t border-border-secondary pt-2">
          <p className="text-[10px] font-medium text-text-tertiary uppercase mb-1">{t('geo.nearbyStations')}</p>
          <p className="text-xs text-text-tertiary">{t('geo.loadingStations')}</p>
        </div>
      )}
    </div>
  );
}
