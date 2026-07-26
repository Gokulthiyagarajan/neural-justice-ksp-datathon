import { useState, useCallback } from 'react';
import { getRiskScore } from '@/api/intelligence';
import type { RiskScoreResponse } from '@/types';

interface UseRiskScoresReturn {
  score: RiskScoreResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchScore: (entityType: string, entityId: string) => Promise<void>;
  clear: () => void;
}

export function useRiskScores(): UseRiskScoresReturn {
  const [score, setScore] = useState<RiskScoreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async (entityType: string, entityId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRiskScore(entityType, entityId);
      setScore(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setScore(null);
    setError(null);
  }, []);

  return { score, isLoading, error, fetchScore, clear };
}
