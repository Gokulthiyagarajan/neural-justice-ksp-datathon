import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from '@/components/Analytics/AnalyticsDashboard';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { getTrends } from '@/api/analytics';
import type { TrendPoint } from '@/types';
import { useTranslation } from 'react-i18next';

// Demo trend data for when the backend is unavailable or in demo mode
const DEMO_TREND: TrendPoint[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (89 - i));
  const base = 15 + Math.sin(i / 7) * 8;
  const noise = Math.round(Math.random() * 5);
  return { date: date.toISOString().slice(0, 10), count: Math.round(base + noise) };
});

export function AnalyticsPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTrends(90)
      .then((res) => setTrendData(res.trends))
      .catch(() => {
        // Demo mode or backend down — use sample trend data
        setTrendData(DEMO_TREND);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner message={t('common.loading')} />;

  return (
    <div className="space-y-4">
      <JurisdictionBanner scope={jurisdiction} />
      <AnalyticsDashboard trendData={trendData} />
    </div>
  );
}
