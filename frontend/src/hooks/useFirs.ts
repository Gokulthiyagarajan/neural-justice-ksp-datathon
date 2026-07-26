import { useState, useCallback } from 'react';
import { getFirs, searchFirs, getFir } from '@/api/firs';
import type { FirCase } from '@/types';

interface UseFirsReturn {
  firs: FirCase[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchFirs: (filters?: Record<string, any>) => Promise<void>;
  search: (query: string) => Promise<void>;
  fetchOne: (crimeNo: string) => Promise<FirCase | null>;
}

export function useFirs(): UseFirsReturn {
  const [firs, setFirs] = useState<FirCase[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFirs = useCallback(async (filters?: Record<string, any>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getFirs(filters);
      setFirs(res.results);
      setTotal(res.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await searchFirs(query);
      setFirs(res.results);
      setTotal(res.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (crimeNo: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fir = await getFir(crimeNo);
      return fir;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { firs, total, isLoading, error, fetchFirs, search, fetchOne };
}
