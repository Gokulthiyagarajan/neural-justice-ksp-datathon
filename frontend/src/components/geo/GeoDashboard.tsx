import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, TrendingUp, MapPin, Shield, Activity } from 'lucide-react';
import { getDistrictRisk, getHotspots, getPatrolUnits } from '@/api/geo';
import { ScoreGauge } from '@/design-system/components/ScoreGauge';
import { Skeleton } from '@/design-system/components/Skeleton';
import type { DistrictAnalytics, Hotspot, PatrolUnit } from '@/types/geo';
import { isDemoMode, demoGeoDashboard } from '@/services/demoData';

interface GeoDashboardProps {
  districtId?: string;
  onDistrictChange?: (districtId: string) => void;
}

export function GeoDashboard({ districtId, onDistrictChange }: GeoDashboardProps) {
  const { t } = useTranslation();
  const [risk, setRisk] = useState<DistrictAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [patrolUnits, setPatrolUnits] = useState<PatrolUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isDemoMode()) {
          const geo = demoGeoDashboard();
          setRisk(geo.risk as any);
          setHotspots(geo.hotspots as any);
          setPatrolUnits(geo.patrolUnits as any);
          setLoading(false);
          return;
        }
        const [riskRes, hotspotRes, patrolRes] = await Promise.all([
          districtId ? getDistrictRisk(districtId) : Promise.resolve(null),
          getHotspots({ district_id: districtId, limit: 5 }),
          getPatrolUnits(districtId),
        ]);
        if (riskRes) setRisk(riskRes);
        setHotspots(hotspotRes.hotspots);
        setPatrolUnits(patrolRes.units);
      } catch {
        // keep prior data on refresh failure
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [districtId]);

  const crimeIndex = risk?.crime_index ?? 0;
  const riskLevel = risk?.risk_level ?? 'Medium';
  const activeHotspots = hotspots.filter((h) => h.status === 'active').length;
  const activePatrolUnits = patrolUnits.filter((u) => u.status === 'active').length;

  const gaugeLevel =
    crimeIndex >= 80 ? 'critical' : crimeIndex >= 60 ? 'high' : crimeIndex >= 40 ? 'medium' : 'low';

  return (
    <div className="glass-floating p-4 w-72 max-w-[calc(100vw-1.5rem)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary font-display">{t('geo.liveIntelligence')}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wide ${
          loading ? 'bg-bg-tertiary text-text-tertiary' : 'badge-live'
        }`}>
          {loading ? 'Syncing' : 'Live'}
        </span>
      </div>

      {districtId && onDistrictChange && (
        <select
          value={districtId}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="input text-xs py-1.5"
          aria-label={t('geo.selectDistrict')}
        >
          <option value="">{t('geo.selectDistrict')}</option>
          <option value="bengaluru-urban">{t('districts.bengaluruUrban')}</option>
          <option value="bengaluru-rural">{t('districts.bengaluruRural')}</option>
          <option value="mysuru">{t('districts.mysuru')}</option>
          <option value="hubli">{t('districts.hubli')}</option>
          <option value="mangaluru">{t('districts.mangaluru')}</option>
        </select>
      )}

      <div className="flex flex-col items-center py-1">
        {loading ? (
          <Skeleton className="h-14 w-20 rounded-full" />
        ) : (
          <>
            <ScoreGauge value={crimeIndex} size="lg" level={gaugeLevel} showValue />
            <p className="text-[10px] uppercase tracking-console text-text-tertiary mt-1">
              Crime Index · {riskLevel}
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-bg-tertiary rounded-md p-2 border border-border-secondary">
          <div className="flex items-center gap-1 text-text-tertiary mb-1">
            <MapPin className="w-3 h-3" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">{t('geo.hotspots')}</span>
          </div>
          <p className="font-mono font-semibold text-text-primary">{loading ? '—' : activeHotspots}</p>
        </div>
        <div className="bg-bg-tertiary rounded-md p-2 border border-border-secondary">
          <div className="flex items-center gap-1 text-text-tertiary mb-1">
            <Shield className="w-3 h-3" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">{t('geo.patrol')}</span>
          </div>
          <p className="font-mono font-semibold text-text-primary">{loading ? '—' : activePatrolUnits}</p>
        </div>
        <div className="bg-bg-tertiary rounded-md p-2 border border-border-secondary col-span-2">
          <div className="flex items-center gap-1 text-text-tertiary mb-1">
            <Activity className="w-3 h-3" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">{t('geo.trend')}</span>
          </div>
          <p className="text-xs text-text-secondary flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-signal-amber" aria-hidden />
            {loading ? 'Loading district metrics…' : `Clearance ${Math.round(risk?.clearance_rate ?? 0)}% · ${risk?.prediction_alerts ?? 0} alerts`}
          </p>
        </div>
      </div>

      {!loading && activeHotspots > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-signal-amber/8 border border-signal-amber/20">
          <AlertTriangle className="w-3.5 h-3.5 text-signal-amber shrink-0 mt-0.5" aria-hidden />
          <p className="text-[10px] text-text-secondary">
            {activeHotspots} active hotspot{activeHotspots !== 1 ? 's' : ''} in jurisdiction — review patrol allocation.
          </p>
        </div>
      )}
    </div>
  );
}
