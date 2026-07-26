import { useMemo } from 'react';
import { UnifiedTrendChart } from '@/components/Common/UnifiedTrendChart';
import type { TrendPoint } from '@/types';

interface CrimeChartProps {
  data: TrendPoint[];
  isLoading?: boolean;
}

export function CrimeChart({ data, isLoading }: CrimeChartProps) {
  const mapped = useMemo(
    () => data.map((d) => ({ date: d.date, count: d.count })),
    [data],
  );

  return <UnifiedTrendChart data={mapped} showForecast isLoading={isLoading} />;
}
