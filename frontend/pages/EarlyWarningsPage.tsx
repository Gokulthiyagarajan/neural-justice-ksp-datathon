import { useEffect, useState, useCallback, useMemo } from 'react';
import { WarningAlert } from '@/components/Intelligence/WarningAlert';
import { Skeleton } from '@/design-system/components/Skeleton';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { getEarlyWarnings, acknowledgeWarning, resolveWarning } from '@/api/intelligence';
import type { EarlyWarning } from '@/types';
import { isActiveWarning } from '@/utils/formatStatus';
import { useTranslation } from 'react-i18next';

// Demo early warnings for when backend is unavailable or in demo mode
const DEMO_WARNINGS: EarlyWarning[] = [
  { warning_id: 'w1', severity: 'high', type: 'spike', entity_name: 'Koramangala', message: 'Robbery spike detected in Koramangala — 3 incidents in 24h', recommended_action: 'Increase patrol frequency in the area', generated_at: new Date().toISOString(), status: 'active' },
  { warning_id: 'w2', severity: 'medium', type: 'trend', entity_name: 'Mysuru Railway Station', message: 'Auto-theft trend emerging near railway station area', recommended_action: 'Deploy plainclothes officers near parking zones', generated_at: new Date().toISOString(), status: 'active' },
  { warning_id: 'w3', severity: 'low', type: 'forecast', entity_name: 'Mangaluru', message: 'Predicted increase in cyber-fraud next week based on historical patterns', recommended_action: 'Issue public awareness advisory via social media', generated_at: new Date().toISOString(), status: 'active' },
  { warning_id: 'w4', severity: 'critical', type: 'hotspot', entity_name: 'Whitefield', message: 'Critical crime hotspot forming — 5 robberies in 48h near tech parks', recommended_action: 'Immediate saturation patrol and CCTV monitoring', generated_at: new Date().toISOString(), status: 'new' },
  { warning_id: 'w5', severity: 'high', type: 'repeat_offender', entity_name: 'Ravi Kumar (AID-001)', message: 'Known repeat offender active — linked to 3 new FIRs this week', recommended_action: 'Prioritize arrest and coordinate with probation officer', generated_at: new Date().toISOString(), status: 'active' },
  { warning_id: 'w6', severity: 'medium', type: 'cluster', entity_name: 'HSR Layout', message: 'Vehicle theft cluster — 4 two-wheelers stolen from same complex', recommended_action: 'Community alert and security audit of parking facilities', generated_at: new Date().toISOString(), status: 'acknowledged' },
];

export function EarlyWarningsPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWarnings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getEarlyWarnings();
      setWarnings(res.warnings);
    } catch (err) {
      // Demo mode or backend down — use sample warnings
      console.info('[EarlyWarnings] Live data unavailable, using demo data:', (err as Error).message);
      setWarnings(DEMO_WARNINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarnings();
  }, [loadWarnings]);

  const activeWarnings = useMemo(
    () => warnings.filter((w) => isActiveWarning(w.status)),
    [warnings],
  );

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeWarning(id);
      setWarnings((prev) =>
        prev.map((w) => (w.warning_id === id ? { ...w, status: 'acknowledged' } : w)),
      );
    } catch (err) {
      setError((err as Error).message || t('earlyWarnings.acknowledgeFailed'));
    }
  };

  const handleResolve = async (id: string, note: string) => {
    try {
      await resolveWarning(id, note);
      setWarnings((prev) =>
        prev.map((w) => (w.warning_id === id ? { ...w, status: 'resolved' } : w)),
      );
    } catch (err) {
      setError((err as Error).message || t('earlyWarnings.resolveFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-md" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <JurisdictionBanner scope={jurisdiction} />
      {error && <div className="alert-error">Unable to load warnings. Please try again.</div>}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary font-display">
          {t('earlyWarnings.active')}
          <span className="ml-2 text-sm font-normal font-mono text-text-tertiary">
            ({activeWarnings.length})
          </span>
        </h3>
        <button type="button" onClick={loadWarnings} className="btn-ghost btn-sm text-service-blue">
          {t('common.refresh')}
        </button>
      </div>
      <WarningAlert
        warnings={activeWarnings}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
      />
    </div>
  );
}
