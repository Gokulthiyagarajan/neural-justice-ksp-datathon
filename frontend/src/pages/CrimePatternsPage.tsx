import { useEffect, useState } from 'react';
import { PatternMap } from '@/components/Intelligence/PatternMap';
import { Skeleton } from '@/design-system/components/Skeleton';
import { EmptyState } from '@/design-system/components/EmptyState';
import { ErrorState } from '@/design-system/components/ErrorState';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { getCrimePatterns } from '@/api/intelligence';
import type { CrimePattern } from '@/types';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CrimePatternsPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [patterns, setPatterns] = useState<CrimePattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCrimePatterns({ days: 30 })
      .then((res) => setPatterns(res.patterns))
      .catch((err) => setError((err as Error).message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('patterns.indexUnavailable')}
        description="Unable to load crime pattern data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (patterns.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp />}
        title={t('patterns.emptyTitle')}
        description={t('patterns.emptyDescription')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <JurisdictionBanner scope={jurisdiction} />
      <PatternMap patterns={patterns} />
    </div>
  );
}
