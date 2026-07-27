import { useState } from 'react';
import { Search, Shield, AlertTriangle, Info } from 'lucide-react';
import { RiskScoreCard } from '@/components/Intelligence/RiskScoreCard';
import { BatchRiskScoring } from '@/components/Intelligence/BatchRiskScoring';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { EmptyState } from '@/design-system/components/EmptyState';
import { useRiskScores } from '@/hooks/useRiskScores';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { submitFeedback } from '@/api/intelligence';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/design-system/components/Tabs';
import { useTranslation } from 'react-i18next';

const entityTypes = [
  { value: 'district', label: 'risk.district' },
  { value: 'station', label: 'risk.station' },
  { value: 'accused', label: 'risk.accused' },
  { value: 'victim', label: 'risk.victim' },
  { value: 'area', label: 'risk.area' },
  { value: 'officer', label: 'risk.officer' },
  { value: 'case', label: 'risk.case' },
];

const modelStatus: Record<string, 'available' | 'not_available' | 'trained'> = {
  district: 'not_available',
  station: 'not_available',
  accused: 'trained',
  victim: 'not_available',
  area: 'not_available',
  officer: 'not_available',
  case: 'not_available',
};

function ModelAvailabilityNotice({ entityType }: { entityType: string }) {
  const { t } = useTranslation();
  const status = modelStatus[entityType];
  if (status === 'trained') return null;

  return (
    <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: 'rgba(255, 200, 0, 0.08)', border: '1px solid rgba(255, 200, 0, 0.2)' }}>
      <Info className="w-5 h-5 shrink-0" style={{ color: 'var(--alert-amber)' }} />
      <div>
        <p className="text-sm font-medium text-text-primary">
          {status === 'not_available'
            ? t('risk.modelNotAvailable', { entityType })
            : t('risk.modelInProgress', { entityType })}
        </p>
        {status === 'not_available' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('risk.modelNotAvailableHint')}
          </p>
        )}
      </div>
    </div>
  );
}

export function RiskDashboardPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [entityType, setEntityType] = useState('accused');
  const [entityId, setEntityId] = useState('');
  const { score, isLoading, error, fetchScore, clear } = useRiskScores();

  const handleSearch = () => {
    if (!entityId.trim()) return;
    fetchScore(entityType, entityId.trim());
  };

  return (
    <div className="space-y-4">
      <JurisdictionBanner scope={jurisdiction} />
      <Tabs defaultValue="single" className="space-y-6">
      <TabsList variant="enclosed">
        <TabsTrigger value="single">{t('risk.singleEntity')}</TabsTrigger>
        <TabsTrigger value="batch">{t('risk.batchScoring')}</TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="space-y-6">
      <div className="bg-bg-card rounded-xl border border-border-primary p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="font-semibold text-text-primary">{t('risk.computeScore')}</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); clear(); }}
            className="px-3 py-2 border border-border-primary rounded-lg text-sm bg-bg-card"
          >
            {entityTypes.map((et) => (
              <option key={et.value} value={et.value}>{t(et.label)}</option>
            ))}
          </select>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('risk.enterEntityId')}
            className="flex-1 min-w-[200px] px-4 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={!entityId.trim() || isLoading}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(0, 212, 255, 0.15)' }}
          >
            <Search className="w-4 h-4" />
            {t('risk.search')}
          </button>
          <button
            onClick={clear}
            className="px-4 py-2 border border-border-primary text-text-secondary text-sm font-medium rounded-lg hover:bg-hover-bg transition-colors"
          >
            {t('risk.clear')}
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner message={t('risk.loading')} />}

      {error && (
        <div className="alert-error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {score && (
        <RiskScoreCard
          data={score}
          onSubmitFeedback={async (feedback) => {
            await submitFeedback({
              entity_type: score.entity_type,
              entity_id: score.entity_id,
              predicted_score: score.score,
              ...feedback,
            });
          }}
        />
      )}

      {!score && !isLoading && !error && (
        <EmptyState
          icon={<Shield className="w-10 h-10" />}
          title={t('risk.noScore')}
          description={t('risk.scoreRange')}
        />
      )}

      <ModelAvailabilityNotice entityType={entityType} />
      </TabsContent>

      <TabsContent value="batch">
        <BatchRiskScoring />
      </TabsContent>
    </Tabs>
    </div>
  );
}
