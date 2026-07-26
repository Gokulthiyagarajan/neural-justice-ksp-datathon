import { useState } from 'react';
import { PatrolRecommendations } from '@/components/Intelligence/PatrolRecommendations';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Skeleton } from '@/design-system/components/Skeleton';
import { Map } from 'lucide-react';
import { getPatrolRecommendations } from '@/api/intelligence';
import type { PatrolRecommendation } from '@/types';
import { useTranslation } from 'react-i18next';

export function PatrolRecommendationsPage() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<PatrolRecommendation[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [stationId, setStationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const load = async (station?: string) => {
    if (!station) {
      setError(t('patrol.selectStation'));
      return;
    }
    setError('');
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await getPatrolRecommendations(station);
      setRecommendations(res.recommendations);
      setTotalHours(res.total_patrol_hours);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && error.toLowerCase().includes('validation') ? (
        <ErrorState
          title={t('patrol.requestRejected')}
          description="The patrol API rejected this station ID — verify the station code format and retry once backend validation is updated."
          onRetry={() => stationId && load(stationId)}
          variant="warning"
        />
      ) : error ? (
        <ErrorState
          title={t('patrol.unavailable')}
          description="Please try again. If the issue persists, contact support."
          onRetry={() => stationId && load(stationId)}
        />
      ) : null}

      <div className="panel-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="station-id" className="text-sm font-medium text-text-primary">
            {t('patrol.filterStation')}
          </label>
          <input
            id="station-id"
            type="text"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(stationId)}
            placeholder={t('patrol.stationIdPlaceholder')}
            className="input max-w-xs"
          />
          <button type="button" onClick={() => load(stationId)} className="btn-primary">
            {t('common.apply')}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      )}

      {!isLoading && !hasSearched && (
        <EmptyState
          icon={<Map />}
          title={t('patrol.selectStation')}
          description="Enter a station ID to view AI-recommended patrol routes and shift allocations for that jurisdiction."
        />
      )}

      {!isLoading && hasSearched && recommendations.length === 0 && !error && (
        <EmptyState
          icon={<Map />}
          title={t('patrol.noShifts')}
          description="The model found no high-priority patrol gaps for this station in the current window. Try another station or check back after the next sync."
        />
      )}

      {!isLoading && recommendations.length > 0 && (
        <PatrolRecommendations recommendations={recommendations} totalHours={totalHours} />
      )}
    </div>
  );
}
