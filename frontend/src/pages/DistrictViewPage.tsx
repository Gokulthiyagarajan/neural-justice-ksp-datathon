import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Shield, Building2, AlertTriangle, Users, Navigation, Activity, ChevronDown, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { MapView } from '@/components/geo/MapView';
import { getDistrictAnalytics, getHotspots, getDistrictsList } from '@/api/geo';
import type { RegionGroup } from '@/api/geo';
import type { DistrictAnalytics, Hotspot } from '@/types/geo';
import { useTranslation } from 'react-i18next';

const PIE_COLORS = ['var(--accent-cyan)', 'var(--alert-amber)', 'var(--alert-red)', 'var(--alert-green)', '#8B5CF6'];

export function DistrictViewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { districtId } = useParams<{ districtId: string }>();

  // Region & district selection state
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [availableDistricts, setAvailableDistricts] = useState<{ id: number; name: string; code: string }[]>([]);
  const [regionOpen, setRegionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);

  // Data state
  const [analytics, setAnalytics] = useState<DistrictAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load regions list on mount
  useEffect(() => {
    getDistrictsList()
      .then((data) => {
        setRegions(data);
        // If districtId is in URL, try to auto-select it
        if (districtId) {
          for (const region of data) {
            const match = region.districts.find(
              (d) => d.code === districtId || String(d.id) === districtId || d.name.toLowerCase().replace(/\s+/g, '-') === districtId
            );
            if (match) {
              setSelectedRegion(String(region.region_id ?? ''));
              setSelectedDistrict(String(match.id));
              setAvailableDistricts(region.districts);
              break;
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [districtId]);

  // When region changes, update available districts
  const handleRegionChange = useCallback((regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedDistrict('');
    setAnalytics(null);
    setHotspots([]);
    const region = regions.find((r) => String(r.region_id ?? '') === regionId);
    setAvailableDistricts(region?.districts ?? []);
    setDistrictOpen(false);
    setRegionOpen(false);
  }, [regions]);

  // When district changes, fetch data and update URL
  const handleDistrictSelect = useCallback((districtIdStr: string) => {
    setSelectedDistrict(districtIdStr);
    setDistrictOpen(false);
    const district = availableDistricts.find((d) => String(d.id) === districtIdStr);
    if (district) {
      const slug = district.code || String(district.id);
      navigate(`/geo/district/${slug}`, { replace: true });
    }
  }, [availableDistricts, navigate]);

  // Fetch district data when districtId in URL changes or refresh is clicked
  const fetchDistrictData = useCallback(async (did: string) => {
    setLoading(true);
    try {
      const [analyticRes, hotspotRes] = await Promise.all([
        getDistrictAnalytics(did).catch(() => null),
        getHotspots({ district_id: did, limit: 10 }).catch(() => ({ hotspots: [] })),
      ]);
      setAnalytics(analyticRes);
      setHotspots(hotspotRes.hotspots);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!districtId) {
      setAnalytics(null);
      setHotspots([]);
      return;
    }
    fetchDistrictData(districtId);
  }, [districtId, refreshTrigger, fetchDistrictData]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const crimeDistribution = analytics?.crime_type_breakdown
    ? Object.entries(analytics.crime_type_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const selectedDistrictName = availableDistricts.find((d) => String(d.id) === selectedDistrict)?.name
    || analytics?.district_name
    || districtId
    || '';

  // ——— Initial loading ———
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-tertiary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ——— Region & District Selector ——— */}
      <div className="bg-bg-card rounded-xl border border-border-primary p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="text-sm font-bold text-text-primary">Select Region & District</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Region Selector */}
          <div className="relative flex-1">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={regionOpen}
              onClick={() => { setRegionOpen(!regionOpen); setDistrictOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setRegionOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm bg-bg-tertiary border border-border-primary rounded-lg hover:border-[var(--accent-cyan)]/40 transition-colors text-left"
            >
              <span className={selectedRegion ? 'text-text-primary' : 'text-text-tertiary'}>
                {selectedRegion ? regions.find((r) => String(r.region_id ?? '') === selectedRegion)?.region_name || 'Select Region' : 'Select Region'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${regionOpen ? 'rotate-180' : ''}`} />
            </button>
            {regionOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRegionOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setRegionOpen(false)} />
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-bg-card border border-border-primary rounded-lg shadow-xl max-h-60 overflow-y-auto" role="listbox" aria-label="Select region">
                  {regions.map((region) => (
                    <button
                      key={region.region_id ?? 'other'}
                      type="button"
                      role="option"
                      aria-selected={selectedRegion === String(region.region_id ?? '')}
                      onClick={() => handleRegionChange(String(region.region_id ?? ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleRegionChange(String(region.region_id ?? ''));
                        if (e.key === 'Escape') setRegionOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${
                        selectedRegion === String(region.region_id ?? '') ? 'bg-bg-tertiary text-[var(--accent-cyan)]' : 'text-text-primary'
                      }`}
                      tabIndex={0}
                    >
                      <div className="font-medium">{region.region_name}</div>
                      {region.headquarters && (
                        <div className="text-[11px] text-text-tertiary">HQ: {region.headquarters}</div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* District Selector */}
          <div className="relative flex-1">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={districtOpen}
              disabled={!selectedRegion}
              onClick={() => { setDistrictOpen(!districtOpen); setRegionOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setDistrictOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm bg-bg-tertiary border border-border-primary rounded-lg hover:border-[var(--accent-cyan)]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
            >
              <span className={selectedDistrict ? 'text-text-primary' : 'text-text-tertiary'}>
                {selectedDistrict ? selectedDistrictName : 'Select District'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${districtOpen ? 'rotate-180' : ''}`} />
            </button>
            {districtOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDistrictOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setDistrictOpen(false)} />
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-bg-card border border-border-primary rounded-lg shadow-xl max-h-60 overflow-y-auto" role="listbox" aria-label="Select district">
                  {availableDistricts.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-text-tertiary text-center">No districts available</div>
                  ) : (
                    availableDistricts.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        role="option"
                        aria-selected={selectedDistrict === String(d.id)}
                        onClick={() => handleDistrictSelect(String(d.id))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleDistrictSelect(String(d.id));
                          if (e.key === 'Escape') setDistrictOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-bg-tertiary transition-colors ${
                          selectedDistrict === String(d.id) ? 'bg-bg-tertiary text-[var(--accent-cyan)]' : 'text-text-primary'
                        }`}
                        tabIndex={0}
                      >
                        {d.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ——— District Data (only shown when a district is selected) ——— */}
      {districtId ? (
        loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-tertiary">Loading district data…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                <h2 className="text-lg font-bold text-text-primary">
                  {analytics?.district_name || selectedDistrictName}
                </h2>
                {analytics?.risk_level && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    analytics.risk_level === 'Critical' ? 'bg-[rgba(255,51,102,0.15)] text-[var(--alert-red)]' :
                    analytics.risk_level === 'High' ? 'bg-[rgba(245,158,11,0.15)] text-[var(--alert-amber)]' :
                    'bg-[rgba(0,212,255,0.1)] text-[var(--accent-cyan)]'
                  }`}>
                    {analytics.risk_level}
                  </span>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-tertiary rounded-lg hover:bg-hover-bg transition-colors text-text-secondary disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 min-h-[320px]">
                <div className="bg-bg-card rounded-xl border border-border-primary p-5 h-full">
                  <MapView districtId={districtId} className="w-full h-full rounded-lg min-h-[280px]" />
                </div>
              </div>

              <div className="space-y-4">
                {/* Station Info */}
                <div className="bg-bg-card rounded-xl border border-border-primary p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.stationInfo')}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                      <span className="font-medium text-text-primary">{analytics?.district_name || selectedDistrictName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs">{analytics?.station_count || 0} stations</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">{analytics?.officer_count || 0} officers</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">{analytics?.hotspot_count || 0} active hotspots</span>
                    </div>
                  </div>
                </div>

                {/* Crime Metrics */}
                <div className="bg-bg-card rounded-xl border border-border-primary p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Crime Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-text-primary">{analytics?.total_cases_30d || 0}</div>
                      <div className="text-[10px] text-text-tertiary">Cases (30d)</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-text-primary">{analytics?.crime_index || 0}</div>
                      <div className="text-[10px] text-text-tertiary">Crime Index</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                      <div className="text-lg font-bold" style={{ color: 'var(--alert-green)' }}>{analytics?.clearance_rate || 0}%</div>
                      <div className="text-[10px] text-text-tertiary">Clearance Rate</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-text-primary">{analytics?.prediction_alerts || 0}</div>
                      <div className="text-[10px] text-text-tertiary">Alerts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-bg-card rounded-xl border border-border-primary p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Crime Distribution</h3>
                {crimeDistribution.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-xs text-text-tertiary">No records are currently available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={crimeDistribution}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {crimeDistribution.map((_: unknown, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-bg-card rounded-xl border border-border-primary p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Active Hotspots</h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {hotspots.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-8">No active hotspots</p>
                  ) : (
                    hotspots.slice(0, 8).map((h) => (
                      <div key={h.hotspot_id} className="flex items-center justify-between text-xs bg-bg-tertiary rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">{h.crime_category}</p>
                          <p className="text-text-tertiary truncate">{h.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              background: h.risk_score > 60 ? 'rgba(255, 51, 102, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                              color: h.risk_score > 60 ? 'var(--alert-red)' : 'var(--alert-amber)',
                            }}
                          >
                            {h.risk_score}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {hotspots.length > 0 && (
                  <button className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg hover:opacity-80 transition-colors"
                    style={{ background: 'rgba(0, 212, 255, 0.15)' }}>
                    <Navigation className="w-3.5 h-3.5" />
                    View All Hotspots
                  </button>
                )}
              </div>
            </div>

            {/* Patrol Units */}
            <div className="bg-bg-card rounded-xl border border-border-primary p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Patrol Units</h3>
              <div className="flex items-center gap-4 text-sm text-text-tertiary">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: 'var(--alert-green)' }} />
                  <span>{analytics?.patrol_units_active || 0} active units</span>
                </div>
              </div>
            </div>
          </>
        )
      ) : (
        /* ——— No district selected ——— */
        <div className="flex items-center justify-center h-48 bg-bg-card rounded-xl border border-border-primary">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-tertiary">Select a region and district above to view data</p>
          </div>
        </div>
      )}
    </div>
  );
}
