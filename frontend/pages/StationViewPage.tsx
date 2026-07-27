import { useState, useEffect } from 'react';
import { MapPin, Shield, Users, Phone, Navigation, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapView } from '@/components/geo/MapView';
import { getStationDetail, getHotspots } from '@/api/geo';
import { getFirs } from '@/api/firs';
import type { StationInfo, Hotspot } from '@/types/geo';
import type { FirCase } from '@/types';
import { useTranslation } from 'react-i18next';

const STATIONS = [
  { id: 1, name: 'Cubbon Park Police Station' },
  { id: 2, name: 'Koramangala Police Station' },
  { id: 3, name: 'Whitefield Police Station' },
  { id: 4, name: 'Jayanagar Police Station' },
  { id: 5, name: 'Malleshwaram Police Station' },
];

export function StationViewPage() {
  const { t } = useTranslation();
  const [stationId, setStationId] = useState(1);
  const [station, setStation] = useState<StationInfo | null>(null);
  const [nearbyFirs, setNearbyFirs] = useState<FirCase[]>([]);
  const [nearbyHotspots, setNearbyHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stationRes, firRes, hotspotRes] = await Promise.all([
          getStationDetail(stationId),
          getFirs({ station_id: stationId, limit: 20, date_from: getDaysAgo(1) }),
          getHotspots({ limit: 10 }),
        ]);
        setStation(stationRes);
        setNearbyFirs(firRes.results);
        setNearbyHotspots(hotspotRes.hotspots);
      } catch (err) {
        // Error handling for StationViewPage fetch failure
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [stationId]);

  const officerData = [
    { name: 'Patrol', count: 24 },
    { name: 'Desk', count: 8 },
    { name: 'Investigation', count: 12 },
    { name: 'Traffic', count: 10 },
    { name: 'Admin', count: 6 },
  ];

  const recentFirs = nearbyFirs.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-cyan/10">
            <Shield className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary font-display">{t('station.inspectorView')}</h2>
            <p className="text-[10px] text-text-tertiary font-mono mt-0.5">
              {t('statusBar.stats', { divisions: 4, districts: 31, stations: 906 })} · Live
            </p>
          </div>
        </div>
        <select
          value={stationId}
          onChange={(e) => setStationId(Number(e.target.value))}
          className="text-sm border border-border-primary rounded-lg px-3 py-1.5 bg-bg-card text-text-primary focus:border-service-blue/40 focus:ring-2 focus:ring-service-blue/10 transition-all duration-200 outline-none"
        >
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[320px]">
          <div className="bg-bg-card rounded-xl border border-border-primary p-5 h-full">
            <MapView districtId={`station-${stationId}`} className="w-full h-full rounded-lg min-h-[280px]" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-bg-card rounded-xl border border-border-primary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.stationInfo')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Shield className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                <span className="font-medium text-text-primary">
                  {station?.station_name || `Station #${stationId}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <MapPin className="w-4 h-4" />
                <span className="text-xs">
                  {station?.lat?.toFixed(4)}, {station?.lng?.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <Users className="w-4 h-4" />
                <span className="text-xs">{station?.officer_count ?? 60} {t('station.officersCount')}</span>
              </div>
              {station?.phone && (
                <div className="flex items-center gap-2 text-text-tertiary">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">{station.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-bg-card rounded-xl border border-border-primary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.clearanceRate')}</h3>
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--glass-border)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none" stroke="var(--alert-green)"
                    strokeWidth="8"
                    strokeDasharray={`${(68 / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-text-primary">68%</span>
                </div>
              </div>
              <p className="text-xs text-text-tertiary mt-2">+2.1% {t('station.fromLastMonth')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.nearbyFIRs')}</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading && <p className="text-xs text-text-tertiary">{t('station.loading')}</p>}
            {!loading && recentFirs.length === 0 && (
              <p className="text-xs text-text-tertiary">{t('station.noRecentFIRs')}</p>
            )}
            {recentFirs.map((fir) => (
              <div key={fir.crime_no} className="flex items-center justify-between text-xs bg-bg-tertiary rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary truncate">{fir.crime_no}</p>
                  <p className="text-text-tertiary truncate">{fir.crime_head_name}</p>
                </div>
                <span className="text-text-tertiary ml-2">{fir.occurrence_date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.nearbyHotspots')}</h3>
          <div className="space-y-2">
            {nearbyHotspots.slice(0, 6).map((h) => (
              <div key={h.hotspot_id} className="flex items-center justify-between text-xs bg-bg-tertiary rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{h.crime_category}</p>
                  <p className="text-text-tertiary">{h.location}</p>
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
            ))}
          </div>

          <button className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #4A82AD)', boxShadow: '0 2px 12px rgba(0,212,255,0.2)' }}>
            <Navigation className="w-3.5 h-3.5" />
            {t('station.suggestPatrolRoutes')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">{t('station.officerAssignment')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={officerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{t('station.suggestedPatrolRoutes')}</h3>
          <div className="space-y-2">
            {[
              { zone: 'Zone A - Commercial', priority: 'High', time: '18:00-02:00', units: 3 },
              { zone: 'Zone B - Residential', priority: 'Medium', time: '22:00-06:00', units: 2 },
              { zone: 'Zone C - Market', priority: 'High', time: '10:00-20:00', units: 4 },
              { zone: 'Zone D - Industrial', priority: 'Low', time: '00:00-08:00', units: 1 },
            ].map((route, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-bg-tertiary rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">{route.zone}</p>
                  <p className="text-text-tertiary">{route.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background: route.priority === 'High' ? 'rgba(255, 51, 102, 0.08)' :
                                  route.priority === 'Medium' ? 'rgba(245, 158, 11, 0.08)' :
                                  'rgba(0, 230, 118, 0.08)',
                      color: route.priority === 'High' ? 'var(--alert-red)' :
                             route.priority === 'Medium' ? 'var(--alert-amber)' :
                             'var(--alert-green)',
                    }}
                  >
                    {route.priority}
                  </span>
                  <span className="text-text-tertiary">{route.units}u</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors">
              <FileText className="w-3.5 h-3.5" />
              {t('station.viewAllRoutes')}
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #4A82AD)', boxShadow: '0 2px 12px rgba(0,212,255,0.2)' }}>
              <Navigation className="w-3.5 h-3.5" />
              {t('station.deployUnits')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
